import { DocumentChunk } from '../../../models/DocumentChunk';
import { Document } from '../../../models/Document';
import { ExtractedContent } from '../extraction/ContentExtractionService';
import { TextChunker } from './strategies/TextChunker';
import { StructuredDocumentChunker } from './strategies/StructuredDocumentChunker';
import { TableChunker } from './strategies/TableChunker';
import { createHash } from 'crypto';

/**
 * Service that handles adaptive chunking of document content
 */
export class AdaptiveChunkingService {
  private readonly textChunker: TextChunker;
  private readonly structuredDocumentChunker: StructuredDocumentChunker;
  private readonly tableChunker: TableChunker;
  
  /**
   * Creates a new instance of AdaptiveChunkingService
   * @param minChunkSize Minimum chunk size in characters
   * @param maxChunkSize Maximum chunk size in characters
   * @param chunkOverlap Number of characters to overlap between chunks
   */
  constructor(
    private readonly minChunkSize: number = 100,
    private readonly maxChunkSize: number = 1500,
    private readonly chunkOverlap: number = 150
  ) {
    this.textChunker = new TextChunker(minChunkSize, maxChunkSize, chunkOverlap);
    this.structuredDocumentChunker = new StructuredDocumentChunker(minChunkSize, maxChunkSize, chunkOverlap);
    this.tableChunker = new TableChunker();
  }
  
  /**
   * Chunks a document based on its content and structure
   * @param document Document metadata
   * @param extractedContent Extracted content from the document
   * @returns Array of document chunks
   */
  public async chunkDocument(
    document: Document,
    extractedContent: ExtractedContent
  ): Promise<DocumentChunk[]> {
    try {
      console.log(`Chunking document ${document.id} using adaptive chunking`);
      
      // Analyze document structure to determine the best chunking strategy
      const documentType = this.analyzeDocumentType(extractedContent);
      
      let chunks: DocumentChunk[];
      
      switch (documentType) {
        case 'structured':
          console.log(`Using structured document chunker for ${document.id}`);
          chunks = await this.structuredDocumentChunker.chunk(document, extractedContent);
          break;
          
        case 'table-heavy':
          console.log(`Using mixed chunking for table-heavy document ${document.id}`);
          // For documents with many tables, we use a mix of strategies
          const tableChunks = await this.chunkTables(document, extractedContent);
          const textChunks = await this.textChunker.chunk(document, extractedContent);
          
          // Merge and sort chunks by their location
          chunks = [...tableChunks, ...textChunks].sort((a, b) => {
            const aPageNum = a.location?.pageNumber || 0;
            const bPageNum = b.location?.pageNumber || 0;
            return aPageNum - bPageNum;
          });
          break;
          
        case 'spreadsheet':
          console.log(`Using table chunker for spreadsheet ${document.id}`);
          chunks = await this.chunkTables(document, extractedContent);
          break;
          
        default: // 'text' or unknown
          console.log(`Using default text chunker for ${document.id}`);
          chunks = await this.textChunker.chunk(document, extractedContent);
          break;
      }
      
      // Add content hashes and metadata
      return chunks.map(chunk => ({
        ...chunk,
        contentHash: this.generateContentHash(chunk.content),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      
    } catch (error) {
      console.error(`Error chunking document ${document.id}:`, error);
      throw new Error(`Failed to chunk document: ${error.message}`);
    }
  }
  
  /**
   * Analyzes the document to determine the best chunking strategy
   * @param extractedContent Extracted content from the document
   * @returns Document type classification
   */
  private analyzeDocumentType(extractedContent: ExtractedContent): 'text' | 'structured' | 'table-heavy' | 'spreadsheet' {
    const { structure, sections } = extractedContent;
    
    // Check if it's a spreadsheet
    if (structure.isSpreadsheet) {
      return 'spreadsheet';
    }
    
    // Check if the document has a clear structure with headings
    const hasStructure = sections.length > 1 && sections.some(s => s.title && s.title.trim() !== '');
    
    // Check if the document has tables
    const hasTableStructure = structure.hasTables || sections.some(s => s.table && s.table.length > 0);
    
    // Count sections with tables
    const sectionsWithTables = sections.filter(s => s.table && s.table.length > 0).length;
    const tableRatio = sectionsWithTables / Math.max(1, sections.length);
    
    if (tableRatio > 0.3) { // If more than 30% of sections have tables
      return 'table-heavy';
    }
    
    if (hasStructure && sections.length >= 3) {
      return 'structured';
    }
    
    return 'text';
  }
  
  /**
   * Chunks tables in a document
   * @param document Document metadata
   * @param extractedContent Extracted content from the document
   * @returns Array of document chunks for tables
   */
  private async chunkTables(
    document: Document,
    extractedContent: ExtractedContent
  ): Promise<DocumentChunk[]> {
    const tableChunks: DocumentChunk[] = [];
    let tableIndex = 0;
    
    // Find and process tables in the sections
    for (const section of extractedContent.sections) {
      if (section.table && section.table.length > 0) {
        const chunks = await this.tableChunker.chunkTable(
          document,
          section.table,
          section.title || `Table ${tableIndex + 1}`,
          tableIndex,
          section.pageNumber
        );
        
        tableChunks.push(...chunks);
        tableIndex++;
      }
    }
    
    return tableChunks;
  }
  
  /**
   * Generates a hash for chunk content
   * @param content Chunk content text
   * @returns Hash string
   */
  private generateContentHash(content: string): string {
    return createHash('sha256')
      .update(content)
      .digest('hex');
  }
}
