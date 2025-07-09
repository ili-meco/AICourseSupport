"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Mic, MicOff } from "lucide-react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { MessageBubble } from "./message-bubble"
import { QuizCard } from "./quiz-card"
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

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        {
          type: "ai" as const,
          content:
            "Excellent question about defense strategies. Let me explain the operational concept with some examples from recent military exercises and provide you with additional resources to explore.",
        },
        {
          type: "quiz" as const,
          content: "Let's test your understanding of tactical procedures with a quick quiz:",
          quizData: {
            question: "Which principle is most important in establishing a defensive perimeter?",
            options: ["Mutual support", "Depth", "All-around security", "Dispersal"],
            correct: 2,
            explanation:
              "All-around security ensures the defensive position cannot be surprised from any direction and is prepared to respond to threats from any angle.",
          },
        },
        {
          type: "flashcard" as const,
          content: "Here's a key concept to remember for your defense training:",
          flashcardData: {
            front: "What is CBRN?",
            back: "Chemical, Biological, Radiological, and Nuclear defense - the protective measures taken in situations where these hazards may be present.",
          },
        },
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: randomResponse.type,
        content: randomResponse.content,
        timestamp: new Date(),
        quizData: randomResponse.quizData,
        flashcardData: randomResponse.flashcardData,
      }

      setMessages((prev) => [...prev, aiMessage])
    }, 1000)
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
            ) : message.type === "flashcard" ? (
              <FlashCard data={message.flashcardData} />
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
