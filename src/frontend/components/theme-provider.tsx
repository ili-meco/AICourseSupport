"use client"

import { createContext, useContext, useEffect, useState } from "react"

interface ThemeContextType {
  theme: string
  setTheme: (theme: string) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

interface ThemeProviderProps {
  theme?: string
  children: React.ReactNode
  onThemeChange?: (theme: string) => void
}

export function ThemeProvider({ 
  theme: initialTheme = "default", 
  children,
  onThemeChange 
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<string>(initialTheme)
  useEffect(() => {
    // Only run on client-side
    const root = document.documentElement
    
    // Remove previous theme classes
    root.classList.remove("dark", "theme-high-contrast")
    
    // Add appropriate theme class
    if (theme === "dark") {
      root.classList.add("dark")
    } else if (theme === "high-contrast") {
      root.classList.add("theme-high-contrast")
    }
    
    // Call the onThemeChange callback if provided
    if (onThemeChange) {
      onThemeChange(theme);
    }
  }, [theme, onThemeChange])
  
  // Create a handler function that updates the state and calls the callback
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleThemeChange }}>
      {children}
    </ThemeContext.Provider>
  )
}
