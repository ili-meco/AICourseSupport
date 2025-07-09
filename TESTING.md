# Testing Guide for SharePoint to Blob Storage Sync

## Prerequisites for Testing

1. **Configuration Complete**: Ensure all settings in `local.settings.json` are configured
2. **App Registration**: Azure App Registration with proper permissions
3. **Test Files**: Have some PDF, DOCX, or PPTX files in your SharePoint library
4. **Storage Account**: Azure Blob Storage account ready

## Local Testing

### Start the Function App

```bash
npm run build
npm start
```

The function will be available at: `http://localhost:7071`

### Test the HTTP Function

#### Using PowerShell (Recommended for Windows)

```powershell
# Basic test - process files from last 7 days
$response = Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?daysBack=7" -Method Get
$response | ConvertTo-Json -Depth 10

# Test with specific file types
$response = Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?fileTypes=pdf&daysBack=14&maxFiles=5" -Method Get
$response | ConvertTo-Json -Depth 10

# POST request with JSON body
$body = @{
    fileTypes = @("pdf", "docx")
    daysBack = 7
    maxFiles = 10
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync" -Method Post -Body $body -ContentType "application/json"
$response | ConvertTo-Json -Depth 10
```

#### Using curl (Cross-platform)

```bash
# GET request
curl "http://localhost:7071/api/SharePointToBlobSync?daysBack=7&fileTypes=pdf,docx&maxFiles=5"

# POST request
curl -X POST "http://localhost:7071/api/SharePointToBlobSync" \
  -H "Content-Type: application/json" \
  -d '{"fileTypes": ["pdf"], "daysBack": 7, "maxFiles": 3}'
```

### Test the Enhanced V2 Function

```powershell
# Test the enhanced version
$response = Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSyncV2?daysBack=7" -Method Get
$response | ConvertTo-Json -Depth 10
```

## Expected Responses

### Success Response

```json
{
  "success": true,
  "result": {
    "totalFiles": 5,
    "processedFiles": 4,
    "failedFiles": 1,
    "processedFileDetails": [
      {
        "fileName": "example.pdf",
        "originalUrl": "https://tenant.sharepoint.com/sites/site/Shared%20Documents/example.pdf",
        "extractedText": "This is the extracted text from the PDF...",
        "fileSize": 1024000,
        "processedAt": "2025-06-30T12:00:00.000Z",
        "contentType": "application/pdf"
      }
    ],
    "errors": [
      "Failed to process corrupted.pdf: Text extraction failed"
    ]
  },
  "message": "Successfully processed 4 out of 5 files",
  "timestamp": "2025-06-30T12:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Graph API authentication failed: invalid_client",
  "timestamp": "2025-06-30T12:00:00.000Z"
}
```

## Testing Scenarios

### 1. Configuration Validation

Test with missing configuration:

```powershell
# Temporarily remove a required setting
$env:SHAREPOINT_CLIENT_ID = ""
# Restart function and test - should return configuration error
```

### 2. File Type Filtering

```powershell
# Test different file type combinations
Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?fileTypes=pdf" -Method Get
Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?fileTypes=docx" -Method Get
Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?fileTypes=pptx" -Method Get
Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?fileTypes=pdf,docx,pptx" -Method Get
```

### 3. Date Range Testing

```powershell
# Test different date ranges
Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?daysBack=1" -Method Get   # Last day
Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?daysBack=7" -Method Get   # Last week
Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?daysBack=30" -Method Get  # Last month
```

### 4. Batch Size Testing

```powershell
# Test different batch sizes
Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?maxFiles=1" -Method Get   # Single file
Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?maxFiles=5" -Method Get   # Small batch
Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?maxFiles=50" -Method Get  # Large batch
```

### 5. Duplicate Processing Test

```powershell
# Run the same request twice - should skip already processed files
$response1 = Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?daysBack=7&maxFiles=3" -Method Get
$response2 = Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?daysBack=7&maxFiles=3" -Method Get

# Second response should show 0 processed files (already processed)
Write-Host "First run processed: $($response1.result.processedFiles)"
Write-Host "Second run processed: $($response2.result.processedFiles)"
```

## Blob Storage Verification

### Check Processed Files

```powershell
# Using Azure CLI to list blobs
az storage blob list --container-name "extracted-content" --account-name "yourstorageaccount" --query "[].{Name:name, Size:properties.contentLength, Modified:properties.lastModified}" --output table

# Download a processed file to verify content
az storage blob download --container-name "extracted-content" --name "example_1719753600000.json" --file "downloaded.json" --account-name "yourstorageaccount"

# View the content
Get-Content "downloaded.json" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Using Azure Storage Explorer

1. Open Azure Storage Explorer
2. Connect to your storage account
3. Navigate to the container
4. Verify processed files are stored as JSON documents

## Performance Testing

### Measure Execution Time

```powershell
$startTime = Get-Date
$response = Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?daysBack=30&maxFiles=20" -Method Get
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "Processing took: $($duration.TotalSeconds) seconds"
Write-Host "Files processed: $($response.result.processedFiles)"
Write-Host "Average time per file: $($duration.TotalSeconds / $response.result.processedFiles) seconds"
```

### Memory Usage Monitoring

Monitor the function logs for memory usage patterns, especially with large files.

## Troubleshooting Tests

### 1. Authentication Issues

```powershell
# Test with invalid credentials
$originalClientId = $env:SHAREPOINT_CLIENT_ID
$env:SHAREPOINT_CLIENT_ID = "invalid-client-id"
# Restart function and test - should return auth error
$env:SHAREPOINT_CLIENT_ID = $originalClientId
```

### 2. Network Issues

Test with network timeouts by processing very large files or when network is slow.

### 3. SharePoint Access Issues

```powershell
# Test with invalid site URL
$originalSiteUrl = $env:SHAREPOINT_SITE_URL
$env:SHAREPOINT_SITE_URL = "https://invalid.sharepoint.com/sites/invalid"
# Test should return site not found error
$env:SHAREPOINT_SITE_URL = $originalSiteUrl
```

### 4. Storage Issues

```powershell
# Test with invalid storage connection string
$originalConnectionString = $env:BLOB_STORAGE_CONNECTION_STRING
$env:BLOB_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=invalid;AccountKey=invalid"
# Test should return storage error
$env:BLOB_STORAGE_CONNECTION_STRING = $originalConnectionString
```

## Load Testing

For production readiness, consider these load testing scenarios:

### 1. High Volume Testing

```powershell
# Process many files at once
Invoke-RestMethod -Uri "http://localhost:7071/api/SharePointToBlobSync?daysBack=365&maxFiles=1000" -Method Get
```

### 2. Concurrent Requests

```powershell
# Run multiple requests simultaneously
$jobs = @()
for ($i = 1; $i -le 5; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($url)
        Invoke-RestMethod -Uri $url -Method Get
    } -ArgumentList "http://localhost:7071/api/SharePointToBlobSync?daysBack=7&maxFiles=10"
}

# Wait for all jobs to complete
$jobs | ForEach-Object { $_ | Wait-Job | Receive-Job }
```

### 3. Large File Testing

Test with large PDF/DOCX files (>10MB) to ensure proper handling.

## Deployment Testing

### Azure Function App Testing

After deploying to Azure:

```powershell
# Test deployed function (replace with your function app name)
$functionUrl = "https://your-function-app.azurewebsites.net/api/SharePointToBlobSync"
$functionKey = "your-function-key"

$response = Invoke-RestMethod -Uri "$functionUrl?code=$functionKey&daysBack=7" -Method Get
$response | ConvertTo-Json -Depth 10
```

### Integration Testing

Test the complete flow:
1. Upload a new file to SharePoint
2. Run the function
3. Verify the extracted content in blob storage
4. Check Application Insights for telemetry

## Test Data Preparation

### Create Test Files

1. **Small PDF** (~1MB): Simple document with text
2. **Large PDF** (~10MB): Complex document with images and text
3. **DOCX with formatting**: Document with various formatting
4. **PPTX with text slides**: Presentation with text content
5. **Corrupted file**: To test error handling

### SharePoint Test Library

1. Create a dedicated test library
2. Upload test files with known content
3. Modify files to test different modification dates
4. Test with files in subfolders

## Automated Testing Script

```powershell
# Comprehensive test script
param(
    [string]$BaseUrl = "http://localhost:7071",
    [string]$FunctionKey = ""
)

$testResults = @()

# Test scenarios
$scenarios = @(
    @{ Name = "Basic Test"; Params = "daysBack=7" },
    @{ Name = "PDF Only"; Params = "fileTypes=pdf&daysBack=7" },
    @{ Name = "Small Batch"; Params = "maxFiles=2&daysBack=7" },
    @{ Name = "Recent Files"; Params = "daysBack=1" }
)

foreach ($scenario in $scenarios) {
    try {
        Write-Host "Running: $($scenario.Name)..."
        $url = "$BaseUrl/api/SharePointToBlobSync?$($scenario.Params)"
        if ($FunctionKey) { $url += "&code=$FunctionKey" }
        
        $startTime = Get-Date
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 120
        $duration = (Get-Date) - $startTime
        
        $testResults += @{
            Scenario = $scenario.Name
            Success = $response.success
            ProcessedFiles = $response.result.processedFiles
            Duration = $duration.TotalSeconds
            Errors = $response.result.errors.Count
        }
        
        Write-Host "✓ $($scenario.Name): $($response.result.processedFiles) files processed" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ $($scenario.Name): $($_.Exception.Message)" -ForegroundColor Red
        $testResults += @{
            Scenario = $scenario.Name
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Display results
$testResults | Format-Table -AutoSize
```

Save this as `test-function.ps1` and run it for comprehensive testing.

## Monitoring and Alerting

Set up monitoring for:
1. Function execution failures
2. High error rates
3. Long execution times
4. Storage quota issues

Use Application Insights queries:
```kusto
// Failed function executions
traces
| where severityLevel >= 3
| where message contains "SharePoint"
| summarize count() by bin(timestamp, 1h)

// Average execution time
requests
| where name contains "SharePointToBlobSync"
| summarize avg(duration) by bin(timestamp, 1h)
```
