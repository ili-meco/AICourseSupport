# PowerShell script to run the end-to-end test

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
Write-Host "Function App URL: $env:FUNCTION_APP_URL"

# Run the test script
Write-Host "Starting end-to-end test..."
node "$PSScriptRoot\run-end-to-end-test.js"
