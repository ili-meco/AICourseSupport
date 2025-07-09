# Educational Chatbot Frontend

This is the frontend application for the AI-powered Educational Chatbot that integrates with SharePoint Online.

## Structure

The frontend is built with:

- Next.js 14 (App Router)
- TypeScript
- React
- TailwindCSS
- shadcn/ui components

## Folder Structure

```
/src/frontend/
├── app/                    # Next.js App Router pages
│   ├── globals.css         # Global styles
│   └── page.tsx            # Main page component
├── components/             # React components
│   ├── ui/                 # UI components (shadcn/ui)
│   ├── chat-interface.tsx  # Chat interface component
│   ├── document-panel.tsx  # Document panel component
│   ├── flash-card.tsx      # Flash card component for learning
│   ├── message-bubble.tsx  # Message bubble component
│   ├── navigation-header.tsx # Header navigation component
│   ├── quiz-card.tsx       # Quiz component
│   └── theme-provider.tsx  # Theme provider component
├── lib/                    # Utility functions
│   └── utils.ts            # General utilities
├── next.config.js          # Next.js configuration
├── package.json            # Frontend dependencies
├── postcss.config.js       # PostCSS configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Setup and Development

1. Install dependencies:
   ```bash
   cd src/frontend
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Integration with Backend

The frontend integrates with the Azure Functions backend through API calls:

- SharePointToBlobSyncV2: HTTP-triggered Azure Function for file processing
- Azure OpenAI Service: For intelligent chatbot responses

## Features

- Modern, responsive UI with light/dark mode support
- Real-time chat interface with message history
- Document panel for viewing relevant course materials
- Interactive learning elements (quizzes and flashcards)
- Microsoft 365/Azure AD authentication integration
- Document content visualization with source references

## Best Practices

- Use TypeScript for type safety throughout the application
- Follow Next.js App Router conventions for routing
- Apply component-based architecture for reusability
- Implement proper state management using React hooks
- Use shadcn/ui for consistent, accessible UI components
- Ensure responsive design for all screen sizes
- Follow accessibility guidelines (WCAG AA compliance)
- Apply proper error handling and loading states
- Implement proper authentication and authorization
