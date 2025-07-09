/**
 * Adaptive Semantic Chunking Service
 * Intelligently chunks document content based on semantic structure
 */

import { DocumentChunk } from "../../../models/DocumentChunk";
import { Document } from "../../../models/Document";

// Import specific chunking strategies
import { TextChunker } from "../../services/chunking/strategies/TextChunker";
import { StructuredDocumentChunker } from "../../services/chunking/strategies/StructuredDocumentChunker";
import { TableChunker } from "../../services/chunking/strategies/TableChunker";

export interface ChunkingOptions {
  targetChunkSize?: number;
  minChunkSize?: number;
  maxChunkSize?: number;
  overlapSize?: number;
  preserveTables?: boolean;
  preserveLists?: boolean;
  preserveCode?: boolean;
  detectHeadersAndFooters?: boolean;
  detectLanguage?: boolean;
  detectEntities?: boolean;
  includeMetadata?: boolean;
}

export interface ChunkingStrategy {
  chunk(document: Document, extractedContent: any): Promise<DocumentChunk[]>;
  chunkContent(
    documentId: string,
    content: string,
    document: Document,
    documentAnalysis: any,
    options: ChunkingOptions
  ): DocumentChunk[];
}

export class AdaptiveChunkingService {
  private textChunker: TextChunker;
  private structuredDocumentChunker: StructuredDocumentChunker;
  private tableChunker: TableChunker;
  
  private defaultOptions: ChunkingOptions = {
    targetChunkSize: 1000,
    minChunkSize: 100,
    maxChunkSize: 2000,
    overlapSize: 200,
    preserveTables: true,
    preserveLists: true,
    preserveCode: true,
    detectHeadersAndFooters: true,
    detectLanguage: false,
    detectEntities: true,
    includeMetadata: true
  };
  
  constructor() {
    this.textChunker = new TextChunker();
    this.structuredDocumentChunker = new StructuredDocumentChunker();
    this.tableChunker = new TableChunker();
  }

  /**
   * Chunk a document based on its content and structure
   */
  public async chunkDocument(
    documentId: string, 
    content: string, 
    document: Document,
    options?: ChunkingOptions
  ): Promise<DocumentChunk[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      // Step 1: Analyze document type and structure
      const documentAnalysis = await this.analyzeDocument(content, document.fileType);
      
      // Step 2: Choose chunking strategy based on analysis
      if (documentAnalysis.hasStructure) {
        // Use structured document chunking for documents with clear structure
        return this.structuredDocumentChunker.chunkContent(
          documentId,
          content,
          document,
          documentAnalysis,
          mergedOptions
        );
      } else {
        // Use basic text chunking for unstructured or simple documents
        return this.textChunker.chunkContent(
          documentId,
          content,
          document,
          documentAnalysis,
          mergedOptions
        );
      }
    } catch (error: any) {
      console.error(`Error chunking document ${documentId}: ${error.message}`);
      
      // Fallback to simple text chunking if sophisticated methods fail
      return this.textChunker.chunkContent(
        documentId,
        content,
        document,
        { hasStructure: false, documentType: 'unknown', complexity: 'low' },
        mergedOptions
      );
    }
  }

  /**
   * Analyze document to determine structure and best chunking strategy
   */
  private async analyzeDocument(
    content: string, 
    fileType?: string
  ): Promise<{
    hasStructure: boolean;
    documentType: string;
    complexity: 'high' | 'medium' | 'low';
    estimatedChunks?: number;
    detectedSections?: any[];
  }> {
    // Determine if document has a clear structure
    const hasHeadings = this.detectHeadings(content);
    const hasTables = this.detectTables(content);
    const hasLists = this.detectLists(content);
    
    // Estimate document complexity
    const complexity = this.estimateComplexity(content, hasHeadings, hasTables, hasLists);
    
    // Determine document type based on content analysis and file type
    let documentType = 'general';
    
    if (fileType) {
      if (['pdf', 'docx', 'doc'].includes(fileType.toLowerCase())) {
        documentType = this.detectDocumentType(content);
      }
    }
    
    // Check for technical manual structure
    const isTechnicalManual = this.detectTechnicalManualStructure(content);
    if (isTechnicalManual) {
      documentType = 'technical_manual';
    }
    
    return {
      hasStructure: hasHeadings || hasTables || isTechnicalManual,
      documentType,
      complexity,
      estimatedChunks: Math.ceil(content.length / 1000) // Rough estimate
    };
  }

  /**
   * Detect if content has headings
   */
  private detectHeadings(content: string): boolean {
    // Look for patterns that suggest headings:
    // 1. Numbered sections (e.g., "1.2.3 Section Title")
    const numberedHeadingPattern = /^\s*\d+(\.\d+)*\s+[A-Z][a-zA-Z0-9\s]+/m;
    
    // 2. All caps short lines that might be headings
    const capsHeadingPattern = /^[A-Z][A-Z\s]{5,50}$/m;
    
    // 3. Lines ending with colon that might be headings
    const colonHeadingPattern = /^.{5,50}:$/m;
    
    return (
      numberedHeadingPattern.test(content) ||
      capsHeadingPattern.test(content) ||
      colonHeadingPattern.test(content)
    );
  }

  /**
   * Detect if content has tables
   */
  private detectTables(content: string): boolean {
    // Look for patterns that suggest tables:
    // 1. Multiple lines with consistent pipe or tab separators
    const pipeTablePattern = /(\|[^|]+){3,}\|/m;
    const tabTablePattern = /(\t[^\t]+){3,}/m;
    
    // 2. ASCII-style tables with dashes and plus signs
    const asciiTablePattern = /\+[-+]+\+/m;
    
    return (
      pipeTablePattern.test(content) ||
      tabTablePattern.test(content) ||
      asciiTablePattern.test(content)
    );
  }

  /**
   * Detect if content has lists
   */
  private detectLists(content: string): boolean {
    // Look for patterns that suggest lists:
    // 1. Bullet points
    const bulletListPattern = /^[\s]*[\•\-\*][\s]+.+/m;
    
    // 2. Numbered lists
    const numberedListPattern = /^[\s]*[\(]?[0-9a-zA-Z][\.\)][\s]+.+/m;
    
    // 3. Letter lists
    const letterListPattern = /^[\s]*[\(]?[a-zA-Z][\.\)][\s]+.+/m;
    
    return (
      bulletListPattern.test(content) ||
      numberedListPattern.test(content) ||
      letterListPattern.test(content)
    );
  }

  /**
   * Detect technical manual structure based on common patterns
   */
  private detectTechnicalManualStructure(content: string): boolean {
    // Technical manuals often have specific structural elements:
    
    // 1. Check for section numbering typical in technical docs (e.g. "3.4.2")
    const technicalSectionPattern = /^\s*\d+\.\d+(\.\d+)*\s+[A-Z][a-zA-Z0-9\s]+/m;
    
    // 2. Check for procedural steps
    const proceduralStepPattern = /^STEP\s+\d+[\.\:]/im;
    
    // 3. Check for warnings, cautions, notes
    const warningPattern = /^WARNING/im;
    const cautionPattern = /^CAUTION/im;
    const notePattern = /^NOTE\s*[\:\-]/im;
    
    // 4. Check for technical terms
    const technicalTermsCount = (content.match(/[A-Z]{2,}[\-][A-Z0-9]{2,}/g) || []).length;
    
    return (
      technicalSectionPattern.test(content) ||
      proceduralStepPattern.test(content) ||
      warningPattern.test(content) ||
      cautionPattern.test(content) ||
      notePattern.test(content) ||
      technicalTermsCount > 5 // Arbitrary threshold for technical abbreviations
    );
  }

  /**
   * Estimate document complexity
   */
  private estimateComplexity(
    content: string,
    hasHeadings: boolean,
    hasTables: boolean,
    hasLists: boolean
  ): 'high' | 'medium' | 'low' {
    // Count structural elements
    let complexityScore = 0;
    
    // Length-based complexity
    if (content.length > 20000) complexityScore += 2;
    else if (content.length > 5000) complexityScore += 1;
    
    // Structure-based complexity
    if (hasHeadings) complexityScore += 1;
    if (hasTables) complexityScore += 2;
    if (hasLists) complexityScore += 1;
    
    // Vocabulary-based complexity (simple heuristic)
    const uniqueWords = new Set(content.match(/\\b[a-zA-Z]{4,}\\b/g));
    if (uniqueWords.size > 1000) complexityScore += 2;
    else if (uniqueWords.size > 500) complexityScore += 1;
    
    // Categorize based on score
    if (complexityScore >= 5) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Detect document type based on content patterns
   */
  private detectDocumentType(content: string): string {
    // Look for patterns that suggest specific document types
    
    // Technical manual patterns
    if (
      /technical\s+manual|training\s+guide|field\s+manual|technical\s+publication|maintenance\s+manual/i.test(content) ||
      /^\s*TM\s+\d+-\d+-\d+|^\s*TP\s+\d+-\d+-\d+/m.test(content)
    ) {
      return 'technical_manual';
    }
    
    // Training document patterns
    if (
      /course\s+material|training\s+module|learning\s+objective|lesson\s+plan/i.test(content) ||
      /knowledge\s+check|quiz|test\s+your\s+knowledge/i.test(content)
    ) {
      return 'training_material';
    }
    
    // Report patterns
    if (
      /executive\s+summary|introduction|methodology|findings|conclusion|recommendations/i.test(content) ||
      /report\s+prepared\s+for|report\s+prepared\s+by|final\s+report/i.test(content)
    ) {
      return 'report';
    }
    
    // Presentation patterns
    if (
      /slide|presentation|agenda|overview|thank\s+you|questions/i.test(content) ||
      /\bQ\s*&\s*A\b/i.test(content)
    ) {
      return 'presentation';
    }
    
    // Policy document patterns
    if (
      /policy|procedure|regulation|directive|instruction|guidance|compliance/i.test(content) ||
      /effective\s+date|approval\s+date|revision\s+date/i.test(content)
    ) {
      return 'policy';
    }
    
    // Default to general document type
    return 'general';
  }
}
