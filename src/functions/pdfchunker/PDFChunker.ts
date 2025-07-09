/**
 * PDF Chunking Function
 * Splits PDF documents into smaller chunks based on page ranges
 */

import { app, InvocationContext } from "@azure/functions";
import { BlobServiceClient, BlockBlobClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { PDFDocument } from 'pdf-lib';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { DocumentChunk } from "../../models/DocumentChunk";

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
    const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
    const outputContainerName = "student-tools-chunked"; // Fixed container name
    const pagesPerChunk = parseInt(process.env.PAGES_PER_CHUNK || '10');
    
    if (!storageAccountName) {
      throw new Error("Missing required environment variable: STORAGE_ACCOUNT_NAME");
    }
    
    // Connect to Azure services using Managed Identity
    const credential = new DefaultAzureCredential();
    const blobServiceClient = new BlobServiceClient(
      `https://${storageAccountName}.blob.core.windows.net`,
      credential
    );
    
    // Get container clients
    const inputContainerClient = blobServiceClient.getContainerClient(containerName);
    const outputContainerClient = blobServiceClient.getContainerClient(outputContainerName);
    
    // Ensure output container exists
    await outputContainerClient.createIfNotExists();
    
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
      
      // Create a unique ID for this chunk
      const chunkId = `${documentId}-chunk-${i + 1}`;
      
      // Create DocumentChunk metadata
      const chunkMetadata: DocumentChunk = {
        id: chunkId,
        documentId: documentId,
        filename: filename,
        content: `PDF chunk containing pages ${chunk.startPage + 1} to ${chunk.endPage}`,
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

// Register the function with Azure Functions
app.storageBlob('pdfChunker', {
  connection: "AzureWebJobsStorage",
  path: "student-tools/{name}.pdf",
  handler: pdfChunkerFunction
});
