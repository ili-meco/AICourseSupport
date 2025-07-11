/**
 * Direct PDF Upload Script
 * 
 * This script uploads a test PDF directly to the students-tools container
 * using the storage account connection string
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');
const fs = require('fs');

// Parse settings from local.settings.json
const localSettingsPath = path.join(__dirname, '../local.settings.json');
const settings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
const connectionString = settings.Values.AzureWebJobsStorage;

// Configuration
const containerName = "students-tools";
const testPdfPath = path.join(__dirname, '../test-files/sample.pdf');
const blobName = `test-${Date.now()}.pdf`;

async function main() {
  try {
    console.log('Starting direct PDF upload test...');
    console.log(`Using connection string from local.settings.json`);
    
    // Create BlobServiceClient
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Create container if it doesn't exist
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      console.log(`Creating container: ${containerName}`);
      await containerClient.create();
      console.log(`Container created: ${containerName}`);
    }
    
    // Upload the test PDF
    console.log(`Uploading PDF: ${testPdfPath} as ${blobName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: 'application/pdf'
      }
    };
    
    await blockBlobClient.uploadFile(testPdfPath, uploadOptions);
    console.log(`PDF uploaded successfully: ${blobName}`);
    console.log(`URL: ${blockBlobClient.url}`);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
main();
