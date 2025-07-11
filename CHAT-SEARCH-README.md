# Connecting Azure Search to GPT-4o-mini for PDF Search and Chat

This README provides instructions for setting up the connection between Azure Search, GPT-4o-mini, and the frontend chat interface.

## Overview

The system consists of three main components:

1. **Azure AI Search Index**: Contains indexed PDF content from your documents
2. **Azure Functions Backend**: Handles chat completion and search integration
3. **Frontend Chat Interface**: Allows users to interact with the system

## Components Created

1. **ChatCompletionFunction** (`src/functions/chat/ChatCompletionFunction.ts`): An Azure Function that:
   - Receives chat messages from the frontend
   - Searches the Azure AI Search index for relevant documents
   - Uses GPT-4o-mini to generate responses based on the search results
   - Returns both the AI response and relevant document references

2. **Next.js API Route** (`src/frontend/app/api/ChatCompletion/route.ts`): A proxy that:
   - Forwards requests from the frontend to the Azure Function
   - Handles error cases and response formatting

3. **Updated Chat Interface** (`src/frontend/components/chat-interface.tsx`): Modified to:
   - Connect to the API route
   - Handle loading states and errors
   - Display AI responses from the GPT-4o-mini model

## Deployment Instructions

### 1. Deploy the Azure Functions

1. Build the Azure Functions project:
   ```bash
   npm run build:backend
   ```

2. Deploy the functions to Azure:
   ```bash
   func azure functionapp publish your-function-app-name
   ```

### 2. Configure the Frontend

1. Create a `.env.local` file in the frontend directory:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-function-app-name.azurewebsites.net
   ```

2. Build and deploy the frontend:
   ```bash
   cd src/frontend
   npm run build
   npm run deploy  # If you have a deploy script, otherwise use your preferred deployment method
   ```

### 3. Verify Configuration

Make sure the following environment variables are properly set in your Azure Function app settings:

- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI service endpoint
- `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key
- `AZURE_OPENAI_COMPLETION_DEPLOYMENT`: The name of your GPT-4o-mini deployment
- `AZURE_SEARCH_ENDPOINT`: Your Azure AI Search service endpoint
- `AZURE_SEARCH_API_KEY`: Your Azure AI Search API key
- `AZURE_SEARCH_INDEX_NAME`: The name of your search index (default: "document-chunks")

## Testing the Integration

1. After deployment, open the frontend application
2. Navigate to the chat interface
3. Ask a question related to the content in your indexed PDFs
4. The system should:
   - Send the question to the Azure Function
   - Search the Azure AI Search index for relevant documents
   - Use GPT-4o-mini to generate a response based on the found documents
   - Return the response to the frontend
   - Display the response in the chat interface

## Troubleshooting

If you encounter issues:

1. **Search not returning relevant results**:
   - Check if the search index contains the expected content
   - Try adjusting the search parameters in the ChatCompletionFunction

2. **GPT-4o-mini not generating good responses**:
   - Review the system prompt in the ChatCompletionFunction
   - Adjust the temperature or other generation parameters

3. **API connection issues**:
   - Verify the CORS settings on your Azure Function app
   - Check the API URLs in the frontend configuration
   - Look at browser network requests for detailed error messages

## Next Steps

- Add user authentication to secure the chat interface
- Implement conversation history storage
- Add citation links to jump directly to relevant documents
- Implement feedback mechanisms to improve search and generation quality
