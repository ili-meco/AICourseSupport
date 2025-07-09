# Educational Chatbot Project Organization

This document provides an overview of how the frontend components are organized and the improvements made.

## Project Structure

The project follows a modern Next.js application structure with the App Router pattern:

```
/src/
├── frontend/            # Frontend application
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components
│   │   ├── ui/          # UI components from shadcn/ui
│   │   └── ...          # Application-specific components
│   └── lib/             # Utility functions
└── functions/           # Azure Functions backend
    └── ...              # Backend functions
```

## Component Architecture

The frontend follows a component-based architecture:

1. **Page Component** (`app/page.tsx`):
   - Main entry point for the application
   - Manages global state (course selection, theme, etc.)
   - Orchestrates layout with key components

2. **Layout Components**:
   - `NavigationHeader`: Top navigation and controls
   - `ChatInterface`: Main chat window for user interaction
   - `DocumentPanel`: Side panel for document display and search

3. **Interactive Components**:
   - `MessageBubble`: Displays user and AI messages
   - `FlashCard`: Interactive learning flashcards
   - `QuizCard`: Interactive quizzes for knowledge testing

4. **UI Components** (shadcn/ui-based):
   - Buttons, inputs, selects, and other UI elements
   - Consistent styling and accessibility features

## Best Practices Applied

1. **TypeScript Integration**:
   - Strong typing for all components and functions
   - Interface definitions for props and state
   - Type-safe event handling

2. **Component Organization**:
   - Single responsibility principle for components
   - Clear prop interfaces for each component
   - Separation of UI components from business logic

3. **State Management**:
   - React hooks for local state management
   - Props for component communication
   - Theme provider for global theme state

4. **Styling Approach**:
   - Tailwind CSS for utility-first styling
   - CSS variables for theming
   - Responsive design patterns
   - Accessibility considerations

5. **Performance Optimizations**:
   - Conditional rendering for components
   - Optimized re-rendering with proper state management
   - Lazy loading for document panel content

6. **Accessibility**:
   - ARIA attributes for interactive elements
   - Keyboard navigation support
   - High-contrast theme option
   - Screen reader compatible markup

## Integration with Backend

The frontend integrates with the Azure Functions backend through:

1. **Data Flow**:
   - Authentication via Azure AD
   - API calls to SharePointToBlobSyncV2 function
   - Processed content retrieval from Azure Blob Storage
   - Conversation handling via Azure OpenAI Service

2. **Security**:
   - Token-based authentication
   - HTTPS for all communication
   - Input sanitization
   - Error handling

## Improvement Areas

1. **API Layer**:
   - Create a dedicated API service layer
   - Implement request caching
   - Add retry logic for failed requests

2. **State Management**:
   - Consider React Context or state libraries for complex state
   - Implement persistence for chat history

3. **Testing**:
   - Add Jest unit tests for components
   - Implement E2E testing with Cypress or Playwright

4. **Build Pipeline**:
   - Set up CI/CD with GitHub Actions
   - Implement automated testing in the pipeline
