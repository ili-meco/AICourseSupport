import { DocumentChunk } from '../../../../models/DocumentChunk';
import { Document } from '../../../../models/Document';
import { ExtractedContent } from '../../extraction/ContentExtractionService';
import { TextChunker } from './TextChunker';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chunker for structured documents with clear sections and hierarchy
 */
export class StructuredDocumentChunker {
  private readonly textChunker: TextChunker;
  
  /**
   * Creates a new instance of StructuredDocumentChunker
   * @param minChunkSize Minimum size of chunks in characters
   * @param maxChunkSize Maximum size of chunks in characters
   * @param chunkOverlap Overlap between chunks in characters
   */
  constructor(
    private readonly minChunkSize: number = 100,
    private readonly maxChunkSize: number = 1500,
    private readonly chunkOverlap: number = 150
  ) {
    this.textChunker = new TextChunker(minChunkSize, maxChunkSize, chunkOverlap);
  }
  
  /**
   * Chunks a document based on its structure
   * @param document Document metadata
   * @param extractedContent Extracted content from the document
   * @returns Array of document chunks
   */
  public async chunk(
    document: Document,
    extractedContent: ExtractedContent
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const { sections } = extractedContent;
    
    if (sections.length === 0) {
      console.warn(`Document ${document.id} has no sections to chunk`);
      return this.textChunker.chunk(document, extractedContent);
    }
    
    // Build a section hierarchy
    const sectionHierarchy = this.buildSectionHierarchy(sections);
    
    // Process each section in context of its hierarchy
    let chunkIndex = 0;
    
    for (const section of sections) {
      // Skip empty sections
      if (!section.content || section.content.trim() === '') continue;
      
      // Get the section path in the hierarchy
      const sectionPath = this.getSectionPath(sectionHierarchy, section);
      
      // If the section is small enough, keep it as a single chunk
      if (section.content.length <= this.maxChunkSize) {
        chunks.push(this.createStructuredChunk(
          document,
          section.content,
          chunkIndex++,
          'structured-text',
          section.title,
          section.level,
          sectionPath,
          section.pageNumber
        ));
        continue;
      }
      
      // For larger sections, use TextChunker to split the content
      const sectionChunks = this.textChunker.splitTextIntoChunks(
        section.content,
        chunkIndex,
        section.title,
        section.pageNumber
      );
      
      chunks.push(...sectionChunks.map(({ content, index }) => 
        this.createStructuredChunk(
          document,
          content,
          index,
          'structured-text',
          section.title,
          section.level,
          sectionPath,
          section.pageNumber
        )
      ));
      
      chunkIndex = sectionChunks.length + chunkIndex;
    }
    
    return chunks;
  }
  
  /**
   * Builds a hierarchical representation of document sections
   * @param sections Flat list of document sections
   * @returns Hierarchical representation of sections
   */
  private buildSectionHierarchy(sections: any[]): any[] {
    const hierarchy: any[] = [];
    const sectionsByLevel: {[key: number]: any[]} = {};
    
    // First pass: group sections by level
    sections.forEach(section => {
      if (!sectionsByLevel[section.level]) {
        sectionsByLevel[section.level] = [];
      }
      sectionsByLevel[section.level].push({
        ...section,
        children: []
      });
    });
    
    // Get all levels and sort them
    const levels = Object.keys(sectionsByLevel)
      .map(level => parseInt(level, 10))
      .sort((a, b) => a - b);
    
    if (levels.length === 0) return hierarchy;
    
    // Top level sections go directly into the hierarchy
    const minLevel = levels[0];
    hierarchy.push(...sectionsByLevel[minLevel]);
    
    // Process each subsequent level
    for (let i = 1; i < levels.length; i++) {
      const currentLevel = levels[i];
      const parentLevel = this.findClosestParentLevel(levels, currentLevel);
      
      // Assign each section at this level to its parent
      for (const section of sectionsByLevel[currentLevel]) {
        const parent = this.findParentSection(sectionsByLevel[parentLevel], section);
        if (parent) {
          parent.children.push(section);
        } else {
          // If no parent found, add to top level
          hierarchy.push(section);
        }
      }
    }
    
    return hierarchy;
  }
  
  /**
   * Finds the closest parent level for a given level
   * @param levels Array of available levels
   * @param currentLevel The level to find a parent for
   * @returns The closest parent level
   */
  private findClosestParentLevel(levels: number[], currentLevel: number): number {
    // Find the highest level that is lower than the current level
    return Math.max(...levels.filter(level => level < currentLevel));
  }
  
  /**
   * Finds the parent section for a given section
   * @param possibleParents Array of possible parent sections
   * @param section The section to find a parent for
   * @returns The parent section or null if not found
   */
  private findParentSection(possibleParents: any[], section: any): any {
    // Find the last parent that appears before this section
    let lastPossibleParent = null;
    
    for (const parent of possibleParents) {
      if (!parent.pageNumber || !section.pageNumber) {
        // If we don't have page numbers, just use the last parent we've seen
        lastPossibleParent = parent;
      } 
      else if (parent.pageNumber <= section.pageNumber) {
        lastPossibleParent = parent;
      } else {
        // This parent is on a later page, so stop looking
        break;
      }
    }
    
    return lastPossibleParent;
  }
  
  /**
   * Gets the path to a section in the hierarchy
   * @param hierarchy Section hierarchy
   * @param targetSection The section to find
   * @param currentPath Current path in the hierarchy
   * @returns Array of section titles forming the path
   */
  private getSectionPath(
    hierarchy: any[],
    targetSection: any,
    currentPath: string[] = []
  ): string[] {
    for (const section of hierarchy) {
      // Check if this is the target section
      if (section.title === targetSection.title && 
          section.pageNumber === targetSection.pageNumber && 
          section.level === targetSection.level) {
        return [...currentPath, section.title];
      }
      
      // Check children
      if (section.children && section.children.length > 0) {
        const result = this.getSectionPath(
          section.children,
          targetSection,
          [...currentPath, section.title]
        );
        
        if (result.length > 0) {
          return result;
        }
      }
    }
    
    return [];
  }
  
  /**
   * Creates a DocumentChunk object with structural information
   * @param document Parent document
   * @param content Chunk content
   * @param chunkIndex Index of the chunk in the document
   * @param contentType Type of content
   * @param sectionTitle Title of the section
   * @param sectionLevel Level of the section in the hierarchy
   * @param sectionHierarchy Path of sections leading to this chunk
   * @param pageNumber Page number
   * @returns DocumentChunk object
   */
  private createStructuredChunk(
    document: Document,
    content: string,
    chunkIndex: number,
    contentType: string = 'structured-text',
    sectionTitle?: string,
    sectionLevel?: number,
    sectionHierarchy?: string[],
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
      sectionTitle: sectionTitle || '',
      sectionHierarchy: sectionHierarchy && sectionHierarchy.length > 0 ? sectionHierarchy : undefined,
      location: {
        pageNumber: pageNumber !== undefined ? pageNumber : -1,
        sectionPath: sectionHierarchy,
      },
      metadata: {
        sectionLevel,
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
