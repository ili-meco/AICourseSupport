import {
  AzureKeyCredential,
  SearchClient
} from '@azure/search-documents';
import { DefaultAzureCredential } from '@azure/identity';
import { DocumentChunk } from '../../../models/DocumentChunk';
import { SearchIndexManager } from './SearchIndexManager';
import { retry } from '../utils/retryUtils';

/**
 * Service for indexing document chunks in Azure Cognitive Search
 */
export class SearchDataIndexer {
  private readonly searchClient: SearchClient<any>;
  
  /**
   * Creates a new instance of SearchDataIndexer
   * @param searchIndexManager SearchIndexManager instance for the target index
   */
  constructor(private readonly searchIndexManager: SearchIndexManager) {
    this.searchClient = searchIndexManager.createSearchClient();
  }
  
  /**
   * Indexes document chunks in the search index
   * @param chunks Array of document chunks to index
   * @returns Number of chunks successfully indexed
   */
  public async indexChunks(chunks: DocumentChunk[]): Promise<number> {
    if (!chunks || chunks.length === 0) {
      console.warn('No chunks provided for indexing');
      return 0;
    }
    
    console.log(`Indexing ${chunks.length} document chunks`);
    let totalIndexed = 0;
    
    // Process chunks in batches of 1000 (Azure Search limit)
    const batchSize = 1000;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      try {
        await retry(() => this.uploadBatch(batch), 3, 1000);
        totalIndexed += batch.length;
        console.log(`Indexed batch ${Math.ceil(i / batchSize) + 1} of ${Math.ceil(chunks.length / batchSize)} (${totalIndexed} total)`);
      } catch (error) {
        console.error(`Error indexing batch starting at index ${i}:`, error);
      }
    }
    
    return totalIndexed;
  }
  
  /**
   * Uploads a batch of chunks to the search index
   * @param chunks Chunks to upload
   * @returns Results of the upload operation
   */
  private async uploadBatch(chunks: DocumentChunk[]): Promise<any> {
    // Map chunks to the format expected by the search index
    const documents = chunks.map(chunk => {
      // Extract the page number from location if it exists
      const pageNumber = chunk.location?.pageNumber !== undefined ? chunk.location.pageNumber : -1;
      
      return {
        ...chunk,
        pageNumber,
        // Ensure dates are serialized correctly
        createdAt: new Date(chunk.createdAt).toISOString(),
        updatedAt: new Date(chunk.updatedAt).toISOString()
      };
    });
    
    return await this.searchClient.uploadDocuments(documents);
  }
  
  /**
   * Merges changes to existing chunks in the index
   * @param chunks Array of chunks with updates
   * @returns Number of chunks successfully merged
   */
  public async mergeChunks(chunks: DocumentChunk[]): Promise<number> {
    if (!chunks || chunks.length === 0) {
      console.warn('No chunks provided for merging');
      return 0;
    }
    
    console.log(`Merging ${chunks.length} document chunks`);
    let totalMerged = 0;
    
    // Process chunks in batches of 1000 (Azure Search limit)
    const batchSize = 1000;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      try {
        const documents = batch.map(chunk => ({
          ...chunk,
          updatedAt: new Date().toISOString()
        }));
        
        await retry(() => this.searchClient.mergeDocuments(documents), 3, 1000);
        totalMerged += batch.length;
        console.log(`Merged batch ${Math.ceil(i / batchSize) + 1} of ${Math.ceil(chunks.length / batchSize)} (${totalMerged} total)`);
      } catch (error) {
        console.error(`Error merging batch starting at index ${i}:`, error);
      }
    }
    
    return totalMerged;
  }
  
  /**
   * Deletes chunks from the search index
   * @param chunkIds IDs of chunks to delete
   * @returns Number of chunks successfully deleted
   */
  public async deleteChunks(chunkIds: string[]): Promise<number> {
    if (!chunkIds || chunkIds.length === 0) {
      console.warn('No chunk IDs provided for deletion');
      return 0;
    }
    
    console.log(`Deleting ${chunkIds.length} document chunks`);
    let totalDeleted = 0;
    
    // Process chunks in batches of 1000 (Azure Search limit)
    const batchSize = 1000;
    for (let i = 0; i < chunkIds.length; i += batchSize) {
      const batch = chunkIds.slice(i, i + batchSize);
      
      try {
        const documents = batch.map(id => ({ id }));
        await retry(() => this.searchClient.deleteDocuments(documents), 3, 1000);
        totalDeleted += batch.length;
        console.log(`Deleted batch ${Math.ceil(i / batchSize) + 1} of ${Math.ceil(chunkIds.length / batchSize)} (${totalDeleted} total)`);
      } catch (error) {
        console.error(`Error deleting batch starting at index ${i}:`, error);
      }
    }
    
    return totalDeleted;
  }
  
  /**
   * Deletes all chunks from a specific document
   * @param documentId ID of the document whose chunks should be deleted
   * @returns Number of chunks deleted
   */
  public async deleteDocumentChunks(documentId: string): Promise<number> {
    console.log(`Deleting all chunks for document ${documentId}`);
    
    try {
      // Find all chunks for this document
      const options = {
        filter: `documentId eq '${documentId}'`,
        select: ["id"]
      };
      
      const searchResults = await retry(() => this.searchClient.search("*", options), 3, 1000);
      const chunkIds: string[] = [];
      
      for await (const result of searchResults.results) {
        chunkIds.push(result.document.id);
      }
      
      if (chunkIds.length === 0) {
        console.log(`No chunks found for document ${documentId}`);
        return 0;
      }
      
      return await this.deleteChunks(chunkIds);
    } catch (error) {
      console.error(`Error deleting chunks for document ${documentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Performs a vector search using an embedding
   * @param embedding Embedding vector to search with
   * @param limit Maximum number of results
   * @param filters Optional filter criteria
   * @returns Search results
   */
  public async searchByVector(
    embedding: number[],
    limit: number = 10,
    filters?: string
  ): Promise<any[]> {
    try {
      const options: any = {
        vectorQueries: [
          {
            kind: "vector",
            vector: embedding,
            fields: ["embedding"],
            k: limit
          }
        ],
        top: limit,
        select: ["id", "documentId", "content", "filename", "title", "sectionTitle", "pageNumber", "chunkIndex", "contentType", "sectionHierarchy"]
      };
      
      if (filters) {
        options.filter = filters;
      }
      
      const searchResults = await retry(() => this.searchClient.search("*", options), 3, 1000);
      const results = [];
      
      for await (const result of searchResults.results) {
        results.push(result.document);
      }
      
      return results;
    } catch (error) {
      console.error('Error performing vector search:', error);
      throw error;
    }
  }
}
