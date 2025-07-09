import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { ClientSecretCredential } from "@azure/identity";
import axios from "axios";
import pdfParse from "pdf-parse";
import * as mammoth from "mammoth";

// Interfaces for better type safety
interface SharePointFile {
    name: string;
    serverRelativeUrl: string;
    timeLastModified: string;
    length: number;
    extension: string;
    downloadUrl?: string; // Added for Graph API support
}

interface ProcessedFile {
    fileName: string;
    originalUrl: string;
    extractedText: string;
    fileSize: number;
    processedAt: string;
    contentType: string;
}

interface SyncResult {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    processedFileDetails: ProcessedFile[];
    errors: string[];
}

export async function SharePointToBlobSync(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`SharePoint to Blob sync function started at: ${new Date().toISOString()}`);

    try {
        // Validate configuration
        const config = validateConfiguration();
        
        // Get query parameters for filtering
        const fileTypes = request.query.get('fileTypes')?.split(',') || ['pdf', 'pptx', 'docx'];
        const daysBack = parseInt(request.query.get('daysBack') || '30');
        const maxFiles = parseInt(request.query.get('maxFiles') || '100');

        context.log(`Processing files: Types=${fileTypes.join(',')}, DaysBack=${daysBack}, MaxFiles=${maxFiles}`);

        // Get access token for Microsoft Graph
        const accessToken = await getGraphAccessToken(config, context);
        
        // Initialize Blob Storage client
        const blobServiceClient = initializeBlobStorageClient(config, context);

        // Get container reference and ensure it exists
        const containerClient = blobServiceClient.getContainerClient(config.blobContainerName);
        await containerClient.createIfNotExists({
            metadata: {
                purpose: 'sharepoint-extracted-content',
                createdBy: 'azure-function'
            }
        });

        // Sync files from SharePoint to Blob Storage using Graph API
        const syncResult = await syncSharePointFilesWithGraph(
            accessToken,
            config.siteUrl,
            config.libraryName,
            containerClient,
            fileTypes,
            daysBack,
            maxFiles,
            context
        );

        context.log(`Sync completed: ${syncResult.processedFiles}/${syncResult.totalFiles} files processed`);

        return {
            status: 200,
            jsonBody: {
                success: true,
                result: syncResult,
                message: `Successfully processed ${syncResult.processedFiles} out of ${syncResult.totalFiles} files`
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error) {
        context.log(`Error in SharePoint to Blob sync: ${error.message}`);
        context.log(`Error stack: ${error.stack}`);

        return {
            status: 500,
            jsonBody: {
                success: false,
                error: 'Internal server error',
                message: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
}

function validateConfiguration() {
    const requiredSettings = [
        'SHAREPOINT_SITE_URL',
        'SHAREPOINT_CLIENT_ID', 
        'SHAREPOINT_CLIENT_SECRET',
        'SHAREPOINT_TENANT_ID',
        'SHAREPOINT_LIBRARY_NAME',
        'BLOB_STORAGE_CONNECTION_STRING',
        'BLOB_CONTAINER_NAME'
    ];

    const missing = requiredSettings.filter(setting => !process.env[setting]);
    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    return {
        siteUrl: process.env.SHAREPOINT_SITE_URL!,
        clientId: process.env.SHAREPOINT_CLIENT_ID!,
        clientSecret: process.env.SHAREPOINT_CLIENT_SECRET!,
        tenantId: process.env.SHAREPOINT_TENANT_ID!,
        libraryName: process.env.SHAREPOINT_LIBRARY_NAME!,
        blobConnectionString: process.env.BLOB_STORAGE_CONNECTION_STRING!,
        blobContainerName: process.env.BLOB_CONTAINER_NAME!
    };
}

async function getGraphAccessToken(config: any, context: InvocationContext): Promise<string> {
    try {
        const credential = new ClientSecretCredential(
            config.tenantId,
            config.clientId,
            config.clientSecret
        );

        const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
        context.log('Successfully obtained Graph API access token');
        return tokenResponse.token;
    } catch (error) {
        context.log(`Failed to get Graph API token: ${error.message}`);
        throw new Error(`Graph API authentication failed: ${error.message}`);
    }
}

function initializeBlobStorageClient(config: any, context: InvocationContext) {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(config.blobConnectionString);
        context.log('Blob Storage client initialized successfully');
        return blobServiceClient;
    } catch (error) {
        context.log(`Failed to initialize Blob Storage client: ${error.message}`);
        throw new Error(`Blob Storage initialization failed: ${error.message}`);
    }
}

async function syncSharePointFilesWithGraph(
    accessToken: string,
    siteUrl: string,
    libraryName: string,
    containerClient: any,
    fileTypes: string[],
    daysBack: number,
    maxFiles: number,
    context: InvocationContext
): Promise<SyncResult> {
    const result: SyncResult = {
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 0,
        processedFileDetails: [],
        errors: []
    };

    try {
        // Extract site information from URL
        const siteInfo = extractSiteInfo(siteUrl);
        
        // Get SharePoint files using Microsoft Graph
        const files = await getSharePointFilesFromGraph(
            accessToken, 
            siteInfo, 
            libraryName, 
            fileTypes, 
            daysBack, 
            maxFiles, 
            context
        );
        
        result.totalFiles = files.length;
        context.log(`Found ${files.length} files to process`);

        // Process files in batches
        const batchSize = 5;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchPromises = batch.map(file => 
                processFileFromGraph(accessToken, containerClient, file, context)
            );
            
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((batchResult, index) => {
                if (batchResult.status === 'fulfilled' && batchResult.value) {
                    result.processedFiles++;
                    result.processedFileDetails.push(batchResult.value);
                } else {
                    result.failedFiles++;
                    const fileName = batch[index].name;
                    const error = batchResult.status === 'rejected' ? batchResult.reason : 'Unknown error';
                    result.errors.push(`Failed to process ${fileName}: ${error}`);
                    context.log(`Failed to process file ${fileName}: ${error}`);
                }
            });

            // Add delay between batches
            if (i + batchSize < files.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return result;
    } catch (error) {
        context.log(`Error in syncSharePointFilesWithGraph: ${error.message}`);
        result.errors.push(`Sync error: ${error.message}`);
        return result;
    }
}

function extractSiteInfo(siteUrl: string) {
    // Extract tenant and site path from SharePoint URL
    // Example: https://tenant.sharepoint.com/sites/sitename
    const match = siteUrl.match(/https:\/\/([^.]+)\.sharepoint\.com\/sites\/([^\/]+)/);
    if (!match) {
        throw new Error(`Invalid SharePoint site URL format: ${siteUrl}`);
    }
    
    return {
        tenant: match[1],
        siteName: match[2],
        hostname: `${match[1]}.sharepoint.com`,
        siteId: null // Will be resolved dynamically
    };
}

async function getSharePointFilesFromGraph(
    accessToken: string,
    siteInfo: any,
    libraryName: string,
    fileTypes: string[],
    daysBack: number,
    maxFiles: number,
    context: InvocationContext
): Promise<SharePointFile[]> {
    try {
        // First, get the site ID
        const siteResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${siteInfo.hostname}:/sites/${siteInfo.siteName}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const siteId = siteResponse.data.id;
        context.log(`Found site ID: ${siteId}`);

        // Get the document library
        const listsResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${siteId}/lists?$filter=displayName eq '${libraryName}'`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!listsResponse.data.value || listsResponse.data.value.length === 0) {
            throw new Error(`Library '${libraryName}' not found in SharePoint site`);
        }

        const listId = listsResponse.data.value[0].id;
        context.log(`Found library ID: ${listId}`);

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);

        // Get files from the library
        const filesResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?` +
            `$expand=driveItem&` +
            `$filter=driveItem ne null and driveItem/lastModifiedDateTime ge ${cutoffDate.toISOString()}&` +
            `$top=${maxFiles}&` +
            `$orderby=driveItem/lastModifiedDateTime desc`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const files: SharePointFile[] = filesResponse.data.value
            .filter((item: any) => {
                const driveItem = item.driveItem;
                if (!driveItem || !driveItem.file) return false;
                
                const extension = driveItem.name.split('.').pop()?.toLowerCase();
                return fileTypes.includes(extension || '');
            })
            .map((item: any) => {
                const driveItem = item.driveItem;
                return {
                    name: driveItem.name,
                    serverRelativeUrl: driveItem.webUrl, // Using webUrl for compatibility
                    timeLastModified: driveItem.lastModifiedDateTime,
                    length: driveItem.size,
                    extension: driveItem.name.split('.').pop()?.toLowerCase() || '',
                    downloadUrl: driveItem['@microsoft.graph.downloadUrl']
                };
            });

        context.log(`Retrieved ${files.length} files from SharePoint library using Graph API`);
        return files;
    } catch (error) {
        context.log(`Error getting SharePoint files from Graph: ${error.message}`);
        if (error.response) {
            context.log(`Graph API error details: ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(`Failed to retrieve files from SharePoint: ${error.message}`);
    }
}

async function processFileFromGraph(
    accessToken: string,
    containerClient: any,
    file: SharePointFile,
    context: InvocationContext
): Promise<ProcessedFile | null> {
    try {
        context.log(`Processing file: ${file.name}`);

        // Check if file was already processed
        const blobName = `${file.name.replace(/\.[^/.]+$/, '')}_${new Date(file.timeLastModified).getTime()}.json`;
        const blobClient = containerClient.getBlobClient(blobName);
        
        if (await blobClient.exists()) {
            context.log(`File ${file.name} already processed, skipping`);
            return null;
        }

        // Download file content using Graph API download URL
        const fileBuffer = await downloadFileFromGraph(file.downloadUrl!, context);
        
        // Extract text content
        const extractedText = await extractTextContent(fileBuffer, file.extension, context);
        
        // Create processed file metadata
        const processedFile: ProcessedFile = {
            fileName: file.name,
            originalUrl: file.serverRelativeUrl,
            extractedText: extractedText,
            fileSize: file.length,
            processedAt: new Date().toISOString(),
            contentType: getContentType(file.extension)
        };

        // Upload to blob storage
        await uploadToBlobStorage(blobClient, processedFile, context);
        
        // If this is a PDF, also save the raw PDF to trigger the PDF chunker function
        if (file.extension.toLowerCase() === 'pdf') {
            await uploadRawPDFForChunking(fileBuffer, file, containerClient, context);
        }
        
        context.log(`Successfully processed file: ${file.name}`);
        return processedFile;
    } catch (error) {
        context.log(`Error processing file ${file.name}: ${error.message}`);
        throw error;
    }
}

async function downloadFileFromGraph(downloadUrl: string, context: InvocationContext): Promise<Buffer> {
    try {
        const response = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 30000 // 30 second timeout
        });
        
        const buffer = Buffer.from(response.data);
        context.log(`Downloaded file from Graph: ${buffer.length} bytes`);
        return buffer;
    } catch (error) {
        context.log(`Error downloading file from Graph: ${error.message}`);
        throw new Error(`Failed to download file: ${error.message}`);
    }
}

async function extractTextContent(buffer: Buffer, extension: string, context: InvocationContext): Promise<string> {
    try {
        switch (extension.toLowerCase()) {
            case 'pdf':
                const pdfData = await pdfParse(buffer);
                // Here we could trigger the PDF chunking function if needed
                // This would normally be handled by the Blob trigger automatically
                return pdfData.text || 'No text content found in PDF';
                
            case 'docx':
                const docxResult = await mammoth.extractRawText({ buffer });
                return docxResult.value || 'No text content found in DOCX';
                
            case 'pptx':
                // Basic PPTX text extraction
                const pptxText = buffer.toString('utf8');
                const textMatches = pptxText.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
                if (textMatches && textMatches.length > 0) {
                    return textMatches
                        .map(match => match.replace(/<a:t[^>]*>([^<]+)<\/a:t>/, '$1'))
                        .join(' ')
                        .trim();
                }
                return 'No readable text found in PowerPoint file';
                
            default:
                return `Text extraction not supported for file type: ${extension}`;
        }
    } catch (error) {
        context.log(`Error extracting text from ${extension} file: ${error.message}`);
        return `Text extraction failed: ${error.message}`;
    }
}

async function uploadToBlobStorage(blobClient: any, processedFile: ProcessedFile, context: InvocationContext): Promise<void> {
    try {
        const jsonContent = JSON.stringify(processedFile, null, 2);
        
        await blobClient.upload(jsonContent, jsonContent.length, {
            blobHTTPHeaders: {
                blobContentType: 'application/json'
            },
            metadata: {
                originalFileName: processedFile.fileName,
                fileSize: processedFile.fileSize.toString(),
                processedAt: processedFile.processedAt,
                contentType: processedFile.contentType,
                extractedBy: 'azure-function-graph-api',
                version: '2.0'
            }
        });
        
        context.log(`Uploaded processed content for: ${processedFile.fileName}`);
    } catch (error) {
        context.log(`Error uploading to blob storage: ${error.message}`);
        throw new Error(`Blob upload failed: ${error.message}`);
    }
}

async function uploadRawPDFForChunking(
    fileBuffer: Buffer,
    file: SharePointFile,
    containerClient: any,
    context: InvocationContext
): Promise<void> {
    try {
        // Get the PDF chunking container name from environment variables
        const pdfInputContainer = process.env.INPUT_CONTAINER_NAME || 'pdf-input';
        
        // Get blob service client from the container client
        const blobServiceUrl = containerClient.url;
        const blobServiceClient = new BlobServiceClient(
            blobServiceUrl.substring(0, blobServiceUrl.indexOf('/' + containerClient.containerName))
        );
        
        // Get PDF input container client
        const pdfContainerClient = blobServiceClient.getContainerClient(pdfInputContainer);
        
        // Ensure container exists
        await pdfContainerClient.createIfNotExists({
            metadata: {
                purpose: 'pdf-input',
                createdBy: 'sharepoint-sync-function'
            }
        });
        
        // Generate a unique blob name for the PDF
        const pdfBlobName = `sharepoint/${file.name.replace(/\s+/g, '_')}_${new Date(file.timeLastModified).getTime()}.pdf`;
        const pdfBlobClient = pdfContainerClient.getBlockBlobClient(pdfBlobName);
        
        // Upload the raw PDF to trigger the PDF chunker function
        await pdfBlobClient.upload(fileBuffer, fileBuffer.length, {
            blobHTTPHeaders: {
                blobContentType: 'application/pdf'
            },
            metadata: {
                sourceFileName: file.name,
                sourceUrl: file.serverRelativeUrl,
                sourceSize: file.length.toString(),
                sourceLastModified: file.timeLastModified,
                uploadedAt: new Date().toISOString(),
                uploadedBy: 'sharepoint-sync-function'
            }
        });
        
        context.log(`Uploaded raw PDF to '${pdfInputContainer}' container: ${pdfBlobName}`);
    } catch (error) {
        context.log(`Warning: Failed to upload raw PDF for chunking: ${error.message}`);
        // We don't want this to fail the main processing, so we don't rethrow the error
    }
}

function getContentType(extension: string): string {
    const contentTypes: { [key: string]: string } = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
}

app.http('SharePointToBlobSync', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: SharePointToBlobSync
});
