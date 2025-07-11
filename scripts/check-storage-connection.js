/**
 * Check Storage Account Connection
 * 
 * This script checks if the storage account connection string is valid
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');
const fs = require('fs');

// Parse settings from local.settings.json
const localSettingsPath = path.join(__dirname, '../local.settings.json');
const settings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
const connectionString = settings.Values.AzureWebJobsStorage;

console.log('Checking storage account connection...');
console.log(`Connection string: ${connectionString}`);

// Validate the connection string format
if (!connectionString.includes('AccountName=') || !connectionString.includes('AccountKey=')) {
  console.error('Invalid connection string format. The connection string should include AccountName and AccountKey.');
  process.exit(1);
}

// Extract the account name from the connection string
const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
const accountName = accountNameMatch ? accountNameMatch[1] : null;

if (!accountName) {
  console.error('Could not extract account name from connection string.');
  process.exit(1);
}

console.log(`Account name: ${accountName}`);

// Try to list the containers
async function checkConnection() {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    console.log('Attempting to list containers...');
    const containers = [];
    for await (const container of blobServiceClient.listContainers()) {
      containers.push(container.name);
    }
    
    console.log(`Successfully connected! Found ${containers.length} containers:`);
    containers.forEach(container => console.log(`- ${container}`));
    
    return true;
  } catch (error) {
    console.error(`Connection test failed: ${error.message}`);
    return false;
  }
}

checkConnection();
