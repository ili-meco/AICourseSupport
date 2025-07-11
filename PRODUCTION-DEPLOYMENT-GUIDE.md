# Production Deployment Guide
## AI Course Support System - Enterprise Deployment

This guide provides step-by-step instructions for deploying the AI Course Support System to production Azure environments.

## 🏗️ Production Architecture

```
Internet Gateway
      ↓
Azure Front Door (CDN + WAF)
      ↓
┌─────────────────────────────────────────────────────────┐
│ Production Environment                                  │
│                                                         │
│ ┌─────────────────┐  ┌──────────────────┐               │
│ │ Next.js Frontend│  │ FastAPI Backend  │               │
│ │ (Static Web App)│  │ (Container Apps) │               │
│ └─────────────────┘  └──────────────────┘               │
│          ↓                    ↓                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Azure Functions (PDF Processing)                    │ │
│ └─────────────────────────────────────────────────────┘ │
│          ↓                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Azure Services                                      │ │
│ │ • Blob Storage (Documents)                          │ │
│ │ • AI Search (Vector Database)                       │ │
│ │ │ OpenAI (LLM + Embeddings)                        │ │
│ │ • Key Vault (Secrets)                               │ │
│ │ • Application Insights (Monitoring)                 │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Pre-Deployment Checklist

### Azure Services Setup
- [ ] Resource Group created
- [ ] Storage Account with containers (`students-tools`, `students-tools-chunked`)
- [ ] Azure AI Search service (Standard tier recommended)
- [ ] Azure OpenAI service with required models deployed
- [ ] Azure Key Vault for secrets management
- [ ] Application Insights for monitoring
- [ ] Azure Container Apps Environment
- [ ] Azure Static Web Apps resource

### Security Configuration
- [ ] Managed Identity configured for all services
- [ ] RBAC permissions assigned (Storage Blob Data Contributor, Search Service Contributor)
- [ ] Key Vault access policies configured
- [ ] Network security groups configured (if using VNet)
- [ ] CORS policies updated for production domains

### Application Configuration
- [ ] Environment variables configured in all services
- [ ] Connection strings stored in Key Vault
- [ ] API keys rotated and secured
- [ ] Rate limiting configured
- [ ] Logging and monitoring enabled

## 🔧 Step-by-Step Deployment

### 1. Azure Infrastructure Setup

#### Create Resource Group
```bash
az group create --name "ai-course-prod" --location "East US"
```

#### Deploy Infrastructure with Bicep (Recommended)
Create `main.bicep`:
```bicep
@description('The name of the environment')
param environmentName string

@description('The location for all resources')
param location string = resourceGroup().location

@description('The OpenAI model deployment name')
param openAiDeploymentName string = 'gpt-4o-mini'

@description('The embedding model deployment name')
param embeddingDeploymentName string = 'text-embedding-ada-002'

var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var prefix = '${environmentName}-${resourceToken}'

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: 'st${resourceToken}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
  }
}

// Blob containers
resource studentsToolsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2022-09-01' = {
  parent: storageAccount.getChild('default')
  name: 'students-tools'
  properties: {
    publicAccess: 'None'
  }
}

resource studentsToolsChunkedContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2022-09-01' = {
  parent: storageAccount.getChild('default')
  name: 'students-tools-chunked'
  properties: {
    publicAccess: 'None'
  }
}

// AI Search Service
resource searchService 'Microsoft.Search/searchServices@2022-09-01' = {
  name: 'search-${resourceToken}'
  location: location
  sku: {
    name: 'standard'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    publicNetworkAccess: 'enabled'
  }
}

// OpenAI Service
resource openAiService 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: 'openai-${resourceToken}'
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    customSubDomainName: 'openai-${resourceToken}'
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: 'kv-${resourceToken}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enabledForTemplateDeployment: true
    accessPolicies: []
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'ai-${resourceToken}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

// Container Apps Environment
resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2022-10-01' = {
  name: 'cae-${resourceToken}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: appInsights.properties.customerId
        sharedKey: appInsights.properties.instrumentationKey
      }
    }
  }
}

// Function App Plan
resource functionAppPlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: 'asp-${resourceToken}'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: 'func-${resourceToken}'
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: functionAppPlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'AZURE_SEARCH_ENDPOINT'
          value: 'https://${searchService.name}.search.windows.net'
        }
        {
          name: 'AZURE_SEARCH_API_KEY'
          value: searchService.listAdminKeys().primaryKey
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: openAiService.properties.endpoint
        }
        {
          name: 'AZURE_OPENAI_API_KEY'
          value: openAiService.listKeys().key1
        }
      ]
    }
  }
}

// Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: 'swa-${resourceToken}'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    buildProperties: {
      appLocation: 'src/frontend'
      outputLocation: '.next'
    }
  }
}

// Outputs
output storageAccountName string = storageAccount.name
output searchServiceName string = searchService.name
output openAiServiceName string = openAiService.name
output functionAppName string = functionApp.name
output staticWebAppName string = staticWebApp.name
output containerAppsEnvironmentName string = containerAppsEnvironment.name
```

Deploy the infrastructure:
```bash
az deployment group create \
  --resource-group "ai-course-prod" \
  --template-file main.bicep \
  --parameters environmentName="prod" location="East US"
```

### 2. Deploy Azure Functions

```bash
# Build the functions
npm run build

# Deploy to Azure
func azure functionapp publish <function-app-name>
```

### 3. Deploy FastAPI Backend to Container Apps

Create `Dockerfile` for FastAPI:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and deploy:
```bash
# Build and push container image
az acr build --registry <your-registry> --image ai-course-api:latest src/api/

# Deploy to Container Apps
az containerapp create \
  --name ai-course-api \
  --resource-group ai-course-prod \
  --environment <container-apps-environment> \
  --image <your-registry>.azurecr.io/ai-course-api:latest \
  --target-port 8000 \
  --ingress external \
  --env-vars \
    AZURE_SEARCH_ENDPOINT="https://<search-service>.search.windows.net" \
    AZURE_SEARCH_API_KEY="<search-key>" \
    AZURE_OPENAI_ENDPOINT="https://<openai-service>.openai.azure.com" \
    AZURE_OPENAI_API_KEY="<openai-key>"
```

### 4. Deploy Frontend to Static Web Apps

Connect your GitHub repository to Azure Static Web Apps through the Azure portal, or use the CLI:

```bash
az staticwebapp create \
  --name ai-course-frontend \
  --resource-group ai-course-prod \
  --source https://github.com/your-org/your-repo \
  --branch main \
  --app-location "src/frontend" \
  --output-location ".next"
```

## 🔒 Security Hardening

### 1. Enable Managed Identity
```bash
# Enable system-assigned managed identity for Function App
az functionapp identity assign --name <function-app-name> --resource-group ai-course-prod

# Enable for Container App
az containerapp identity assign --name ai-course-api --resource-group ai-course-prod --system-assigned
```

### 2. Configure RBAC
```bash
# Grant Storage permissions
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee <managed-identity-principal-id> \
  --scope /subscriptions/<subscription-id>/resourceGroups/ai-course-prod/providers/Microsoft.Storage/storageAccounts/<storage-account>

# Grant Search permissions
az role assignment create \
  --role "Search Service Contributor" \
  --assignee <managed-identity-principal-id> \
  --scope /subscriptions/<subscription-id>/resourceGroups/ai-course-prod/providers/Microsoft.Search/searchServices/<search-service>
```

### 3. Configure Key Vault Integration
```bash
# Store secrets in Key Vault
az keyvault secret set --vault-name <key-vault-name> --name "OpenAI-API-Key" --value "<openai-key>"
az keyvault secret set --vault-name <key-vault-name> --name "Search-API-Key" --value "<search-key>"

# Grant Key Vault access
az keyvault set-policy \
  --name <key-vault-name> \
  --object-id <managed-identity-principal-id> \
  --secret-permissions get list
```

## 📊 Monitoring and Alerting

### Application Insights Configuration
```bash
# Configure Application Insights for Function App
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group ai-course-prod \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="<instrumentation-key>"

# Configure for Container App
az containerapp update \
  --name ai-course-api \
  --resource-group ai-course-prod \
  --set-env-vars APPINSIGHTS_INSTRUMENTATIONKEY="<instrumentation-key>"
```

### Set Up Alerts
Create alert rules for:
- Function execution failures
- API response time > 5 seconds
- Storage account access failures
- OpenAI API quota exceeded

## 🚦 Health Checks and Testing

### Automated Health Checks
```bash
# Test Function App health
curl https://<function-app-name>.azurewebsites.net/api/health

# Test FastAPI health
curl https://<container-app-url>/health

# Test document processing pipeline
az storage blob upload \
  --account-name <storage-account> \
  --container-name students-tools \
  --name test.pdf \
  --file test-document.pdf
```

### Load Testing
Use Azure Load Testing or Artillery.js:
```bash
npm install -g artillery
artillery quick --count 10 --num 5 https://<api-url>/api/ChatCompletion
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: Azure/functions-action@v1
        with:
          app-name: ${{ secrets.AZURE_FUNCTIONAPP_NAME }}
          package: '.'
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}

  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - run: |
          az acr build --registry ${{ secrets.ACR_NAME }} --image ai-course-api:${{ github.sha }} src/api/
          az containerapp update \
            --name ai-course-api \
            --resource-group ${{ secrets.RESOURCE_GROUP }} \
            --image ${{ secrets.ACR_NAME }}.azurecr.io/ai-course-api:${{ github.sha }}
```

## 📋 Production Checklist

### Pre-Go-Live
- [ ] All services deployed and healthy
- [ ] Security scanning completed
- [ ] Performance testing passed
- [ ] Backup and disaster recovery tested
- [ ] Documentation updated
- [ ] Team training completed

### Go-Live
- [ ] DNS records updated
- [ ] SSL certificates installed
- [ ] Monitoring alerts active
- [ ] Support team notified
- [ ] Rollback plan ready

### Post-Go-Live
- [ ] Monitor performance for 24 hours
- [ ] Verify all functionality working
- [ ] Check logs for errors
- [ ] Document any issues
- [ ] Plan for ongoing maintenance

## 🆘 Troubleshooting Production Issues

### Common Issues and Solutions

1. **Function App not processing documents**
   - Check blob storage triggers
   - Verify connection strings
   - Check function app logs

2. **API returning 500 errors**
   - Check Application Insights logs
   - Verify OpenAI service availability
   - Check search index status

3. **Frontend not loading**
   - Check Static Web App build logs
   - Verify API endpoints
   - Check CORS configuration

4. **Search returning no results**
   - Verify documents are indexed
   - Check search service status
   - Validate search index schema

### Support Contacts
- **Azure Support**: [Azure Support Portal](https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade)
- **OpenAI Support**: [OpenAI Support](https://help.openai.com/)
- **System Administrator**: [Your contact info]

## 📚 Additional Resources

- [Azure Functions Production Checklist](https://docs.microsoft.com/azure/azure-functions/functions-best-practices)
- [Container Apps Security Best Practices](https://docs.microsoft.com/azure/container-apps/security-best-practices)
- [Static Web Apps Production Guidelines](https://docs.microsoft.com/azure/static-web-apps/deploy-nextjs)
- [Azure OpenAI Service Limits](https://docs.microsoft.com/azure/cognitive-services/openai/quotas-limits)
