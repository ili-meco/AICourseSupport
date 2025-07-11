"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { 
  FileText, 
  Search, 
  BookOpen, 
  X, 
  ChevronRight,
  Download,
  FileIcon,
  PlusCircle
} from "lucide-react"

interface Document {
  id: string
  title: string
  type: "pdf" | "doc" | "ppt" | "txt" | "other"
  url: string
  date: string
}

const mockDocuments: Document[] = [
  {
    id: "1",
    title: "Military Leadership: Core Principles",
    type: "pdf",
    url: "#",
    date: "2023-03-15",
  },
  {
    id: "2",
    title: "Tactical Planning Framework",
    type: "pdf",
    url: "#",
    date: "2023-04-22",
  },
  {
    id: "3",
    title: "Crisis Management Handbook",
    type: "pdf",
    url: "#",
    date: "2023-01-10",
  },
  {
    id: "4",
    title: "Strategic Operations Guidelines",
    type: "doc",
    url: "#",
    date: "2023-05-05",
  },
  {
    id: "5",
    title: "Defense Systems Overview",
    type: "ppt",
    url: "#",
    date: "2023-02-18",
  },
]

export function DocumentPanel() {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedDocument, setExpandedDocument] = useState<string | null>(null)
  const [pinnedDocuments, setPinnedDocuments] = useState<string[]>([])
  
  const filteredDocuments = mockDocuments.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const togglePinDocument = (id: string) => {
    setPinnedDocuments((current) =>
      current.includes(id)
        ? current.filter((docId) => docId !== id)
        : [...current, id]
    )
  }
  
  const getDocumentIcon = (type: Document["type"]) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />
      case "doc":
        return <FileText className="h-5 w-5 text-blue-500" />
      case "ppt":
        return <FileText className="h-5 w-5 text-orange-500" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Course Materials</h2>
        <div className="mt-2 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search documents..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pinned">Pinned</TabsTrigger>
            <TabsTrigger value="notes">My Notes</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="all" className="flex-1 overflow-y-auto p-4">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  className="border border-border rounded-md overflow-hidden"
                >
                  <div 
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent"
                    onClick={() => setExpandedDocument(expandedDocument === doc.id ? null : doc.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {getDocumentIcon(doc.type)}
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.date}</p>
                      </div>
                    </div>
                    <ChevronRight 
                      className={`h-5 w-5 transition-transform ${
                        expandedDocument === doc.id ? "transform rotate-90" : ""
                      }`} 
                    />
                  </div>
                  
                  {expandedDocument === doc.id && (
                    <div className="p-3 border-t border-border bg-accent/50">
                      <div className="flex justify-between items-center mb-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => togglePinDocument(doc.id)}
                          className="text-xs"
                        >
                          {pinnedDocuments.includes(doc.id) ? "Unpin" : "Pin"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-xs flex items-center"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                      <Button 
                        variant="default"
                        size="sm"
                        className="w-full"
                      >
                        <BookOpen className="h-4 w-4 mr-2" /> Read Document
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="pinned" className="flex-1 overflow-y-auto p-4">
          {pinnedDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pinned documents
            </div>
          ) : (
            <div className="space-y-3">
              {mockDocuments
                .filter((doc) => pinnedDocuments.includes(doc.id))
                .map((doc) => (
                  <div 
                    key={doc.id}
                    className="border border-border rounded-md overflow-hidden"
                  >
                    <div className="flex items-center p-3">
                      {getDocumentIcon(doc.type)}
                      <div className="ml-3">
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.date}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="ml-auto"
                        onClick={() => togglePinDocument(doc.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="notes" className="flex-1 overflow-y-auto p-4">
          <div className="text-center py-8">
            <FileIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Your personal notes will appear here</p>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
