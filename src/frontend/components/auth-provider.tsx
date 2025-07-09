"use client"

import { createContext, useContext, useState, useEffect } from "react";
import { AccountInfo } from "@azure/msal-browser";
import { 
  initializeMsal, 
  getActiveAccount, 
  signIn as msalSignIn,
  signOut as msalSignOut
} from "@/lib/services/auth-service";

// Define the authentication context state
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AccountInfo | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: Error | null;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  signIn: async () => {},
  signOut: async () => {},
  authError: null,
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

// Authentication provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [authError, setAuthError] = useState<Error | null>(null);

  // Initialize authentication state - BYPASSED FOR TESTING
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === 'undefined') {
        return; // Skip on server-side
      }
      
      try {
        // For testing: Set authenticated without MSAL
        setIsAuthenticated(true);
        
        // Mock user data
        setUser({
          homeAccountId: 'test-account',
          localAccountId: 'test-local-account',
          environment: 'test-env',
          tenantId: 'test-tenant',
          username: 'test@example.com',
          name: 'Test User'
        } as AccountInfo);
        
        /* COMMENTED OUT FOR TESTING
        // Initialize MSAL
        initializeMsal();
        
        // Check if user is already signed in
        const account = getActiveAccount();
        if (account) {
          setUser(account);
          setIsAuthenticated(true);
        }
        */
      } catch (error) {
        console.error("Auth initialization error:", error);
        setAuthError(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Handle sign in - BYPASSED FOR TESTING
  const signIn = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setAuthError(null);
      
      // Mock user for testing
      setUser({
        homeAccountId: 'test-account',
        localAccountId: 'test-local-account',
        environment: 'test-env',
        tenantId: 'test-tenant',
        username: 'test@example.com',
        name: 'Test User'
      } as AccountInfo);
      
      setIsAuthenticated(true);
      
      /* COMMENTED OUT FOR TESTING
      const result = await msalSignIn();
      
      if (result) {
        setUser(result.account);
        setIsAuthenticated(true);
      }
      */
    } catch (error) {
      console.error("Sign in error:", error);
      setAuthError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign out - BYPASSED FOR TESTING
  const signOut = async (): Promise<void> => {
    try {
      setIsLoading(true);
      // await msalSignOut(); // COMMENTED OUT FOR TESTING
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Sign out error:", error);
      setAuthError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auth context value
  const value = {
    isAuthenticated,
    isLoading,
    user,
    signIn,
    signOut,
    authError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
