"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { RotateCw } from "lucide-react"

interface FlashCardProps {
  flashcardData: {
    term: string
    definition: string
  }
}

export function FlashCard({ flashcardData }: { flashcardData: { term: string, definition: string } }) {
  const [isFlipped, setIsFlipped] = useState(false)
  
  return (
    <div
      className="p-4 border rounded-lg bg-card cursor-pointer h-[200px] relative perspective"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`absolute inset-0 backface-hidden transition-transform duration-500 ease-in-out ${
        isFlipped ? "rotate-y-180" : ""
      }`}>
        <div className="p-4 flex flex-col items-center justify-center h-full">
          <h3 className="font-semibold mb-2">Term</h3>
          <p className="text-center text-lg">{flashcardData.term}</p>
          <Button variant="ghost" size="sm" className="mt-4">
            <RotateCw className="h-4 w-4 mr-2" />
            Flip Card
          </Button>
        </div>
      </div>
      
      <div className={`absolute inset-0 backface-hidden rotate-y-180 transition-transform duration-500 ease-in-out ${
        isFlipped ? "rotate-y-0" : ""
      }`}>
        <div className="p-4 flex flex-col items-center justify-center h-full">
          <h3 className="font-semibold mb-2">Definition</h3>
          <p className="text-center">{flashcardData.definition}</p>
          <Button variant="ghost" size="sm" className="mt-4">
            <RotateCw className="h-4 w-4 mr-2" />
            Flip Card
          </Button>
        </div>
      </div>
      
      {/* CSS classes should be in a global stylesheet or Tailwind classes */}
    </div>
  )
}
