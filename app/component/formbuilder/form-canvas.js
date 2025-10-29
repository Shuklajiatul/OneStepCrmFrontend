"use client"

import { memo, useMemo } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, GripVertical, Settings, Plus, Database } from "lucide-react"
import { cn } from "@/lib/utils"
import { FieldRenderer } from "./field-renderer"
import { SortableFieldItem } from "./sortable-field-item"

const FormCanvasComponent = function FormCanvas({ fields, selectedField, onSelectField, onDeleteField, onMoveField, onAddField, activeId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "form-canvas",
  })

  const fieldIds = useMemo(() => fields.map(field => field.id), [fields])

  if (fields.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "h-full flex items-center justify-center transition-colors duration-200",
          isOver && "bg-primary/5 border-2 border-dashed border-primary",
        )}
      >
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            {isOver ? (
              <Plus className="h-8 w-8 text-primary" />
            ) : (
              <Settings className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-medium mb-2">
            {isOver ? "Drop to Add Field" : "Start Building Your Form"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {isOver
              ? "Release to add this field to your form"
              : "Add fields from the palette on the left to start creating your form. Drag and drop to reorder fields."}
          </p>
          {!isOver && (
            <Badge variant="outline" className="text-xs">
              Tip: Click on any field to configure its properties
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-full overflow-y-auto p-6"
      ref={setNodeRef}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Form Preview</h2>
          <p className="text-muted-foreground">Configure your form fields and see the live preview</p>
        </div>

        <SortableContext 
          items={fieldIds}
          strategy={verticalListSortingStrategy}
        >
          {fields.map((field) => (
            <SortableFieldItem
              key={field.id}
              field={field}
              selectedField={selectedField}
              onSelectField={onSelectField}
              onDeleteField={onDeleteField}
              isActive={activeId === field.id}
            />
          ))}
        </SortableContext>

        {/* Drop zone at the end */}
        <div
          className={cn(
            "h-16 border-2 border-dashed border-transparent rounded-lg transition-colors duration-200 flex items-center justify-center",
            isOver && "border-primary bg-primary/5",
          )}
        >
          {isOver && <div className="text-sm text-primary font-medium">Drop field here to add to form</div>}
        </div>
      </div>
    </div>
  )
}

export const FormCanvas = memo(FormCanvasComponent)