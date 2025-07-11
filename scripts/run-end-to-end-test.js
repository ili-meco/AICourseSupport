/**
 * End-to-End Test Script
 * 
 * This script demonstrates the complete workflow:
 * 1. SharePoint document synchronization
 * 2. PDF chunking
 * 3. Content extraction
 */

const axios = require('axios');
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const path = require('path');
const fs = require('fs');

// Configuration - update these values or use environment variables
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME || '<your-storage-account>';
const INPUT_CONTAINER_NAME = process.env.INPUT_CONTAINER_NAME || 'pdf-input';
const OUTPUT_CONTAINER_NAME = process.env.OUTPUT_CONTAINER_NAME || 'pdf-chunks';
const FUNCTION_APP_URL = process.env.FUNCTION_APP_URL || 'http://localhost:7071';
const FUNCTION_KEY = process.env.FUNCTION_KEY || '';

// Main execution function
async function main() {
  try {
    console.log('Starting end-to-end test...');
    
    // Step 1: Test SharePoint to Blob synchronization
    await testSharePointSync();
    
    // Step 2: Test PDF chunking functionality
    await testPDFChunking();
    
    console.log('End-to-end test completed successfully!');
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Test SharePoint to Blob synchronization function
 */
async function testSharePointSync() {
  console.log('\n=== Testing SharePoint to Blob Synchronization ===');
  
  try {
    // Call the SharePoint sync function
    const functionUrl = `${FUNCTION_APP_URL}/api/SharePointToBlobSync`;
    const params = {
      fileTypes: 'pdf,docx',
      daysBack: '7',
      maxFiles: '5'
    };
    
    // Add function key if provided
    const headers = FUNCTION_KEY ? { 'x-functions-key': FUNCTION_KEY } : {};
    
    console.log(`Calling function at: ${functionUrl}`);
    console.log(`Parameters: ${JSON.stringify(params)}`);
    
    const response = await axios.get(functionUrl, { params, headers });
    
    if (response.status === 200 && response.data.success) {
      console.log('SharePoint sync function executed successfully:');
      console.log(`- Total files: ${response.data.result.totalFiles}`);
      console.log(`- Processed files: ${response.data.result.processedFiles}`);
      console.log(`- Failed files: ${response.data.result.failedFiles}`);
      
      if (response.data.result.processedFileDetails.length > 0) {
        console.log('\nProcessed files:');
        response.data.result.processedFileDetails.forEach((file, index) => {
          console.log(`${index + 1}. ${file.fileName} (${file.fileSize} bytes)`);
        });
      }
      
      if (response.data.result.errors.length > 0) {
        console.log('\nErrors:');
        response.data.result.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }
    } else {
      console.error('SharePoint sync function failed:', response.data);
    }
  } catch (error) {
    if (error.response) {
      console.error(`SharePoint sync function error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`SharePoint sync function error: ${error.message}`);
    }
    console.warn('SharePoint sync test failed, but continuing with PDF chunking test...');
  }
}

/**
 * Test PDF chunking functionality
 */
async function testPDFChunking() {
  console.log('\n=== Testing PDF Chunking ===');
  
  try {
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
    
    // Check for a sample PDF in the test-files directory
    const testFilesDir = path.join(__dirname, '../test-files');
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
    
    const testPdfPath = path.join(testFilesDir, 'sample.pdf');
    
    if (!fs.existsSync(testPdfPath)) {
      console.log('No sample PDF found. Attempting to create or download one...');
      
      try {
        // Try to download a sample PDF using axios
        console.log('Downloading sample PDF...');
        const pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(testPdfPath, Buffer.from(pdfResponse.data));
        console.log('Sample PDF downloaded successfully');
      } catch (downloadError) {
        console.error(`Failed to download sample PDF: ${downloadError.message}`);
        console.error('Please place a sample PDF file at: ' + testPdfPath);
        return;
      }
    }
    
    // Upload the sample PDF to the input container
    const pdfFileName = 'sample.pdf';
    const pdfBlobName = `test/${pdfFileName}`;
    console.log(`Uploading PDF: ${pdfFileName} to ${pdfBlobName}`);
    
    const blockBlobClient = inputContainerClient.getBlockBlobClient(pdfBlobName);
    await blockBlobClient.uploadFile(testPdfPath, {
      metadata: {
        testFile: 'true',
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'end-to-end-test-script'
      }
    });
    
    console.log('Sample PDF uploaded successfully!');
    console.log('PDF chunking should be triggered automatically if the function is running.');
    
    // Wait and check for chunks
    console.log('Waiting for chunks to be created...');
    const chunks = await checkForChunks(outputContainerClient, path.basename(pdfFileName, '.pdf'));
    
    if (chunks.length > 0) {
      console.log('PDF chunking test completed successfully!');
    } else {
      console.warn('No chunks were found. Please check if the PDF chunking function is running correctly.');
    }
    
  } catch (error) {
    console.error(`PDF chunking test failed: ${error.message}`);
    throw error;
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
