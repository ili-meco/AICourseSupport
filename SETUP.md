# SharePoint to Blob Storage Sync - Setup Guide

## Overview

This Azure Function project provides a solution to automatically extract content from SharePoint Online documents (PDF, DOCX, PPTX) and store the extracted text in Azure Blob Storage. It uses Microsoft Graph API for secure SharePoint access and Azure Blob Storage for reliable content storage.

## Features

- **Secure Authentication**: Uses Azure App Registration with Client Credentials flow
- **Multiple File Types**: Supports PDF, DOCX, and PPTX files
- **Text Extraction**: Extracts readable text content from documents
- **Batch Processing**: Processes files in batches to avoid throttling
- **Duplicate Prevention**: Skips already processed files
- **Error Handling**: Comprehensive error handling and logging
- **Configurable**: Flexible filtering by file types, date ranges, and limits

## Prerequisites

1. **Azure Subscription**: Active Azure subscription
2. **SharePoint Online**: Access to SharePoint Online site
3. **Azure App Registration**: Registered application with appropriate permissions
4. **Azure Storage Account**: Blob storage for storing extracted content
5. **Development Tools**:
   - Node.js (18.x or later)
   - Azure Functions Core Tools v4.x
   - Azure CLI (for deployment)

## Setup Instructions

### 1. Azure App Registration

Create an App Registration in Azure Active Directory:

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Click "New registration"
3. Enter application name (e.g., "SharePoint-Blob-Sync")
4. Select "Accounts in this organizational directory only"
5. Click "Register"

### 2. Configure App Permissions

Add the following Microsoft Graph permissions:

**Application Permissions** (not Delegated):
- `Sites.Read.All` - Read items in all site collections
- `Files.Read.All` - Read files in all site collections

To add permissions:
1. Go to your App Registration → API permissions
2. Click "Add a permission" → Microsoft Graph → Application permissions
3. Search and add the required permissions
4. Click "Grant admin consent" (requires Global Admin)

### 3. Create Client Secret

1. Go to your App Registration → Certificates & secrets
2. Click "New client secret"
3. Add description and expiration
4. Copy the **Value** (not the Secret ID) - you'll need this for configuration

### 4. Azure Storage Account

Create or use existing Azure Storage Account:
1. Create a new container for storing extracted content
2. Get the connection string from Storage Account → Access keys

### 5. Environment Configuration

Update `local.settings.json` with your values:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "SHAREPOINT_SITE_URL": "https://yourtenant.sharepoint.com/sites/yoursite",
    "SHAREPOINT_CLIENT_ID": "your-app-registration-client-id",
    "SHAREPOINT_CLIENT_SECRET": "your-app-registration-client-secret",
    "SHAREPOINT_TENANT_ID": "your-azure-tenant-id",
    "SHAREPOINT_LIBRARY_NAME": "Documents",
    "BLOB_STORAGE_CONNECTION_STRING": "DefaultEndpointsProtocol=https;AccountName=...",
    "BLOB_CONTAINER_NAME": "extracted-content"
  }
}
```

### 6. Find Your Configuration Values

**Tenant ID**: Azure Portal → Azure Active Directory → Overview → Tenant ID

**Client ID**: Your App Registration → Overview → Application (client) ID

**Site URL**: Your SharePoint site URL (e.g., `https://contoso.sharepoint.com/sites/teamsite`)

**Library Name**: Usually "Documents" for the default library, or the specific library name

## Available Functions

### SharePointToBlobSync (HTTP Trigger)

**Endpoint**: `/api/SharePointToBlobSync`
**Method**: GET, POST
**Auth Level**: Function (requires function key)

**Query Parameters**:
- `fileTypes` (optional): Comma-separated list of file extensions (default: pdf,pptx,docx)
- `daysBack` (optional): Number of days to look back for files (default: 30)
- `maxFiles` (optional): Maximum number of files to process (default: 100)

**Example Usage**:
```bash
# Process all supported files from last 7 days
GET https://your-function-app.azurewebsites.net/api/SharePointToBlobSync?code=your-function-key&daysBack=7

# Process only PDF files from last 14 days, max 50 files
GET https://your-function-app.azurewebsites.net/api/SharePointToBlobSync?code=your-function-key&fileTypes=pdf&daysBack=14&maxFiles=50
```

### SharePointToBlobSyncV2 (Enhanced Version)

**Endpoint**: `/api/SharePointToBlobSyncV2`
**Method**: GET, POST
**Auth Level**: Function

Enhanced version with improved error handling and Graph API optimization.

## Response Format

```json
{
  "success": true,
  "result": {
    "totalFiles": 15,
    "processedFiles": 12,
    "failedFiles": 3,
    "processedFileDetails": [...],
    "errors": [...]
  },
  "message": "Successfully processed 12 out of 15 files",
  "timestamp": "2025-06-30T12:00:00.000Z"
}
```

## Blob Storage Structure

Processed files are stored as JSON documents in blob storage:

**Blob Name Format**: `{filename}_{timestamp}.json`

**Content Structure**:
```json
{
  "fileName": "document.pdf",
  "originalUrl": "https://tenant.sharepoint.com/sites/site/Shared%20Documents/document.pdf",
  "extractedText": "This is the extracted text content...",
  "fileSize": 1024000,
  "processedAt": "2025-06-30T12:00:00.000Z",
  "contentType": "application/pdf"
}
```

## Development

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Start locally**:
   ```bash
   npm start
   ```

4. **Test the function**:
   ```bash
   # Using PowerShell
   Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?daysBack=7" -Method Get
   ```

### Deployment

1. **Create Function App**:
   ```bash
   az functionapp create --resource-group myResourceGroup --consumption-plan-location westus --runtime node --runtime-version 18 --functions-version 4 --name myFunctionApp --storage-account myStorageAccount
   ```

2. **Deploy**:
   ```bash
   func azure functionapp publish myFunctionApp
   ```

3. **Configure App Settings**:
   ```bash
   az functionapp config appsettings set --name myFunctionApp --resource-group myResourceGroup --settings SHAREPOINT_SITE_URL="your-site-url"
   ```

## Monitoring and Troubleshooting

### Application Insights

Enable Application Insights for monitoring:
1. Create Application Insights resource
2. Add `APPINSIGHTS_INSTRUMENTATIONKEY` to app settings

### Common Issues

1. **Authentication Errors**:
   - Verify App Registration permissions
   - Check admin consent is granted
   - Validate client secret hasn't expired

2. **SharePoint Access Issues**:
   - Verify site URL format
   - Check library name spelling
   - Ensure site exists and is accessible

3. **Text Extraction Failures**:
   - Large files may timeout (adjust function timeout)
   - Some file formats may not be supported
   - Corrupted files will be logged and skipped

### Logs

Check Function App logs in Azure Portal:
- Function App → Functions → Your Function → Monitor

## Security Best Practices

1. **Store secrets in Key Vault**: For production, use Azure Key Vault for secrets
2. **Use Managed Identity**: Consider using Managed Identity instead of client secrets
3. **Limit permissions**: Grant minimum required permissions
4. **Monitor access**: Enable logging and monitoring
5. **Rotate secrets**: Regularly rotate client secrets

## Cost Optimization

1. **Batch processing**: Adjust batch sizes based on your needs
2. **Filter effectively**: Use date ranges and file type filters
3. **Monitor usage**: Track Function execution and storage costs
4. **Schedule wisely**: Use timer triggers for regular processing

## Support

For issues and questions:
1. Check the logs in Application Insights
2. Review the error messages in function responses
3. Validate configuration settings
4. Test with a small number of files first

## Version History

- **v2.0**: Microsoft Graph API implementation
- **v1.0**: Initial PnP SharePoint implementation (deprecated)
