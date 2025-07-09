/**
 * Test script for document processing pipeline
 * 
 * This script simulates the process of uploading a document to Azure Blob Storage
 * and then monitors the processing pipeline.
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const { SearchClient } = require('@azure/search-documents');
const path = require('path');
const fs = require('fs');

// Configuration - update these values or use environment variables
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME || '<your-storage-account>';
const CONTAINER_NAME = process.env.ORIGINAL_CONTAINER_NAME || 'original-documents';
const SEARCH_SERVICE_ENDPOINT = process.env.SEARCH_SERVICE_ENDPOINT || 'https://<your-search-service>.search.windows.net';
const SEARCH_INDEX_NAME = process.env.SEARCH_INDEX_NAME || 'defense-document-chunks';
const TEST_FILE_PATH = process.env.TEST_FILE_PATH || path.join(__dirname, '../test-files/sample-document.pdf');
const COURSE_ID = process.env.COURSE_ID || 'test-course';

// Create directory structure if it doesn't exist
const testFilesDir = path.join(__dirname, '../test-files');
if (!fs.existsSync(testFilesDir)) {
  fs.mkdirSync(testFilesDir, { recursive: true });
}

// Main execution function
async function main() {
  try {
    console.log('Starting document processing pipeline test...');
    
    // Use DefaultAzureCredential for authentication
    const credential = new DefaultAzureCredential();
    
    // Connect to blob storage
    console.log(`Connecting to storage account: ${STORAGE_ACCOUNT_NAME}`);
    const blobServiceClient = new BlobServiceClient(
      `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
      credential
    );
    
    // Get container client
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    // Create container if it doesn't exist
    console.log(`Ensuring container exists: ${CONTAINER_NAME}`);
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      console.log(`Creating container: ${CONTAINER_NAME}`);
      await containerClient.create();
    }
    
    // Upload file
    if (!fs.existsSync(TEST_FILE_PATH)) {
      throw new Error(`Test file not found at path: ${TEST_FILE_PATH}`);
    }
    
    const fileName = path.basename(TEST_FILE_PATH);
    const blobName = `${COURSE_ID}/${fileName}`;
    
    console.log(`Uploading file: ${fileName} to ${blobName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Set metadata on blob
    const metadata = {
      documentId: `test-doc-${Date.now()}`,
      title: `Test Document - ${fileName}`,
      courseId: COURSE_ID,
      courseTitle: 'Test Course',
      author: 'Test User',
      classification: 'UNCLASSIFIED'
    };
    
    // Upload file with metadata
    await blockBlobClient.uploadFile(TEST_FILE_PATH, {
      metadata: metadata
    });
    
    console.log('File uploaded successfully. Processing should begin automatically...');
    
    // Poll for metadata updates to monitor processing
    await monitorProcessing(containerClient, blobName);
    
    // Once processing is complete, check for chunks in search index
    await checkSearchIndex(credential);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Monitor the processing status of a blob by checking its metadata
 */
async function monitorProcessing(containerClient, blobName, maxAttempts = 20) {
  console.log(`Monitoring processing of ${blobName}`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Get blob client
      const blobClient = containerClient.getBlobClient(blobName);
      
      // Get blob properties which include metadata
      const properties = await blobClient.getProperties();
      const status = properties.metadata?.processingstatus;
      
      console.log(`Attempt ${attempt + 1}/${maxAttempts} - Status: ${status || 'unknown'}`);
      
      // If processing is complete or in error state, exit loop
      if (status === 'complete') {
        console.log(`Processing completed successfully! Created ${properties.metadata?.chunkcount || 'unknown'} chunks.`);
        return;
      } else if (status === 'error') {
        throw new Error(`Processing failed: ${properties.metadata?.errormessage || 'Unknown error'}`);
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      console.warn(`Error checking status: ${error.message}. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  throw new Error('Timed out waiting for processing to complete');
}

/**
 * Check if chunks were indexed in Azure AI Search
 */
async function checkSearchIndex(credential) {
  console.log(`Checking search index: ${SEARCH_INDEX_NAME}`);
  
  const searchClient = new SearchClient(
    SEARCH_SERVICE_ENDPOINT,
    SEARCH_INDEX_NAME,
    credential
  );
  
  // Perform a simple search to verify index exists and has documents
  try {
    const searchResults = await searchClient.search('', {
      top: 10,
      includeTotalCount: true
    });
    
    let documentCount = 0;
    for await (const result of searchResults.results) {
      documentCount++;
    }
    
    console.log(`Found ${documentCount} documents in search index. Total count: ${searchResults.count}`);
    
    if (documentCount === 0) {
      throw new Error('No documents found in search index');
    }
  } catch (error) {
    throw new Error(`Search index check failed: ${error.message}`);
  }
}

// Run the test
main().catch(console.error);
