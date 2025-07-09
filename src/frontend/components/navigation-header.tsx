"use client"

import { Search, Settings, BookOpen, Menu, Sun, Moon, Contrast, PanelRightClose, PanelRightOpen, RefreshCw, User, LogOut } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { AccountInfo } from "@azure/msal-browser"
import { useAuth } from "./auth-provider"

interface NavigationHeaderProps {
  selectedCourse: string
  onCourseChange: (course: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  theme: string
  onThemeChange: (theme: string) => void
  showDocumentPanel: boolean
  onToggleDocumentPanel: () => void
  onSyncContent?: () => void
  isSyncing?: boolean
  user?: AccountInfo | null
  onSignOut?: () => void
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
  isSyncing = false,
  user,
  onSignOut,
}: NavigationHeaderProps) {
  const courses = [
    "Military Leadership Fundamentals",
    "Strategic Defense Planning",
    "Cybersecurity for Defense Systems",
    "Military Logistics Management",
    "National Security Policy",
    "Defense Crisis Management",
  ]

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">DefenseTrainer AI</h1>
          </div>

          <Select value={selectedCourse} onValueChange={onCourseChange}>
            <SelectTrigger className="w-64 hidden sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course} value={course}>
                  {course}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {onSyncContent && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSyncContent}
              disabled={isSyncing}
              aria-label="Sync content from SharePoint"
              title="Sync content from SharePoint"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDocumentPanel}
            className="hidden lg:flex"
            aria-label={showDocumentPanel ? "Hide document panel" : "Show document panel"}
          >
            {showDocumentPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>

          {/* Theme Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Theme settings">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => onThemeChange("default")}>
                <Sun className="mr-2 h-4 w-4" />
                Light Theme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onThemeChange("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                Dark Theme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onThemeChange("high-contrast")}>
                <Contrast className="mr-2 h-4 w-4" />
                High Contrast
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="User profile">
                  <div className="flex items-center justify-center rounded-full bg-primary/10 text-primary h-6 w-6 text-xs font-medium">
                    {user.name?.charAt(0) || user.username?.charAt(0) || 'U'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2 text-sm">
                  <p className="font-medium">{user.name || user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.username}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
