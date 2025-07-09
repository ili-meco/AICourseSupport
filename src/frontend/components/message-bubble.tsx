"use client"

import { User, Bot, Copy, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "./ui/button" 
import { Avatar, AvatarFallback } from "./ui/avatar"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
  attachments?: string[]
}

interface MessageBubbleProps {
  message: Message
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
            <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
          </div>

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
