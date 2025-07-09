/**
 * Document chunk model definition
 * Represents a semantically meaningful portion of a document
 */

export interface DocumentChunk {
  id: string;
  content: string;
  documentId: string;
  documentTitle: string;
  documentUrl?: string;
  courseId: string;
  courseTitle?: string;
  
  // Chunk metadata
  chunkIndex: number;
  totalChunks: number;
  chunkType: 'text' | 'heading' | 'table' | 'list' | 'procedure' | 'image_caption' | 'code' | 'other';
  
  // Structural metadata
  heading?: string;
  precedingHeadings?: string[];
  sectionNumber?: string;
  hierarchyLevel?: number;
  
  // Content metadata
  startOffset?: number;
  endOffset?: number;
  pageNumber?: number;
  
  // References and relationships
  references?: string[];
  relatedChunks?: string[];
  
  // Semantic metadata
  namedEntities?: string[];
  keywords?: string[];
  
  // Vector representation
  contentVector?: number[];
  
  // Source document metadata
  fileType?: string;
  classification?: string;
  publicationNumber?: string;
  revisionNumber?: string;
  
  // Additional metadata
  metadata?: Record<string, any>;
}
