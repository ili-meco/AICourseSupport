# Customer Integration Guide
## Connecting Your Systems to the AI Course Support System

This guide provides high-level integration concepts for connecting your existing frontend and Express.js backend to our AI Course Support System.

## 🏗️ Integration Architecture

```
Your Frontend (React/Vue/Angular)
         ↓ HTTP Requests
Your Express.js Backend
         ↓ HTTP Requests
AI Course Support FastAPI (Port 8000)
         ↓ Search Queries
Azure AI Search + Azure OpenAI
```

## 📋 Required Azure Services

To integrate with our system, you'll need these Azure services configured:

### Core Services
1. **Azure Blob Storage** - Document storage and processing pipeline
2. **Azure AI Search** - Vector search and document indexing
3. **Azure OpenAI** - Language model and embeddings generation
4. **Azure Functions** - Automated document processing (optional)

### Storage Containers
Your Azure Storage Account needs these containers:
- `students-tools` - Upload location for original PDF documents
- `students-tools-chunked` - Processed document chunks (auto-created)

## 🔧 Integration Approach

### Option 1: Backend-to-Backend Integration (Recommended)
Your Express.js backend calls our FastAPI service as a microservice.

**Key Integration Points:**
- **HTTP Client**: Use axios, node-fetch, or similar to call our API
- **Endpoint**: `POST /api/ChatCompletion` for chat interactions
- **Health Check**: `GET /health` for service monitoring
- **Base URL**: Configure our FastAPI URL in your environment variables

**Your Express.js Backend Tasks:**
1. Create a service module to handle communication with our API
2. Add routes that accept requests from your frontend
3. Transform your frontend requests to match our API format
4. Handle responses and error scenarios
5. Implement proper logging and monitoring

### Option 2: Frontend Direct Integration
Your frontend communicates directly with our FastAPI service.

**Key Integration Points:**
- **CORS**: We'll configure our API to accept requests from your domain
- **HTTP Requests**: Standard fetch/axios calls to our endpoints
- **Error Handling**: Implement proper error boundaries and user feedback
- **Authentication**: Handle any API keys or tokens as needed

## 📊 API Interface

### Request Format to Our FastAPI
```json
{
  "message": "What are the key performance parameters?",
  "conversation": [
    {
      "id": "1",
      "type": "user", 
      "content": "Previous user message",
      "timestamp": "2024-01-01T10:00:00Z"
    }
  ],
  "courseId": "course-identifier" // Optional
}
```

### Response Format from Our FastAPI
```json
{
  "message": {
    "id": "3",
    "type": "ai",
    "content": "The key performance parameters include...",
    "timestamp": "2024-01-01T10:01:00Z"
  },
  "relevantDocuments": [
    {
      "id": "doc-123",
      "name": "Document Title",
      "url": "#document-doc-123",
      "relevanceScore": 0.95
    }
  ]
}
```

## 💾 Document Management Integration

### Document Upload Workflow
1. **Your System**: Upload PDFs to Azure Blob Storage (`students-tools` container)
2. **Our Functions**: Automatically process and chunk documents 
3. **Our Indexing**: Create searchable embeddings in Azure AI Search
4. **Your Chat**: Documents become available for AI responses

### Key Integration Points:
- **Azure Storage SDK**: Use Azure SDK to upload documents programmatically
- **Blob Triggers**: Our Azure Functions automatically process new uploads
- **Processing Time**: Allow 2-5 minutes for documents to be fully indexed
- **Status Monitoring**: Check Azure AI Search index for document availability
```

## 🚀 Deployment Scenarios

### Scenario 1: All Services Separate
```
Your Frontend (Vercel/Netlify) 
    ↓
Your Express.js Backend (Heroku/Azure App Service)
    ↓  
AI FastAPI (Azure Container Apps)
    ↓
Azure Services (Storage, Search, OpenAI)
```

### Scenario 2: Co-located Backend
```
Your Frontend + Express.js Backend (Azure App Service)
    ↓
AI FastAPI (Azure Container Apps) 
    ↓
Azure Services (Storage, Search, OpenAI)
```

## 🔐 Security and Configuration

### CORS Configuration
We'll update our FastAPI CORS settings to include your domains:
```python
# We'll configure these origins in our main.py
origins = [
    "https://your-frontend-domain.com",
    "https://your-backend-domain.com"
]
```

### Environment Variables You'll Need
```env
# Your application configuration
AI_COURSE_API_URL=https://your-fastapi-deployment-url.com
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection-string
```

### Authentication Considerations
- **API Keys**: If needed, we can implement API key authentication
- **Azure AD**: Integration with Azure Active Directory for enterprise scenarios
- **Rate Limiting**: Built-in rate limiting for API protection

## 📁 Azure Functions Integration

### What Our Functions Do
1. **PDF Chunker**: Splits uploaded PDFs into manageable chunks
2. **Document Indexer**: Creates vector embeddings and search indexes
3. **Automatic Processing**: Triggered by blob storage events

### How They Work with Your System
- **Upload Trigger**: When you upload to `students-tools`, chunking starts automatically
- **Processing Pipeline**: Documents go through chunking → embedding → indexing
- **No Direct Integration Needed**: Functions work behind the scenes
- **Monitoring**: Check Azure Function logs for processing status

### Alternative Integration
If you prefer not to use our Azure Functions:
- **Custom Processing**: Implement your own document chunking logic
- **Direct API Calls**: Send processed chunks directly to our indexing endpoints
- **Batch Processing**: Upload multiple documents and process in batches

## � Deployment Architecture Options

### Option A: Microservices Architecture
```
Your Frontend (Your hosting choice)
    ↓
Your Express.js Backend (Your hosting choice)
    ↓  
Our AI FastAPI (Azure Container Apps)
    ↓
Azure Services (Storage, Search, OpenAI, Functions)
```

### Option B: Hybrid Integration
```
Your Complete Application Stack
    ↓
Our AI FastAPI + Azure Functions (As a service)
    ↓
Shared Azure Services
```

## 🔍 Testing and Monitoring

### Health Check Integration
- **Endpoint**: `GET /health` returns service status
- **Integration**: Call from your monitoring systems
- **Response**: JSON status with version information

### Logging Strategy
- **Your Logs**: Track requests to our API
- **Our Logs**: We log processing and response details
- **Azure Monitoring**: Application Insights for full system monitoring

### Error Handling
- **HTTP Status Codes**: Standard REST API error responses
- **Timeout Handling**: Configure appropriate timeouts (30+ seconds recommended)
- **Retry Logic**: Implement exponential backoff for transient failures

## 🧪 Integration Testing

### API Testing Approaches
- **Unit Tests**: Test your service modules that call our API
- **Integration Tests**: End-to-end testing with our deployed service
- **Load Testing**: Verify performance under expected load
- **Health Monitoring**: Regular health check calls

### Test Scenarios
1. **Basic Chat**: Send simple message, verify AI response
2. **Document Context**: Upload document, test if it appears in responses
3. **Error Handling**: Test network failures, invalid requests
4. **Conversation Flow**: Test multi-turn conversations

## 🚨 Common Integration Issues

### Connection Issues
- **Network Timeouts**: Increase timeout values (30+ seconds)
- **CORS Errors**: Ensure we've added your domain to our allowed origins
- **SSL/TLS**: Verify secure connections in production

### Document Processing Issues  
- **Upload Failures**: Check Azure Storage connection and permissions
- **Processing Delays**: Allow 2-5 minutes for document indexing
- **Format Support**: Currently supports PDF files only

### API Response Issues
- **Empty Responses**: May indicate no relevant documents found
- **Rate Limiting**: Implement retry logic with exponential backoff
- **Authentication**: Verify API keys and authentication tokens

## 📞 Integration Support

### Getting Started
1. **Review Requirements**: Ensure you have the required Azure services
2. **Environment Setup**: Configure connection strings and API endpoints  
3. **Basic Integration**: Start with simple health check and chat API calls
4. **Document Upload**: Test document processing pipeline
5. **Production Deployment**: Scale and secure for production use

### Technical Support
- **Service Health**: Monitor our API status and Azure service availability
- **Documentation**: Refer to our main README for detailed setup instructions
- **Troubleshooting**: Check logs and verify configuration before escalating

## 📋 Integration Checklist

### Pre-Integration Setup
- [ ] Azure services provisioned (Storage, AI Search, OpenAI)
- [ ] Storage containers created (`students-tools`, `students-tools-chunked`)
- [ ] Our FastAPI service deployed and accessible
- [ ] Azure Functions deployed for document processing

### Your Application Changes
- [ ] HTTP client library installed (axios, fetch, etc.)
- [ ] Service module created to call our API
- [ ] Routes/endpoints added to handle chat requests
- [ ] Document upload capability integrated with Azure Storage
- [ ] Error handling and logging implemented
- [ ] Environment variables configured

### Testing and Go-Live
- [ ] Basic API connectivity tested
- [ ] Document upload and processing verified
- [ ] Chat functionality working end-to-end
- [ ] Performance and load testing completed
- [ ] Security and CORS configuration verified
- [ ] Monitoring and alerting in place

## 🔗 Next Steps

1. **Architecture Review**: Discuss which integration option fits your needs
2. **Azure Setup**: Provision required Azure services
3. **Basic Integration**: Implement health check and simple chat calls
4. **Document Pipeline**: Test document upload and processing
5. **Production Ready**: Security, monitoring, and performance optimization

For detailed technical implementation, refer to our main [README.md](./README.md) and [PRODUCTION-DEPLOYMENT-GUIDE.md](./PRODUCTION-DEPLOYMENT-GUIDE.md).
