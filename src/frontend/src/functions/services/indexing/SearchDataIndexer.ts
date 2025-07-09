/**
 * Search Data Indexer
 * Handles uploading document chunks to the search index
 */

import { SearchClient } from "@azure/search-documents";
import { DefaultAzureCredential } from "@azure/identity";
import { DocumentChunk } from "../../../models/DocumentChunk";

export class SearchDataIndexer {
  private searchServiceEndpoint: string;
  private searchIndexName: string;
  private searchClient: SearchClient<DocumentChunk>;
  
  constructor(searchServiceEndpoint: string, searchIndexName: string) {
    this.searchServiceEndpoint = searchServiceEndpoint;
    this.searchIndexName = searchIndexName;
    
    // Initialize AI Search client using Managed Identity
    const credential = new DefaultAzureCredential();
    this.searchClient = new SearchClient(
      this.searchServiceEndpoint,
      this.searchIndexName,
      credential
    );
  }
  
  /**
   * Upload document chunks to the search index
   */
  public async uploadChunks(chunks: DocumentChunk[]): Promise<void> {
    try {
      if (chunks.length === 0) {
        console.log("No chunks to upload");
        return;
      }
      
      console.log(`Uploading ${chunks.length} chunks to search index: ${this.searchIndexName}`);
      
      // Upload in batches to avoid hitting API limits
      const batchSize = 1000; // Azure Cognitive Search limit is 1000 docs per batch
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        // Upload the batch
        await this.searchClient.uploadDocuments(batch);
        
        console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(chunks.length / batchSize)}`);
      }
      
      console.log(`Successfully uploaded ${chunks.length} chunks to search index`);
    } catch (error: any) {
      console.error(`Error uploading chunks to search index: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete documents from the search index by document ID
   */
  public async deleteDocumentChunks(documentId: string): Promise<void> {
    try {
      console.log(`Deleting chunks for document: ${documentId} from search index: ${this.searchIndexName}`);
      
      // First, find all chunks for this document
      const searchResults = await this.searchClient.search("", {
        filter: `documentId eq '${documentId}'`,
        select: ["id"],
        top: 1000
      });
      
      const chunkIds: string[] = [];
      
      for await (const result of searchResults.results) {
        chunkIds.push(result.document.id);
      }
      
      if (chunkIds.length === 0) {
        console.log(`No chunks found for document: ${documentId}`);
        return;
      }
      
      console.log(`Found ${chunkIds.length} chunks to delete for document: ${documentId}`);
      
      // Delete chunks in batches
      const batchSize = 1000;
      
      for (let i = 0; i < chunkIds.length; i += batchSize) {
        const batch = chunkIds.slice(i, i + batchSize).map(id => ({
          id,
          documentId: documentId,
          documentTitle: '',
          courseId: '',
          content: '',
          chunkIndex: 0,
          totalChunks: 0,
          chunkType: 'text' as 'text' | 'heading' | 'table' | 'list' | 'procedure' | 'image_caption' | 'code' | 'other'
        } as DocumentChunk));
        
        // Delete the batch
        await this.searchClient.deleteDocuments(batch);
        
        console.log(`Deleted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(chunkIds.length / batchSize)}`);
      }
      
      console.log(`Successfully deleted ${chunkIds.length} chunks for document: ${documentId}`);
    } catch (error: any) {
      console.error(`Error deleting chunks from search index: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Merge or upload documents (update if exists, create if new)
   */
  public async mergeOrUploadChunks(chunks: DocumentChunk[]): Promise<void> {
    try {
      if (chunks.length === 0) {
        console.log("No chunks to merge or upload");
        return;
      }
      
      console.log(`Merging or uploading ${chunks.length} chunks to search index: ${this.searchIndexName}`);
      
      // Upload in batches to avoid hitting API limits
      const batchSize = 1000;
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        // Merge or upload the batch
        await this.searchClient.mergeOrUploadDocuments(batch);
        
        console.log(`Merged or uploaded batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(chunks.length / batchSize)}`);
      }
      
      console.log(`Successfully merged or uploaded ${chunks.length} chunks to search index`);
    } catch (error: any) {
      console.error(`Error merging or uploading chunks to search index: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get total document count in the index
   */
  public async getDocumentCount(): Promise<number> {
    try {
      const response = await this.searchClient.search("", { top: 0 });
      return response.count || 0;
    } catch (error: any) {
      console.error(`Error getting document count: ${error.message}`);
      throw error;
    }
  }
}
