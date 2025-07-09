"use client"

import { useState } from "react"
import { RotateCcw, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FlashCardData {
  front: string
  back: string
}

interface FlashCardProps {
  data: FlashCardData
}

export function FlashCard({ data }: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleReset = () => {
    setIsFlipped(false)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-secondary/20 bg-gradient-to-br from-secondary/5 to-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-secondary-foreground">F</span>
          </div>
          <span>Flashcard</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="min-h-[120px] p-6 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card cursor-pointer transition-all duration-300 hover:border-muted-foreground/40"
          onClick={handleFlip}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === "Enter" && handleFlip()}
          aria-label={isFlipped ? "Show front of card" : "Show back of card"}
        >
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-lg font-medium mb-2">{isFlipped ? data.back : data.front}</div>
            <div className="text-sm text-muted-foreground">{isFlipped ? "Answer" : "Click to reveal answer"}</div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button onClick={handleFlip} variant="outline" className="flex-1 bg-transparent">
            {isFlipped ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {isFlipped ? "Show Question" : "Show Answer"}
          </Button>
          <Button onClick={handleReset} variant="ghost">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
