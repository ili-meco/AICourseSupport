"use client"

import { useState } from "react"
import { Search, Moon, Sun, Menu, X, RefreshCw } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Theme } from "./theme-provider"

type User = {
  id: string
  name: string
  email: string
} | null

interface NavigationHeaderProps {
  selectedCourse: string
  onCourseChange: (course: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  showDocumentPanel: boolean
  onToggleDocumentPanel: () => void
  onSyncContent: () => void
  isSyncing: boolean
  user: User
  onSignOut: () => void
}

export function NavigationHeader({
  selectedCourse,
  onCourseChange,
  searchQuery,
  onSearchChange,
  theme,
  onThemeChange,
  showDocumentPanel,
  onToggleDocumentPanel,
  onSyncContent,
  isSyncing,
  user,
  onSignOut,
}: NavigationHeaderProps) {
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false)
  
  const availableCourses = [
    "Military Leadership Fundamentals",
    "Strategic Operations",
    "Tactical Planning",
    "Advanced Defense Systems",
    "Crisis Management",
  ]
  
  const toggleTheme = () => {
    onThemeChange(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="bg-background border-b border-border">
      <div className="container mx-auto flex items-center justify-between p-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsNavOpen(!isNavOpen)}
          aria-label="Toggle navigation menu"
        >
          {isNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-lg font-bold">Educational AI</h1>
        </div>
        
        {/* Course Selector (Desktop) */}
        <div className="hidden md:block relative">
          <Button
            variant="ghost"
            className="text-base font-medium"
            onClick={() => setIsCourseMenuOpen(!isCourseMenuOpen)}
          >
            {selectedCourse}
          </Button>
          {isCourseMenuOpen && (
            <div className="absolute z-10 mt-2 w-72 rounded-md shadow-lg bg-popover border border-border">
              <div className="py-1" role="menu" aria-orientation="vertical">
                {availableCourses.map((course) => (
                  <button
                    key={course}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-accent ${
                      course === selectedCourse ? "bg-accent/50" : ""
                    }`}
                    onClick={() => {
                      onCourseChange(course)
                      setIsCourseMenuOpen(false)
                    }}
                  >
                    {course}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search in course materials..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        
        {/* Right side actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDocumentPanel}
            aria-label="Toggle document panel"
            className="hidden md:flex"
          >
            <span className="sr-only">Toggle document panel</span>
            <div className={`h-5 w-5 grid grid-cols-2 gap-0.5 ${showDocumentPanel ? 'opacity-80' : 'opacity-50'}`}>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
            </div>
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onSyncContent}
            disabled={isSyncing}
            aria-label="Sync content"
          >
            <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
          
          {user ? (
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-sm">{user.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex"
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
      
      {/* Mobile menu */}
      {isNavOpen && (
        <div className="md:hidden p-4 bg-background border-t border-border">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Course</label>
              <select 
                className="block w-full bg-background border border-input rounded px-3 py-2"
                value={selectedCourse}
                onChange={(e) => onCourseChange(e.target.value)}
              >
                {availableCourses.map((course) => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search in course materials..."
                  className="pl-8 w-full"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-between pt-2">
              {user ? (
                <div className="text-sm">
                  <div>{user.name}</div>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0"
                    onClick={onSignOut}
                  >
                    Sign out
                  </Button>
                </div>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
