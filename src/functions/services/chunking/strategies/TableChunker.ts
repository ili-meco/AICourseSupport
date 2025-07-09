import { DocumentChunk } from '../../../../models/DocumentChunk';
import { Document } from '../../../../models/Document';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chunker for tabular data
 */
export class TableChunker {
  /**
   * Creates chunks from a table
   * @param document Parent document metadata
   * @param tableData 2D array representing the table
   * @param tableTitle Title of the table
   * @param tableIndex Index of the table in the document
   * @param pageNumber Page number where the table appears
   * @returns Array of document chunks
   */
  public async chunkTable(
    document: Document,
    tableData: string[][],
    tableTitle: string,
    tableIndex: number,
    pageNumber: number = -1
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    
    if (!tableData || tableData.length === 0) {
      console.warn(`Table ${tableIndex} in document ${document.id} has no data`);
      return chunks;
    }
    
    // Determine if the table has headers (we assume first row might be headers)
    const hasHeaders = this.detectTableHeaders(tableData);
    const headers = hasHeaders ? tableData[0] : [];
    const dataRows = hasHeaders ? tableData.slice(1) : tableData;
    
    // Approach 1: Create one chunk for the entire table (good for small tables)
    if (tableData.length <= 10) {
      chunks.push(this.createTableChunk(
        document,
        this.tableToMarkdown(tableData, hasHeaders),
        tableIndex,
        'table',
        tableTitle,
        pageNumber,
        { tableIndex, rowCount: tableData.length, columnCount: tableData[0].length, hasHeaders }
      ));
    } 
    // Approach 2: Split large tables into multiple chunks
    else {
      // Chunk 1: Table summary with headers and first few rows
      const previewRows = Math.min(5, dataRows.length);
      const previewData = hasHeaders 
        ? [headers, ...dataRows.slice(0, previewRows)]
        : dataRows.slice(0, previewRows);
      
      chunks.push(this.createTableChunk(
        document,
        `Table: ${tableTitle}\n\n${this.tableToMarkdown(previewData, hasHeaders)}\n\n(Table preview - ${tableData.length} rows total)`,
        tableIndex,
        'table-summary',
        tableTitle,
        pageNumber,
        { tableIndex, rowCount: tableData.length, columnCount: tableData[0].length, hasHeaders, isPreview: true }
      ));
      
      // Chunk 2+: Split remaining rows into meaningful chunks
      const rowsPerChunk = 20;
      for (let i = 0; i < dataRows.length; i += rowsPerChunk) {
        const chunkRows = dataRows.slice(i, i + rowsPerChunk);
        const chunkData = hasHeaders ? [headers, ...chunkRows] : chunkRows;
        
        chunks.push(this.createTableChunk(
          document,
          `Table: ${tableTitle} (Rows ${i + 1}-${Math.min(i + rowsPerChunk, dataRows.length)})\n\n${this.tableToMarkdown(chunkData, hasHeaders)}`,
          tableIndex + chunks.length,
          'table-segment',
          tableTitle,
          pageNumber,
          { 
            tableIndex, 
            rowCount: chunkRows.length, 
            columnCount: chunkData[0].length, 
            hasHeaders,
            startRow: i,
            endRow: Math.min(i + rowsPerChunk - 1, dataRows.length - 1)
          }
        ));
      }
    }
    
    return chunks;
  }
  
  /**
   * Attempts to detect if the first row of a table contains headers
   * @param tableData Table data as 2D array
   * @returns True if the first row appears to be headers
   */
  private detectTableHeaders(tableData: string[][]): boolean {
    if (tableData.length < 2) return false;
    
    const firstRow = tableData[0];
    const secondRow = tableData[1];
    
    // Heuristic 1: Check if first row has different format (e.g., all cells are non-numeric while data is numeric)
    const firstRowHasNumbers = firstRow.some(cell => !isNaN(Number(cell)) && cell.trim() !== '');
    const secondRowHasNumbers = secondRow.some(cell => !isNaN(Number(cell)) && cell.trim() !== '');
    
    if (!firstRowHasNumbers && secondRowHasNumbers) {
      return true;
    }
    
    // Heuristic 2: Check if first row has shorter text (typical for headers)
    const avgFirstRowLength = firstRow.reduce((sum, cell) => sum + cell.length, 0) / firstRow.length;
    const avgSecondRowLength = secondRow.reduce((sum, cell) => sum + cell.length, 0) / secondRow.length;
    
    if (avgFirstRowLength < avgSecondRowLength * 0.7) {
      return true;
    }
    
    // Heuristic 3: Check for common header terms
    const headerTerms = ['id', 'name', 'title', 'description', 'date', 'total', 'sum', 'avg', 'count', 'number', 'type'];
    const firstRowHasHeaderTerms = firstRow.some(cell => 
      headerTerms.some(term => cell.toLowerCase().includes(term))
    );
    
    return firstRowHasHeaderTerms;
  }
  
  /**
   * Converts table data to markdown format
   * @param tableData Table data as 2D array
   * @param hasHeaders Whether the first row contains headers
   * @returns Markdown formatted table
   */
  private tableToMarkdown(tableData: string[][], hasHeaders: boolean): string {
    if (tableData.length === 0 || tableData[0].length === 0) {
      return '';
    }
    
    const rows = tableData.map(row => `| ${row.map(cell => cell || '').join(' | ')} |`);
    
    if (hasHeaders) {
      // Insert separator row after header
      rows.splice(1, 0, `| ${tableData[0].map(() => '---').join(' | ')} |`);
    }
    
    return rows.join('\n');
  }
  
  /**
   * Creates a DocumentChunk object for table content
   * @param document Parent document
   * @param content Chunk content
   * @param chunkIndex Index of the chunk in the document
   * @param contentType Type of content
   * @param tableTitle Title of the table
   * @param pageNumber Page number
   * @param tableMetadata Metadata about the table
   * @returns DocumentChunk object
   */
  private createTableChunk(
    document: Document,
    content: string,
    chunkIndex: number,
    contentType: string = 'table',
    tableTitle?: string,
    pageNumber?: number,
    tableMetadata?: Record<string, any>
  ): DocumentChunk {
    return {
      id: uuidv4(),
      documentId: document.id,
      filename: document.filename,
      content: content.trim(),
      chunkIndex,
      contentType,
      title: document.title,
      sectionTitle: tableTitle || '',
      location: {
        pageNumber: pageNumber !== undefined ? pageNumber : -1,
      },
      metadata: {
        ...tableMetadata,
        isTable: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
