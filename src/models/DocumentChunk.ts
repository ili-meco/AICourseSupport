/**
 * Represents a semantically meaningful chunk of a document for vector indexing.
 */
export interface DocumentChunk {
  /**
   * Unique identifier for the chunk
   */
  id: string;
  
  /**
   * Reference to the parent document's ID
   */
  documentId: string;
  
  /**
   * Original filename of the document
   */
  filename: string;
  
  /**
   * The actual text content of the chunk
   */
  content: string;
  
  /**
   * Vector embedding of the chunk content
   */
  embedding?: number[];
  
  /**
   * Sequential number of the chunk within the document
   */
  chunkIndex: number;
  
  /**
   * Type of content in the chunk (e.g., 'text', 'table', 'image-caption', 'header')
   */
  contentType: string;
  
  /**
   * Location information for the chunk within the document (e.g., page number, paragraph number)
   */
  location?: {
    pageNumber?: number;
    paragraphNumber?: number;
    sectionPath?: string[];
  };
  
  /**
   * Section title/header this chunk belongs to, if applicable
   */
  sectionTitle?: string;
  
  /**
   * Document title
   */
  title?: string;
  
  /**
   * Hierarchy of section headers this chunk falls under
   */
  sectionHierarchy?: string[];
  
  /**
   * Tags or keywords associated with this chunk
   */
  tags?: string[];
  
  /**
   * Additional metadata extracted specifically for this chunk
   */
  metadata?: Record<string, any>;
  
  /**
   * Classification level (e.g., 'Unclassified', 'Secret')
   */
  classification?: string;
  
  /**
   * Hash or checksum of the chunk content, useful for deduplication and tracking changes
   */
  contentHash?: string;
  
  /**
   * The timestamp when this chunk was created
   */
  createdAt: Date;
  
  /**
   * The timestamp when this chunk was last updated
   */
  updatedAt: Date;
}
