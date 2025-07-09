import { app, InvocationContext } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { Document } from '../models/Document';
import { ContentExtractionService } from './services/extraction/ContentExtractionService';
import { AdaptiveChunkingService } from './services/chunking/AdaptiveChunkingService';
import { SearchIndexManager } from './services/indexing/SearchIndexManager';
import { SearchDataIndexer } from './services/indexing/SearchDataIndexer';
import { EmbeddingsGenerator } from './services/indexing/EmbeddingsGenerator';

/**
 * Azure Function to process a document uploaded to Blob Storage
 * - Downloads the document
 * - Extracts content using appropriate extractor
 * - Chunks content using adaptive chunking
 * - Generates embeddings for chunks
 * - Indexes chunks in Azure Cognitive Search
 * - Updates metadata in blob storage
 */
const processDocument = async function (context: InvocationContext, triggerBlob: Buffer, blobName: string): Promise<void> {
  context.log(`Processing document: ${blobName}, size: ${triggerBlob.length} bytes`);
  
  try {
    // Get configuration from environment variables
    const {
      SEARCH_SERVICE_ENDPOINT,
      SEARCH_INDEX_NAME,
      OPENAI_ENDPOINT,
      OPENAI_DEPLOYMENT_NAME,
      STORAGE_ACCOUNT_NAME,
      ORIGINAL_CONTAINER_NAME,
      CHUNKS_CONTAINER_NAME,
      MIN_CHUNK_SIZE,
      MAX_CHUNK_SIZE,
      CHUNK_OVERLAP
    } = process.env;
    
    // Validate required configuration
    if (!SEARCH_SERVICE_ENDPOINT || !SEARCH_INDEX_NAME || !OPENAI_ENDPOINT || 
        !OPENAI_DEPLOYMENT_NAME || !STORAGE_ACCOUNT_NAME || 
        !ORIGINAL_CONTAINER_NAME || !CHUNKS_CONTAINER_NAME) {
      throw new Error('Missing required environment variables');
    }
    
    // Parse chunking configuration
    const minChunkSize = MIN_CHUNK_SIZE ? parseInt(MIN_CHUNK_SIZE, 10) : 100;
    const maxChunkSize = MAX_CHUNK_SIZE ? parseInt(MAX_CHUNK_SIZE, 10) : 1500;
    const chunkOverlap = CHUNK_OVERLAP ? parseInt(CHUNK_OVERLAP, 10) : 150;
    
    // Get document metadata from blob
    const blobServiceClient = new BlobServiceClient(
      `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
      new DefaultAzureCredential()
    );
    
    const containerClient = blobServiceClient.getContainerClient(ORIGINAL_CONTAINER_NAME);
    const blobClient = containerClient.getBlobClient(blobName);
    const properties = await blobClient.getProperties();
    
    // Create document object
    const document: Document = {
      id: blobClient.name.replace(/[^a-zA-Z0-9]/g, '-'),
      filename: blobName,
      contentType: properties.contentType || 'application/octet-stream',
      sourceUrl: blobClient.url,
      size: properties.contentLength || 0,
      lastModified: properties.lastModified || new Date(),
      createdAt: new Date(),
      title: properties.metadata?.title || blobName,
      authors: properties.metadata?.authors ? properties.metadata.authors.split(',') : undefined,
      classification: properties.metadata?.classification,
      organization: properties.metadata?.organization,
      metadata: {
        ...properties.metadata
      }
    };
    
    // Initialize services
    const contentExtractionService = new ContentExtractionService();
    const adaptiveChunkingService = new AdaptiveChunkingService(minChunkSize, maxChunkSize, chunkOverlap);
    const searchIndexManager = new SearchIndexManager(SEARCH_SERVICE_ENDPOINT, SEARCH_INDEX_NAME);
    const searchDataIndexer = new SearchDataIndexer(searchIndexManager);
    const embeddingsGenerator = new EmbeddingsGenerator(OPENAI_ENDPOINT, OPENAI_DEPLOYMENT_NAME);
    
    // Ensure search index exists
    await searchIndexManager.createIndexIfNotExists();
    
    // Extract content from the document
    context.log(`Extracting content from ${document.filename}`);
    const extractedContent = await contentExtractionService.extractContent(document, triggerBlob);
    
    // Update document with any extracted metadata
    document.title = extractedContent.metadata.title || document.title;
    if (extractedContent.metadata.author) {
      document.authors = [extractedContent.metadata.author];
    }
    
    // Chunk the document
    context.log(`Chunking document ${document.id}`);
    const chunks = await adaptiveChunkingService.chunkDocument(document, extractedContent);
    context.log(`Created ${chunks.length} chunks`);
    
    // Generate embeddings for chunks
    context.log(`Generating embeddings for ${chunks.length} chunks`);
    const chunksWithEmbeddings = await embeddingsGenerator.generateEmbeddings(chunks);
    
    // Index chunks in Azure Cognitive Search
    context.log(`Indexing ${chunksWithEmbeddings.length} chunks in search index`);
    const indexedCount = await searchDataIndexer.indexChunks(chunksWithEmbeddings);
    context.log(`Successfully indexed ${indexedCount} chunks`);
    
    // Store chunk data in blob storage for future reference
    const chunksContainerClient = blobServiceClient.getContainerClient(CHUNKS_CONTAINER_NAME);
    await chunksContainerClient.createIfNotExists();
    
    const chunksBlobName = `${document.id}/chunks.json`;
    const chunksBlobClient = chunksContainerClient.getBlockBlobClient(chunksBlobName);
    
    // Store chunks with embeddings
    await chunksBlobClient.upload(
      JSON.stringify(chunksWithEmbeddings, null, 2),
      JSON.stringify(chunksWithEmbeddings, null, 2).length
    );
    
    // Update metadata on the original blob with processing information
    const metadata = {
      ...properties.metadata,
      processed: 'true',
      processingDate: new Date().toISOString(),
      chunkCount: chunks.length.toString(),
      indexedCount: indexedCount.toString()
    };
    
    await blobClient.setMetadata(metadata);
    
    context.log(`Document processing completed successfully for ${document.filename}`);
  } catch (error) {
    context.log(`ERROR: Error processing document ${blobName}: ${error.message}`);
    throw error;
  }
};

export default processDocument;
