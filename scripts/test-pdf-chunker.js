/**
 * Test script for PDF Chunking function
 * 
 * This script simulates uploading a PDF to Azure Blob Storage
 * to test the PDF chunking functionality
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const path = require('path');
const fs = require('fs');

// Configuration - update these values or use environment variables
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME || '<your-storage-account>';
const INPUT_CONTAINER_NAME = process.env.INPUT_CONTAINER_NAME || 'pdf-input';
const OUTPUT_CONTAINER_NAME = process.env.OUTPUT_CONTAINER_NAME || 'pdf-chunks';
const TEST_PDF_PATH = process.env.TEST_PDF_PATH || path.join(__dirname, '../test-files/sample.pdf');

// Create directory structure if it doesn't exist
const testFilesDir = path.join(__dirname, '../test-files');
if (!fs.existsSync(testFilesDir)) {
  fs.mkdirSync(testFilesDir, { recursive: true });
}

// Main execution function
async function main() {
  try {
    console.log('Starting PDF chunking test...');
    
    // Use DefaultAzureCredential for authentication
    const credential = new DefaultAzureCredential();
    
    // Connect to blob storage
    console.log(`Connecting to storage account: ${STORAGE_ACCOUNT_NAME}`);
    const blobServiceClient = new BlobServiceClient(
      `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
      credential
    );
    
    // Ensure input container exists
    const inputContainerClient = blobServiceClient.getContainerClient(INPUT_CONTAINER_NAME);
    const inputContainerExists = await inputContainerClient.exists();
    
    if (!inputContainerExists) {
      console.log(`Creating input container: ${INPUT_CONTAINER_NAME}`);
      await inputContainerClient.create({
        metadata: {
          purpose: 'pdf-input',
          createdBy: 'test-script'
        }
      });
    }
    
    // Ensure output container exists
    const outputContainerClient = blobServiceClient.getContainerClient(OUTPUT_CONTAINER_NAME);
    const outputContainerExists = await outputContainerClient.exists();
    
    if (!outputContainerExists) {
      console.log(`Creating output container: ${OUTPUT_CONTAINER_NAME}`);
      await outputContainerClient.create({
        metadata: {
          purpose: 'pdf-chunks',
          createdBy: 'test-script'
        }
      });
    }
    
    // Check if test PDF exists
    if (!fs.existsSync(TEST_PDF_PATH)) {
      console.log(`Test PDF not found at path: ${TEST_PDF_PATH}`);
      console.log(`Please place a PDF file at this location or set the TEST_PDF_PATH environment variable`);
      return;
    }
    
    // Upload test PDF to blob storage
    const fileName = path.basename(TEST_PDF_PATH);
    const blobName = `test/${fileName}`;
    
    console.log(`Uploading PDF: ${fileName} to ${blobName}`);
    const blockBlobClient = inputContainerClient.getBlockBlobClient(blobName);
    
    // Upload file
    await blockBlobClient.uploadFile(TEST_PDF_PATH, {
      metadata: {
        testFile: 'true',
        uploadedAt: new Date().toISOString()
      }
    });
    
    console.log('File uploaded successfully. PDF chunking should begin automatically if the function is running...');
    
    // Poll for chunks in the output container
    console.log('Waiting for chunks to be created...');
    await checkForChunks(outputContainerClient, fileName.replace('.pdf', ''));
    
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Check for chunks in the output container
 */
async function checkForChunks(containerClient, fileNamePrefix, maxAttempts = 12) {
  console.log(`Checking for chunks with prefix: ${fileNamePrefix}`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxAttempts}`);
      
      // List blobs in the container with our prefix
      let chunks = [];
      for await (const blob of containerClient.listBlobsFlat({ prefix: fileNamePrefix })) {
        chunks.push(blob.name);
      }
      
      if (chunks.length > 0) {
        console.log(`Found ${chunks.length} chunks:`);
        chunks.forEach(chunk => console.log(`- ${chunk}`));
        return chunks;
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.warn(`Error checking for chunks: ${error.message}`);
    }
  }
  
  console.log('No chunks found after maximum attempts. Check if the function processed the PDF.');
  return [];
}

// Run the test
main().catch(console.error);
