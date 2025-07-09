/**
 * SharePoint and Blob Storage service for interacting with documents
 */

import { apiRequest, ApiResponse } from './api-client';

// SharePoint sync response type
export interface SharePointSyncResult {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  processedFileDetails: {
    fileName: string;
    originalUrl: string;
    extractedText: string;
    fileSize: number;
    processedAt: string;
    contentType: string;
  }[];
  errors: string[];
}

// Document metadata type
export interface DocumentMetadata {
  id: string;
  name: string;
  contentType: string;
  size: number;
  lastModified: string;
  url: string;
  course?: string;
  category?: string;
}

/**
 * Trigger SharePoint to Blob synchronization
 */
export async function syncSharePointContent(
  fileTypes: string[] = ['pdf', 'docx', 'pptx'],
  daysBack: number = 30,
  maxFiles: number = 100
): Promise<ApiResponse<SharePointSyncResult>> {
  const queryParams = new URLSearchParams({
    fileTypes: fileTypes.join(','),
    daysBack: daysBack.toString(),
    maxFiles: maxFiles.toString(),
  }).toString();
  
  return apiRequest<SharePointSyncResult>(
    `/api/SharePointToBlobSyncV2?${queryParams}`,
    { method: 'POST' }
  );
}

/**
 * Get documents for a specific course
 */
export async function getDocumentsForCourse(
  courseId: string,
  filter?: string
): Promise<ApiResponse<DocumentMetadata[]>> {
  let url = `/api/GetDocuments?courseId=${encodeURIComponent(courseId)}`;
  
  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`;
  }
  
  return apiRequest<DocumentMetadata[]>(url);
}

/**
 * Search across all document content
 */
export async function searchDocumentContent(
  query: string,
  courseId?: string
): Promise<ApiResponse<{
  query: string;
  results: {
    documentId: string;
    documentName: string;
    relevanceScore: number;
    snippets: string[];
  }[]
}>> {
  let url = `/api/SearchDocuments?query=${encodeURIComponent(query)}`;
  
  if (courseId) {
    url += `&courseId=${encodeURIComponent(courseId)}`;
  }
  
  return apiRequest<{
    query: string;
    results: {
      documentId: string;
      documentName: string;
      relevanceScore: number;
      snippets: string[];
    }[]
  }>(url);
}

/**
 * Get document content by ID
 */
export async function getDocumentContent(
  documentId: string
): Promise<ApiResponse<{
  metadata: DocumentMetadata;
  content: string;
}>> {
  return apiRequest<{
    metadata: DocumentMetadata;
    content: string;
  }>(`/api/GetDocumentContent?id=${encodeURIComponent(documentId)}`);
}
