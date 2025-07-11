# FastAPI Chat Backend for DND-SP

This folder contains a FastAPI backend that provides a chat completion API with RAG (Retrieval-Augmented Generation) capabilities. The API connects to Azure AI Search for document retrieval and Azure OpenAI for generating responses.

## Features

- Chat completion endpoint that accepts user messages and conversation history
- Integration with Azure AI Search to find relevant documents
- Integration with Azure OpenAI for generating contextual responses
- Support for RAG (Retrieval-Augmented Generation) pattern
- CORS support for frontend integration
- Health check endpoint

## Prerequisites

- Python 3.8 or higher
- Azure AI Search index with document chunks
- Azure OpenAI Service with GPT-4o-mini deployment

## Installation

1. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

2. Activate the virtual environment:
   - Windows: 
     ```
     venv\Scripts\activate
     ```
   - Linux/Mac: 
     ```
     source venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

Copy the values from your `local.settings.json` file to the `.env` file to configure the API:

```
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_INDEX_NAME=document-chunks
AZURE_SEARCH_API_KEY=your-search-api-key

AZURE_OPENAI_ENDPOINT=https://your-openai-service.openai.azure.com/
AZURE_OPENAI_API_KEY=your-openai-api-key
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
AZURE_OPENAI_COMPLETION_DEPLOYMENT=gpt-4o-mini
```

## Running the API

### Local Development

Run the API with hot-reloading:

```bash
# Linux/Mac
./start.sh

# Windows
start.bat
```

Or manually:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Using Docker

1. Build the Docker image:
   ```bash
   docker build -t dnd-sp-api .
   ```

2. Run the Docker container:
   ```bash
   docker run -p 8000:8000 --env-file .env dnd-sp-api
   ```

## API Documentation

Once the server is running, you can access the API documentation at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### POST /api/ChatCompletion

Generates a chat completion based on the user's message and conversation history.

**Request Body:**
```json
{
  "message": "What are the key performance parameters for training?",
  "conversation": [
    {
      "id": "1",
      "type": "ai",
      "content": "Hello! How can I assist you today?",
      "timestamp": "2025-07-10T12:00:00.000Z"
    },
    {
      "id": "2",
      "type": "user",
      "content": "Tell me about training documentation",
      "timestamp": "2025-07-10T12:01:00.000Z"
    }
  ],
  "courseId": "optional-course-id"
}
```

**Response:**
```json
{
  "message": {
    "id": "1625943661000",
    "type": "ai",
    "content": "Based on the reference documents, there are five principal attributes of training as Key Performance Parameters (KPPs):\n\n1. Proficiency level: Operators/maintainers/leaders perform tasks to standard x% of the time after training.\n\n2. Time to train: Operators/maintainers/leaders require no more than x [time in hours or days] to train to use the system capabilities properly.\n\n3. Training retention: Refresher training is required no more frequently than x [time interval] to maintain proficiency.\n\n4. Training support: Training requires appropriate resources to support effective training; specifically, x [defined in appropriate measurable terms such as amount of land, quantity of ammunition, amount of fuel/repair parts, cost of simulators/simulations, etc.]\n\n5. Training interoperability: System specific training capabilities are able to interoperate with and support collective training with existing LVC and gaming training environments.\n\n[Document 1] provides detailed information about these KPPs in Chapter 11.",
    "timestamp": "2025-07-10T12:02:00.000Z"
  },
  "relevantDocuments": [
    {
      "id": "3da1109acba73f9f0afe8ec8dc2e42c0-chunk-19",
      "name": "TP350-70-13",
      "url": "#document-3da1109acba73f9f0afe8ec8dc2e42c0-chunk-19",
      "relevanceScore": 0.95
    }
  ]
}
```

### GET /health

Health check endpoint to verify the API is running.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

## Integration with Frontend

The frontend makes API calls to the Next.js API route at `/api/ChatCompletion`, which proxies the request to this FastAPI backend. Make sure to set the `NEXT_PUBLIC_API_BASE_URL` environment variable in your frontend to point to this API server.
