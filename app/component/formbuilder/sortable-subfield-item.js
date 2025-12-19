"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function SortableSubFieldItem({
    subField,
    value,
    onChange,
    disabled,
    isBuilder,
    onSelectSubField,
    selectedSubFieldId,
    parentId,
    onDeleteSubField,
    renderInput
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: subField.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const isSelected = selectedSubFieldId === subField.id

    const handleSelect = (e) => {
        if (isBuilder && onSelectSubField) {
            e.stopPropagation()
            onSelectSubField(subField, parentId)
        }
    }

    const handleDelete = (e) => {
        e.stopPropagation()
        if (onDeleteSubField) {
            onDeleteSubField(subField.id, parentId)
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group/subfield relative space-y-2 p-3 rounded-md transition-all cursor-pointer",
                isBuilder
                    ? isSelected
                        ? 'ring-2 ring-primary bg-primary/5 border border-primary/30'
                        : 'hover:bg-gray-100/80 hover:ring-1 hover:ring-gray-300'
                    : '',
                isDragging && "z-50 shadow-xl bg-white ring-2 ring-primary"
            )}
            onClick={handleSelect}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isBuilder && (
                        <div
                            {...attributes}
                            {...listeners}
                            className="opacity-0 group-hover/subfield:opacity-100 cursor-grab hover:text-primary transition-opacity"
                        >
                            <GripVertical className="h-4 w-4" />
                        </div>
                    )}
                    <Label className={cn("cursor-pointer", isSelected ? 'text-primary font-medium' : '')}>
                        {subField.label}
                        {subField.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                    </Label>
                </div>

                {isBuilder && (
                    <div className="flex items-center gap-2">
                        <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                            {subField.type}
                        </Badge>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/subfield:opacity-100 transition-opacity"
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>

            <div className={isBuilder ? "pointer-events-none" : ""}>
                {renderInput()}
            </div>
        </div>
    )
}
