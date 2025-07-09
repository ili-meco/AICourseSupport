/**
 * Represents a document to be processed by the semantic chunking and indexing pipeline.
 */
export interface Document {
  /**
   * Unique identifier for the document
   */
  id: string;
  
  /**
   * Original filename of the document
   */
  filename: string;
  
  /**
   * MIME type of the document (e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
   */
  contentType: string;
  
  /**
   * URL or URI to access the document content
   */
  sourceUrl: string;
  
  /**
   * Size of the document in bytes
   */
  size: number;
  
  /**
   * When the document was last modified
   */
  lastModified: Date;
  
  /**
   * When the document was created or uploaded
   */
  createdAt: Date;
  
  /**
   * Document title, if available
   */
  title?: string;
  
  /**
   * Document author(s), if available
   */
  authors?: string[];
  
  /**
   * Publication or creation date of the document content
   */
  publicationDate?: Date;
  
  /**
   * Document version or revision number
   */
  version?: string;
  
  /**
   * Classification level (e.g., 'Unclassified', 'Secret')
   */
  classification?: string;
  
  /**
   * Organization or department that created the document
   */
  organization?: string;
  
  /**
   * Tags associated with the document for categorization
   */
  tags?: string[];
  
  /**
   * Any additional metadata extracted from the document
   */
  metadata?: Record<string, any>;
}
