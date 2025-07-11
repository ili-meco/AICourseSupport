"""
Chat Completion API with RAG using Azure AI Search
"""

import os
import logging
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
# Import middleware when the directory structure is properly set up
# from .middleware.rate_limit import RateLimitMiddleware
# from .middleware.logging import RequestLoggingMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

import openai
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="DND-SP Chat API",
    description="Chat completion API with RAG using Azure AI Search",
    version="1.0.0"
)

# Add CORS middleware
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # More restrictive CORS policy
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Restrict to needed methods
    allow_headers=["Content-Type", "Authorization"],  # Restrict to needed headers
)

# Define models
class ChatMessage(BaseModel):
    """Chat message model"""
    role: str
    content: str

class ConversationMessage(BaseModel):
    """Conversation message for the frontend"""
    id: str
    type: str
    content: str
    timestamp: Union[str, datetime]
    attachments: Optional[List[str]] = None
    quizData: Optional[Dict[str, Any]] = None
    flashcardData: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    """Chat completion request"""
    message: str
    conversation: List[ConversationMessage]
    courseId: Optional[str] = None

class RelevantDocument(BaseModel):
    """Relevant document model"""
    id: str
    name: str
    url: str
    relevanceScore: float

class ChatResponse(BaseModel):
    """Chat completion response"""
    message: ConversationMessage
    relevantDocuments: Optional[List[RelevantDocument]] = None

# Initialize Azure clients
def get_search_client():
    """Get Azure Search client"""
    search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
    search_index = os.getenv("AZURE_SEARCH_INDEX_NAME", "document-chunks")
    search_api_key = os.getenv("AZURE_SEARCH_API_KEY")
    
    if not search_endpoint or not search_api_key:
        raise ValueError("Missing Azure Search configuration")
    
    return SearchClient(
        endpoint=search_endpoint,
        index_name=search_index,
        credential=AzureKeyCredential(search_api_key)
    )

def get_openai_client():
    """Get OpenAI client configured for Azure OpenAI"""
    openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    openai_api_key = os.getenv("AZURE_OPENAI_API_KEY")
    
    if not openai_endpoint or not openai_api_key:
        raise ValueError("Missing OpenAI configuration")
    
    client = openai.AzureOpenAI(
        azure_endpoint=openai_endpoint,
        api_key=openai_api_key,
        api_version="2023-05-15"
    )
    
    return client

async def perform_search(query: str, search_client: SearchClient):
    """Perform search on Azure AI Search index"""
    try:
        # Perform search with proper parameters
        results = search_client.search(
            query,
            select=["id", "content", "title", "filename", "documentId"],
            top=3,  # Limit to top 3 most relevant results
            include_total_count=True
        )
        
        documents = []
        for result in results:
            documents.append({
                "id": result["id"],
                "content": result.get("content", ""),
                "title": result.get("title", ""),
                "filename": result.get("filename", ""),
                "score": result.get("@search.score", 0)
            })
            
        return documents
    except Exception as e:
        logger.error(f"Error in search: {str(e)}")
        return []

@app.post("/api/ChatCompletion", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    search_client: SearchClient = Depends(get_search_client),
    openai_client = Depends(get_openai_client)
):
    """Chat completion endpoint"""
    try:
        # Check for required data
        if not request.message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Get deployment name from env
        deployment_name = os.getenv("AZURE_OPENAI_COMPLETION_DEPLOYMENT", "gpt-4o-mini")
        
        # Perform semantic search to find relevant documents
        relevant_documents = await perform_search(request.message, search_client)
        logger.info(f"Found {len(relevant_documents)} relevant documents for query: {request.message}")
        
        # Log the document titles for debugging
        for doc in relevant_documents:
            logger.info(f"Document: {doc.get('title') or doc.get('filename')} (Score: {doc.get('score', 0)})")
        
        # Format relevant documents as context for the AI
        document_context = ""
        if relevant_documents:
            document_context = "### Reference Information:\n\n"
            for i, doc in enumerate(relevant_documents):
                document_context += f"[Document {i + 1}] {doc.get('title') or doc.get('filename')}\n{doc.get('content')}\n\n"
        
        # Convert previous conversation to OpenAI format
        previous_messages = []
        for msg in request.conversation:
            if msg.type in ["user", "ai"]:
                role = "user" if msg.type == "user" else "assistant"
                previous_messages.append({"role": role, "content": msg.content})
        
        # Build the messages array
        messages = [
            {
                "role": "system",
                "content": f"""You are an AI-powered educational assistant integrated with SharePoint Online repositories containing course materials and training documents. You serve as a knowledgeable tutor with expertise in military training documentation, providing students with real-time assistance, explanations, and guidance throughout their learning journey.

YOUR ROLE:
- Act as a supportive and knowledgeable course tutor
- Provide clear explanations of complex subject matter
- Offer step-by-step guidance when students are struggling
- Maintain awareness of course context and learning progression
- Be encouraging and supportive to promote student engagement
- Respond in a professional yet approachable tone

WHEN ANSWERING QUESTIONS:
1. Use the provided reference documents to give accurate and helpful answers
2. Always cite your sources by referring to the document numbers provided (e.g., "According to [Document 2]...")
3. Break down complex topics into understandable segments with headers and bullet points
4. Provide examples and analogies to illustrate concepts when appropriate
5. Suggest related topics or materials for further learning when relevant
6. Offer interactive learning opportunities (quizzes, exercises) when appropriate

FORMAT YOUR RESPONSES:
- Start with a direct answer to the question
- Follow with detailed explanations
- Use bullet points for lists
- Use headers to organize longer responses
- Include a brief summary for complex answers

CONSTRAINTS:
- Keep responses focused on educational content
- Do not provide answers to test questions if explicitly identified as assessment material
- If asked about topics outside the scope of course materials, redirect to relevant course content
- Avoid speculation when documents don't contain the information
- Limit responses to 3-4 paragraphs unless the question requires detailed explanation

If the reference documents don't contain relevant information to answer the student's question, acknowledge this and offer general assistance based on your knowledge, but clearly state that the specific information is not in the provided documents.

Example citation format:
"According to [Document 1], the key performance parameters include... Further information in [Document 3] suggests..."

{document_context}"""
            },
            *previous_messages,
            {
                "role": "user",
                "content": request.message,
            },
        ]
        
        # Call Azure OpenAI for completion with added parameters for better reliability and performance
        response = openai_client.chat.completions.create(
            model=deployment_name,
            messages=messages,
            temperature=0.7,
            max_tokens=800,
            n=1,  # Generate a single completion
            timeout=30,  # Add timeout for resilience
            stream=False,  # Don't stream responses
            presence_penalty=0.1,  # Slight penalty to avoid repetition
            frequency_penalty=0.1  # Slight penalty to avoid repetition
        )
        
        # Get the completion response
        completion = response.choices[0].message.content if response.choices else "I'm sorry, I couldn't generate a response."
        
        # Format response
        return {
            "message": {
                "id": str(int(datetime.now().timestamp() * 1000)),
                "type": "ai",
                "content": completion,
                "timestamp": datetime.now().isoformat()
            },
            "relevantDocuments": [
                {
                    "id": doc["id"],
                    "name": doc.get("title", "") or doc.get("filename", ""),
                    "url": f"#document-{doc['id']}",
                    "relevanceScore": doc.get("score", 0)
                } for doc in relevant_documents
            ]
        }
    except Exception as e:
        logger.error(f"Error processing chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
