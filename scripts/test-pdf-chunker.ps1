# PowerShell Script to Test PDF Chunker Function

# Configuration
$FunctionAppUrl = "http://localhost:7071/api/PdfChunker"  # Adjust if using a different port
$FunctionKey = ""  # Set this if you have a function key configured
$BlobName = "example/sample.pdf"  # Replace with an actual PDF in your storage
$PagesPerChunk = 5
$Overlap = 2

Write-Host "Testing PDF Chunker Function" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host "Function URL: $FunctionAppUrl"
Write-Host "Blob to chunk: $BlobName"
Write-Host "Pages per chunk: $PagesPerChunk"
Write-Host "Page overlap: $Overlap"

# Build the request URL
$RequestUrl = "$FunctionAppUrl?blobName=$BlobName&pagesPerChunk=$PagesPerChunk&overlap=$Overlap"

if ($FunctionKey) {
    $RequestUrl += "&code=$FunctionKey"
}

# Make the request
Write-Host "`nSending request..." -ForegroundColor Green
try {
    $Response = Invoke-RestMethod -Uri $RequestUrl -Method Post -ErrorAction Stop
    
    Write-Host "Request successful!" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Cyan
    $Response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "Error calling function: $_" -ForegroundColor Red
    Write-Host "Status code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host "Error details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
