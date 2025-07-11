"use client"

import { createContext, useContext, useEffect, useState } from "react"

type AuthProviderProps = {
  children: React.ReactNode
}

type User = {
  id: string
  name: string
  email: string
} | null

type AuthProviderState = {
  user: User
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signIn: (email?: string, password?: string) => Promise<void>
  signOut: () => Promise<void>
}

const initialState: AuthProviderState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  signIn: async () => {},
  signOut: async () => {}
}

const AuthProviderContext = createContext<AuthProviderState>(initialState)

export function AuthProvider({
  children,
  ...props
}: AuthProviderProps) {
  const [user, setUser] = useState<User>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Simulate checking for an existing session on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In a real app, you would check for an existing session here
        // For now, we'll just simulate this with a timeout
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // For development, you might want to set a mock user
        // Uncomment the following line to simulate a logged-in user
        // setUser({ id: '1', name: 'Test User', email: 'test@example.com' })
        
        setIsLoading(false)
      } catch (error) {
        console.error('Authentication check failed:', error)
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email?: string, password?: string) => {
    // In a real app, this would make a request to your authentication API
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Set user on successful login
      setUser({ 
        id: '1', 
        name: 'Test User', 
        email: email || 'user@example.com' 
      })
      
      setIsLoading(false)
    } catch (error) {
      console.error('Login failed:', error)
      setIsLoading(false)
      throw error
    }
  }

  const logout = async () => {
    // In a real app, this would make a request to your authentication API
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Clear user on successful logout
      setUser(null)
      
      setIsLoading(false)
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoading(false)
      throw error
    }
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    signIn: login,
    signOut: logout
  }

  return (
    <AuthProviderContext.Provider {...props} value={value}>
      {children}
    </AuthProviderContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthProviderContext)

  if (context === undefined)
    throw new Error("useAuth must be used within an AuthProvider")

  return context
}
