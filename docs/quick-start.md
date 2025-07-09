# Quick Start Guide

This guide will help you get started with the semantic chunking and indexing pipeline for the Azure AI-powered assistant.

## Prerequisites

- Azure subscription
- Azure Storage Account
- Azure AI Search Service
- Azure OpenAI Service with embedding model deployment
- Node.js 18+ and npm
- Azure Functions Core Tools v4

## Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd DND-SP
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `local.settings.json` file in the project root with the following content:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "STORAGE_ACCOUNT_NAME": "<your-storage-account-name>",
    "ORIGINAL_CONTAINER_NAME": "original-documents",
    "SEARCH_SERVICE_ENDPOINT": "https://<your-search-service>.search.windows.net",
    "SEARCH_INDEX_NAME": "defense-document-chunks",
    "OPENAI_ENDPOINT": "https://<your-openai-service>.openai.azure.com",
    "OPENAI_EMBEDDING_DEPLOYMENT": "<embedding-model-deployment-name>"
  }
}
```

4. **Build the project**

```bash
npm run build
```

## Running Locally

1. **Start the Azure Functions runtime**

```bash
npm start
```

2. **Upload a test document**

Place a test document (PDF, DOCX, etc.) in the `test-files` directory and run:

```bash
pwsh .\scripts\run-tests.ps1
```

This will:
- Upload the test document to your Azure Storage account
- Trigger the document processing function
- Monitor the processing status
- Check if the document chunks were indexed correctly

## Monitoring

You can monitor the processing status of a document by:

1. Checking the blob metadata in Azure Storage Explorer
2. Looking at the Azure Function logs
3. Querying the Azure AI Search index

## Troubleshooting

If you encounter issues:

1. **Check Azure Function logs**
   - Look for error messages and stack traces

2. **Verify environment variables**
   - Ensure all required environment variables are set correctly

3. **Check blob metadata**
   - Blob metadata contains processing status and error details

4. **Verify Azure permissions**
   - Ensure the function app has proper permissions to access Storage, AI Search, and OpenAI

## Next Steps

- Customize chunking parameters in `AdaptiveChunkingService`
- Add support for additional document formats
- Implement additional chunking strategies
- Optimize vector search parameters
