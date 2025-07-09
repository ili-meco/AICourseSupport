# PDF Chunking Solution

This is a simple and robust solution for PDF chunking using Azure Functions. The solution takes PDF documents uploaded to the `student-tools` container in Azure Blob Storage, splits them into smaller chunks by page ranges, and stores the resulting chunks in the `student-tools-chunked` container for downstream indexing and LLM-based question answering.

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
    "PAGES_PER_CHUNK": "10"
  }
}
```

## Getting Started

1. Clone this repository
2. Install dependencies: `npm install`
3. Update `local.settings.json` with your Azure Storage account name
4. Build the project: `npm run build`
5. Start the function locally: `npm start`
6. Run the test script: `node scripts/test-simple-pdf-chunker.js`

## How It Works

1. When a PDF is uploaded to the input container, the Azure Function is triggered
2. The PDF is downloaded to a temporary location
3. The PDF is split into chunks based on the configured page ranges
4. Each chunk is saved as a separate PDF file in the output container
5. Metadata is added to each chunk to track its relationship to the original document
6. The original PDF's metadata is updated to indicate it has been processed

## Next Steps

This proof of concept demonstrates basic PDF chunking functionality. For a more robust solution, consider adding:

1. Text extraction from each chunk
2. Semantic chunking based on document content
3. Integration with Azure AI Search for vector search capabilities
4. Additional document formats (Word, PowerPoint, etc.)
5. Error handling and retry logic
6. Monitoring and logging enhancements

## Testing

Use the included test script to upload a sample PDF and verify the chunking functionality:

```bash
node scripts/test-simple-pdf-chunker.js
```

This will:
- Upload a test PDF to your Azure Storage account
- Trigger the PDF chunking function
- Check for resulting chunks in the output container
