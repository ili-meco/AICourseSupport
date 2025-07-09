# PowerShell script to run the PDF chunker test

# Ensure environment variables are set
$envFilePath = "$PSScriptRoot\..\local.settings.json"

if (Test-Path $envFilePath) {
    $envSettings = Get-Content $envFilePath | ConvertFrom-Json
    foreach ($key in $envSettings.Values.PSObject.Properties.Name) {
        $env:$key = $envSettings.Values.$key
    }
    Write-Host "Loaded environment variables from local.settings.json"
} else {
    Write-Warning "local.settings.json not found. Make sure environment variables are set manually."
}

# Print some diagnostic info
Write-Host "Using the following configuration:"
Write-Host "Storage Account: $env:STORAGE_ACCOUNT_NAME"
Write-Host "Input Container: $env:INPUT_CONTAINER_NAME"
Write-Host "Output Container: $env:OUTPUT_CONTAINER_NAME"

# Check if a test PDF file exists
$testPdfPath = "$PSScriptRoot\..\test-files\sample.pdf"
if (-not (Test-Path $testPdfPath)) {
    Write-Warning "No test PDF found at $testPdfPath"
    Write-Host "Creating a simple test PDF..."
    
    # Check if we have curl available to download a sample PDF
    try {
        $null = Get-Command curl -ErrorAction Stop
        Write-Host "Downloading a sample PDF..."
        
        # Create directory if it doesn't exist
        if (-not (Test-Path "$PSScriptRoot\..\test-files")) {
            New-Item -Path "$PSScriptRoot\..\test-files" -ItemType Directory | Out-Null
        }
        
        # Download a sample PDF
        curl -o $testPdfPath "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        
        if (Test-Path $testPdfPath) {
            Write-Host "Sample PDF downloaded successfully!"
        } else {
            Write-Error "Failed to download sample PDF"
            exit 1
        }
    } catch {
        Write-Error "No test PDF available. Please place a PDF file at $testPdfPath"
        exit 1
    }
}

# Run the test script
Write-Host "Starting PDF chunker test..."
node "$PSScriptRoot\test-pdf-chunker.js"
