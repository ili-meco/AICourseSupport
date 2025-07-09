/**
 * Test script for PDF Chunking function
 * 
 * This script simulates uploading a PDF to the student-tools container
 * to test the PDF chunking functionality
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const path = require('path');
const fs = require('fs');

// Configuration - update these values or use environment variables
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME || '<your-storage-account>';
const INPUT_CONTAINER_NAME = "student-tools";
const OUTPUT_CONTAINER_NAME = "student-tools-chunked";
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
      await inputContainerClient.create();
    }
    
    // Ensure output container exists
    const outputContainerClient = blobServiceClient.getContainerClient(OUTPUT_CONTAINER_NAME);
    const outputContainerExists = await outputContainerClient.exists();
    
    if (!outputContainerExists) {
      console.log(`Creating output container: ${OUTPUT_CONTAINER_NAME}`);
      await outputContainerClient.create();
    }
    
    // Check if test PDF exists
    if (!fs.existsSync(TEST_PDF_PATH)) {
      console.log(`Test PDF not found at path: ${TEST_PDF_PATH}`);
      console.log('Trying to download a sample PDF...');
      
      try {
        // Try to download a sample PDF using axios
        const axios = require('axios');
        const pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(TEST_PDF_PATH, Buffer.from(pdfResponse.data));
        console.log('Sample PDF downloaded successfully');
      } catch (downloadError) {
        console.error(`Failed to download sample PDF: ${downloadError.message}`);
        console.error('Please place a PDF file at: ' + TEST_PDF_PATH);
        return;
      }
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
    await checkForChunks(outputContainerClient, path.basename(fileName, '.pdf'));
    
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
