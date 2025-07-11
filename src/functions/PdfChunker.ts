import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * PDF Chunking Function - Splits PDFs into smaller chunks with overlap
 * 
 * This function splits PDFs from a source container into overlapping chunks
 * and saves them to an output container.
 */
export async function PdfChunker(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`PDF Chunking function started at: ${new Date().toISOString()}`);

    try {
        // 1. Get configuration from environment variables
        const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
        const sourceContainerName = process.env.SOURCE_CONTAINER_NAME || "original-documents";
        const outputContainerName = process.env.OUTPUT_CONTAINER_NAME || "chunked-documents";
        
        if (!storageAccountName) {
            throw new Error("STORAGE_ACCOUNT_NAME environment variable is required");
        }

        // 2. Get query parameters
        const blobName = request.query.get('blobName');
        const pagesPerChunk = parseInt(request.query.get('pagesPerChunk') || '10');
        const overlap = parseInt(request.query.get('overlap') || String(Math.floor(pagesPerChunk / 2)));

        if (!blobName) {
            throw new Error("blobName query parameter is required");
        }

        // 3. Connect to Azure services using DefaultAzureCredential
        const credential = new DefaultAzureCredential();
        const blobServiceClient = new BlobServiceClient(
            `https://${storageAccountName}.blob.core.windows.net`,
            credential
        );

        // 4. Get container references
        const sourceContainerClient = blobServiceClient.getContainerClient(sourceContainerName);
        const outputContainerClient = blobServiceClient.getContainerClient(outputContainerName);
        
        // 5. Ensure output container exists
        await outputContainerClient.createIfNotExists();

        // 6. Download the source PDF
        context.log(`Downloading blob: ${blobName}`);
        const tempFilePath = await downloadBlob(sourceContainerClient, blobName);

        // 7. Split the PDF into chunks
        context.log(`Splitting PDF into chunks of ${pagesPerChunk} pages with ${overlap} pages overlap`);
        const chunkResults = await splitPdfIntoChunks(
            tempFilePath,
            blobName,
            outputContainerClient,
            pagesPerChunk,
            overlap,
            context
        );

        // 8. Clean up temporary file
        fs.unlinkSync(tempFilePath);

        return {
            status: 200,
            jsonBody: {
                message: `Successfully split PDF into ${chunkResults.chunks.length} chunks`,
                sourceDocument: blobName,
                chunks: chunkResults.chunks
            }
        };
    } catch (error: any) {
        context.log(`Error in PDF chunking: ${error.message}`);
        context.log(`Error stack: ${error.stack}`);

        return {
            status: 500,
            jsonBody: {
                success: false,
                error: 'Internal server error',
                message: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        };
    }
}

/**
 * Download a blob to a temporary file
 */
async function downloadBlob(containerClient: ContainerClient, blobName: string): Promise<string> {
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
 * Split a PDF into chunks with overlap
 */
async function splitPdfIntoChunks(
    inputPdfPath: string,
    originalBlobName: string,
    outputContainerClient: ContainerClient,
    pagesPerChunk: number,
    overlap: number,
    context: InvocationContext
): Promise<{
    chunks: Array<{
        chunkName: string,
        startPage: number,
        endPage: number,
        url: string
    }>
}> {
    // Read the PDF file
    const pdfBytes = fs.readFileSync(inputPdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const numPages = pdfDoc.getPageCount();

    context.log(`PDF has ${numPages} pages`);

    const chunks = [];
    
    // Calculate chunk start positions with overlap
    let chunkPositions = [];
    for (let start = 0; start < numPages; start += pagesPerChunk - overlap) {
        const end = Math.min(start + pagesPerChunk, numPages);
        chunkPositions.push({ start, end });
        
        // If we've reached the end of the document, break
        if (end >= numPages) break;
    }

    context.log(`Creating ${chunkPositions.length} chunks`);
    
    // Create each chunk
    for (let i = 0; i < chunkPositions.length; i++) {
        const { start, end } = chunkPositions[i];
        
        // Create a new document for this chunk
        const chunkDoc = await PDFDocument.create();
        
        // Copy pages from the source document
        const copiedPages = await chunkDoc.copyPages(pdfDoc, Array.from(
            { length: end - start }, 
            (_, index) => start + index
        ));
        
        // Add each copied page to the chunk document
        copiedPages.forEach(page => chunkDoc.addPage(page));
        
        // Serialize the chunk to PDF format
        const chunkBytes = await chunkDoc.save();
        
        // Generate chunk name
        const fileNameBase = path.basename(originalBlobName, path.extname(originalBlobName));
        const chunkName = `${fileNameBase}_chunk_${i + 1}_pages_${start + 1}_to_${end}.pdf`;
        
        // Upload to blob storage
        context.log(`Uploading chunk ${i + 1}: ${chunkName}`);
        const blockBlobClient = outputContainerClient.getBlockBlobClient(chunkName);
        
        await blockBlobClient.upload(
            chunkBytes,
            chunkBytes.length,
            {
                blobHTTPHeaders: { blobContentType: 'application/pdf' },
                metadata: {
                    sourceDocument: originalBlobName,
                    chunkIndex: String(i),
                    startPage: String(start),
                    endPage: String(end),
                    totalPages: String(numPages),
                    pagesPerChunk: String(pagesPerChunk),
                    overlap: String(overlap),
                    createdAt: new Date().toISOString()
                }
            }
        );
        
        // Add to result
        chunks.push({
            chunkName,
            startPage: start,
            endPage: end - 1, // Zero-based index for pages
            url: blockBlobClient.url
        });
    }

    return { chunks };
}

// Register the HTTP trigger function
app.http('PdfChunker', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: PdfChunker
});
