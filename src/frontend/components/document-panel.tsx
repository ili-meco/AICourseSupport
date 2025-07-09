"use client"

import { useState } from "react"
import { FileText, ExternalLink, Search, Filter, BookOpen, Video, Link } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Document {
  id: string
  title: string
  type: "pdf" | "video" | "article" | "link"
  preview: string
  relevance: number
  tags: string[]
  url: string
}

export function DocumentPanel() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")

  const documents: Document[] = [
    {
      id: "1",
      title: "Tactical Decision Making in Modern Warfare",
      type: "pdf",
      preview: "This guide covers key principles of tactical decision making in dynamic battlefield environments...",
      relevance: 95,
      tags: ["tactics", "leadership", "battlefield management"],
      url: "#",
    },
    {
      id: "2",
      title: "Force Protection Strategies",
      type: "video",
      preview: "Interactive training video demonstrating comprehensive force protection measures and procedures...",
      relevance: 88,
      tags: ["security", "protection", "training"],
      url: "#",
    },
    {
      id: "3",
      title: "Canadian Military Doctrine Overview",
      type: "article",
      preview: "Comprehensive guide to understanding Canadian military doctrine with practical applications and case studies...",
      relevance: 82,
      tags: ["doctrine", "strategy", "operational"],
      url: "#",
    },
    {
      id: "4",
      title: "Allied Joint Operational Resources",
      type: "link",
      preview: "Curated collection of NATO and allied operational documents and procedures...",
      relevance: 75,
      tags: ["NATO", "allied", "joint operations"],
      url: "#",
    },
  ]

  const getIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-4 h-4" />
      case "video":
        return <Video className="w-4 h-4" />
      case "article":
        return <BookOpen className="w-4 h-4" />
      case "link":
        return <Link className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "pdf":
        return "bg-red-100 text-red-800"
      case "video":
        return "bg-blue-100 text-blue-800"
      case "article":
        return "bg-green-100 text-green-800"
      case "link":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesFilter = filterType === "all" || doc.type === filterType
    return matchesSearch && matchesFilter
  })

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">Related Resources</h2>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pdf">PDFs</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="article">Articles</SelectItem>
              <SelectItem value="link">Links</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-start justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    {getIcon(doc.type)}
                    <span className="line-clamp-2">{doc.title}</span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" aria-label="Open resource">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3 line-clamp-3">{doc.preview}</p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className={`text-xs ${getTypeColor(doc.type)}`}>
                      {doc.type.toUpperCase()}
                    </Badge>
                    {doc.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="text-xs text-muted-foreground">{doc.relevance}% match</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
