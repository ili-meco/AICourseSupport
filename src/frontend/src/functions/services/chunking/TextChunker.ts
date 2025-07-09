/**
 * Text Chunker Strategy
 * Basic chunking strategy for unstructured or simple text content
 */

import { DocumentChunk } from "../../../../models/DocumentChunk";
import { Document } from "../../../../models/Document";
import { ChunkingOptions } from "../AdaptiveChunkingService";
import { v4 as uuidv4 } from 'uuid';

export class TextChunker {
  /**
   * Chunk text content using a basic approach
   */
  public chunk(
    document: Document,
    extractedContent: any
  ): Promise<DocumentChunk[]> {
    const content = extractedContent.fullText || '';
    const options: ChunkingOptions = {
      minChunkSize: 100,
      maxChunkSize: 1500,
      overlapSize: 150
    };
    
    return Promise.resolve(this.chunkContent(
      document.id,
      content,
      document,
      extractedContent,
      options
    ));
  }
  
  /**
   * Chunk text content using a basic approach
   */
  public chunkContent(
    documentId: string,
    content: string,
    document: Document,
    documentAnalysis: any,
    options: ChunkingOptions
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    // Use semantically meaningful boundaries when possible
    const paragraphs = this.splitIntoParagraphs(content);
    
    let currentChunk = "";
    let currentChunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      // If this paragraph would make the chunk too large
      if ((currentChunk.length + paragraph.length > options.maxChunkSize!) && currentChunk.length > 0) {
        // Add the current chunk to our results
        chunks.push(this.createChunk(
          documentId,
          currentChunk,
          document,
          currentChunkIndex,
          'text'
        ));
        
        // Start a new chunk, with overlap if specified
        currentChunkIndex++;
        
        // Add overlap with previous chunk if enabled
        if (options.overlapSize && options.overlapSize > 0) {
          const words = currentChunk.split(/\s+/);
          const overlapText = words.slice(-Math.min(words.length, Math.floor(options.overlapSize / 5))).join(' ');
          currentChunk = overlapText + '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
      } else {
        // Otherwise add to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n';
        }
        currentChunk += paragraph;
      }
    }
    
    // Add the final chunk if there's anything left
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(
        documentId,
        currentChunk,
        document,
        currentChunkIndex,
        'text'
      ));
    }
    
    // Update total chunks count
    const totalChunks = chunks.length;
    chunks.forEach(chunk => chunk.totalChunks = totalChunks);
    
    return chunks;
  }
  
  /**
   * Split text into paragraphs
   */
  private splitIntoParagraphs(text: string): string[] {
    // Split by double line breaks to get paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    // Filter out empty paragraphs
    return paragraphs
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
  
  /**
   * Create a document chunk with appropriate metadata
   */
  private createChunk(
    documentId: string,
    content: string,
    document: Document,
    chunkIndex: number,
    chunkType: 'text' | 'heading' | 'table' | 'list' | 'procedure' | 'image_caption' | 'code' | 'other'
  ): DocumentChunk {
    // Extract first line as potential heading
    const firstLine = content.split('\n')[0].trim();
    const heading = firstLine.length < 100 ? firstLine : undefined;
    
    // Extract entities from content (simple keyword extraction)
    const keywords = this.extractKeywords(content);
    
    const now = new Date();
    
    return {
      id: `${documentId}-chunk-${chunkIndex}`,
      content,
      documentId,
      documentTitle: document.title || '',
      documentUrl: document.url,
      courseId: document.courseId || '',
      courseTitle: document.courseTitle || '',
      chunkIndex,
      totalChunks: 0,  // Will be updated later
      chunkType,
      heading,
      keywords,
      fileType: document.fileType || '',
      classification: document.classification || '',
      publicationNumber: document.publicationNumber || '',
      revisionNumber: document.revisionNumber || ''
    };
  }
  
  /**
   * Extract keywords from content
   * Simple implementation - in production, use NLP or AI services
   */
  private extractKeywords(content: string): string[] {
    // Very simple keyword extraction - just get capitalized phrases
    const capitalized = content.match(/\b[A-Z][A-Za-z]{2,}\b/g) || [];
    
    // Get unique keywords without using Set spread
    const uniqueKeywords: string[] = [];
    const seen: {[key: string]: boolean} = {};
    
    for (const word of capitalized) {
      if (!seen[word]) {
        seen[word] = true;
        uniqueKeywords.push(word);
      }
      if (uniqueKeywords.length >= 10) break;
    }
    
    return uniqueKeywords;
  }
}
