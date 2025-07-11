/**
 * PDF Indexer Function
 * Indexes PDF chunks from the students-tools-chunked container into Azure AI Search
 */

import { app, InvocationContext } from "@azure/functions";
import { BlobServiceClient, BlockBlobClient } from "@azure/storage-blob";
import { DocumentChunk } from "../../models/DocumentChunk";
import { SearchIndexManager } from "../services/indexing/SearchIndexManager";
import { SearchDataIndexer } from "../services/indexing/SearchDataIndexer";
import { EmbeddingsGenerator } from "../services/indexing/EmbeddingsGenerator";

/**
 * Azure Function triggered by Blob Storage events when a new PDF chunk is uploaded
 * This function indexes the PDF chunks into Azure AI Search
 */
async function pdfIndexerFunction(blob: unknown, context: InvocationContext): Promise<void> {
  try {
    // Get the blob trigger path from the context
    const blobTrigger = context.triggerMetadata?.blobTrigger as string;
    
    if (!blobTrigger) {
      throw new Error("Blob trigger path is missing from context metadata");
    }
    
    // Only process JSON metadata files (not the PDF chunks themselves)
    if (!blobTrigger.toLowerCase().endsWith('_metadata.json')) {
      context.log(`Skipping non-metadata file: ${blobTrigger}`);
      return;
    }
    
    context.log(`PDF Indexing started for metadata: ${blobTrigger}`);
    
    // Extract blob information
    const blobPathParts = blobTrigger.split('/');
    const containerName = blobPathParts[0];
    const blobName = blobPathParts.slice(1).join('/');
    
    // Get configuration from environment variables
    const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const searchIndexName = process.env.AZURE_SEARCH_INDEX_NAME || "document-chunks";
    const searchApiKey = process.env.AZURE_SEARCH_API_KEY;
    const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const openaiApiKey = process.env.AZURE_OPENAI_API_KEY;
    const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-ada-002";
    
    // Validate required environment variables
    const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
    const storageConnectionString = process.env.AzureWebJobsStorage;
    
    if (!storageAccountName) {
      throw new Error("Missing STORAGE_ACCOUNT_NAME environment variable");
    }
    if (!storageConnectionString) {
      throw new Error("Missing AzureWebJobsStorage environment variable");
    }
    if (!searchEndpoint) {
      throw new Error("Missing AZURE_SEARCH_ENDPOINT environment variable");
    }
    if (!openaiEndpoint) {
      throw new Error("Missing AZURE_OPENAI_ENDPOINT environment variable");
    }
    
    // Connect to Azure services using connection string instead of DefaultAzureCredential
    const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
    
    // Get the container client
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Download the metadata JSON file
    const blobClient = containerClient.getBlobClient(blobName);
    const downloadResponse = await blobClient.download();
    const metadataContent = await streamToString(downloadResponse.readableStreamBody);
    
    // Parse the metadata JSON
    const chunkMetadata = JSON.parse(metadataContent) as DocumentChunk;
    context.log(`Processing metadata for chunk: ${chunkMetadata.id}`);
    
    // Skip if this chunk already has embeddings to avoid an infinite loop
    if (chunkMetadata.embedding && Array.isArray(chunkMetadata.embedding) && chunkMetadata.embedding.length > 0) {
      context.log(`Skipping chunk ${chunkMetadata.id} as it already has embeddings`);
      return;
    }
    
    // Initialize the embeddings generator
    const embeddingsGenerator = new EmbeddingsGenerator(
      openaiEndpoint,
      embeddingDeployment,
      openaiApiKey
    );
    
    // Generate embeddings for the chunk
    const chunksWithEmbeddings = await embeddingsGenerator.generateEmbeddings([chunkMetadata]);
    const enrichedChunk = chunksWithEmbeddings[0];
    
    context.log(`Generated embeddings for chunk: ${enrichedChunk.id}`);
    
    // Validate embeddings are in the expected format
    if (!enrichedChunk.embedding || !Array.isArray(enrichedChunk.embedding)) {
      context.log(`Warning: Missing or invalid embedding for chunk ${enrichedChunk.id}. Type: ${typeof enrichedChunk.embedding}`);
      // Create a fallback embedding if needed (all zeros)
      enrichedChunk.embedding = new Array(1536).fill(0);
    }
    
    context.log(`Embedding vector length: ${enrichedChunk.embedding.length}`);
    
    // Prepare a flattened version of the chunk for indexing
    // This resolves the issue with nested properties like 'location'
    const flattenedChunk = {
      id: enrichedChunk.id,
      documentId: enrichedChunk.documentId,
      filename: enrichedChunk.filename,
      content: enrichedChunk.content,
      // Use the embedding field for vector search
      embedding: enrichedChunk.embedding,
      chunkIndex: enrichedChunk.chunkIndex,
      contentType: enrichedChunk.contentType,
      title: enrichedChunk.title || '',
      classification: enrichedChunk.classification || 'Unclassified',
      contentHash: enrichedChunk.contentHash || '',
      createdAt: enrichedChunk.createdAt,
      updatedAt: enrichedChunk.updatedAt,
      // Flattening the location property
      pageNumber: enrichedChunk.location?.pageNumber || 0
      // Removed summary field as it's not in the search index schema
    };
    
    // Initialize the search index manager and ensure index exists
    const searchIndexManager = new SearchIndexManager(
      searchEndpoint,
      searchIndexName,
      searchApiKey
    );
    
    await searchIndexManager.createIndexIfNotExists();
    
    // Initialize the search data indexer
    const searchDataIndexer = new SearchDataIndexer(searchIndexManager);
    
    // Index the flattened chunk
    await searchDataIndexer.indexChunks([flattenedChunk]);
    
    context.log(`Successfully indexed chunk: ${enrichedChunk.id}`);
    
    // Update the metadata file with embeddings
    const blockBlobClient = blobClient.getBlockBlobClient();
    await blockBlobClient.upload(
      JSON.stringify(enrichedChunk, null, 2),
      JSON.stringify(enrichedChunk, null, 2).length,
      {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        }
      }
    );
    
    context.log(`Updated metadata file with embeddings: ${blobName}`);
    
  } catch (error: any) {
    context.error(`ERROR: Error indexing PDF chunk: ${error.message}`);
    throw error;
  }
}

/**
 * Converts a readable stream to a string
 */
async function streamToString(readableStream: NodeJS.ReadableStream | undefined): Promise<string> {
  if (!readableStream) {
    return "";
  }
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on("data", (data) => {
      chunks.push(Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    readableStream.on("error", reject);
  });
}

// Register the function with Azure Functions
app.storageBlob('pdfIndexer', {
  connection: "AzureWebJobsStorage",
  path: "students-tools-chunked/{name}",
  handler: pdfIndexerFunction
});
