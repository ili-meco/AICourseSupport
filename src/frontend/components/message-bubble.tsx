"use client"

import { User, Bot, Copy, ThumbsUp, ThumbsDown, FileText } from "lucide-react"
import { Button } from "./ui/button" 
import { Avatar, AvatarFallback } from "./ui/avatar"

interface RelevantDocument {
  id: string
  name: string
  url: string
  relevanceScore: number
}

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
  attachments?: string[]
  relevantDocuments?: RelevantDocument[]
}

interface MessageBubbleProps {
  message: Message
}

// Simple markdown renderer for basic formatting
function renderMarkdown(content: string): JSX.Element {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  
  lines.forEach((line, index) => {
    if (line.startsWith('### ')) {
      elements.push(<h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.replace('### ', '')}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={index} className="text-xl font-semibold mt-4 mb-2">{line.replace('## ', '')}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={index} className="text-2xl font-bold mt-4 mb-2">{line.replace('# ', '')}</h1>)
    } else if (line.match(/^\d+\.\s/)) {
      // Handle numbered lists
      const text = line.replace(/^\d+\.\s/, '')
      const formattedText = formatInlineMarkdown(text)
      elements.push(<li key={index} className="ml-4 mb-1">{formattedText}</li>)
    } else if (line.startsWith('- ')) {
      // Handle bullet points
      const text = line.replace('- ', '')
      const formattedText = formatInlineMarkdown(text)
      elements.push(<li key={index} className="ml-4 mb-1 list-disc">{formattedText}</li>)
    } else if (line.trim() === '') {
      elements.push(<br key={index} />)
    } else {
      const formattedText = formatInlineMarkdown(line)
      elements.push(<p key={index} className="mb-2">{formattedText}</p>)
    }
  })
  
  return <div>{elements}</div>
}

// Handle inline markdown formatting like **bold** and *italic*
function formatInlineMarkdown(text: string): JSX.Element {
  const parts = []
  let currentIndex = 0
  
  // Handle **bold** text
  const boldRegex = /\*\*(.*?)\*\*/g
  let match
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push(text.slice(currentIndex, match.index))
    }
    // Add the bold text
    parts.push(<strong key={match.index}>{match[1]}</strong>)
    currentIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.slice(currentIndex))
  }
  
  return <span>{parts}</span>
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === "user"

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"} items-start space-x-2`}>
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-secondary"}>
            {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>

        <div className={`${isUser ? "mr-2" : "ml-2"} space-y-1`}>
          <div
            className={`rounded-lg px-4 py-2 ${
              isUser ? "bg-primary text-primary-foreground" : "bg-muted border border-border"
            }`}
          >
            <div className="text-sm break-words">
              {isUser ? (
                <div className="whitespace-pre-wrap">{message.content}</div>
              ) : (
                renderMarkdown(message.content)
              )}
            </div>
          </div>

          {/* Show relevant documents for AI messages */}
          {!isUser && message.relevantDocuments && message.relevantDocuments.length > 0 && (
            <div className="mt-2 p-3 bg-accent/50 rounded-lg border">
              <h4 className="text-xs font-semibold mb-2 flex items-center">
                <FileText className="w-3 h-3 mr-1" />
                Referenced Documents
              </h4>
              <div className="space-y-1">
                {message.relevantDocuments.map((doc, index) => (
                  <div key={doc.id} className="text-xs">
                    <span className="font-medium">Document {index + 1}:</span> {doc.name}
                    <span className="text-muted-foreground ml-1">
                      (Score: {doc.relevanceScore.toFixed(2)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className={`flex items-center space-x-1 text-xs text-muted-foreground ${isUser ? "justify-end" : "justify-start"}`}
          >
            <span>{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>

            {!isUser && (
              <div className="flex items-center space-x-1 ml-2">
                <Button variant="ghost" size="sm" onClick={handleCopy} aria-label="Copy message">
                  <Copy className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Like message">
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Dislike message">
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
