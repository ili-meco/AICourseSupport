/**
 * Document content extraction service
 * Handles extraction of text from various document formats
 */

import { InvocationContext } from "@azure/functions";
import * as fs from "fs";
import * as path from "path";
import * as mammoth from "mammoth";
import pdfParse from "pdf-parse";
import * as ExcelJS from "exceljs";
import * as cheerio from "cheerio";

export interface ExtractedContent {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount?: number;
    extractionMethod: string;
    extractionSuccessful: boolean;
    [key: string]: any;
  };
}

export class ContentExtractionService {
  private context: InvocationContext;

  constructor(context: InvocationContext) {
    this.context = context;
  }
  
  /**
   * Logs error message and handles unknown error type safely
   */
  private logError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.context.log(`ERROR: ${message}: ${errorMessage}`);
  }

  /**
   * Extract content from a file based on its type
   */
  public async extractContent(filePath: string): Promise<ExtractedContent> {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      
      switch (fileExtension) {
        case '.pdf':
          return await this.extractFromPdf(filePath);
        case '.docx':
        case '.doc':
          return await this.extractFromWord(filePath);
        case '.xlsx':
        case '.xls':
          return await this.extractFromExcel(filePath);
        case '.pptx':
        case '.ppt':
          return await this.extractFromPowerPoint(filePath);
        case '.txt':
          return await this.extractFromText(filePath);
        case '.html':
        case '.htm':
          return await this.extractFromHtml(filePath);
        case '.md':
          return await this.extractFromMarkdown(filePath);
        case '.json':
          return await this.extractFromJson(filePath);
        case '.csv':
          return await this.extractFromCsv(filePath);
        default:
          this.context.log(`WARNING: Unsupported file type: ${fileExtension} for ${filePath}`);
          return {
            text: `[Unsupported file type: ${fileExtension}]`,
            metadata: {
              extractionMethod: 'none',
              extractionSuccessful: false,
              unsupportedFormat: fileExtension
            }
          };
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.context.log(`ERROR: Error extracting content from file ${filePath}: ${errorMessage}`);
      return {
        text: `[Error extracting content: ${errorMessage}]`,
        metadata: {
          extractionMethod: 'failed',
          extractionSuccessful: false,
          error: errorMessage
        }
      };
    }
  }

  /**
   * Extract text from PDF files
   */
  private async extractFromPdf(filePath: string): Promise<ExtractedContent> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      return {
        text: data.text,
        metadata: {
          pageCount: data.numpages,
          extractionMethod: 'pdf-parse',
          extractionSuccessful: true,
          pdfInfo: {
            version: data.info?.PDFFormatVersion,
            isEncrypted: data.info?.IsEncrypted,
            pageSize: data.info?.pageSize
          }
        }
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.context.log(`ERROR: Error extracting text from PDF: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Extract text from Word documents
   */
  private async extractFromWord(filePath: string): Promise<ExtractedContent> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      
      // Estimate word count
      const wordCount = text.split(/\\s+/).length;
      
      return {
        text,
        metadata: {
          wordCount,
          extractionMethod: 'mammoth',
          extractionSuccessful: true,
          messages: result.messages
        }
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.context.log(`ERROR: Error extracting text from Word document: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Extract text from Excel spreadsheets
   */
  private async extractFromExcel(filePath: string): Promise<ExtractedContent> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      let text = '';
      const sheetInfo: Array<{ name: string; rowCount: number }> = [];
      
      // Process each worksheet
      workbook.eachSheet((worksheet, sheetId) => {
        text += `[Sheet: ${worksheet.name}]\n\n`;
        sheetInfo.push({ name: worksheet.name, rowCount: worksheet.rowCount });
        
        // Process each row
        worksheet.eachRow((row, rowNumber) => {
          const rowValues = row.values;
          // Convert row values to text (safely access values)
          if (rowValues && Array.isArray(rowValues)) {
            text += rowValues.slice(1).map(val => val?.toString() || '').join('\t') + '\n';
          } else {
            text += '[Row data conversion failed]\n';
          }
        });
        
        text += '\n\n';
      });
      
      return {
        text,
        metadata: {
          extractionMethod: 'exceljs',
          extractionSuccessful: true,
          sheetCount: sheetInfo.length,
          sheets: sheetInfo
        }
      };
    } catch (error) {
      this.logError(`Error extracting text from Excel`, error);
      throw error;
    }
  }

  /**
   * Extract text from PowerPoint presentations
   * Note: For proper PowerPoint extraction, consider using a specialized library
   */
  private async extractFromPowerPoint(filePath: string): Promise<ExtractedContent> {
    try {
      // This is a placeholder - in a real implementation you would use a library 
      // that can extract text from PowerPoint files
      return {
        text: `[PowerPoint content would be extracted here from: ${path.basename(filePath)}]`,
        metadata: {
          extractionMethod: 'placeholder',
          extractionSuccessful: false,
          note: 'PowerPoint extraction requires a specialized library'
        }
      };
    } catch (error) {
      this.logError(`Error extracting text from PowerPoint`, error);
      throw error;
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractFromText(filePath: string): Promise<ExtractedContent> {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      const wordCount = text.split(/\\s+/).length;
      
      return {
        text,
        metadata: {
          wordCount,
          extractionMethod: 'fs-readFile',
          extractionSuccessful: true
        }
      };
    } catch (error) {
      this.logError(`Error extracting text from text file`, error);
      throw error;
    }
  }

  /**
   * Extract text from HTML files
   */
  private async extractFromHtml(filePath: string): Promise<ExtractedContent> {
    try {
      const html = fs.readFileSync(filePath, 'utf8');
      const $ = cheerio.load(html);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Get title if available
      const title = $('title').text() || '';
      
      // Get text content
      const content = $('body').text().trim();
      
      return {
        text: title ? `[Title: ${title}]\n\n${content}` : content,
        metadata: {
          title,
          extractionMethod: 'cheerio',
          extractionSuccessful: true,
          hasHead: $('head').length > 0,
          hasBody: $('body').length > 0
        }
      };
    } catch (error) {
      this.logError(`Error extracting text from HTML`, error);
      throw error;
    }
  }

  /**
   * Extract text from Markdown files
   */
  private async extractFromMarkdown(filePath: string): Promise<ExtractedContent> {
    try {
      const markdown = fs.readFileSync(filePath, 'utf8');
      
      // For markdown, we'll just use the raw text
      // In a more advanced implementation, you might want to parse the markdown
      // and extract structured data like headings, lists, etc.
      
      return {
        text: markdown,
        metadata: {
          extractionMethod: 'fs-readFile',
          extractionSuccessful: true,
          format: 'markdown'
        }
      };
    } catch (error) {
      this.logError(`Error extracting text from Markdown`, error);
      throw error;
    }
  }

  /**
   * Extract text from JSON files
   */
  private async extractFromJson(filePath: string): Promise<ExtractedContent> {
    try {
      const json = fs.readFileSync(filePath, 'utf8');
      const parsedJson = JSON.parse(json);
      
      // Convert JSON to formatted text
      const text = JSON.stringify(parsedJson, null, 2);
      
      return {
        text,
        metadata: {
          extractionMethod: 'json-parse',
          extractionSuccessful: true,
          format: 'json'
        }
      };
    } catch (error) {
      this.logError(`Error extracting text from JSON`, error);
      throw error;
    }
  }

  /**
   * Extract text from CSV files
   */
  private async extractFromCsv(filePath: string): Promise<ExtractedContent> {
    try {
      const csv = fs.readFileSync(filePath, 'utf8');
      
      // Simple processing for CSV - each line is a row
      const rows = csv.split('\n');
      const text = rows.join('\n');
      
      return {
        text,
        metadata: {
          extractionMethod: 'fs-readFile',
          extractionSuccessful: true,
          format: 'csv',
          rowCount: rows.length
        }
      };
    } catch (error) {
      this.logError(`Error extracting text from CSV`, error);
      throw error;
    }
  }
}
