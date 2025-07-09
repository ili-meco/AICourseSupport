/**
 * Embeddings Generator Service
 * Generates vector embeddings for document chunks to support semantic search
 */

import { OpenAIClient } from "@azure/openai";
import { DefaultAzureCredential } from "@azure/identity";
import { DocumentChunk } from "../../../models/DocumentChunk";

export class EmbeddingsGenerator {
  private openAiEndpoint: string;
  private embeddingDeployment: string;
  private openAiClient: OpenAIClient;
  
  constructor(openAiEndpoint: string, embeddingDeployment: string) {
    this.openAiEndpoint = openAiEndpoint;
    this.embeddingDeployment = embeddingDeployment;
    
    // Initialize Azure OpenAI client using Managed Identity
    const credential = new DefaultAzureCredential();
    this.openAiClient = new OpenAIClient(this.openAiEndpoint, credential);
  }
  
  /**
   * Generate embeddings for document chunks
   */
  public async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    try {
      if (chunks.length === 0) {
        console.log("No chunks to generate embeddings for");
        return chunks;
      }
      
      console.log(`Generating embeddings for ${chunks.length} chunks using deployment: ${this.embeddingDeployment}`);
      
      // Generate embeddings in small batches to avoid rate limits
      const batchSize = 20; // Adjust based on your rate limits
      const chunksWithEmbeddings: DocumentChunk[] = [];
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddingTexts = batch.map(chunk => this.prepareTextForEmbedding(chunk));
        
        // Generate embeddings for the batch
        const response = await this.openAiClient.getEmbeddings(
          this.embeddingDeployment,
          embeddingTexts
        );
        
        // Add embeddings to chunks
        for (let j = 0; j < batch.length; j++) {
          chunksWithEmbeddings.push({
            ...batch[j],
            contentVector: response.data[j].embedding
          });
        }
        
        console.log(`Generated embeddings for batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(chunks.length / batchSize)}`);
        
        // Add a small delay to avoid hitting rate limits
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`Successfully generated embeddings for ${chunksWithEmbeddings.length} chunks`);
      
      return chunksWithEmbeddings;
    } catch (error: any) {
      console.error(`Error generating embeddings: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Prepare text for embedding by combining important fields
   */
  private prepareTextForEmbedding(chunk: DocumentChunk): string {
    // Combine relevant fields to create a rich representation for embedding
    let embeddingText = '';
    
    // Add title information if available
    if (chunk.heading) {
      embeddingText += `Title: ${chunk.heading}\n\n`;
    } else if (chunk.documentTitle) {
      embeddingText += `Document: ${chunk.documentTitle}\n\n`;
    }
    
    // Add section number if available
    if (chunk.sectionNumber) {
      embeddingText += `Section: ${chunk.sectionNumber}\n\n`;
    }
    
    // Add content - the most important part
    embeddingText += chunk.content;
    
    // Add keywords if available
    if (chunk.keywords && chunk.keywords.length > 0) {
      embeddingText += `\n\nKeywords: ${chunk.keywords.join(', ')}`;
    }
    
    return embeddingText;
  }
}
