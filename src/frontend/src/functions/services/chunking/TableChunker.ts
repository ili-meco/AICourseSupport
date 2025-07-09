/**
 * Table Chunker Strategy
 * Specialized chunking strategy for tables and structured data
 */

import { DocumentChunk } from "../../../../models/DocumentChunk";
import { Document } from "../../../../models/Document";
import { ChunkingOptions } from "../AdaptiveChunkingService";
import { v4 as uuidv4 } from 'uuid';

export class TableChunker {
  /**
   * Process and chunk table content
   */
  public chunkTable(
    documentId: string,
    tableContent: string,
    document: Document,
    chunkIndex: number,
    options: ChunkingOptions
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    try {
      // Try to detect table type
      let tableType: 'markdown' | 'ascii' | 'tab_separated' | 'unknown' = 'unknown';
      
      if (tableContent.includes('|')) {
        tableType = 'markdown';
      } else if (tableContent.includes('+') && tableContent.includes('-')) {
        tableType = 'ascii';
      } else if (tableContent.includes('\t')) {
        tableType = 'tab_separated';
      }
      
      // Get table title/caption if present
      const caption = this.extractTableCaption(tableContent);
      
      // For large tables, we may need to split them
      if (tableContent.length > options.maxChunkSize! && options.preserveTables !== true) {
        // Split large tables by rows, keeping header row with each chunk
        const rows = this.parseTableRows(tableContent, tableType);
        
        if (rows.length > 1) { // Only if we have more than just a header
          const headerRow = rows[0];
          let currentChunkRows = [headerRow];
          let currentChunkContent = '';
          
          for (let i = 1; i < rows.length; i++) {
            // Add this row to the chunk
            currentChunkRows.push(rows[i]);
            
            // Rebuild the chunk content
            const rebuiltTable = this.rebuildTable(currentChunkRows, tableType);
            
            // If this makes the chunk too large, create a new chunk
            if (rebuiltTable.length > options.maxChunkSize! && currentChunkRows.length > 2) {
              // Remove the last added row
              currentChunkRows.pop();
              
              // Create a chunk with the current rows
              currentChunkContent = this.rebuildTable(currentChunkRows, tableType);
              
              chunks.push(this.createTableChunk(
                documentId,
                currentChunkContent,
                document,
                chunkIndex++,
                caption,
                `Part ${chunks.length + 1}`
              ));
              
              // Start a new chunk with header + current row
              currentChunkRows = [headerRow, rows[i]];
            }
          }
          
          // Add the final chunk if there are remaining rows
          if (currentChunkRows.length > 1) {
            currentChunkContent = this.rebuildTable(currentChunkRows, tableType);
            
            chunks.push(this.createTableChunk(
              documentId,
              currentChunkContent,
              document,
              chunkIndex++,
              caption,
              `Part ${chunks.length + 1}`
            ));
          }
        } else {
          // Just one row, add it as is
          chunks.push(this.createTableChunk(
            documentId,
            tableContent,
            document,
            chunkIndex++,
            caption
          ));
        }
      } else {
        // Table is small enough, add it as a single chunk
        chunks.push(this.createTableChunk(
          documentId,
          tableContent,
          document,
          chunkIndex++,
          caption
        ));
      }
      
      return chunks;
    } catch (error: any) {
      console.error(`Error chunking table: ${error.message}`);
      
      // Fallback - add the whole table as one chunk
      chunks.push(this.createTableChunk(
        documentId,
        tableContent,
        document,
        chunkIndex++
      ));
      
      return chunks;
    }
  }
  
  /**
   * Extract table caption or title if present
   */
  private extractTableCaption(tableContent: string): string | undefined {
    // Look for common table caption patterns
    const lines = tableContent.split('\n');
    
    // Check first line for table caption
    const firstLine = lines[0].trim();
    if (
      firstLine.toLowerCase().includes('table') && 
      (firstLine.includes(':') || /^table\s+\d+/i.test(firstLine))
    ) {
      return firstLine;
    }
    
    return undefined;
  }
  
  /**
   * Parse table rows based on table type
   */
  private parseTableRows(tableContent: string, tableType: string): string[] {
    const lines = tableContent.trim().split('\n');
    const rows: string[] = [];
    
    switch (tableType) {
      case 'markdown':
        // Skip separator rows (---|---) for markdown tables
        for (const line of lines) {
          if (!line.trim().match(/^[|\-+:]+$/)) {
            rows.push(line);
          }
        }
        break;
        
      case 'ascii':
        // Skip separator rows (+---+---+) for ASCII tables
        for (const line of lines) {
          if (!line.trim().match(/^[+\-=|]+$/)) {
            rows.push(line);
          }
        }
        break;
        
      case 'tab_separated':
        // Each line is a row for tab-separated
        rows.push(...lines);
        break;
        
      default:
        // For unknown formats, treat each line as a row
        rows.push(...lines);
    }
    
    return rows;
  }
  
  /**
   * Rebuild table from rows
   */
  private rebuildTable(rows: string[], tableType: string): string {
    switch (tableType) {
      case 'markdown':
        // Add separator row after header for markdown tables
        if (rows.length > 1) {
          const headerParts = rows[0].split('|').map(() => '---');
          const separator = `|${headerParts.join('|')}|`;
          return [rows[0], separator, ...rows.slice(1)].join('\n');
        }
        return rows.join('\n');
        
      case 'ascii':
        // For ASCII tables, we need to preserve structure
        // This is a simplification - real implementation would be more complex
        return rows.join('\n');
        
      default:
        return rows.join('\n');
    }
  }
  
  /**
   * Create a chunk for table content
   */
  private createTableChunk(
    documentId: string,
    content: string,
    document: Document,
    chunkIndex: number,
    caption?: string,
    partIndicator?: string
  ): DocumentChunk {
    // Build a descriptive heading
    let heading = caption || 'Table';
    if (partIndicator) {
      heading += ` (${partIndicator})`;
    }
    
    return {
      id: `${documentId}-chunk-${chunkIndex}`,
      content,
      documentId,
      documentTitle: document.title,
      documentUrl: document.url,
      courseId: document.courseId,
      courseTitle: document.courseTitle,
      chunkIndex,
      totalChunks: 1,  // Will be updated later by parent chunker
      chunkType: 'table',
      heading
    };
  }
  
  /**
   * Main chunking method that aligns with the interface expected by AdaptiveChunkingService
   */
  public chunk(
    document: Document,
    extractedContent: any
  ): Promise<DocumentChunk[]> {
    const options: ChunkingOptions = {
      maxChunkSize: 1500,
      preserveTables: true
    };
    
    // If we don't have table content, return an empty array
    if (!extractedContent.tables || extractedContent.tables.length === 0) {
      return Promise.resolve([]);
    }
    
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;
    
    // Process each table
    for (const table of extractedContent.tables) {
      const tableContent = typeof table === 'string' ? table : JSON.stringify(table);
      const tableChunks = this.chunkTable(
        document.id,
        tableContent,
        document,
        chunkIndex,
        options
      );
      
      chunks.push(...tableChunks);
      chunkIndex += tableChunks.length;
    }
    
    return Promise.resolve(chunks);
  }
  
  /**
   * Chunk table content using a table approach - implementation method
   * that aligns with the interface expected by AdaptiveChunkingService
   */
  public chunkContent(
    documentId: string,
    content: string,
    document: Document,
    documentAnalysis: any,
    options: ChunkingOptions
  ): DocumentChunk[] {
    // This is a pass-through to our table-specific implementation
    return this.chunkTable(documentId, content, document, 0, options);
  }
}
