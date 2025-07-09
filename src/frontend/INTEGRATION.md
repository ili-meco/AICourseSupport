# Frontend-Backend Integration Guide

This document explains how the Educational Chatbot frontend integrates with the Azure Functions backend and other Azure services.

## Architecture Overview

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  React Frontend │<─────│  Azure Function │<─────│ SharePoint Online│
│                 │      │                 │      │                 │
└────────┬────────┘      └────────┬────────┘      └─────────────────┘
         │                        │                        
         │                        ▼                        
         │               ┌─────────────────┐               
         │               │                 │               
         └──────────────>│  Azure Blob     │               
                         │  Storage        │               
                         │                 │               
                         └────────┬────────┘               
                                  │                        
                                  ▼                        
                         ┌─────────────────┐               
                         │                 │               
                         │  Azure OpenAI   │               
                         │  Service        │               
                         │                 │               
                         └─────────────────┘               
```

## Integration Points

### 1. Authentication

The frontend uses Microsoft Authentication Library (MSAL) for authentication with Azure AD:

```typescript
// Example authentication integration
import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID}`,
    redirectUri: window.location.origin,
  }
};

const msalInstance = new PublicClientApplication(msalConfig);
```

### 2. SharePoint Content Synchronization

The frontend can trigger content synchronization from SharePoint to Azure Blob Storage:

```typescript
// Example API call to SharePointToBlobSyncV2
async function syncSharePointContent(courseId: string) {
  const functionUrl = process.env.NEXT_PUBLIC_FUNCTION_APP_URL;
  const response = await fetch(`${functionUrl}/api/SharePointToBlobSyncV2?courseId=${courseId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}
```

### 3. Content Retrieval for Chatbot

The frontend queries the processed content for the AI chatbot:

```typescript
// Example content retrieval for chatbot context
async function getContentForCourse(courseId: string, query: string) {
  const functionUrl = process.env.NEXT_PUBLIC_FUNCTION_APP_URL;
  const response = await fetch(`${functionUrl}/api/GetCourseContent?courseId=${courseId}&query=${encodeURIComponent(query)}`);
  
  return await response.json();
}
```

### 4. Chatbot Conversation

The frontend interacts with Azure OpenAI Service for the chatbot functionality:

```typescript
// Example chatbot conversation
async function getChatbotResponse(message: string, conversation: Message[], courseId: string) {
  // First get relevant documents for context
  const relevantContent = await getContentForCourse(courseId, message);
  
  // Then interact with Azure OpenAI
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      conversation,
      courseId,
      relevantContent
    }),
  });
  
  return await response.json();
}
```

## Environment Variables

The frontend requires these environment variables:

```
# Authentication
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_AD_TENANT_ID=your-tenant-id

# API Endpoints
NEXT_PUBLIC_FUNCTION_APP_URL=https://your-function-app.azurewebsites.net
NEXT_PUBLIC_OPENAI_API_ENDPOINT=https://your-openai.openai.azure.com

# Feature Flags
NEXT_PUBLIC_ENABLE_FLASHCARDS=true
NEXT_PUBLIC_ENABLE_QUIZZES=true
```

## Deployment Strategy

1. Build the frontend using Next.js build process
2. Deploy as a static site to Azure Static Web Apps
3. Configure authentication provider in Static Web Apps
4. Set up API proxy to Azure Functions backend

## Security Considerations

1. Use Azure AD authentication for all API calls
2. Implement proper CORS settings
3. Use HTTPS for all communications
4. Apply least privilege principle for all API permissions
5. Sanitize all user inputs before sending to backend
6. Implement proper error handling and logging
