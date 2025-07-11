/**
 * PDF Chunking Function
 * Splits PDF documents into smaller chunks based on page ranges
 */

import { app, InvocationContext } from "@azure/functions";
import { BlobServiceClient, BlockBlobClient } from "@azure/storage-blob";
import { PDFDocument } from 'pdf-lib';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { DocumentChunk } from "../../models/DocumentChunk";
import pdfParse from 'pdf-parse';

/**
 * Azure Function triggered by Blob Storage events when a new PDF is uploaded
 * This function splits the PDF into chunks and saves them to a separate container
 */
async function pdfChunkerFunction(blob: unknown, context: InvocationContext): Promise<void> {
  try {
    // Get the blob trigger path from the context
    const blobTrigger = context.triggerMetadata?.blobTrigger as string;
    
    if (!blobTrigger) {
      throw new Error("Blob trigger path is missing from context metadata");
    }
    
    context.log(`PDF Chunking started for blob: ${blobTrigger}`);
    
    // Extract blob information
    const blobPathParts = blobTrigger.split('/');
    const containerName = blobPathParts[0];
    const blobName = blobPathParts.slice(1).join('/');
    
    // Check if the file is a PDF
    if (!blobName.toLowerCase().endsWith('.pdf')) {
      context.log(`File ${blobName} is not a PDF, skipping`);
      return;
    }
    
    // Get configuration from environment variables
    const outputContainerName = "students-tools-chunked"; // Fixed container name
    const pagesPerChunk = parseInt(process.env.PAGES_PER_CHUNK || '10');
    
    // Connect to Azure services using connection string
    context.log('Connecting to storage account using connection string');
    const connectionString = process.env.AzureWebJobsStorage;
    
    if (!connectionString) {
      throw new Error("Missing required environment variable: AzureWebJobsStorage");
    }
    
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Get container clients
    const inputContainerClient = blobServiceClient.getContainerClient(containerName);
    const outputContainerClient = blobServiceClient.getContainerClient(outputContainerName);
    
    // Ensure output container exists
    await outputContainerClient.createIfNotExists();
    
    // Check if this blob has already been processed
    const sourceBlobClient = inputContainerClient.getBlobClient(blobName);
    const properties = await sourceBlobClient.getProperties();
    const metadata = properties.metadata || {};
    
    // Prepare to check if chunks actually exist for this file
    const fileBaseName = path.basename(blobName, '.pdf');
    const chunkPrefix = `${fileBaseName}_chunk_`;
    
    // Check if the file is marked as processed
    if (metadata.processed === "true") {
      context.log(`File ${blobName} is marked as processed, verifying chunks exist...`);
      
      // Try to find at least one chunk in the output container
      let chunksExist = false;
      try {
        // List blobs with the chunk prefix
        const chunkIterator = outputContainerClient.listBlobsFlat({ prefix: chunkPrefix });
        const firstChunk = await chunkIterator.next();
        
        // If we found at least one chunk, the file was indeed processed
        chunksExist = !firstChunk.done;
        
        if (chunksExist) {
          context.log(`Chunks found for ${blobName}, skipping processing`);
          return;
        } else {
          context.log(`No chunks found for ${blobName} despite being marked as processed, will reprocess`);
        }
      } catch (error) {
        context.log(`Error checking for existing chunks: ${error.message}, will reprocess file`);
      }
    }

    // Download the PDF to a temporary file
    const tempFilePath = await downloadBlob(inputContainerClient, blobName);
    context.log(`PDF downloaded to temporary file: ${tempFilePath}`);
    
    // Split the PDF into chunks
    const chunkResults = await splitPdfIntoChunks(
      tempFilePath, 
      blobName, 
      outputContainerClient, 
      pagesPerChunk,
      context
    );
    
    // Clean up temporary file
    fs.unlinkSync(tempFilePath);
    
    context.log(`PDF chunking completed for ${blobName}. Created ${chunkResults.length} chunks.`);
    
    // Update metadata on the original blob to indicate it has been processed
    const blobClient = inputContainerClient.getBlobClient(blobName);
    await blobClient.setMetadata({
      processed: "true",
      processedAt: new Date().toISOString(),
      chunkCount: chunkResults.length.toString()
    });
    
  } catch (error: any) {
    context.log(`ERROR: Error chunking PDF: ${error.message}`);
    throw error;
  }
}

/**
 * Download a blob to a temporary file
 */
async function downloadBlob(containerClient: any, blobName: string): Promise<string> {
  const blobClient = containerClient.getBlobClient(blobName);
  const downloadResponse = await blobClient.download();
  
  // Create temporary file path
  const tempFilePath = path.join(
    os.tmpdir(),
    `${crypto.randomBytes(8).toString('hex')}-${path.basename(blobName)}`
  );
  
  // Download to temporary file
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(tempFilePath);
    downloadResponse.readableStreamBody?.pipe(fileStream)
      .on('error', (error) => {
        reject(error);
      })
      .on('finish', () => {
        resolve(tempFilePath);
      });
  });
}

/**
 * Split a PDF into chunks based on page ranges
 */
async function splitPdfIntoChunks(
  inputFilePath: string, 
  originalBlobName: string, 
  outputContainerClient: any, 
  pagesPerChunk: number,
  context: InvocationContext
): Promise<DocumentChunk[]> {
  try {
    const documentChunks: DocumentChunk[] = [];
    
    // Read the PDF file
    const pdfBytes = fs.readFileSync(inputFilePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const numPages = pdfDoc.getPageCount();
    
    context.log(`PDF has ${numPages} pages, splitting into chunks of ${pagesPerChunk} pages`);
    
    // Extract full PDF text for later use in chunks
    const fullPdfText = await extractTextFromPDF(pdfBytes);
    context.log(`Extracted ${fullPdfText.length} characters of text from the PDF`);
    
    // Calculate chunk boundaries with overlap
    const overlap = Math.floor(pagesPerChunk / 2);
    const chunks: Array<{startPage: number, endPage: number}> = [];
    
    for (let startPage = 0; startPage < numPages; startPage += pagesPerChunk - overlap) {
      const endPage = Math.min(startPage + pagesPerChunk, numPages);
      chunks.push({ startPage, endPage });
      
      if (startPage + pagesPerChunk >= numPages) {
        break;
      }
    }
    
    context.log(`Created ${chunks.length} chunk definitions`);
    
    // Document ID will be derived from the original blob name
    const documentId = crypto.createHash('md5').update(originalBlobName).digest('hex');
    const filename = path.basename(originalBlobName);
    const title = path.basename(originalBlobName, '.pdf');
    
    // Create and upload each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkDoc = await PDFDocument.create();
      
      // Copy pages from original document to chunk
      const pageIndexes = Array.from(
        { length: chunk.endPage - chunk.startPage }, 
        (_, index) => chunk.startPage + index
      );
      
      const copiedPages = await chunkDoc.copyPages(pdfDoc, pageIndexes);
      copiedPages.forEach(page => chunkDoc.addPage(page));
      
      // Create chunk file name for the PDF
      const chunkBlobName = `${title}_chunk_${i + 1}_pages_${chunk.startPage + 1}_to_${chunk.endPage}.pdf`;
      
      // Save chunk to temporary file
      const chunkPdfBytes = await chunkDoc.save();
      const chunkTempPath = path.join(os.tmpdir(), chunkBlobName);
      fs.writeFileSync(chunkTempPath, chunkPdfBytes);
      
      // Extract text from the chunk
      const chunkText = await extractTextFromPDF(chunkPdfBytes);
      context.log(`Extracted ${chunkText.length} characters from chunk ${i + 1}`);
      
      // Create a unique ID for this chunk
      const chunkId = `${documentId}-chunk-${i + 1}`;
      
      // Create DocumentChunk metadata
      const chunkMetadata: DocumentChunk = {
        id: chunkId,
        documentId: documentId,
        filename: filename,
        content: chunkText || `PDF chunk containing pages ${chunk.startPage + 1} to ${chunk.endPage}`, // Use extracted text or fallback to placeholder
        chunkIndex: i,
        contentType: 'pdf',
        location: {
          pageNumber: chunk.startPage + 1,
        },
        title: title,
        classification: 'Unclassified',
        contentHash: crypto.createHash('md5').update(chunkPdfBytes).digest('hex'),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          startPage: chunk.startPage + 1,
          endPage: chunk.endPage,
          pageCount: chunk.endPage - chunk.startPage,
          totalPages: numPages,
        }
      };
      
      // Upload chunk to blob storage with metadata
      const blockBlobClient = outputContainerClient.getBlockBlobClient(chunkBlobName);
      
      // Convert DocumentChunk to blob metadata (strings only)
      const blobMetadata: Record<string, string> = {
        id: chunkMetadata.id,
        documentId: chunkMetadata.documentId,
        filename: chunkMetadata.filename,
        chunkIndex: chunkMetadata.chunkIndex.toString(),
        contentType: chunkMetadata.contentType,
        startPage: chunkMetadata.metadata!.startPage.toString(),
        endPage: chunkMetadata.metadata!.endPage.toString(),
        pageCount: chunkMetadata.metadata!.pageCount.toString(),
        totalPages: chunkMetadata.metadata!.totalPages.toString(),
        title: chunkMetadata.title || '',
        classification: chunkMetadata.classification || 'Unclassified',
        contentHash: chunkMetadata.contentHash || '',
        createdAt: chunkMetadata.createdAt.toISOString(),
        updatedAt: chunkMetadata.updatedAt.toISOString()
      };
      
      // Upload the chunk PDF with metadata
      await blockBlobClient.uploadFile(chunkTempPath, {
        blobHTTPHeaders: {
          blobContentType: 'application/pdf'
        },
        metadata: blobMetadata
      });
      
      // Clean up temporary chunk file
      fs.unlinkSync(chunkTempPath);
      
      documentChunks.push(chunkMetadata);
      context.log(`Uploaded chunk ${i + 1}/${chunks.length}: ${chunkBlobName}`);
      
      // Create a JSON representation of the chunk metadata
      const chunkJsonName = `${title}_chunk_${i + 1}_metadata.json`;
      const blockJsonClient = outputContainerClient.getBlockBlobClient(chunkJsonName);
      
      await blockJsonClient.upload(
        JSON.stringify(chunkMetadata, null, 2),
        JSON.stringify(chunkMetadata, null, 2).length,
        {
          blobHTTPHeaders: {
            blobContentType: 'application/json'
          }
        }
      );
      
      context.log(`Uploaded metadata JSON for chunk ${i + 1}: ${chunkJsonName}`);
    }
    
    return documentChunks;
  } catch (error: any) {
    context.log(`Error splitting PDF: ${error.message}`);
    throw error;
  }
}

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(pdfBuffer: Buffer | Uint8Array): Promise<string> {
  try {
    // pdf-parse expects a Buffer, so convert if needed
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error: any) {
    console.error(`Error extracting text from PDF: ${error.message}`);
    return ''; // Return empty string on failure
  }
}

// Register the function with Azure Functions
app.storageBlob('BlobTriggerPDFChunker', {
  connection: "AzureWebJobsStorage",
  path: "students-tools/{name}",
  handler: pdfChunkerFunction
});
