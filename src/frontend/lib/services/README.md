# API Services Documentation

This directory contains service modules for interacting with the backend API and authentication.

## Overview

The services are organized as follows:

- `api-client.ts` - Base API client for making authenticated HTTP requests
- `auth-service.ts` - Authentication services using Microsoft Authentication Library (MSAL)
- `document-service.ts` - Services for interacting with SharePoint documents and blob storage
- `chatbot-service.ts` - Services for AI chatbot functionality
- `index.ts` - Exports all services for easy importing

## Usage Examples

### Authentication

```typescript
import { signIn, signOut, getActiveAccount } from '@/lib/services';

// Sign in user
await signIn();

// Get current user
const account = getActiveAccount();

// Sign out
await signOut();
```

### Document Services

```typescript
import { syncSharePointContent, getDocumentsForCourse } from '@/lib/services';

// Sync SharePoint content to blob storage
const result = await syncSharePointContent(['pdf', 'docx'], 30, 50);

// Get documents for a course
const documents = await getDocumentsForCourse('Computer Science 101');

// Search document content
const searchResults = await searchDocumentContent('neural networks', 'Computer Science 101');
```

### Chatbot Services

```typescript
import { sendChatMessage, generateQuiz } from '@/lib/services';

// Send a message to the chatbot
const response = await sendChatMessage(
  'Explain how neural networks work',
  previousMessages,
  'Computer Science 101'
);

// Generate a quiz
const quiz = await generateQuiz('Neural Networks', 'medium', 5);

// Generate flashcards
const flashcards = await generateFlashcards('Neural Networks', 10);
```

## Configuration

The services rely on environment variables for configuration. Make sure to set up the `.env.local` file with the following variables:

```
NEXT_PUBLIC_FUNCTION_APP_URL=http://localhost:7071
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_AD_TENANT_ID=your-tenant-id
```

## Error Handling

All service calls return an `ApiResponse` object with the following structure:

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    message: string;
    status?: number;
    code?: string;
  }
}
```

Example error handling:

```typescript
const result = await syncSharePointContent();

if (result.success) {
  // Handle success
  console.log('Success:', result.data);
} else {
  // Handle error
  console.error('Error:', result.error?.message);
}
```
