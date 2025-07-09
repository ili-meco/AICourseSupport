# DND-SP Azure Functions

This project contains Azure Functions built with TypeScript using the Azure Functions v4 programming model.

## Features

- **PDF Chunking**: Automatically splits PDFs uploaded to blob storage into smaller chunks for easier processing and analysis. [More details](./PDF-CHUNKER-README.md)

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version)
- [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local) v4.x
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (for deployment)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Configure environment variables:**

   Copy `local.settings.example.json` to `local.settings.json` and update with your settings:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "STORAGE_ACCOUNT_NAME": "<your-storage-account>",
       "INPUT_CONTAINER_NAME": "pdf-input",
       "OUTPUT_CONTAINER_NAME": "pdf-chunks",
       "PAGES_PER_CHUNK": "10",
       "SHAREPOINT_SITE_URL": "<your-sharepoint-site-url>",
       "SHAREPOINT_CLIENT_ID": "<your-client-id>",
       "SHAREPOINT_CLIENT_SECRET": "<your-client-secret>",
       "SHAREPOINT_TENANT_ID": "<your-tenant-id>",
       "SHAREPOINT_LIBRARY_NAME": "<your-library-name>",
       "BLOB_STORAGE_CONNECTION_STRING": "<your-blob-storage-connection-string>",
       "BLOB_CONTAINER_NAME": "<your-blob-container>"
     }
   }
   ```

4. **Start the function app locally:**
   ```bash
   npm start
   ```

   The functions will be available at: 
   - SharePoint Sync: `http://localhost:7071/api/SharePointToBlobSync`
   - PDF Chunker: Triggered by blob uploads to the input container

## Available Functions

### SharePointToBlobSync

This HTTP-triggered function synchronizes documents from a SharePoint library to Azure Blob Storage. It:
1. Authenticates with Microsoft Graph API using client credentials
2. Retrieves documents from a specified SharePoint library
3. Downloads and extracts text from documents (PDF, DOCX, PPTX)
4. Stores extracted text as JSON in Azure Blob Storage
5. For PDFs, also uploads raw PDF data to trigger PDF chunking

### PDFChunker (Proof of Concept)

This blob-triggered function splits PDF documents into smaller chunks by page ranges. It:
1. Is triggered when a PDF is uploaded to a specified container
2. Downloads the PDF and splits it into overlapping chunks
3. Stores each chunk as a separate PDF file
4. Adds metadata to track relationships between chunks

See [PDF-CHUNKER-README.md](./PDF-CHUNKER-README.md) for more details on the PDF chunking functionality.

### SharePointToBlobSyncV2
- **Type:** HTTP Trigger
- **Auth Level:** Function
- **Methods:** GET, POST
- **URL:** `/api/SharePointToBlobSyncV2`

**Usage:**
- GET/POST: `http://localhost:7071/api/SharePointToBlobSyncV2?fileTypes=pdf,docx,pptx&daysBack=30&maxFiles=100`

This function synchronizes SharePoint Online documents to Azure Blob Storage, extracting text content from various document types.

## Project Structure

```
├── src/
│   ├── functions/          # Function implementations
│   │   └── SharePointToBlobSyncV2.ts  # SharePoint to Blob sync function
│   ├── utils/              # Utility functions
│   └── frontend/           # React frontend application
│       ├── app/            # Next.js App Router pages
│       │   ├── globals.css # Global CSS
│       │   └── page.tsx    # Main page component
│       ├── components/     # React components
│       │   ├── ui/         # UI components
│       │   └── ...         # Feature components
│       └── lib/            # Frontend utilities
├── .vscode/                # VS Code settings
├── host.json               # Function app configuration
├── local.settings.json     # Local environment settings
├── package.json            # Node.js dependencies
└── tsconfig.json           # TypeScript configuration
```

## Development Scripts

### Backend (Azure Functions)
- `npm run build` - Build TypeScript to JavaScript
- `npm run watch` - Watch for changes and rebuild
- `npm run clean` - Clean built files
- `npm start` - Start the function app locally
- `npm test` - Run tests (placeholder)

### Frontend (Next.js)
- `cd src/frontend && npm run dev` - Start Next.js development server
- `cd src/frontend && npm run build` - Build production frontend
- `cd src/frontend && npm run start` - Start production frontend
- `cd src/frontend && npm run lint` - Run linting

## Configuration

### Backend Configuration
Update `local.settings.json` to configure local environment variables:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "SHAREPOINT_SITE_URL": "https://yourtenant.sharepoint.com/sites/yoursite",
    "SHAREPOINT_CLIENT_ID": "your-client-id",
    "SHAREPOINT_CLIENT_SECRET": "your-client-secret",
    "SHAREPOINT_TENANT_ID": "your-tenant-id",
    "SHAREPOINT_LIBRARY_NAME": "Documents",
    "BLOB_STORAGE_CONNECTION_STRING": "your-connection-string",
    "BLOB_CONTAINER_NAME": "documents"
  }
}
```

### Frontend Configuration
Create a `.env.local` file in the `/src/frontend` directory:

```
NEXT_PUBLIC_FUNCTION_APP_URL=http://localhost:7071
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_AD_TENANT_ID=your-tenant-id
```

### Adding New Functions

Create new functions using the Azure Functions Core Tools:

```bash
func new --name YourFunctionName --template "Template Name"
```

Available templates:
- HTTP trigger
- Timer trigger
- Blob trigger
- Queue trigger
- And more...

## Deployment

### Backend Deployment

1. **Create a Function App in Azure:**
   ```bash
   az functionapp create --resource-group myResourceGroup --consumption-plan-location westus --runtime node --runtime-version 18 --functions-version 4 --name myFunctionApp --storage-account myStorageAccount
   ```

2. **Deploy the function:**
   ```bash
   func azure functionapp publish myFunctionApp
   ```

3. **Configure environment variables:**
   ```bash
   az functionapp config appsettings set --name myFunctionApp --resource-group myResourceGroup --settings "SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/yoursite"
   ```

### Frontend Deployment

1. **Create a Static Web App:**
   ```bash
   az staticwebapp create --name myStaticWebApp --resource-group myResourceGroup --source https://github.com/yourusername/yourrepo --branch main --app-location "src/frontend" --api-location "." --output-location ".next"
   ```

2. **Or deploy to Azure App Service:**
   ```bash
   cd src/frontend
   npm run build
   az webapp deployment source config-zip --resource-group myResourceGroup --name myWebApp --src ./out.zip
   ```

## Best Practices

### Backend
- Use the latest Azure Functions runtime (v4)
- Implement proper error handling and logging
- Use TypeScript for type safety
- Store secrets in Azure Key Vault or environment variables
- Use managed identities where possible
- Implement retry policies for external services
- Use batch processing for large document sets

### Frontend
- Follow component-based architecture
- Implement responsive design
- Follow accessibility guidelines
- Use TypeScript for type safety
- Implement proper error handling
- Use environment variables for configuration
- Implement authentication and authorization

## AI Chatbot Integration

See the following documentation for more details:
- [Frontend Organization](./src/frontend/ORGANIZATION.md)
- [Backend-Frontend Integration](./src/frontend/INTEGRATION.md)
- [Frontend Setup](./src/frontend/README.md)
- Implement proper error handling
- Use environment variables for configuration
- Follow TypeScript best practices
- Use extension bundles for bindings
- Implement proper logging

## Troubleshooting

- Ensure you have the correct Node.js version (18.x)
- Make sure Azure Functions Core Tools is updated to v4.x
- Check `local.settings.json` for proper configuration
- Use `func start --verbose` for detailed logging

For more information, visit the [Azure Functions documentation](https://docs.microsoft.com/en-us/azure/azure-functions/).
