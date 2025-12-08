"use client"

import { useState, memo, useCallback, useMemo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { FieldRenderer } from "./field-renderer"

const SortableFieldItemComponent = function SortableFieldItem({ field, selectedField, onSelectField, onDeleteField, onUpdateField, isActive, onSelectSubField, selectedSubFieldId, onDeleteSubField }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    // Add a small delay for the animation before actually deleting
    setTimeout(() => {
      onDeleteField(field.id)
    }, 200)
  }, [field.id, onDeleteField])

  const handleSelect = useCallback(() => {
    if (!isDeleting) {
      onSelectField(field)
    }
  }, [field, isDeleting, onSelectField])

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition: isDeleting ? "transform 0.2s ease-in-out" : transition,
    zIndex: isDragging ? 1000 : 'auto',
  }), [transform, transition, isDeleting, isDragging])

  const isSelected = useMemo(() =>
    selectedField?.id === field.id,
    [selectedField?.id, field.id]
  )

  // Don't render table_column fields as they are configuration-only
  if (field.type === "table_column") {
    return null
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative transition-all duration-200",
        isDragging && "opacity-30 scale-95 shadow-lg",
      )}
    >
      <Card
        className={cn(
          "cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md",
          isSelected ? "ring-2 ring-primary border-primary/50" : "hover:border-primary/30",
          isDeleting && "opacity-50 scale-95 transform -translate-x-4",
        )}
        onClick={handleSelect}
        {...attributes}
        {...listeners}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <FieldRenderer
                field={field}
                isBuilder={true}
                onSelectField={onSelectField}
                onUpdateSubField={onUpdateField}
                selectedSubFieldId={selectedSubFieldId}
                onDeleteSubField={onDeleteSubField}
              />
            </div>

            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isSelected && !isDeleting && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {field.type}
                </Badge>
                {/* <span>•</span> */}
                {/* <span>ID: {field.id}</span> */}
                {field.required && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  </>
                )}
              </div>
            </div>
          )}

          {isDeleting && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-destructive">
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                <span>Deleting field...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const SortableFieldItem = memo(SortableFieldItemComponent)