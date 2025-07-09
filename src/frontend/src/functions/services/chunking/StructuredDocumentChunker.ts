/**
 * Structured Document Chunker Strategy
 * Advanced chunking strategy for documents with clear hierarchical structure
 */

import { DocumentChunk } from "../../../../models/DocumentChunk";
import { Document } from "../../../../models/Document";
import { ChunkingOptions } from "../AdaptiveChunkingService";
import { TextChunker } from "./TextChunker";
import { v4 as uuidv4 } from 'uuid';

interface DocumentSection {
  level: number;
  heading: string;
  content: string;
  sectionNumber?: string;
  subSections: DocumentSection[];
}

interface ContentBlock {
  type: 'text' | 'heading' | 'table' | 'list' | 'procedure' | 'image_caption' | 'code' | 'other';
  content: string;
  metadata?: any;
}

export class StructuredDocumentChunker {
  private readonly textChunker: TextChunker;
  
  constructor(
    private readonly minChunkSize: number = 100,
    private readonly maxChunkSize: number = 1500,
    private readonly chunkOverlap: number = 150
  ) {
    this.textChunker = new TextChunker();
  }

  /**
   * Main chunking method that aligns with the interface expected by AdaptiveChunkingService
   */
  public async chunk(
    document: Document,
    extractedContent: any
  ): Promise<DocumentChunk[]> {
    // If no structured content is available, fall back to the text chunker
    if (!extractedContent.sections || extractedContent.sections.length === 0) {
      return this.textChunker.chunk(document, extractedContent);
    }
    
    // Process structured content
    const options: ChunkingOptions = {
      minChunkSize: this.minChunkSize,
      maxChunkSize: this.maxChunkSize,
      overlapSize: this.chunkOverlap
    };
    
    // Convert from the extracted content sections to our internal DocumentSection format
    const sections: DocumentSection[] = this.convertToDocumentSections(extractedContent.sections);
    
    // Use our implementation to chunk structured content
    return this.processStructuredDocument(document.id, sections, document, options);
  }
  
  /**
   * Convert the extracted content sections to our internal DocumentSection format
   */
  private convertToDocumentSections(sections: any[]): DocumentSection[] {
    const result: DocumentSection[] = [];
    
    for (const section of sections) {
      result.push({
        level: section.level || 0,
        heading: section.title || '',
        content: section.content || '',
        sectionNumber: this.extractSectionNumber(section.title || ''),
        subSections: []
      });
    }
    
    return this.buildHierarchy(result);
  }
  
  /**
   * Extract section number from heading if present
   */
  private extractSectionNumber(heading: string): string | undefined {
    // Extract patterns like "1.2.3" or "Section 1.2.3" or "Chapter 5"
    const match = heading.match(/^(?:(?:Section|Chapter|Part)\s+)?([0-9]+(?:\.[0-9]+)*)/i);
    return match ? match[1] : undefined;
  }
  
  /**
   * Build a hierarchy of sections from a flat list
   */
  private buildHierarchy(sections: DocumentSection[]): DocumentSection[] {
    if (sections.length === 0) return [];
    
    // Sort sections by their appearance order
    const sortedSections = [...sections];
    
    // Find the root sections (lowest level number)
    const minLevel = Math.min(...sortedSections.map(s => s.level));
    const rootSections = sortedSections.filter(s => s.level === minLevel);
    
    // Process each root section
    for (let i = 0; i < rootSections.length; i++) {
      const rootSection = rootSections[i];
      const nextRootIndex = i < rootSections.length - 1 ? 
        sortedSections.indexOf(rootSections[i + 1]) : 
        sortedSections.length;
      
      // Get all sections between this root and the next
      const childSectionIndexes = [];
      for (let j = sortedSections.indexOf(rootSection) + 1; j < nextRootIndex; j++) {
        if (sortedSections[j].level > rootSection.level) {
          childSectionIndexes.push(j);
        }
      }
      
      if (childSectionIndexes.length > 0) {
        const childSections = childSectionIndexes.map(idx => sortedSections[idx]);
        rootSection.subSections = this.buildHierarchy(childSections);
      }
    }
    
    return rootSections;
  }
  
  /**
   * Chunk structured document content
   */
  public chunkContent(
    documentId: string,
    content: string,
    document: Document,
    documentAnalysis: any,
    options: ChunkingOptions
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    try {
      // Step 1: Extract document structure
      const documentStructure = this.extractDocumentStructure(content, documentAnalysis.documentType);
      
      // Step 2: Process each section in the document structure
      let chunkIndex = 0;
      
      // Process the entire document structure recursively
      chunkIndex = this.processDocumentSections(
        documentId,
        document,
        documentStructure,
        chunks,
        chunkIndex,
        options
      );
      
      // Step 3: Update total chunks count
      const totalChunks = chunks.length;
      chunks.forEach(chunk => chunk.totalChunks = totalChunks);
      
      return chunks;
    } catch (error: any) {
      console.error(`Error in structured chunking: ${error.message}`);
      
      // Fallback to simpler chunking if structured approach fails
      return this.fallbackChunking(documentId, content, document, options);
    }
  }
  
  /**
   * Extract document structure from content
   */
  private extractDocumentStructure(content: string, documentType: string): DocumentSection[] {
    // Different document types may have different structure extraction logic
    switch (documentType) {
      case 'technical_manual':
        return this.extractTechnicalManualStructure(content);
      case 'training_material':
        return this.extractTrainingMaterialStructure(content);
      case 'policy':
        return this.extractPolicyDocumentStructure(content);
      default:
        return this.extractGenericDocumentStructure(content);
    }
  }
  
  /**
   * Extract technical manual structure
   */
  private extractTechnicalManualStructure(content: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    
    // Split content into lines for analysis
    const lines = content.split('\n');
    
    // Current section being built
    let currentSection: DocumentSection | null = null;
    let currentLevel = 0;
    
    // Pattern to detect section headings in technical manuals
    const sectionPattern = /^(\s*)(\d+(\.\d+)*)\.?\s+([A-Z][\w\s\-:]+)$/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if this line is a section heading
      const sectionMatch = line.match(sectionPattern);
      
      if (sectionMatch) {
        // This is a section heading
        const sectionNumber = sectionMatch[2];
        const heading = sectionMatch[4].trim();
        const level = sectionNumber.split('.').length;
        
        // Create a new section
        const newSection: DocumentSection = {
          level,
          heading,
          content: '',
          sectionNumber,
          subSections: []
        };
        
        // Add section to the appropriate parent
        if (level === 1) {
          // Top level section
          sections.push(newSection);
          currentSection = newSection;
          currentLevel = level;
        } else if (currentSection) {
          // Find the appropriate parent section
          let parentSection = currentSection;
          
          // Go up in the hierarchy until we find the right parent
          while (parentSection && parentSection.level >= level - 1) {
            if (parentSection.level === level - 1) {
              parentSection.subSections.push(newSection);
              break;
            }
            // TODO: Fix this by tracking the parent sections properly
            // Skip this section as we can't find a parent
          }
          
          currentSection = newSection;
          currentLevel = level;
        }
      } else if (currentSection) {
        // Add content to current section
        if (currentSection.content) {
          currentSection.content += '\n' + line;
        } else {
          currentSection.content = line;
        }
      }
    }
    
    return sections;
  }
  
  /**
   * Extract training material structure
   */
  private extractTrainingMaterialStructure(content: string): DocumentSection[] {
    // Similar to technical manual but with different patterns
    // For brevity, this is a simplified version
    return this.extractGenericDocumentStructure(content);
  }
  
  /**
   * Extract policy document structure
   */
  private extractPolicyDocumentStructure(content: string): DocumentSection[] {
    // Similar to technical manual but with different patterns
    // For brevity, this is a simplified version
    return this.extractGenericDocumentStructure(content);
  }
  
  /**
   * Extract generic document structure
   */
  private extractGenericDocumentStructure(content: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    
    // Split by common heading patterns
    // This is a simplified approach - a real implementation would be more robust
    
    // Pattern for headings (e.g., "1. Introduction", "2.3 Configuration", etc.)
    const headingPatterns = [
      /^(\d+(\.\d+)*)\.?\s+([A-Z][\w\s\-:]+)$/,  // Numbered headings
      /^([A-Z][A-Z\s]{5,50})$/,                  // All caps headings
      /^([\w\s\-]{3,50}):$/                      // Headings ending with colon
    ];
    
    // Split content into paragraphs
    const paragraphs = content.split(/\n\s*\n/);
    
    let currentSection: DocumentSection | null = null;
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      // Skip empty paragraphs
      if (!trimmedParagraph) continue;
      
      // Check if this paragraph is a heading
      let isHeading = false;
      let headingLevel = 1;
      let headingText = '';
      let sectionNumber = '';
      
      for (const pattern of headingPatterns) {
        const match = trimmedParagraph.match(pattern);
        if (match) {
          isHeading = true;
          if (match[1].includes('.')) {
            // Numbered heading
            sectionNumber = match[1];
            headingText = match[3] || match[1];
            headingLevel = sectionNumber.split('.').length;
          } else {
            // Non-numbered heading
            headingText = match[1];
            headingLevel = 1;
          }
          break;
        }
      }
      
      if (isHeading) {
        // Create a new section
        const newSection: DocumentSection = {
          level: headingLevel,
          heading: headingText,
          content: '',
          sectionNumber,
          subSections: []
        };
        
        // Add to top level if level 1 heading
        if (headingLevel === 1) {
          sections.push(newSection);
        } else if (sections.length > 0) {
          // Add to last top-level section for simplicity
          // In a real implementation, this would use proper parent-child relationship
          sections[sections.length - 1].subSections.push(newSection);
        }
        
        currentSection = newSection;
      } else if (currentSection) {
        // Add content to current section
        if (currentSection.content) {
          currentSection.content += '\n\n' + trimmedParagraph;
        } else {
          currentSection.content = trimmedParagraph;
        }
      } else {
        // Handle content before any heading
        const introSection: DocumentSection = {
          level: 0,
          heading: "Introduction",
          content: trimmedParagraph,
          subSections: []
        };
        sections.push(introSection);
        currentSection = introSection;
      }
    }
    
    return sections;
  }
  
  /**
   * Process document sections and create chunks
   */
  private processDocumentSections(
    documentId: string,
    document: Document,
    sections: DocumentSection[],
    chunks: DocumentChunk[],
    chunkIndex: number,
    options: ChunkingOptions
  ): number {
    // Process each top-level section
    for (const section of sections) {
      // Process this section
      chunkIndex = this.processSection(
        documentId,
        document,
        section,
        chunks,
        chunkIndex,
        options,
        []  // No preceding headings for top-level
      );
      
      // Process subsections
      for (const subSection of section.subSections) {
        chunkIndex = this.processSection(
          documentId,
          document,
          subSection,
          chunks,
          chunkIndex,
          options,
          [section.heading]  // Top-level heading as preceding
        );
        
        // Process nested subsections (simplified, non-recursive for brevity)
        for (const nestedSubSection of subSection.subSections) {
          chunkIndex = this.processSection(
            documentId,
            document,
            nestedSubSection,
            chunks,
            chunkIndex,
            options,
            [section.heading, subSection.heading]  // Heading hierarchy
          );
        }
      }
    }
    
    return chunkIndex;
  }
  
  /**
   * Process a single section and create chunks
   */
  private processSection(
    documentId: string,
    document: Document,
    section: DocumentSection,
    chunks: DocumentChunk[],
    chunkIndex: number,
    options: ChunkingOptions,
    precedingHeadings: string[]
  ): number {
    // First, create a chunk for the section heading and introduction if substantial
    if (section.heading) {
      // Combine heading with first paragraph as introduction
      const contentParts = section.content.split(/\n\s*\n/);
      const introContent = contentParts.length > 0 ? contentParts[0] : '';
      
      if (introContent.length > 0) {
        const headingChunk = this.createChunk(
          documentId,
          document,
          `${section.heading}\n\n${introContent}`,
          chunkIndex++,
          'heading',
          section.heading,
          precedingHeadings,
          section.sectionNumber,
          section.level
        );
        chunks.push(headingChunk);
      }
      
      // If the section has substantial content beyond the intro, process it
      if (contentParts.length > 1) {
        // Get remaining content after intro
        const remainingContent = contentParts.slice(1).join('\n\n');
        
        // Extract content blocks (tables, lists, paragraphs)
        const contentBlocks = this.extractContentBlocks(remainingContent);
        
        // Process each content block
        for (const block of contentBlocks) {
          // If the block is small enough, add it as a single chunk
          if (block.content.length <= options.maxChunkSize!) {
            chunks.push(this.createChunk(
              documentId,
              document,
              block.content,
              chunkIndex++,
              block.type,
              section.heading,
              precedingHeadings,
              section.sectionNumber,
              section.level
            ));
          } else {
            // Split large blocks while preserving semantic meaning
            const subBlocks = this.splitContentBlock(block, options.targetChunkSize!);
            
            for (const subBlock of subBlocks) {
              chunks.push(this.createChunk(
                documentId,
                document,
                subBlock,
                chunkIndex++,
                block.type,
                section.heading,
                precedingHeadings,
                section.sectionNumber,
                section.level
              ));
            }
          }
        }
      }
    }
    
    return chunkIndex;
  }
  
  /**
   * Extract content blocks from text (tables, lists, paragraphs, etc.)
   */
  private extractContentBlocks(content: string): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    
    // Split content into potential blocks by double newlines
    const rawBlocks = content.split(/\n\s*\n/);
    
    for (const rawBlock of rawBlocks) {
      const trimmedBlock = rawBlock.trim();
      if (!trimmedBlock) continue;
      
      // Determine block type
      let blockType: 'text' | 'heading' | 'table' | 'list' | 'procedure' | 'image_caption' | 'code' | 'other' = 'text';
      
      // Detect tables
      if (
        /\|.+\|.+\|/.test(trimmedBlock) || // Markdown-style tables
        /\+[-+]+\+/.test(trimmedBlock)   // ASCII tables
      ) {
        blockType = 'table';
      }
      // Detect lists
      else if (
        /^[\s]*[\*\-•][\s]/.test(trimmedBlock) || // Bullet lists
        /^[\s]*\d+\.[\s]/.test(trimmedBlock)    // Numbered lists
      ) {
        blockType = 'list';
      }
      // Detect procedure steps
      else if (
        /^STEP\s+\d+[\.\:]|^[\(]?[0-9a-zA-Z][\.\)][\s]+/.test(trimmedBlock)
      ) {
        blockType = 'procedure';
      }
      // Detect code blocks
      else if (
        trimmedBlock.startsWith('```') ||
        /^[\s]{4}/.test(trimmedBlock)
      ) {
        blockType = 'code';
      }
      
      blocks.push({
        type: blockType,
        content: trimmedBlock
      });
    }
    
    return blocks;
  }
  
  /**
   * Split a large content block while preserving semantic meaning
   */
  private splitContentBlock(block: ContentBlock, targetSize: number): string[] {
    const result: string[] = [];
    
    // Special handling for different block types
    switch (block.type) {
      case 'table':
      case 'procedure':
      case 'code':
        // For these types, we don't split them to preserve meaning
        result.push(block.content);
        break;
        
      case 'list':
        // Split lists by list items
        const listItems = block.content.split(/\n(?=[\s]*[\*\-•\d])/);
        let listChunk = '';
        
        for (const item of listItems) {
          if ((listChunk.length + item.length) > targetSize && listChunk.length > 0) {
            result.push(listChunk);
            listChunk = item;
          } else {
            if (listChunk.length > 0) {
              listChunk += '\n';
            }
            listChunk += item;
          }
        }
        
        if (listChunk.length > 0) {
          result.push(listChunk);
        }
        break;
        
      default:
        // For plain text, split by sentences
        const sentences = block.content.split(/(?<=[.!?])\s+/);
        let textChunk = '';
        
        for (const sentence of sentences) {
          if ((textChunk.length + sentence.length) > targetSize && textChunk.length > 0) {
            result.push(textChunk);
            textChunk = sentence;
          } else {
            if (textChunk.length > 0) {
              textChunk += ' ';
            }
            textChunk += sentence;
          }
        }
        
        if (textChunk.length > 0) {
          result.push(textChunk);
        }
    }
    
    return result;
  }
  
  /**
   * Create a chunk object with appropriate metadata
   */
  private createChunk(
    documentId: string,
    document: Document,
    content: string,
    chunkIndex: number,
    chunkType: 'text' | 'heading' | 'table' | 'list' | 'procedure' | 'image_caption' | 'code' | 'other',
    heading?: string,
    precedingHeadings?: string[],
    sectionNumber?: string,
    hierarchyLevel?: number
  ): DocumentChunk {
    // Extract entities from content
    const keywords = this.extractKeywords(content);
    
    // References/citations in the text
    const references = this.extractReferences(content);
    
    return {
      id: `${documentId}-chunk-${chunkIndex}`,
      content,
      documentId,
      documentTitle: document.title,
      documentUrl: document.url,
      courseId: document.courseId,
      courseTitle: document.courseTitle,
      chunkIndex,
      totalChunks: 0,  // Will be updated later
      chunkType,
      heading,
      precedingHeadings,
      sectionNumber,
      hierarchyLevel,
      keywords,
      references,
      fileType: document.fileType,
      classification: document.classification,
      publicationNumber: document.publicationNumber,
      revisionNumber: document.revisionNumber
    };
  }
  
  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - get capitalized terms and phrases
    const capitalized = content.match(/\b[A-Z][A-Za-z]{2,}\b/g) || [];
    const acronyms = content.match(/\b[A-Z]{2,}\b/g) || [];
    
    // Combine and get unique keywords
    const combined = [...capitalized, ...acronyms];
    const unique = combined.filter((value, index, self) => self.indexOf(value) === index);
    
    return unique.slice(0, 15);  // Limit to 15 keywords
  }
  
  /**
   * Extract references to other sections
   */
  private extractReferences(content: string): string[] {
    // Look for references to other sections, figures, tables, etc.
    const sectionRefs = content.match(/Section\s+\d+(\.\d+)*/gi) || [];
    const figureRefs = content.match(/Figure\s+\d+(\.\d+)*/gi) || [];
    const tableRefs = content.match(/Table\s+\d+(\.\d+)*/gi) || [];
    
    // Combine all references
    return [...sectionRefs, ...figureRefs, ...tableRefs];
  }
  
  /**
   * Fallback to simpler chunking if structured approach fails
   */
  private fallbackChunking(
    documentId: string,
    content: string,
    document: Document,
    options: ChunkingOptions
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    // Simple paragraph-based chunking
    const paragraphs = content.split(/\n\s*\n/);
    
    let currentChunk = "";
    let currentChunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) continue;
      
      // If adding this paragraph would exceed chunk size
      if ((currentChunk.length + trimmedParagraph.length > options.maxChunkSize!) && currentChunk.length > 0) {
        // Add current chunk to results
        chunks.push({
          id: `${documentId}-chunk-${currentChunkIndex}`,
          content: currentChunk,
          documentId,
          documentTitle: document.title,
          documentUrl: document.url,
          courseId: document.courseId,
          courseTitle: document.courseTitle,
          chunkIndex: currentChunkIndex,
          totalChunks: 0,  // Will be updated later
          chunkType: 'text'
        });
        
        // Start new chunk
        currentChunkIndex++;
        currentChunk = trimmedParagraph;
      } else {
        // Add to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n';
        }
        currentChunk += trimmedParagraph;
      }
    }
    
    // Add the final chunk if there's content
    if (currentChunk.length > 0) {
      chunks.push({
        id: `${documentId}-chunk-${currentChunkIndex}`,
        content: currentChunk,
        documentId,
        documentTitle: document.title,
        documentUrl: document.url,
        courseId: document.courseId,
        courseTitle: document.courseTitle,
        chunkIndex: currentChunkIndex,
        totalChunks: 0,  // Will be updated later
        chunkType: 'text'
      });
    }
    
    // Update total chunks count
    const totalChunks = chunks.length;
    chunks.forEach(chunk => chunk.totalChunks = totalChunks);
    
    return chunks;
  }
  
  /**
   * Process structured document content and create appropriate chunks
   */
  private processStructuredDocument(
    documentId: string,
    sections: DocumentSection[],
    document: Document,
    options: ChunkingOptions
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;
    
    // Process each top-level section
    for (const section of sections) {
      this.processSection(documentId, document, section, chunks, chunkIndex, options, []);
      chunkIndex += section.content ? 1 : 0;
      
      // Process subsections recursively
      if (section.subSections && section.subSections.length > 0) {
        for (const subSection of section.subSections) {
          this.processSection(documentId, document, subSection, chunks, chunkIndex, options, [section.heading]);
          chunkIndex += subSection.content ? 1 : 0;
        }
      }
    }
    
    // Update total chunks count
    const totalChunks = chunks.length;
    chunks.forEach(chunk => chunk.totalChunks = totalChunks);
    
    return chunks;
  }
  

}
