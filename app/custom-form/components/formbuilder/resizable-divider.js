"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export function ResizableDivider({ 
  onResize, 
  orientation = "vertical",
  minSize = 200,
  maxSize = 600,
  className,
  direction = "ltr" // "ltr" (left-to-right) or "rtl" (right-to-left)
}) {
  const [isDragging, setIsDragging] = useState(false)
  const dividerRef = useRef(null)
  const rafRef = useRef(null)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    // Use requestAnimationFrame for smooth updates
    rafRef.current = requestAnimationFrame(() => {
      const divider = dividerRef.current
      if (!divider) return

      const container = divider.parentElement
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      
      if (orientation === "vertical") {
        const mouseX = e.clientX
        
        let newWidth
        if (direction === "rtl") {
          // For right-aligned panels, calculate from the right edge
          const containerRight = containerRect.right
          newWidth = containerRight - mouseX
        } else {
          // For left-aligned panels, calculate from the left edge
          const containerLeft = containerRect.left
          newWidth = mouseX - containerLeft
        }
        
        // Constrain width between minSize and maxSize
        const constrainedWidth = Math.max(minSize, Math.min(maxSize, newWidth))
        onResize(constrainedWidth)
      } else {
        // For horizontal dividers
        const mouseY = e.clientY
        const containerTop = containerRect.top
        const newHeight = mouseY - containerTop
        
        const constrainedHeight = Math.max(minSize, Math.min(maxSize, newHeight))
        onResize(constrainedHeight)
      }
    })
  }, [isDragging, orientation, minSize, maxSize, onResize, direction])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    // Cancel any pending animation frame on mouse up
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = orientation === "vertical" ? "col-resize" : "row-resize"
      document.body.style.userSelect = "none"
      // Add a subtle overlay during dragging
      document.body.style.pointerEvents = "none"
      if (dividerRef.current) {
        dividerRef.current.style.pointerEvents = "auto"
      }
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        document.body.style.pointerEvents = ""
        // Clean up animation frame on cleanup
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, orientation])

  return (
    <div
      ref={dividerRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "group relative flex items-center justify-center transition-all duration-200 ease-in-out",
        orientation === "vertical" 
          ? "w-1 hover:w-2 cursor-col-resize hover:bg-primary/10" 
          : "h-1 hover:h-2 cursor-row-resize hover:bg-primary/10",
        isDragging && "w-2 bg-primary/20",
        className
      )}
    >
      <div
        className={cn(
          "absolute bg-border transition-all duration-200 ease-in-out",
          orientation === "vertical" ? "w-px h-full" : "h-px w-full",
          "group-hover:bg-primary/60",
          isDragging && "bg-primary w-0.5"
        )}
      />
      <div
        className={cn(
          "absolute bg-background border rounded-md shadow-lg transition-all duration-200 ease-in-out z-10",
          "opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-95",
          orientation === "vertical" 
            ? "w-6 h-12 flex items-center justify-center" 
            : "h-6 w-12 flex items-center justify-center",
          isDragging && "opacity-100 scale-110 border-primary bg-primary/5 shadow-xl"
        )}
      >
        <GripVertical
          className={cn(
            "transition-all duration-200 ease-in-out",
            "text-muted-foreground group-hover:text-primary",
            orientation === "vertical" ? "h-4 w-4" : "h-4 w-4 rotate-90",
            isDragging && "text-primary scale-110"
          )}
        />
      </div>
    </div>
  )
}

