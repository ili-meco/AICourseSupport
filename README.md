# AI Course Support System

An AI-powered educational assistant that processes course materials and provides intelligent tutoring through a retrieval-augmented generation (RAG) system. The system automatically processes PDF documents, creates searchable indexes, and provides contextual answers with document citations.

## Architecture Overview

This system consists of three main components:

1. **Document Processing Pipeline** (Azure Functions)
   - PDF chunking and text extraction
   - Vector embedding generation
   - Azure AI Search indexing

2. **AI Chat Backend** (FastAPI)
   - RAG implementation with Azure OpenAI
   - Semantic search across documents
   - Educational prompt engineering

3. **Frontend Interface** (Next.js)
   - Chat interface for student interactions
   - Document reference display
   - Course material navigation

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or later
- Azure subscription with the following services:
  - Azure Functions
  - Azure Blob Storage
  - Azure AI Search
  - Azure OpenAI
- Python 3.9+ (for FastAPI backend)

### 1. Azure Services Setup

#### Required Azure Resources:
```bash
# Create resource group
az group create --name ai-course-support --location eastus

# Create storage account
az storage account create --name <storage-name> --resource-group ai-course-support --location eastus --sku Standard_LRS

# Create Azure AI Search service
az search service create --name <search-name> --resource-group ai-course-support --location eastus --sku Basic

# Create Azure OpenAI service
az cognitiveservices account create --name <openai-name> --resource-group ai-course-support --location eastus --kind OpenAI --sku S0
```

#### Required Blob Storage Containers:
- `students-tools` (for original PDF uploads)
- `students-tools-chunked` (for processed document chunks)

### 2. Backend Setup (FastAPI)

```bash
# Navigate to API directory
cd src/api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your Azure credentials
cp .env.example .env
# Edit .env with your Azure service credentials

# Start the FastAPI server
python main.py
```

### 3. Azure Functions Setup

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Install dependencies
npm install

# Copy and configure local settings
cp local.settings.example.json local.settings.json
# Edit local.settings.json with your Azure credentials

# Start functions locally
npm start
```

### 4. Frontend Setup (Next.js)

```bash
# Navigate to frontend directory
cd src/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📋 Required Environment Variables

### Azure Functions (`local.settings.json`)
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "<storage-connection-string>",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_SEARCH_ENDPOINT": "https://<search-name>.search.windows.net",
    "AZURE_SEARCH_API_KEY": "<search-admin-key>",
    "AZURE_SEARCH_INDEX_NAME": "document-chunks",
    "AZURE_OPENAI_ENDPOINT": "https://<openai-name>.openai.azure.com",
    "AZURE_OPENAI_API_KEY": "<openai-api-key>",
    "AZURE_OPENAI_EMBEDDING_DEPLOYMENT": "text-embedding-ada-002",
    "PAGES_PER_CHUNK": "10"
  }
}
```

### FastAPI Backend (`src/api/.env`)
```env
AZURE_SEARCH_ENDPOINT=https://<search-name>.search.windows.net
AZURE_SEARCH_API_KEY=<search-admin-key>
AZURE_SEARCH_INDEX_NAME=document-chunks
AZURE_OPENAI_ENDPOINT=https://<openai-name>.openai.azure.com
AZURE_OPENAI_API_KEY=<openai-api-key>
AZURE_OPENAI_COMPLETION_DEPLOYMENT=gpt-4o-mini
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (`src/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🔧 Key Components

### 1. PDF Chunking Function (`src/functions/pdfchunker/PDFChunker.ts`)
- **Trigger**: Blob storage events when PDFs are uploaded
- **Process**: Splits PDFs into overlapping chunks, extracts text
- **Output**: Chunked PDFs and metadata in separate container

### 2. Document Indexing Function (`src/functions/indexing/PDFIndexer.ts`)
- **Trigger**: Blob storage events for chunked documents
- **Process**: Generates embeddings, creates search index
- **Dependencies**: Embeddings Generator, Search Index Manager

### 3. Chat API (`src/api/main.py`)
- **Endpoints**: `/api/ChatCompletion`, `/health`
- **Features**: RAG with Azure AI Search, educational prompt engineering
- **Response**: AI answers with document citations

### 4. Frontend Interface (`src/frontend/`)
- **Components**: Chat interface, document panel, navigation
- **Features**: Real-time chat, document references, course selection

## 📁 Project Structure

```
├── src/
│   ├── functions/                    # Azure Functions
│   │   ├── pdfchunker/              # PDF processing
│   │   │   └── PDFChunker.ts        # Main chunking function
│   │   ├── indexing/                # Document indexing
│   │   │   └── PDFIndexer.ts        # Indexing function
│   │   └── services/                # Shared services
│   │       ├── indexing/            # Search and embedding services
│   │       └── utils/               # Utility functions
│   ├── api/                         # FastAPI backend
│   │   ├── main.py                  # Main API application
│   │   ├── requirements.txt         # Python dependencies
│   │   └── .env                     # Environment variables
│   ├── frontend/                    # Next.js frontend
│   │   ├── app/                     # App router pages
│   │   ├── components/              # React components
│   │   ├── lib/                     # Utilities and services
│   │   └── package.json             # Frontend dependencies
│   └── models/                      # Shared TypeScript models
├── host.json                        # Function app configuration
├── local.settings.json              # Local development settings
├── package.json                     # Function dependencies
└── README.md                        # This file
```

## 🔄 Data Flow

1. **Document Upload**: PDFs uploaded to `students-tools` container
2. **Chunking**: Azure Function processes PDFs into chunks
3. **Indexing**: Another Function creates embeddings and search index
4. **Query**: User asks question through web interface
5. **Search**: System performs hybrid search on indexed content
6. **Generate**: Azure OpenAI generates response using retrieved documents
7. **Display**: Response shown with document citations

## 🚀 Deployment

### Azure Functions Deployment
```bash
# Build and deploy functions
npm run build
func azure functionapp publish <your-function-app-name>
```

### FastAPI Deployment (Azure Container Instances)
```bash
# Build Docker image
docker build -t ai-course-api src/api/

# Deploy to Azure Container Instances
az container create --resource-group ai-course-support --name ai-course-api --image ai-course-api --cpu 1 --memory 2 --port 8000
```

### Frontend Deployment (Azure Static Web Apps)
```bash
# Build frontend
cd src/frontend
npm run build

# Deploy to Azure Static Web Apps
az staticwebapp create --name ai-course-frontend --resource-group ai-course-support --source . --branch main --app-location "src/frontend" --output-location ".next"
```

## 🔍 Usage

1. **Upload Documents**: Place PDF course materials in the `students-tools` blob container
2. **Wait for Processing**: Functions automatically chunk and index documents
3. **Start Chatting**: Use the web interface to ask questions about course content
4. **Review References**: Check document citations provided with each response

## 🛠️ Customization

### Adding New Document Types
- Modify `PDFChunker.ts` to handle additional file formats
- Update text extraction logic in the chunking function

### Adjusting Chunk Size
- Change `PAGES_PER_CHUNK` environment variable
- Rebuild and redeploy functions

### Modifying AI Behavior
- Edit the system prompt in `src/api/main.py`
- Adjust OpenAI parameters (temperature, max_tokens)

## 📊 Monitoring

- **Function Logs**: View in Azure Portal or Application Insights
- **API Health**: Check `/health` endpoint
- **Search Performance**: Monitor Azure AI Search metrics
- **OpenAI Usage**: Track token consumption in Azure OpenAI

## 🔧 Troubleshooting

### Common Issues

1. **Functions not triggering**: Check blob storage connection strings
2. **Search returning no results**: Verify index exists and has data
3. **OpenAI errors**: Check API key and deployment names
4. **Frontend not connecting**: Verify API URL in environment variables

### Debug Commands
```bash
# Check function logs
func start --verbose

# Test API health
curl http://localhost:8000/health

# Check search index
curl -H "api-key: <search-key>" "https://<search-name>.search.windows.net/indexes/document-chunks?api-version=2023-11-01"
```

## 📝 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Azure service logs
3. Verify all environment variables are set correctly
4. Ensure all required Azure services are running

## 🔄 Version History

- **v1.0.0**: Initial release with PDF processing, RAG chat, and web interface
- **Current**: Enhanced error handling, improved document citations, markdown support
