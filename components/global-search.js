"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Command } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const searchItems = [
  { label: "Dashboard", category: "General", href: "/", type: "page" },
  { label: "Leads", category: "General", href: "/", tab: "leads", type: "page" },
  { label: "Forms", category: "General", href: "/", tab: "forms", type: "page" },
  { label: "Custom Form", category: "Forms", href: "/", tab: "custom-form", type: "page" },
  { label: "My Forms", category: "Forms", href: "/", tab: "my-forms", type: "page" },
  { label: "Form Analytics", category: "Forms", href: "/", tab: "form-analytics", type: "page" },
  { label: "Gene Management", category: "Gene Management", href: "/", tab: "general-management", type: "page" },
  { label: "Gene", category: "Gene Management", href: "/", tab: "gene", type: "page" },
  { label: "Feature", category: "Gene Management", href: "/feature", type: "route" },
  { label: "Permission Management System", category: "Gene Management", href: "/permissionManagementSystem", type: "route" },
  { label: "User Management", category: "User Management", href: "/users", type: "route" },
  { label: "Role Management", category: "User Management", href: "/roles", type: "route" },
  { label: "Org Management", category: "User Management", href: "/organizations", type: "route" },
  { label: "Custom Table", category: "General", href: "/", tab: "custom-table", type: "page" },
  { label: "Report", category: "General", href: "/", tab: "report", type: "page" },
  { label: "Setting", category: "General", href: "/", tab: "setting", type: "page" },
  { label: "Help", category: "General", href: "/", tab: "help", type: "page" },
  { label: "Profile", category: "User", href: "/profile", type: "route" },
  { label: "Settings", category: "User", href: "#", type: "action" },
]

export default function GlobalSearch({ open, onOpenChange }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  const filteredItems = searchItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(true)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [onOpenChange])

  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setSelectedIndex(0)
    }
  }, [open])

  const handleSelect = (item) => {
    if (item.type === "route") {
      router.push(item.href)
    } else if (item.type === "page") {
      if (item.tab) {
        sessionStorage.setItem('intended-tab', item.tab)
      }
      router.push(item.href)
    }
    onOpenChange(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < filteredItems.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex])
      }
    } else if (e.key === "Escape") {
      onOpenChange(false)
    }
  }

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        
        <div className="flex items-center border-b px-4 py-3">
          <Search className="size-4 text-muted-foreground mr-2" />
          <Input
            placeholder="Search pages, features, and more..."
            className="flex-1 border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {/* <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Command className="size-3" />
            <span>K</span>
          </div> */}
        </div>

        <ScrollArea className="max-h-[400px]">
          {Object.keys(groupedItems).length > 0 ? (
            <div className="p-2">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="text-xs font-medium text-muted-foreground px-3 py-2 uppercase tracking-wide">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {items.map((item, index) => {
                      const globalIndex = filteredItems.findIndex(fi => fi === item)
                      return (
                        <button
                          key={`${category}-${item.label}`}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                            globalIndex === selectedIndex
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/50"
                          )}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <div className="flex-1 text-left">
                            <div className="font-medium">{item.label}</div>
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {item.type}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No results found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try searching for something else
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}