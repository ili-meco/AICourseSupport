import { Document } from '../../../models/Document';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as ExcelJS from 'exceljs';
import * as cheerio from 'cheerio';

/**
 * Service responsible for extracting content from various document formats
 */
export class ContentExtractionService {
  /**
   * Maximum size of file to process in bytes (default: 100MB)
   */
  private readonly maxFileSize: number;

  /**
   * Supported MIME types for content extraction
   */
  private readonly supportedMimeTypes: Set<string>;

  /**
   * Creates a new instance of ContentExtractionService
   * @param maxFileSize Maximum size of file to process in bytes (default: 100MB)
   */
  constructor(maxFileSize: number = 104857600) {
    this.maxFileSize = maxFileSize;
    this.supportedMimeTypes = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'text/plain',
      'text/html',
      'text/markdown',
      'application/rtf'
    ]);
  }

  /**
   * Checks if the document format is supported
   * @param document The document to check
   * @returns True if the document format is supported, false otherwise
   */
  public canExtract(document: Document): boolean {
    if (document.size > this.maxFileSize) {
      console.warn(`Document ${document.id} exceeds maximum size limit of ${this.maxFileSize} bytes`);
      return false;
    }
    
    return this.supportedMimeTypes.has(document.contentType);
  }

  /**
   * Extracts content from a document based on its format
   * @param document The document metadata
   * @param buffer The document content as a buffer
   * @returns Extracted content with structure information
   */
  public async extractContent(document: Document, buffer: Buffer): Promise<ExtractedContent> {
    if (!this.canExtract(document)) {
      throw new Error(`Unsupported document format: ${document.contentType} or size exceeds limit`);
    }

    try {
      switch (document.contentType) {
        case 'application/pdf':
          return await this.extractFromPdf(buffer, document);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.extractFromWord(buffer, document);
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          return await this.extractFromExcel(buffer, document);
        case 'text/html':
          return await this.extractFromHtml(buffer.toString(), document);
        case 'text/markdown':
        case 'text/plain':
        case 'application/rtf':
          return await this.extractFromText(buffer.toString(), document);
        default:
          throw new Error(`Unsupported document format: ${document.contentType}`);
      }
    } catch (error) {
      console.error(`Error extracting content from document ${document.id}:`, error);
      throw new Error(`Failed to extract content from document: ${error.message}`);
    }
  }

  /**
   * Extracts content from a PDF document
   * @param buffer PDF document as buffer
   * @param document Document metadata
   * @returns Extracted content with structure information
   */
  private async extractFromPdf(buffer: Buffer, document: Document): Promise<ExtractedContent> {
    const pdfParser = require('pdf-parse');
    const result = await pdfParser(buffer);
    
    // Basic structure extraction - in a real implementation, 
    // you would use a more sophisticated PDF parser to extract headings, sections, tables, etc.
    const sections: DocumentSection[] = [];
    const lines = result.text.split('\n').filter(line => line.trim().length > 0);
    
    let currentHeading = '';
    let currentContent: string[] = [];
    
    // Simple heuristic to identify headings - this would be more sophisticated in production
    // e.g., using font size, formatting, numbering patterns
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Simple heading detection heuristic - can be improved
      const isHeading = 
        (trimmedLine.length < 100 && 
         (trimmedLine.match(/^[0-9]+[\.\s]+[A-Z]/) || // Numbered heading pattern: "1. TITLE"
          trimmedLine.match(/^[A-Z][A-Z\s]{3,}$/) || // ALL CAPS heading
          trimmedLine.toUpperCase() === trimmedLine && trimmedLine.length > 3 && trimmedLine.length < 50)); // All caps shorter line
      
      if (isHeading || index === lines.length - 1) {
        // Save previous section if it exists
        if (currentHeading || currentContent.length > 0) {
          sections.push({
            title: currentHeading,
            content: currentContent.join('\n'),
            level: this.estimateHeadingLevel(currentHeading),
            pageNumber: -1  // We don't have precise page info in this basic implementation
          });
        }
        
        // Start new section
        currentHeading = isHeading ? trimmedLine : '';
        currentContent = [];
      } else {
        currentContent.push(trimmedLine);
      }
    });

    // Extract metadata
    const metadata: Record<string, any> = {
      pageCount: result.numpages,
      author: result.info?.Author || '',
      creationDate: result.info?.CreationDate || '',
      title: result.info?.Title || document.title || '',
    };

    return {
      sections,
      metadata,
      fullText: result.text,
      structure: {
        hasTableOfContents: result.text.toLowerCase().includes('table of contents') || 
                           result.text.toLowerCase().includes('contents'),
        hasFootnotes: result.text.includes('[') && result.text.includes(']'),
        detectedLanguage: 'en'  // In a real implementation, use language detection
      }
    };
  }

  /**
   * Extracts content from a Word document
   * @param buffer Word document as buffer
   * @param document Document metadata
   * @returns Extracted content with structure information
   */
  private async extractFromWord(buffer: Buffer, document: Document): Promise<ExtractedContent> {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    // Extract document structure - in a real implementation, 
    // you would use the document styles and formatting
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const sections: DocumentSection[] = [];
    
    let currentHeading = '';
    let currentContent: string[] = [];
    let currentLevel = 0;
    
    // Simple heuristic to identify headings
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Simple heading detection - can be improved with actual Word styles data
      const isHeading = 
        (trimmedLine.match(/^[0-9]+[\.\s]+[A-Z]/) || // Numbered heading pattern: "1. TITLE"
         trimmedLine.match(/^[A-Z][A-Z\s]{3,}$/) ||  // ALL CAPS heading
         trimmedLine.length < 100 && trimmedLine.toUpperCase() === trimmedLine && trimmedLine.length > 3); // All caps shorter line
      
      if (isHeading || index === lines.length - 1) {
        // Save previous section if it exists
        if (currentHeading || currentContent.length > 0) {
          sections.push({
            title: currentHeading,
            content: currentContent.join('\n'),
            level: currentLevel,
            pageNumber: -1  // We don't have page info from mammoth
          });
        }
        
        // Start new section
        currentHeading = isHeading ? trimmedLine : '';
        currentContent = [];
        currentLevel = this.estimateHeadingLevel(currentHeading);
      } else {
        currentContent.push(trimmedLine);
      }
    });

    // Extract basic metadata
    const metadata: Record<string, any> = {
      title: document.title || '',
      extractionWarnings: result.messages
    };

    return {
      sections,
      metadata,
      fullText: text,
      structure: {
        hasTableOfContents: text.toLowerCase().includes('table of contents') || 
                           text.toLowerCase().includes('contents'),
        hasFootnotes: text.includes('[') && text.includes(']'),
        detectedLanguage: 'en'  // In a real implementation, use language detection
      }
    };
  }

  /**
   * Extracts content from an Excel document
   * @param buffer Excel document as buffer
   * @param document Document metadata
   * @returns Extracted content with structure information
   */
  private async extractFromExcel(buffer: Buffer, document: Document): Promise<ExtractedContent> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const sections: DocumentSection[] = [];
    let fullText = '';
    
    // Process each worksheet as a separate section
    workbook.eachSheet((worksheet, sheetId) => {
      let sheetContent = '';
      let tableData: string[][] = [];
      
      // Convert sheet to structured data and text
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const rowData: string[] = [];
        
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const value = cell.text || '';
          rowData.push(value);
          sheetContent += value + '\t';
        });
        
        tableData.push(rowData);
        sheetContent += '\n';
      });
      
      sections.push({
        title: worksheet.name,
        content: sheetContent,
        level: 1,
        pageNumber: sheetId,
        table: tableData  // Store the structured table data
      });
      
      fullText += `[Sheet: ${worksheet.name}]\n${sheetContent}\n\n`;
    });

    // Extract basic metadata
    const metadata: Record<string, any> = {
      title: document.title || workbook.creator || '',
      author: workbook.creator || '',
      sheetNames: workbook.worksheets.map(sheet => sheet.name),
      sheetCount: workbook.worksheets.length
    };

    return {
      sections,
      metadata,
      fullText,
      structure: {
        hasTableOfContents: false,
        hasFootnotes: false,
        isSpreadsheet: true,
        detectedLanguage: 'en'  // In a real implementation, use language detection
      }
    };
  }

  /**
   * Extracts content from HTML
   * @param html HTML content as string
   * @param document Document metadata
   * @returns Extracted content with structure information
   */
  private async extractFromHtml(html: string, document: Document): Promise<ExtractedContent> {
    const $ = cheerio.load(html);
    const sections: DocumentSection[] = [];
    let fullText = '';
    
    // Remove script and style elements
    $('script, style').remove();
    
    // Extract title
    const title = $('title').text().trim() || document.title || '';
    
    // Extract headings and their content
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const headingEl = $(element);
      const headingText = headingEl.text().trim();
      const headingLevel = parseInt($(element).prop('tagName').substring(1), 10);
      
      // Get all content until the next heading of same or higher level
      let content = '';
      let next = headingEl.next();
      
      while (next.length > 0 && 
            !(next.is('h1, h2, h3, h4, h5, h6') && 
              parseInt(next.prop('tagName').substring(1), 10) <= headingLevel)) {
        content += next.text().trim() + '\n';
        next = next.next();
      }
      
      sections.push({
        title: headingText,
        content: content.trim(),
        level: headingLevel,
        pageNumber: -1
      });
    });
    
    // If no headings were found, treat the entire body as one section
    if (sections.length === 0) {
      sections.push({
        title: title,
        content: $('body').text().trim(),
        level: 0,
        pageNumber: -1
      });
    }
    
    // Extract full text
    fullText = $('body').text().trim();
    
    // Check for tables
    const hasTables = $('table').length > 0;
    
    // Extract metadata
    const metadata: Record<string, any> = {
      title,
      description: $('meta[name="description"]').attr('content') || '',
      keywords: $('meta[name="keywords"]').attr('content') || '',
      author: $('meta[name="author"]').attr('content') || '',
      url: document.sourceUrl || ''
    };

    return {
      sections,
      metadata,
      fullText,
      structure: {
        hasTableOfContents: $('nav').length > 0 || $('#toc').length > 0 || $('.toc').length > 0,
        hasFootnotes: $('footer').length > 0 || $('.footnote').length > 0,
        hasTables,
        detectedLanguage: $('html').attr('lang') || 'en'
      }
    };
  }

  /**
   * Extracts content from plain text
   * @param text Text content
   * @param document Document metadata
   * @returns Extracted content with structure information
   */
  private async extractFromText(text: string, document: Document): Promise<ExtractedContent> {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const sections: DocumentSection[] = [];
    
    let currentHeading = document.title || '';
    let currentContent: string[] = [];
    
    // Simple heuristic to identify sections in plain text
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Try to identify headings in plain text - this is very basic
      const isHeading =
        (trimmedLine.match(/^[0-9]+[\.\s]+[A-Z]/) || // Numbered heading pattern: "1. TITLE"
         trimmedLine.match(/^[A-Z][A-Z\s]{3,}$/) ||  // ALL CAPS heading
         (trimmedLine.length < 100 && 
          trimmedLine.toUpperCase() === trimmedLine && 
          trimmedLine.length > 3 && 
          !trimmedLine.match(/^[\s\t]+/))); // All caps shorter line, not indented
      
      if (isHeading || index === lines.length - 1) {
        // Save previous section if it exists
        if ((currentHeading || currentContent.length > 0) && index > 0) {
          sections.push({
            title: currentHeading,
            content: currentContent.join('\n'),
            level: this.estimateHeadingLevel(currentHeading),
            pageNumber: -1
          });
        }
        
        // Start new section
        currentHeading = isHeading ? trimmedLine : '';
        currentContent = [];
        
        // If it's the last line and not a heading, add to content
        if (index === lines.length - 1 && !isHeading) {
          currentContent.push(trimmedLine);
        }
      } else {
        currentContent.push(trimmedLine);
      }
    });
    
    // If no sections were created, create one with the entire content
    if (sections.length === 0) {
      sections.push({
        title: document.title || '',
        content: text,
        level: 0,
        pageNumber: -1
      });
    }

    // Extract basic metadata
    const metadata: Record<string, any> = {
      title: document.title || '',
      lineCount: lines.length,
      charCount: text.length
    };

    return {
      sections,
      metadata,
      fullText: text,
      structure: {
        hasTableOfContents: text.toLowerCase().includes('table of contents') || 
                           text.toLowerCase().includes('contents'),
        hasFootnotes: text.includes('[') && text.includes(']'),
        detectedLanguage: 'en'  // In a real implementation, use language detection
      }
    };
  }

  /**
   * Estimates the heading level based on heading text format
   * @param heading The heading text
   * @returns Estimated heading level (1-6)
   */
  private estimateHeadingLevel(heading: string): number {
    // This is a simple heuristic - can be improved
    if (!heading) return 0;
    
    // Check for numbered patterns
    if (heading.match(/^[0-9]+\./)) return 1;
    if (heading.match(/^[0-9]+\.[0-9]+\./)) return 2;
    if (heading.match(/^[0-9]+\.[0-9]+\.[0-9]+\./)) return 3;
    
    // Check based on capitalization and length
    if (heading.toUpperCase() === heading && heading.length < 30) return 1;
    if (heading.length < 50) return 2;
    
    return 3;
  }
}

/**
 * Represents a section of a document
 */
interface DocumentSection {
  /**
   * Section title or heading
   */
  title: string;
  
  /**
   * Text content of the section
   */
  content: string;
  
  /**
   * Heading level (1-6, where 1 is the highest level)
   */
  level: number;
  
  /**
   * Page number where the section starts (if available)
   */
  pageNumber: number;
  
  /**
   * Table data, if this section represents a table
   */
  table?: string[][];
}

/**
 * Represents the extracted content from a document
 */
export interface ExtractedContent {
  /**
   * Document sections with their headings and content
   */
  sections: DocumentSection[];
  
  /**
   * Any metadata extracted from the document
   */
  metadata: Record<string, any>;
  
  /**
   * Full text content of the document
   */
  fullText: string;
  
  /**
   * Detected structural information about the document
   */
  structure: {
    /**
     * Whether the document has a table of contents
     */
    hasTableOfContents: boolean;
    
    /**
     * Whether the document has footnotes
     */
    hasFootnotes: boolean;
    
    /**
     * Detected language of the document
     */
    detectedLanguage: string;
    
    /**
     * Whether the document is a spreadsheet
     */
    isSpreadsheet?: boolean;
    
    /**
     * Whether the document has tables
     */
    hasTables?: boolean;
  };
}
