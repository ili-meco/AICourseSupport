/**
 * Document Processing Orchestrator
 * Main function that orchestrates the document processing pipeline
 */

import { app, InvocationContext } from "@azure/functions";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as crypto from "crypto";

// Import our services
import { ContentExtractionService } from "./services/extraction/ContentExtractionService";
import { AdaptiveChunkingService } from "./services/chunking/AdaptiveChunkingService";
import { SearchIndexManager } from "./services/indexing/SearchIndexManager";
import { SearchDataIndexer } from "./services/indexing/SearchDataIndexer";
import { EmbeddingsGenerator } from "./services/indexing/EmbeddingsGenerator";
import { Document } from "../models/Document";

/**
 * Azure Function triggered by Blob Storage events when a new document is uploaded
 * This orchestrates the entire document processing pipeline:
 * 1. Download document from Blob Storage
 * 2. Extract text content based on file type
 * 3. Semantically chunk the content
 * 4. Generate embeddings for each chunk
 * 5. Index chunks in Azure AI Search
 */
const processBlobTrigger = async function(blob: unknown, context: InvocationContext): Promise<void> {
  // Get the blob trigger path from the context
  const blobTrigger = context.triggerMetadata?.blobTrigger as string;
  
  if (!blobTrigger) {
    throw new Error("Blob trigger path is missing from context metadata");
  }
  try {
    context.log(`Document Processing started for blob: ${blobTrigger}`);
    
    // 1. Get configuration from environment variables
    const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
    const originalContainerName = process.env.ORIGINAL_CONTAINER_NAME || "original-documents";
    const searchServiceEndpoint = process.env.SEARCH_SERVICE_ENDPOINT;
    const searchIndexName = process.env.SEARCH_INDEX_NAME || "defense-document-chunks";
    const openAiEndpoint = process.env.OPENAI_ENDPOINT;
    const embeddingDeployment = process.env.OPENAI_EMBEDDING_DEPLOYMENT;
    
    if (!storageAccountName || !searchServiceEndpoint || !openAiEndpoint || !embeddingDeployment) {
      throw new Error("Missing required environment variables");
    }
    
    // 2. Extract blob information
    // The blobTrigger is in the format {container}/{blobname}
    const blobName = blobTrigger.split('/').slice(1).join('/');
    // Will fetch metadata from blob properties later
    const blobMetadata = {};
    
    // 3. Connect to Azure services using Managed Identity
    const credential = new DefaultAzureCredential();
    const blobServiceClient = new BlobServiceClient(
      `https://${storageAccountName}.blob.core.windows.net`,
      credential
    );
    const containerClient = blobServiceClient.getContainerClient(originalContainerName);
    
    // 4. Download the document to a temporary file
    context.log(`Downloading blob: ${blobName}`);
    const tempFilePath = await downloadBlob(containerClient, blobName);
    
    // 5. Extract metadata from the blob and create document object
    const document = createDocumentFromBlob(blobName, blobMetadata);
    
    // 6. Update document status to processing
    await updateBlobMetadata(containerClient, blobName, {
      ...blobMetadata,
      processingStatus: 'processing',
      processingStarted: new Date().toISOString()
    });
    
    // 7. Extract content based on file type
    context.log(`Extracting content from ${document.fileType} file`);
    const extractionService = new ContentExtractionService(context);
    const extractedContent = await extractionService.extractContent(tempFilePath);
    
    if (!extractedContent.metadata.extractionSuccessful) {
      throw new Error(`Failed to extract content: ${JSON.stringify(extractedContent.metadata)}`);
    }
    
    // Update document with additional metadata from extraction
    document.pageCount = extractedContent.metadata.pageCount;
    
    // 8. Chunk the document using adaptive chunking
    context.log(`Chunking document: ${document.title}`);
    const chunkingService = new AdaptiveChunkingService();
    const chunks = await chunkingService.chunkDocument(
      document.id,
      extractedContent.text,
      document,
      {
        targetChunkSize: 1000,
        overlapSize: 150,
        preserveTables: true,
        preserveLists: true
      }
    );
    
    context.log(`Created ${chunks.length} chunks for document`);
    
    // 9. Generate embeddings for chunks
    context.log(`Generating embeddings for chunks`);
    const embeddingsGenerator = new EmbeddingsGenerator(openAiEndpoint, embeddingDeployment);
    const chunksWithEmbeddings = await embeddingsGenerator.generateEmbeddings(chunks);
    
    // 10. Ensure search index exists
    context.log(`Ensuring search index exists: ${searchIndexName}`);
    const indexManager = new SearchIndexManager(searchServiceEndpoint, searchIndexName);
    const indexExists = await indexManager.indexExists();
    
    if (!indexExists) {
      context.log(`Creating search index: ${searchIndexName}`);
      await indexManager.createOrUpdateIndex();
    }
    
    // 11. Upload chunks to search index
    context.log(`Uploading chunks to search index`);
    const indexer = new SearchDataIndexer(searchServiceEndpoint, searchIndexName);
    await indexer.uploadChunks(chunksWithEmbeddings);
    
    // 12. Update document status to complete
    await updateBlobMetadata(containerClient, blobName, {
      ...blobMetadata,
      processingStatus: 'complete',
      processingCompleted: new Date().toISOString(),
      chunkCount: String(chunks.length)
    });
    
    // 13. Clean up temporary file
    fs.unlinkSync(tempFilePath);
    
    context.log(`Document processing completed successfully for: ${document.title}`);
  } catch (error: any) {
    context.log(`ERROR: Error processing document: ${error.message}`);
    
    // Update blob metadata to indicate error
    try {
      const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
      const originalContainerName = process.env.ORIGINAL_CONTAINER_NAME || "original-documents";
      // Use the blobTrigger parameter already available
      
      const credential = new DefaultAzureCredential();
      const blobServiceClient = new BlobServiceClient(
        `https://${storageAccountName}.blob.core.windows.net`,
        credential
      );
      const containerClient = blobServiceClient.getContainerClient(originalContainerName);
      
      // Get the blob name from the blobTrigger
      const blobPathParts = blobTrigger.split('/');
      const blobName = blobPathParts.slice(1).join('/');
      
      // Get blob properties to access metadata
      const blobClient = containerClient.getBlobClient(blobName);
      const blobProps = await blobClient.getProperties();
      const blobMetadata = blobProps.metadata || {};
      
      await updateBlobMetadata(containerClient, blobName, {
        ...blobMetadata,
        processingStatus: 'error',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    } catch (metadataError: any) {
      context.log(`ERROR: Failed to update error metadata: ${metadataError.message}`);
    }
    
    // Re-throw the error to mark the function as failed
    throw error;
  }
};

/**
 * Download a blob to a temporary file
 */
async function downloadBlob(containerClient: ContainerClient, blobName: string): Promise<string> {
  const blobClient = containerClient.getBlobClient(blobName);
  const downloadResponse = await blobClient.download();
  
  // Create temporary file path
  const tempFilePath = path.join(
    os.tmpdir(),
    `${crypto.randomBytes(8).toString('hex')}-${path.basename(blobName)}`
  );
  
  // Download to temporary file
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(tempFilePath);
    downloadResponse.readableStreamBody?.pipe(fileStream)
      .on('error', (error) => {
        reject(error);
      })
      .on('finish', () => {
        resolve(tempFilePath);
      });
  });
}

/**
 * Create a Document object from blob metadata
 */
function createDocumentFromBlob(blobName: string, metadata: any): Document {
  const blobPath = blobName.split('/');
  const fileName = blobPath.pop() || '';
  const courseId = blobPath[0] || 'default';
  
  return {
    id: metadata.documentId || `doc-${Date.now()}-${path.basename(fileName, path.extname(fileName))}`,
    title: metadata.title || path.basename(fileName, path.extname(fileName)),
    courseId: metadata.courseId || courseId,
    courseTitle: metadata.courseTitle || `Course ${courseId}`,
    url: metadata.url,
    blobName: blobName,
    fileType: path.extname(fileName).substring(1),
    fileSize: metadata.size || 0,
    author: metadata.author,
    createdDate: metadata.createdDate || new Date().toISOString(),
    modifiedDate: metadata.modifiedDate || new Date().toISOString(),
    classification: metadata.classification || 'UNCLASSIFIED',
    publicationNumber: metadata.publicationNumber,
    revisionNumber: metadata.revisionNumber,
    processingStatus: 'pending',
    tags: metadata.tags ? JSON.parse(metadata.tags) : []
  };
}

/**
 * Update blob metadata
 */
async function updateBlobMetadata(
  containerClient: ContainerClient,
  blobName: string,
  metadata: Record<string, string>
): Promise<void> {
  try {
    const blobClient = containerClient.getBlobClient(blobName);
    
    // Clean up metadata - all values must be strings
    const cleanMetadata: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          cleanMetadata[key] = JSON.stringify(value);
        } else {
          cleanMetadata[key] = String(value);
        }
      }
    }
    
    // Update blob metadata
    await blobClient.setMetadata(cleanMetadata);
  } catch (error: any) {
    throw new Error(`Failed to update blob metadata: ${error.message}`);
  }
}

// Register the function with Azure Functions
app.storageBlob('processBlobTrigger', {
  connection: "AzureWebJobsStorage",
  path: "%ORIGINAL_CONTAINER_NAME%/{name}",
  handler: processBlobTrigger
});
