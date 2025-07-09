/**
 * Authentication service for handling Microsoft Authentication Library (MSAL)
 */

import { 
  PublicClientApplication, 
  AuthenticationResult, 
  AccountInfo,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';

// MSAL configuration
// Client-side only code
const getClientSideConfig = () => {
  return {
    auth: {
      clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || '',
      authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || ''}`,
      redirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    }
  };
};

// MSAL configuration - will be initialized on client side
const msalConfig = typeof window !== 'undefined' ? getClientSideConfig() : {
  auth: {
    clientId: '',
    authority: '',
    redirectUri: '',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  }
};

// Request scopes for the token
const tokenRequest = {
  scopes: ["User.Read", "Files.Read"],
  // Add other required scopes for the Azure Functions
};

// Initialize MSAL instance
let msalInstance: PublicClientApplication | null = null;

// Initialize MSAL in client-side context
export const initializeMsal = (): PublicClientApplication => {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
};

/**
 * Get the current active account
 */
export const getActiveAccount = (): AccountInfo | null => {
  if (!msalInstance) {
    initializeMsal();
  }
  
  if (!msalInstance) {
    return null;
  }
  
  const activeAccount = msalInstance.getActiveAccount();
  if (activeAccount) {
    return activeAccount;
  }
  
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
    return accounts[0];
  }
  
  return null;
};

/**
 * Sign in the user using a popup
 */
export const signIn = async (): Promise<AuthenticationResult | null> => {
  if (!msalInstance) {
    initializeMsal();
  }
  
  if (!msalInstance) {
    console.error('MSAL instance is not initialized');
    return null;
  }
  
  try {
    const response = await msalInstance.loginPopup({
      scopes: tokenRequest.scopes,
      prompt: 'select_account',
    });
    
    if (response) {
      msalInstance.setActiveAccount(response.account);
    }
    
    return response;
  } catch (error) {
    console.error('Sign in error:', error);
    return null;
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  if (!msalInstance) {
    initializeMsal();
  }
  
  if (!msalInstance) {
    return;
  }
  
  const activeAccount = msalInstance.getActiveAccount();
  if (activeAccount) {
    await msalInstance.logoutPopup({
      account: activeAccount,
    });
  }
};

/**
 * Get an authentication token for API calls
 */
export const getAuthToken = async (): Promise<string | null> => {
  // This function should only be called in client-side code
  if (typeof window === 'undefined') {
    console.warn('getAuthToken called during SSR, returning null');
    return null; // Server-side rendering context
  }
  
  if (!msalInstance) {
    initializeMsal();
  }
  
  if (!msalInstance) {
    console.error('MSAL instance is not initialized');
    return null;
  }
  
  const account = getActiveAccount();
  if (!account) {
    console.warn('No active account, user is not signed in');
    return null;
  }
  
  try {
    // Try to get token silently
    const response = await msalInstance.acquireTokenSilent({
      ...tokenRequest,
      account,
    });
    
    return response?.accessToken || null;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // Interactive sign-in is required
      try {
        const response = await msalInstance.acquireTokenPopup({
          ...tokenRequest,
          account,
        });
        
        return response?.accessToken || null;
      } catch (interactiveError) {
        console.error('Error acquiring token interactively:', interactiveError);
        return null;
      }
    }
    
    console.error('Error acquiring token silently:', error);
    return null;
  }
};
