"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Label } from "./ui/label"
import { cn } from "../lib/utils"

interface QuizOption {
  id: string
  text: string
  isCorrect: boolean
}

interface QuizCardProps {
  data: {
    question: string
    options: QuizOption[]
    explanation?: string
  }
}

export default function QuizCard({ data }: QuizCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const handleOptionChange = (value: string) => {
    if (!hasSubmitted) {
      setSelectedOptionId(value)
    }
  }

  const handleSubmit = () => {
    setHasSubmitted(true)
  }

  const handleNext = () => {
    // Reset the card state for the next question
    setSelectedOptionId(null)
    setHasSubmitted(false)
  }

  const isCorrectAnswer = 
    selectedOptionId !== null && 
    data.options.find(option => option.id === selectedOptionId)?.isCorrect

  return (
    <div className="border rounded-xl p-6 mb-6 bg-card shadow-sm">
      <h3 className="font-semibold text-lg mb-4">Quiz Question</h3>
      
      <p className="mb-6">{data.question}</p>
      
      <RadioGroup 
        value={selectedOptionId || ""} 
        onValueChange={handleOptionChange}
        className="space-y-3"
      >
        {data.options.map((option) => {
          const showCorrectUI = hasSubmitted && option.isCorrect
          const showIncorrectUI = hasSubmitted && selectedOptionId === option.id && !option.isCorrect
          
          return (
            <div 
              key={option.id} 
              className={cn(
                "flex items-start space-x-2 p-3 rounded-md border",
                showCorrectUI && "border-green-500 bg-green-50 dark:bg-green-900/20",
                showIncorrectUI && "border-red-500 bg-red-50 dark:bg-red-900/20",
                hasSubmitted && !showCorrectUI && !showIncorrectUI && "opacity-70"
              )}
            >
              <RadioGroupItem 
                value={option.id} 
                id={option.id} 
                disabled={hasSubmitted}
                className={cn(
                  showCorrectUI && "text-green-500 border-green-500",
                  showIncorrectUI && "text-red-500 border-red-500"
                )}
              />
              <Label 
                htmlFor={option.id} 
                className={cn(
                  "flex-1 cursor-pointer",
                  showCorrectUI && "text-green-700 dark:text-green-300",
                  showIncorrectUI && "text-red-700 dark:text-red-300"
                )}
              >
                {option.text}
              </Label>
            </div>
          )
        })}
      </RadioGroup>
      
      {hasSubmitted && data.explanation && (
        <div className="mt-6 p-4 bg-muted rounded-md">
          <h4 className="font-medium mb-2">Explanation:</h4>
          <p className="text-sm">{data.explanation}</p>
        </div>
      )}
      
      <div className="mt-6 flex justify-end">
        {!hasSubmitted ? (
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedOptionId}
          >
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next Question
          </Button>
        )}
      </div>
    </div>
  )
}
