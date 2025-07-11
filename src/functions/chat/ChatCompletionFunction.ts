/**
 * Chat Completion Function
 * Handles chat completion requests with integration to Azure AI Search for RAG capabilities
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { SearchClient, AzureKeyCredential as SearchAzureKeyCredential } from "@azure/search-documents";

// Dynamic import for OpenAI as it's an ESM module
let OpenAIClient: any;
let AzureKeyCredential: any;

async function importOpenAI() {
  const openai = await import("@azure/openai");
  OpenAIClient = openai.OpenAIClient;
  AzureKeyCredential = openai.AzureKeyCredential;
}

// Define interfaces
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionRequest {
  message: string;
  conversation: any[]; // Previous messages
  courseId?: string;
}

interface RelevantDocument {
  id: string;
  content: string;
  title: string;
  filename: string;
  score: number;
}

/**
 * Main handler function for chat completion requests
 */
async function chatCompletionHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log("Chat Completion function processing request");
    
    // Import OpenAI dynamically
    await importOpenAI();

    // Get request body
    const requestBody = await request.json() as ChatCompletionRequest;
    const { message, conversation } = requestBody;

    if (!message) {
      return {
        status: 400,
        body: JSON.stringify({
          error: "Message is required",
        }),
      };
    }

    // Get configuration from environment variables
    const openAiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const openAiApiKey = process.env.AZURE_OPENAI_API_KEY;
    const openAiDeployment = process.env.AZURE_OPENAI_COMPLETION_DEPLOYMENT || "gpt-4o-mini";

    const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const searchApiKey = process.env.AZURE_SEARCH_API_KEY;
    const searchIndexName = process.env.AZURE_SEARCH_INDEX_NAME || "document-chunks";

    if (!openAiEndpoint || !openAiApiKey) {
      return {
        status: 500,
        body: JSON.stringify({
          error: "Missing OpenAI configuration",
        }),
      };
    }

    if (!searchEndpoint || !searchApiKey) {
      return {
        status: 500,
        body: JSON.stringify({
          error: "Missing Search configuration",
        }),
      };
    }

    // Initialize OpenAI client
    const openAiClient = new OpenAIClient(
      openAiEndpoint,
      new AzureKeyCredential(openAiApiKey)
    );

    // Initialize Search client
    const searchClient = new SearchClient(
      searchEndpoint,
      searchIndexName,
      new SearchAzureKeyCredential(searchApiKey)
    );

    // Perform semantic search to find relevant documents
    const relevantDocuments = await performSearch(searchClient, message, context);

    // Format relevant documents as context for the AI
    let documentContext = "";
    if (relevantDocuments.length > 0) {
      documentContext = "### Reference Information:\n\n";
      relevantDocuments.forEach((doc, index) => {
        documentContext += `[Document ${index + 1}] ${doc.title || doc.filename}\n${doc.content}\n\n`;
      });
    }

    // Convert previous conversation to OpenAI format
    const previousMessages: ChatMessage[] = conversation
      .filter((msg: any) => msg.type === "user" || msg.type === "ai")
      .map((msg: any) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content,
      }));

    // Build the messages array
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are an AI assistant for defense strategy and training materials. You help users understand defense concepts, tactics, and procedures.
        
When the user asks a question, use the provided reference documents to give accurate and helpful answers. Always cite your sources by referring to the document numbers provided.

If the reference documents don't contain relevant information to answer the user's question, acknowledge that and offer general assistance based on your knowledge, but clearly state that you don't have specific information about that in the provided documents.

${documentContext}`
      },
      ...previousMessages,
      {
        role: "user",
        content: message,
      },
    ];

    // Call Azure OpenAI for completion
    const result = await openAiClient.getChatCompletions(openAiDeployment, messages, {
      temperature: 0.7,
      maxTokens: 800,
    });

    // Get the completion response
    const completion = result.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // Format response
    const response = {
      message: {
        id: Date.now().toString(),
        type: "ai",
        content: completion,
        timestamp: new Date().toISOString()
      },
      relevantDocuments: relevantDocuments.map(doc => ({
        id: doc.id,
        name: doc.title || doc.filename,
        url: `#document-${doc.id}`,
        relevanceScore: doc.score
      }))
    };

    return {
      status: 200,
      jsonBody: response,
      headers: {
        "Content-Type": "application/json"
      }
    };
  } catch (error: any) {
    context.error(`Error in chat completion: ${error.message}`);
    return {
      status: 500,
      body: JSON.stringify({
        error: `Error processing chat: ${error.message}`,
      }),
    };
  }
}

/**
 * Perform semantic search on the Azure AI Search index
 */
async function performSearch(
  searchClient: SearchClient<any>,
  query: string,
  context: InvocationContext
): Promise<RelevantDocument[]> {
  try {
    // Perform simple keyword search instead of semantic search
    // as semantic search requires additional configuration
    const searchResults = await searchClient.search(query, {
      select: ["id", "content", "title", "filename", "documentId"],
      top: 3, // Limit to top 3 most relevant results
      includeTotalCount: true
    });

    const documents: RelevantDocument[] = [];

    for await (const result of searchResults.results) {
      documents.push({
        id: result.document.id as string,
        content: result.document.content as string,
        title: result.document.title as string || "",
        filename: result.document.filename as string || "",
        score: result.score || 0
      });
    }

    return documents;
  } catch (error: any) {
    context.log(`Error in search: ${error.message}`);
    // Return empty array on error
    return [];
  }
}

// Register the HTTP trigger with Azure Functions
app.http("chatCompletion", {
  methods: ["POST"],
  route: "ChatCompletion",
  authLevel: "anonymous", // Consider changing to "function" for production
  handler: chatCompletionHandler
});
