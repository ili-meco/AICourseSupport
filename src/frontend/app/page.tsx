"use client"

import { useState, useEffect } from "react"
import { ChatInterface } from "../components/chat-interface"
import { DocumentPanel } from "../components/document-panel"
import { NavigationHeader } from "../components/navigation-header"
import { useTheme } from "../components/theme-provider"
import { useAuth } from "../components/auth-provider"
// import { syncSharePointContent } from "../lib/services/document-service" // Commented out for testing

export default function EducationalChatbot() {
  const [selectedCourse, setSelectedCourse] = useState("Military Leadership Fundamentals")
  const [searchQuery, setSearchQuery] = useState("")
  const [showDocumentPanel, setShowDocumentPanel] = useState(true)
  const { theme, setTheme } = useTheme()
  const { isAuthenticated, isLoading, user, signIn, signOut } = useAuth()
  const [syncStatus, setSyncStatus] = useState<{
    isSyncing: boolean;
    lastSync: Date | null;
    error: string | null;
  }>({
    isSyncing: false,
    lastSync: null,
    error: null
  });
  
  // Trigger initial sync when authenticated
  useEffect(() => {
    if (isAuthenticated && !syncStatus.isSyncing && !syncStatus.lastSync) {
      handleSync();
    }
  }, [isAuthenticated]);

  // Handle SharePoint content sync - BYPASSED FOR TESTING
  const handleSync = async () => {
    if (!isAuthenticated) {
      await signIn();
      return;
    }
    
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));
      
      // Mock successful sync for testing
      console.log('Mock sync: No actual API call made');
      
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set success state
      setSyncStatus({
        isSyncing: false,
        lastSync: new Date(),
        error: null
      });
      
      console.log('Mock sync completed successfully');
      
    } catch (error) {
      console.error('Error during sync:', error);
      setSyncStatus({
        isSyncing: false,
        lastSync: null,
        error: (error instanceof Error && error.message) ? error.message : 'Unknown error during sync'
      });
    }
  };

  // Authentication check bypassed for testing
  /* 
  // Show authentication screen if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="max-w-md w-full space-y-6 p-8 bg-card rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center">Educational Chatbot</h1>
          <p className="text-center text-muted-foreground">
            Please sign in to access your educational resources
          </p>
          <button
            onClick={() => signIn()}
            className="w-full py-2 px-4 bg-primary text-white rounded hover:bg-primary/90"
          >
            Sign in with Microsoft
          </button>
        </div>
      </div>
    );
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  */

  return (
    <div className="flex flex-col h-screen bg-background">
      <NavigationHeader
        selectedCourse={selectedCourse}
        onCourseChange={setSelectedCourse}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
        onThemeChange={setTheme}
        showDocumentPanel={showDocumentPanel}
        onToggleDocumentPanel={() => setShowDocumentPanel(!showDocumentPanel)}
        onSyncContent={handleSync}
        isSyncing={syncStatus.isSyncing}
        user={user}
        onSignOut={signOut}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 ${showDocumentPanel ? "lg:w-2/3" : "w-full"} transition-all duration-300`}>
          <ChatInterface selectedCourse={selectedCourse} searchQuery={searchQuery} />
        </div>

        {showDocumentPanel && (
          <div className="hidden lg:block lg:w-1/3 border-l border-border">
            <DocumentPanel />
          </div>
        )}
      </div>
    </div>
  )
}

