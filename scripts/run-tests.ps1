# PowerShell script to run the test pipeline

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
Write-Host "Container: $env:ORIGINAL_CONTAINER_NAME"
Write-Host "Search Service: $env:SEARCH_SERVICE_ENDPOINT"
Write-Host "Search Index: $env:SEARCH_INDEX_NAME"
Write-Host "OpenAI Endpoint: $env:OPENAI_ENDPOINT"
Write-Host "Embedding Model: $env:OPENAI_EMBEDDING_DEPLOYMENT"

# Run the test script
Write-Host "Starting test pipeline..."
node "$PSScriptRoot\test-pipeline.js"
