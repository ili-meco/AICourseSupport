"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Mic, MicOff } from "lucide-react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { MessageBubble } from "./message-bubble"
import QuizCard from "./quiz-card"
import { FlashCard } from "./flash-card"

export interface Message {
  id: string
  type: "user" | "ai" | "quiz" | "flashcard"
  content: string
  timestamp: Date
  attachments?: string[]
  quizData?: any
  flashcardData?: any
}

export type UserAiMessage = Omit<Message, "type" | "quizData" | "flashcardData"> & {
  type: "user" | "ai"
}

interface ChatInterfaceProps {
  selectedCourse: string
  searchQuery: string
}

export function ChatInterface({ selectedCourse, searchQuery }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content: `Hello! I'm your AI learning assistant for ${selectedCourse}. I'm here to help you understand defense strategies, operational procedures, and training materials. How can I assist you with your defense learning objectives today?`,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    
    // Show typing indicator
    const typingIndicator: Message = {
      id: 'typing-indicator',
      type: 'ai',
      content: '...',
      timestamp: new Date(),
    }
    
    setMessages((prev) => [...prev, typingIndicator])
    
    try {
      // Send request to the backend API
      const response = await fetch('/api/ChatCompletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversation: messages.filter(m => m.id !== 'typing-indicator'),
          courseId: selectedCourse || undefined,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Create AI message from response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.message.content,
        timestamp: new Date(),
      }
      
      // Remove typing indicator and add AI response
      setMessages((prev) => prev.filter(m => m.id !== 'typing-indicator').concat([aiMessage]))
    } catch (error) {
      console.error('Error fetching chat response:', error)
      
      // Remove typing indicator and add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "I'm sorry, I couldn't process your request. Please try again.",
        timestamp: new Date(),
      }
      
      setMessages((prev) => prev.filter(m => m.id !== 'typing-indicator').concat([errorMessage]))
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.type === "quiz" ? (
              <QuizCard data={message.quizData} />
            ) : message.type === "flashcard" && message.flashcardData ? (
              <FlashCard term={message.flashcardData.term} definition={message.flashcardData.definition} />
            ) : (
              <MessageBubble message={message as UserAiMessage} />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-4">
        <div className="flex items-end space-x-2">
          <Button variant="ghost" size="icon" aria-label="Attach file">
            <Paperclip className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question or request help..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRecording}
            className={isRecording ? "text-red-500" : ""}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button onClick={handleSendMessage} disabled={!inputValue.trim()} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
