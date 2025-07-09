/**
 * Document model definition
 * Represents metadata for documents stored in the system
 */

export interface Document {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  url?: string;
  blobName: string;
  fileType: string;
  fileSize: number;
  pageCount?: number;
  author?: string;
  createdDate?: string;
  modifiedDate?: string;
  classification?: string;
  publicationNumber?: string;
  revisionNumber?: string;
  processingStatus: 'pending' | 'processing' | 'complete' | 'error';
  errorDetails?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}
