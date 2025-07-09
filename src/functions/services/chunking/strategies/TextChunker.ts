import { DocumentChunk } from '../../../../models/DocumentChunk';
import { Document } from '../../../../models/Document';
import { ExtractedContent } from '../../extraction/ContentExtractionService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chunker for plain text content
 */
export class TextChunker {
  /**
   * Creates a new instance of TextChunker
   * @param minChunkSize Minimum size of chunks in characters
   * @param maxChunkSize Maximum size of chunks in characters
   * @param chunkOverlap Overlap between chunks in characters
   */
  constructor(
    private readonly minChunkSize: number = 100,
    private readonly maxChunkSize: number = 1500,
    private readonly chunkOverlap: number = 150
  ) {}
  
  /**
   * Chunks a document based on its extracted content
   * @param document Document metadata
   * @param extractedContent Extracted content from the document
   * @returns Array of document chunks
   */
  public async chunk(
    document: Document,
    extractedContent: ExtractedContent
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const { sections, fullText } = extractedContent;
    
    if (sections.length === 0 || !fullText) {
      console.warn(`Document ${document.id} has no content to chunk`);
      return chunks;
    }
    
    // Handle case where there are meaningful sections
    if (sections.length > 0 && sections.some(s => s.content)) {
      let chunkIndex = 0;
      
      for (const section of sections) {
        // Skip empty sections
        if (!section.content || section.content.trim() === '') continue;
        
        // For small sections, keep them as single chunks
        if (section.content.length <= this.maxChunkSize) {
          chunks.push(this.createChunk(
            document,
            section.content,
            chunkIndex++,
            'text',
            section.title,
            section.pageNumber
          ));
          continue;
        }
        
        // For larger sections, split them into multiple chunks
        const sectionChunks = this.splitTextIntoChunks(
          section.content,
          chunkIndex,
          section.title,
          section.pageNumber
        );
        
        chunks.push(...sectionChunks.map(({ content, index }) => 
          this.createChunk(
            document,
            content,
            index,
            'text',
            section.title,
            section.pageNumber
          )
        ));
        
        chunkIndex = sectionChunks.length + chunkIndex;
      }
    } else {
      // If no meaningful sections, chunk the full document text
      const textChunks = this.splitTextIntoChunks(fullText, 0);
      
      chunks.push(...textChunks.map(({ content, index }) => 
        this.createChunk(document, content, index, 'text')
      ));
    }
    
    return chunks;
  }
  
  /**
   * Splits text into chunks of appropriate size
   * @param text Text to split
   * @param startIndex Starting index for chunk numbering
   * @param sectionTitle Title of the section, if applicable
   * @param pageNumber Page number, if known
   * @returns Array of text chunks with their indices
   */
  public splitTextIntoChunks(
    text: string,
    startIndex: number = 0,
    sectionTitle?: string,
    pageNumber?: number
  ): { content: string; index: number }[] {
    const chunks: { content: string; index: number }[] = [];
    let index = startIndex;
    
    // Try to split on paragraph boundaries first
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    
    // If we have meaningful paragraphs
    if (paragraphs.length > 1) {
      let currentChunk = '';
      
      for (const paragraph of paragraphs) {
        // If adding this paragraph would exceed max size and we already have content,
        // save the current chunk and start a new one
        if (currentChunk.length + paragraph.length > this.maxChunkSize && currentChunk.length >= this.minChunkSize) {
          chunks.push({ content: currentChunk, index: index++ });
          
          // Start new chunk with overlap from previous chunk if possible
          const overlapPoint = Math.max(0, currentChunk.length - this.chunkOverlap);
          currentChunk = currentChunk.substring(overlapPoint) + '\n\n';
        }
        
        // If a single paragraph exceeds max size, we need to split it further
        if (paragraph.length > this.maxChunkSize) {
          // Save current chunk if not empty
          if (currentChunk.length > 0) {
            chunks.push({ content: currentChunk, index: index++ });
            currentChunk = '';
          }
          
          // Split the paragraph by sentences or chunks of characters
          const sentenceChunks = this.splitLargeTextBySentences(paragraph);
          for (const sentenceChunk of sentenceChunks) {
            chunks.push({ content: sentenceChunk, index: index++ });
          }
        } else {
          // Add paragraph to current chunk
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }
      
      // Save any remaining content
      if (currentChunk.length > 0) {
        chunks.push({ content: currentChunk, index: index++ });
      }
    } else {
      // No paragraph breaks, split by sentences
      const sentenceChunks = this.splitLargeTextBySentences(text);
      chunks.push(...sentenceChunks.map((content, i) => ({ content, index: startIndex + i })));
    }
    
    return chunks;
  }
  
  /**
   * Splits text by sentences to create chunks of appropriate size
   * @param text Text to split
   * @returns Array of text chunks
   */
  private splitLargeTextBySentences(text: string): string[] {
    const chunks: string[] = [];
    
    // Simple regex to split by sentences
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      // If this sentence alone exceeds the max size, we'll need to split it by words
      if (sentence.length > this.maxChunkSize) {
        // Save current chunk if not empty
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
        
        // Split large sentence by words
        const words = sentence.split(/\s+/);
        for (const word of words) {
          if (currentChunk.length + word.length + 1 > this.maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = '';
          }
          
          currentChunk += (currentChunk ? ' ' : '') + word;
        }
      }
      // If adding this sentence would exceed max size, save chunk and start new one
      else if (currentChunk.length + sentence.length + 1 > this.maxChunkSize && currentChunk.length >= this.minChunkSize) {
        chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        // Add sentence to current chunk
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    
    // Add any remaining content
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
  
  /**
   * Creates a DocumentChunk object
   * @param document Parent document
   * @param content Chunk content
   * @param chunkIndex Index of the chunk in the document
   * @param contentType Type of content
   * @param sectionTitle Title of the section
   * @param pageNumber Page number
   * @returns DocumentChunk object
   */
  protected createChunk(
    document: Document,
    content: string,
    chunkIndex: number,
    contentType: string = 'text',
    sectionTitle?: string,
    pageNumber?: number
  ): DocumentChunk {
    return {
      id: uuidv4(),
      documentId: document.id,
      filename: document.filename,
      content: content.trim(),
      chunkIndex,
      contentType,
      title: document.title,
      sectionTitle,
      location: {
        pageNumber: pageNumber !== undefined ? pageNumber : -1,
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
