import { DocumentChunk } from '../../../models/DocumentChunk';
import { AzureKeyCredential } from '@azure/core-auth';
import { DefaultAzureCredential } from '@azure/identity';
import { retry } from '../utils/retryUtils';
// Using require for OpenAI due to ESM/CommonJS compatibility issues
const { OpenAIClient } = require('@azure/openai');

/**
 * Service for generating embeddings for document chunks
 */
export class EmbeddingsGenerator {
  private openAIClient: any; // Using any as OpenAI API structure has changed
  private readonly deploymentName: string;
  private readonly embeddingDimension: number;
  private readonly batchSize: number;
  
  /**
   * Creates a new instance of EmbeddingsGenerator
   * @param endpoint Azure OpenAI endpoint
   * @param deploymentName Name of the embeddings model deployment
   * @param apiKey Optional API key (if not using managed identity)
   * @param embeddingDimension Dimension of embeddings vector (default: 1536 for text-embedding-ada-002)
   * @param batchSize Number of chunks to process in parallel (default: 10)
   */
  constructor(
    private readonly endpoint: string,
    deploymentName: string = 'text-embedding-ada-002',
    private readonly apiKey?: string,
    embeddingDimension: number = 1536,
    batchSize: number = 10
  ) {
    this.deploymentName = deploymentName;
    this.embeddingDimension = embeddingDimension;
    this.batchSize = batchSize;
    
    // Initialize OpenAI client with appropriate credentials
    if (apiKey) {
      const credential = new AzureKeyCredential(apiKey);
      this.openAIClient = new OpenAIClient(endpoint, credential);
    } else {
      // Use managed identity (preferred in production)
      const credential = new DefaultAzureCredential();
      this.openAIClient = new OpenAIClient(endpoint, credential);
    }
  }
  
  /**
   * Generates embeddings for an array of document chunks
   * @param chunks Array of document chunks
   * @returns The same chunks with embeddings added
   */
  public async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    if (!chunks || chunks.length === 0) {
      console.warn('No chunks provided for embedding generation');
      return chunks;
    }
    
    console.log(`Generating embeddings for ${chunks.length} chunks in batches of ${this.batchSize}`);
    const enrichedChunks: DocumentChunk[] = [];
    
    // Process chunks in batches to avoid rate limits
    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batchChunks = chunks.slice(i, i + this.batchSize);
      const batchTexts = batchChunks.map(chunk => chunk.content);
      
      // Generate embeddings with retry for resilience
      try {
        const batchEmbeddings = await retry(() => this.getEmbeddingsForBatch(batchTexts), 3, 1000);
        
        // Add embeddings to chunks
        for (let j = 0; j < batchChunks.length; j++) {
          enrichedChunks.push({
            ...batchChunks[j],
            embedding: batchEmbeddings[j]
          });
        }
        
        console.log(`Generated embeddings for batch ${i / this.batchSize + 1} of ${Math.ceil(chunks.length / this.batchSize)}`);
      } catch (error) {
        console.error(`Failed to generate embeddings for batch starting at index ${i}:`, error);
        // Add chunks without embeddings so they can be processed later
        enrichedChunks.push(...batchChunks);
      }
      
      // Add a small delay between batches to avoid rate limiting
      if (i + this.batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return enrichedChunks;
  }
  
  /**
   * Gets embeddings for a batch of texts
   * @param texts Array of text strings
   * @returns 2D array of embeddings
   */
  private async getEmbeddingsForBatch(texts: string[]): Promise<number[][]> {
    try {
      const result = await this.openAIClient.getEmbeddings(this.deploymentName, texts);
      return result.map(item => Array.from(item.embedding));
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }
  
  /**
   * Generates an embedding for a single text
   * @param text Text to embed
   * @returns Embedding vector
   */
  public async generateSingleEmbedding(text: string): Promise<number[]> {
    try {
      const result = await retry(() => this.openAIClient.getEmbeddings(this.deploymentName, [text]), 3, 1000);
      return Array.from(result[0].embedding);
    } catch (error) {
      console.error('Error generating single embedding:', error);
      throw error;
    }
  }
}
