"use client"

import { memo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useDraggable } from "@dnd-kit/core"
import {
  Type,
  Mail,
  Hash,
  ChevronDown,
  CheckSquare,
  AlignLeft,
  Circle,
  Upload,
  Calendar,
  PanelLeft,
  MapPin,
  Phone,
  Database,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const fieldTypes = [
  { type: "text", label: "Text Input", icon: Type, description: "Single line text" },
  { type: "email", label: "Email", icon: Mail, description: "Email validation" },
  { type: "phone", label: "Phone Number", icon: Phone, description: "Country code + number" },
  { type: "number", label: "Number", icon: Hash, description: "Numeric input" },
  { type: "textarea", label: "Textarea", icon: AlignLeft, description: "Multi-line text" },
  { type: "select", label: "Select", icon: ChevronDown, description: "Dropdown options" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare, description: "Multiple choice" },
  { type: "radio", label: "Radio", icon: Circle, description: "Single choice" },
  { type: "file", label: "File Upload", icon: Upload, description: "File attachment" },
  { type: "datetime", label: "Date Time", icon: Calendar, description: "Date and time picker" },
  { type: "location", label: "Location", icon: MapPin, description: "Country → State → City" },
  { type: "table_column", label: "Table Column", icon: Database, description: "Use table columns as fields" },
]

const DraggableFieldItem = memo(function DraggableFieldItem({ field, collapsed, onAddField }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `field-type-${field.type}`,
    data: {
      type: "field-type",
      fieldType: field.type,
    },
  })

  const handleClick = useCallback(() => {
    onAddField(field.type)
  }, [onAddField, field.type])

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const Icon = field.icon

  const buttonElement = (
    <Button
      ref={setNodeRef}
      style={style}
      variant="ghost"
      className={`w-full ${collapsed
          ? "justify-center p-2 h-10 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:scale-105"
          : "justify-start h-auto p-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm"
        } field-type-button cursor-grab active:cursor-grabbing rounded-md transition-all duration-200 ease-out ${isDragging ? "opacity-50 scale-95" : ""
        }`}
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      {collapsed ? (
        <Icon className="h-5 w-5" />
      ) : (
        <div className="flex items-start gap-3 w-full">
          <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-left min-w-0">
            <div className="font-medium text-sm truncate">{field.label}</div>
            <div className="text-xs text-sidebar-foreground/70 truncate">{field.description}</div>
          </div>
        </div>
      )}
    </Button>
  )

  // Only show tooltip when collapsed
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonElement}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <div className="text-center">
            <div className="font-medium">{field.label}</div>
            <div className="text-xs opacity-80">{field.description}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return buttonElement
})

const FieldPaletteComponent = function FieldPalette({ onAddField, collapsed = false, onToggleCollapse, width }) {
  const style = width ? { 
    width: `${width}px`,
    transition: 'width 0.05s ease-out'
  } : {}
  
  return (
    <div 
      className={`h-full bg-sidebar border-r border-sidebar-border ${collapsed ? "w-16" : ""} flex flex-col flex-shrink-0 transition-all duration-200 ease-out relative group/sidebar`}
      style={collapsed ? {} : style}
    >
      {/* Modern Toggle Button on Border */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-3 -right-3 z-20 h-6 w-6 rounded-full bg-background border border-border shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 ease-out opacity-0 group-hover/sidebar:opacity-100 hover:!opacity-100 ${
              collapsed ? "opacity-100" : ""
            }`}
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
        </TooltipContent>
      </Tooltip>

      <Card className={`border-0 shadow-none bg-transparent m-0 h-full flex flex-col ${collapsed ? "p-2" : "p-4"}`}>
        <CardHeader className={`p-0 ${collapsed ? "mb-2" : "mb-4"} flex-shrink-0`}>
          {!collapsed && (
            <CardTitle className="text-sm font-semibold text-sidebar-foreground uppercase tracking-wide flex items-center gap-2">
              <div className="w-2 h-2 bg-sidebar-primary rounded-full"></div>
              Field Types
            </CardTitle>
          )}
        </CardHeader>
        
        {/* Scrollable Content Area */}
        <CardContent className="p-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent">
            <div className={collapsed ? "space-y-1" : "space-y-2"}>
              {fieldTypes.map((field) => (
                <DraggableFieldItem 
                  key={field.type} 
                  field={field} 
                  collapsed={collapsed} 
                  onAddField={onAddField} 
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const FieldPalette = memo(FieldPaletteComponent)