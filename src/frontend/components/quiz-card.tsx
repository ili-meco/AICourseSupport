"use client"

import { useState } from "react"
import { HelpCircle, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface QuizData {
  question: string
  options: string[]
  correct: number
  explanation: string
}

interface QuizCardProps {
  data: QuizData
}

export function QuizCard({ data }: QuizCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = () => {
    if (selectedOption === null) return

    setIsLoading(true)
    setTimeout(() => {
      setIsSubmitted(true)
      setIsLoading(false)
    }, 1000)
  }

  const isCorrect = selectedOption === data.correct

  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">Q</span>
          </div>
          <span>Knowledge Check</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="font-medium">{data.question}</div>

        <RadioGroup value={selectedOption?.toString()} onValueChange={(value: string) => setSelectedOption(Number(value))}>
          {data.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="flex items-center h-12 space-x-3 px-3 rounded-md border border-muted">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} disabled={isSubmitted} />
                <Label
                  htmlFor={`option-${index}`}
                  className={`flex-1 text-sm ${
                    isSubmitted && index === data.correct
                      ? "text-green-600 font-semibold"
                      : isSubmitted && index === selectedOption
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  {option}
                </Label>

                {isSubmitted && index === data.correct && <Check className="h-4 w-4 text-green-600" />}
                {isSubmitted && index === selectedOption && index !== data.correct && (
                  <X className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
          ))}
        </RadioGroup>

        {isSubmitted && (
          <div className="p-3 bg-muted/50 rounded-md border border-border">
            <div className="flex items-start space-x-2">
              <div className="p-1 mt-0.5 rounded-full bg-primary/20">
                {isCorrect ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <X className="h-3 w-3 text-red-600" />
                )}
              </div>
              <div className="space-y-1">
                <div className="font-medium text-sm">{isCorrect ? "Correct!" : "Incorrect"}</div>
                <p className="text-sm text-muted-foreground">{data.explanation}</p>
              </div>
            </div>
          </div>
        )}

        {!isSubmitted && (
          <Button onClick={handleSubmit} disabled={selectedOption === null || isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...
              </>
            ) : (
              "Submit Answer"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
