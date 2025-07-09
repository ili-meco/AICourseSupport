# Document Processing Pipeline Documentation

## Overview

This document provides an overview of the Azure AI-powered semantic chunking and indexing pipeline. The system extracts content from various document types, semantically chunks the content, generates vector embeddings, and indexes the chunks in Azure AI Search for optimal retrieval by large language models (LLMs).

## Architecture

The pipeline consists of several modular components:

1. **Document Extraction**: Extracts text content from various document formats (PDF, DOCX, etc.)
2. **Semantic Chunking**: Breaks down large documents into semantically meaningful chunks
3. **Embedding Generation**: Creates vector embeddings for each chunk
4. **Search Indexing**: Indexes chunks in Azure AI Search with vector search capabilities

## Components

### Document Extraction (`ContentExtractionService`)

- Handles extraction from multiple file formats
- Preserves document structure where possible
- Extracts metadata from documents

Supported Formats:
- PDF (using `pdf-parse`)
- Word Documents (using `mammoth`)
- Excel Spreadsheets (using `exceljs`)
- Plain Text
- HTML (using `cheerio`)

### Semantic Chunking (`AdaptiveChunkingService`)

Uses different chunking strategies based on content type:
- `TextChunker`: For plain text, splits based on semantic boundaries
- `StructuredDocumentChunker`: Handles structured documents with headings and sections
- `TableChunker`: Special handling for tabular data

The chunking process preserves:
- Document hierarchy
- Tables
- Lists
- Other important structural elements

### Embedding Generation (`EmbeddingsGenerator`)

- Uses Azure OpenAI Service to generate vector embeddings
- Implements batch processing for efficiency
- Handles rate limiting and retries

### Search Indexing (`SearchIndexManager` & `SearchDataIndexer`)

- Creates and manages the Azure AI Search index with vector search capabilities
- Efficiently uploads document chunks with their embeddings
- Handles document updates and deletions

## Data Models

### Document

```typescript
interface Document {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  url?: string;
  blobName: string;
  fileType: string;
  fileSize: number;
  pageCount?: number;
  author?: string;
  createdDate?: string;
  modifiedDate?: string;
  classification?: string;
  publicationNumber?: string;
  revisionNumber?: string;
  processingStatus: 'pending' | 'processing' | 'complete' | 'error';
  errorDetails?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}
```

### DocumentChunk

```typescript
interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  contentVector?: number[];
  title?: string;
  courseId: string;
  courseTitle?: string;
  chunkType?: 'text' | 'table' | 'list' | 'heading' | 'other';
  chunkIndex: number;
  pageNumber?: number;
  offset?: number;
  length?: number;
  filepath?: string;
  metadata?: Record<string, any>;
}
```

## Workflow

1. A document is uploaded to Azure Blob Storage
2. The Azure Function (`ProcessDocument`) is triggered
3. Document content is extracted based on file type
4. Content is chunked using appropriate chunking strategies
5. Embeddings are generated for each chunk
6. Chunks are indexed in Azure AI Search
7. Document metadata is updated with processing status

## Configuration

The pipeline is configured using environment variables:

```
STORAGE_ACCOUNT_NAME=<your-storage-account>
ORIGINAL_CONTAINER_NAME=original-documents
SEARCH_SERVICE_ENDPOINT=https://<your-search-service>.search.windows.net
SEARCH_INDEX_NAME=defense-document-chunks
OPENAI_ENDPOINT=https://<your-openai-service>.openai.azure.com
OPENAI_EMBEDDING_DEPLOYMENT=<embedding-model-deployment>
```

## Error Handling

The pipeline implements comprehensive error handling:

- Retries for transient errors (network, rate limiting)
- Detailed error logging
- Error status and messages are stored in blob metadata
- Failed documents can be reprocessed

## Testing

A test script (`scripts/test-pipeline.js`) is provided to validate the end-to-end pipeline:

1. Uploads a test document to Azure Blob Storage
2. Monitors the processing status via blob metadata
3. Verifies that chunks are correctly indexed in Azure AI Search

Run the test using the PowerShell script: `./scripts/run-tests.ps1`

## Best Practices

- **Security**: Uses Azure Managed Identity for authentication
- **Scalability**: Implements batching and handles large documents efficiently
- **Maintainability**: Modular design with clear separation of concerns
- **Error Handling**: Comprehensive error handling and logging
- **Configurability**: Environment variables for all settings
