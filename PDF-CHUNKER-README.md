# PDF Chunking Solution

This is a simple and robust solution for PDF chunking using Azure Functions. The solution takes PDF documents uploaded to the `students-tools` container in Azure Blob Storage, splits them into smaller chunks by page ranges, and stores the resulting chunks in the `students-tools-chunked` container for downstream indexing and LLM-based question answering.

## Features

- Automated PDF chunking triggered by blob storage events
- Configurable chunk size (number of pages per chunk)
- Page overlap between chunks to ensure context is maintained
- Metadata preservation for tracking and organization
- Azure Managed Identity for secure authentication

## Project Structure

- `src/functions/pdfchunker/PDFChunker.ts`: Main Azure Function for PDF chunking
- `scripts/test-simple-pdf-chunker.js`: Test script to validate the PDF chunking functionality

## Configuration

Update `local.settings.json` with the following settings:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "STORAGE_ACCOUNT_NAME": "<your-storage-account-name>",
    "PAGES_PER_CHUNK": "10",
    
    "AZURE_SEARCH_ENDPOINT": "https://<your-search-service>.search.windows.net",
    "AZURE_SEARCH_INDEX_NAME": "document-chunks",
    "AZURE_SEARCH_API_KEY": "<your-search-api-key>",
    
    "AZURE_OPENAI_ENDPOINT": "https://<your-openai-service>.openai.azure.com/",
    "AZURE_OPENAI_API_KEY": "<your-openai-api-key>",
    "AZURE_OPENAI_EMBEDDING_DEPLOYMENT": "text-embedding-ada-002",
    "AZURE_OPENAI_COMPLETION_DEPLOYMENT": "<your-completion-model-name>"
  }
}
```

## Getting Started

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `local.settings.json` file (copy from `local.settings.example.json`) and update with your Azure service details:
   ```bash
   cp local.settings.example.json local.settings.json
   ```

4. Update all placeholders in `local.settings.json`:
   - `<your-storage-account-name>` - Your Azure Storage account name
   - `<your-search-service>` - Your Azure AI Search service name
   - `<your-search-api-key>` - Your Azure AI Search API key
   - `<your-openai-service>` - Your Azure OpenAI service name
   - `<your-openai-api-key>` - Your Azure OpenAI API key
   - `<your-completion-model-name>` - Your Azure OpenAI completion model deployment name

5. Build the backend functions only:
   ```bash
   npm run build:backend
   ```

6. Start the Azure Functions runtime locally:
   ```bash
   npm start
   ```

7. Prepare a test PDF file in the `test-files` directory (create the directory if it doesn't exist):
   ```bash
   mkdir -p test-files
   # Copy a sample PDF file to test-files/sample.pdf
   ```

8. Run the test script to upload a PDF and test the chunking process:
   ```bash
   node scripts/test-simple-pdf-chunker.js
   ```

> **Note on Build Errors**: If you're seeing frontend-related build errors when running `npm run build`, use the `npm run build:backend` command instead. The initial phase focuses on the backend PDF processing functionality. We've configured a separate `tsconfig.backend.json` file that excludes frontend components.

## How It Works

### PDF Chunking Process
1. When a PDF is uploaded to the `students-tools` container, the Azure Function is triggered
2. The PDF is downloaded to a temporary location
3. The PDF is split into chunks based on the configured page ranges (default: 10 pages with 5-page overlap)
4. Each chunk is saved as a separate PDF file in the `students-tools-chunked` container
5. A JSON metadata file is created for each chunk with document details
6. The original PDF's metadata is updated to indicate it has been processed

### PDF Indexing Process
1. When a chunk metadata file is created in the `students-tools-chunked` container, the indexer function is triggered
2. The metadata is read and embeddings are generated using Azure OpenAI
3. The chunk with embeddings is indexed in Azure AI Search
4. The metadata file is updated with the embeddings information

## Next Steps

This proof of concept demonstrates basic PDF chunking functionality. For a more robust solution, consider adding:

1. Text extraction from each chunk
2. Semantic chunking based on document content
3. Integration with Azure AI Search for vector search capabilities
4. Additional document formats (Word, PowerPoint, etc.)
5. Error handling and retry logic
6. Monitoring and logging enhancements

## Testing

### Using the Test Script

The repository includes a test script that automates the process of uploading a sample PDF and verifying the chunking functionality:

```bash
node scripts/test-simple-pdf-chunker.js
```

The test script:
1. Connects to your Azure Storage account using the credentials in `local.settings.json`
2. Creates the required containers if they don't exist
3. Uploads a test PDF (from `test-files/sample.pdf`) to the `students-tools` container
4. Waits for the Azure Function to process the PDF
5. Checks the `students-tools-chunked` container for the resulting chunks
6. Outputs the results to the console

### Test Script Configuration

You can configure the test script by setting these environment variables:

- `STORAGE_ACCOUNT_NAME` - Override the storage account name from `local.settings.json`
- `TEST_PDF_PATH` - Specify a different test PDF (defaults to `test-files/sample.pdf`)
- `WAIT_TIME_MS` - Time to wait for function execution (defaults to 10000ms)

Example:
```bash
$env:TEST_PDF_PATH="path/to/your/test.pdf"
node scripts/test-simple-pdf-chunker.js
```

### Manual Testing

You can also manually test the function by:
1. Uploading a PDF to the `students-tools` container via Azure Portal or Azure Storage Explorer
2. Monitoring the function logs to see processing events
3. Checking the `students-tools-chunked` container for output files

## Azure Services Required

To use this solution, you'll need the following Azure services:

1. **Azure Storage Account** - For storing PDFs and chunked files
2. **Azure Functions** - For running the PDF processing code
3. **Azure AI Search** (formerly known as Azure Cognitive Search) - For indexing and searching the PDF content
4. **Azure OpenAI Service** - For generating embeddings and handling AI-based queries

### Local Development Prerequisites

1. Node.js 18 or higher
2. Azure Functions Core Tools v4
3. Azure CLI or Azure Portal access
4. Visual Studio Code with Azure Functions extension (recommended)
5. Azurite (for local storage emulation) - Can be installed as a VS Code extension or standalone

### Running Azure Functions Locally

To run the Azure Functions locally:

1. Start Azurite (local storage emulator):
   ```bash
   # If installed via npm
   npx azurite --silent --location c:\azurite --debug c:\azurite\debug.log
   
   # Or use the VS Code Azurite extension
   ```

2. Build the backend:
   ```bash
   npm run build:backend
   ```

3. Start the Functions runtime:
   ```bash
   npm start
   ```

4. The terminal will display URLs for your local functions, typically:
   ```
   Functions:
       PDFChunker: [GET,POST] http://localhost:7071/api/PDFChunker
       PDFIndexer: [GET,POST] http://localhost:7071/api/PDFIndexer
   ```

## Full Project Structure

```
.
├── dist/                      # Compiled JavaScript output
├── scripts/                   # Utility and test scripts
│   └── test-simple-pdf-chunker.js  # Test script for PDF chunking
├── src/
│   ├── functions/             # Azure Functions
│   │   ├── pdfchunker/        # PDF chunking function
│   │   │   └── PDFChunker.ts  # Main chunking logic
│   │   ├── indexing/          # PDF indexing function
│   │   │   └── PDFIndexer.ts  # Indexing logic
│   │   └── services/          # Shared services
│   │       └── utils/         # Utility functions
│   └── models/                # Shared data models
│       └── DocumentChunk.ts   # Document chunk model
├── test-files/                # Sample PDFs for testing
├── local.settings.json        # Local settings (not committed to git)
├── local.settings.example.json # Example settings file
├── host.json                  # Azure Functions host configuration
├── package.json               # Project dependencies
├── tsconfig.json              # TypeScript configuration
└── tsconfig.backend.json      # Backend-only TypeScript configuration
```

## Deploying to Azure

To deploy this solution to Azure:

1. Create the required Azure resources:
   - Azure Storage Account with two containers: `students-tools` and `students-tools-chunked`
   - Azure Functions App (Node.js runtime)
   - Azure AI Search service
   - Azure OpenAI service with embedding model deployed

2. Deploy the Functions App:

   ```bash
   # Login to Azure
   az login

   # Set your subscription
   az account set --subscription <your-subscription-id>

   # Deploy the function app
   func azure functionapp publish <your-function-app-name>
   ```

3. Configure the Function App settings in Azure Portal with the same environment variables from your local.settings.json

4. Assign a managed identity to the Function App and grant it access to the Storage Account, Azure AI Search, and Azure OpenAI service

## Troubleshooting

### Common Issues

1. **Build Errors**:
   - If you see frontend build errors, use `npm run build:backend` instead
   - Check that all required npm packages are installed with `npm install`

2. **Storage Authentication**:
   - Verify your storage account name is correct in the settings
   - For local development with Azurite, set `AzureWebJobsStorage` to `UseDevelopmentStorage=true`
   - For Azure deployment, ensure proper managed identity permissions

3. **PDF Processing**:
   - Ensure test PDFs are valid and readable
   - Check Azure Function logs for detailed error messages
   - Verify the `PAGES_PER_CHUNK` setting is appropriate for your PDFs

4. **Azure AI Search Issues**:
   - Confirm the search index exists and has the correct schema
   - Verify the search endpoint and API key are correct
   - Check that the Azure Function has proper access to the search service

### Blob Trigger Not Firing

If you've uploaded a PDF to the `students-tools` container but the PDF chunker function isn't running:

1. **Check Function Registration**: 
   - Make sure the function is properly registered in your `src/functions/pdfchunker/PDFChunker.ts` file with the correct blob trigger path:

   ```typescript
   app.storageBlob('PDFChunker', {
     path: 'students-tools/{name}',
     connection: 'AzureWebJobsStorage',
     handler: pdfChunkerFunction
   });
   ```

2. **Verify Local Storage Emulation**:
   - Ensure Azurite is running correctly if testing locally
   - Check that the storage connection string in `local.settings.json` is correct
   - Try restarting Azurite and the Functions runtime

3. **Use the Test Script**:
   - Run the test script which handles the upload and validation:
   ```bash
   node scripts/test-simple-pdf-chunker.js
   ```

4. **Manually Check Container**:
   - Use Azure Storage Explorer or the Azure Portal to verify your PDF was correctly uploaded to the `students-tools` container

5. **Review Function Logs**:
   - Check the function logs during upload for any errors
   - Look for message like: `Executing 'Functions.PDFChunker' (Reason='New blob detected...`

6. **Check Extension Bundle**:
   - Ensure `host.json` has the correct extension bundle configuration for blob triggers

# Testing with a Real Azure Storage Account

When testing with a real Azure Storage account (not using the Azurite emulator):

1. Get your storage account key from the Azure Portal under your storage account's "Access keys" section

2. Update your `local.settings.json` file with the full connection string:
   ```json
   "AzureWebJobsStorage": "DefaultEndpointsProtocol=https;AccountName=dndblobpoc;AccountKey=YOUR_STORAGE_ACCOUNT_KEY_HERE;EndpointSuffix=core.windows.net",
   ```

3. Make sure your user (DefaultAzureCredential) has proper permissions to access the storage account, or use a SAS token or connection string with the account key.

4. Create both containers in your storage account:
   - `students-tools` - For uploading original PDFs
   - `students-tools-chunked` - For the chunked output files

5. Rebuild the function and restart it:
   ```bash
   npm run build:backend && npm start
   ```

6. Run the test script to upload a sample PDF:
   ```bash
   node scripts/test-simple-pdf-chunker.js
   ```

## Troubleshooting Connection Issues

If you're getting authentication errors like "This request is not authorized to perform this operation", check:

1. Your storage account key is correctly entered in the connection string
2. Your Azure login credentials have access to the storage account
3. The storage account exists and is accessible
4. Both required containers exist in the storage account

For local development, you can also use Azurite (the local emulator) instead of a real storage account by setting:
```json
"AzureWebJobsStorage": "UseDevelopmentStorage=true"
```
