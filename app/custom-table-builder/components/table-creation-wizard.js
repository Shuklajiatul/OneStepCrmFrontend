"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ArrowLeft, ArrowRight, Check, Database, Plus, Trash2, X, Loader2 } from "lucide-react"
import { v4 as uuidv4 } from 'uuid'
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ColumnConfigPanel } from "./column-config-panel"
import { toast } from "sonner"

export function TableCreationWizard({ open, onOpenChange, onComplete, columnTypes }) {
    const [step, setStep] = useState(0) // 0: Details, 1: Columns
    const [loading, setLoading] = useState(false)

    // Step 0: Table Details
    const [tableName, setTableName] = useState("")
    const [description, setDescription] = useState("")

    // Step 1: Columns (Reusing logic from page.js)
    const [columns, setColumns] = useState([])
    const [activeColumnIndex, setActiveColumnIndex] = useState(0)

    const reset = () => {
        setStep(0)
        setTableName("")
        setDescription("")
        setColumns([createDefaultColumn()])
        setActiveColumnIndex(0)
    }

    const createDefaultColumn = () => ({
        id: uuidv4(),
        name: "New Column",
        type: "text",
        options: [],
        required: false,
        isSearchable: true,
        properties: {},
        validation: {},
        nestedFields: {}
    })

    const handleNext = () => {
        if (step === 0) {
            if (!tableName.trim()) {
                toast.error("Table name is required")
                return
            }
            if (columns.length === 0) {
                setColumns([createDefaultColumn()])
            }
            setStep(1)
        }
    }

    const handleBack = () => {
        setStep(Math.max(0, step - 1))
    }

    const handleComplete = async () => {
        if (!tableName.trim()) return

        // Validate columns
        const invalidColumn = columns.find(col => !col.name.trim())
        if (invalidColumn) {
            toast.error("All columns must have a name")
            return
        }

        setLoading(true)
        try {
            await onComplete({
                name: tableName,
                description,
                columns
            })
            onOpenChange(false)
            reset()
        } catch (error) {
            console.error("Wizard completion error:", error)
            // Toast handled by parent usually, but good to ensure
        } finally {
            setLoading(false)
        }
    }

    const essentialTypes = columnTypes.filter(t => t.category === "essential")
    const superUsefulTypes = columnTypes.filter(t => t.category === "super-useful")
    const customTypes = columnTypes.filter(t => t.category === "custom")

    // Inline reused components from page.js would be ideal, but for now we'll duplicate the structure 
    // or we could export them. Given the context, I'll inline the relevant UI for the column builder 
    // to keep this file self-contained without fragile exports from page.js.

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) reset()
            onOpenChange(val)
        }}>
            <DialogContent className={step === 1 ? "sm:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[1400px] h-[90vh] flex flex-col p-0 overflow-hidden text-foreground" : "sm:max-w-[500px]"}>
                {step === 0 ? (
                    // STEP 0: TABLE DETAILS
                    <div className="flex flex-col h-full">
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle>Create New Table</DialogTitle>
                        </DialogHeader>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label>Table Name</Label>
                                <Input
                                    value={tableName}
                                    onChange={e => setTableName(e.target.value)}
                                    placeholder="e.g., Customer Leads"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Describe what this table is for..."
                                    className="resize-none h-24"
                                />
                            </div>
                        </div>
                        <DialogFooter className="p-6 pt-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleNext}>
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    // STEP 1: CONFIGURE COLUMNS
                    <div className="flex flex-col h-full bg-background" style={{ overflow: 'hidden' }}>
                        <div className="p-4 border-b flex items-center justify-between bg-background z-10">
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div>
                                    <h2 className="text-lg font-semibold">Configure Columns</h2>
                                    <p className="text-xs text-muted-foreground">Add and configure fields for <span className="font-medium text-foreground">{tableName}</span></p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">{columns.length} Columns</Badge>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Left Sidebar - Column List */}
                            <div className="w-[300px] border-r bg-muted/20 flex flex-col h-full min-h-0">
                                <div className="p-3 border-b bg-background/50 flex items-center justify-between shrink-0">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">Fields</span>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                                        const newList = [...columns, createDefaultColumn()]
                                        setColumns(newList)
                                        setActiveColumnIndex(newList.length - 1)
                                    }}>
                                        <Plus className="h-3 w-3" /> Add Field
                                    </Button>
                                </div>
                                <ScrollArea className="flex-1 min-h-0">
                                    <div className="p-2 space-y-1">
                                        {columns.map((col, idx) => {
                                            const typeInfo = columnTypes.find(t => t.value === col.type) || columnTypes[0]
                                            return (
                                                <div
                                                    key={col.id}
                                                    className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${activeColumnIndex === idx ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                                                        }`}
                                                    onClick={() => setActiveColumnIndex(idx)}
                                                >
                                                    <typeInfo.icon className={`h-4 w-4 shrink-0 ${activeColumnIndex === idx ? "" : "text-muted-foreground"}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{col.name || "Untitled"}</p>
                                                        <p className={`text-[10px] ${activeColumnIndex === idx ? "opacity-80" : "text-muted-foreground"}`}>{typeInfo.label}</p>
                                                    </div>
                                                    {columns.length > 1 && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${activeColumnIndex === idx ? "hover:bg-white/20 text-white" : "hover:bg-destructive/10 text-destructive"
                                                                }`}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                const newList = columns.filter((_, i) => i !== idx)
                                                                setColumns(newList)
                                                                setActiveColumnIndex(Math.max(0, idx - 1))
                                                            }}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Middle - Type Selection & Main Config */}
                            {columns[activeColumnIndex] && (
                                <div className="flex-1 flex overflow-hidden min-h-0 bg-background">
                                    {/* Type Selector */}
                                    <div className="w-[240px] border-r bg-muted/10 flex flex-col h-full min-h-0 overflow-hidden">
                                        <div className="p-4 border-b shrink-0">
                                            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Field Type</h4>
                                        </div>
                                        <ScrollArea className="flex-1 min-h-0">
                                            <div className="p-3 space-y-6">
                                                {[
                                                    { label: "ESSENTIAL", types: essentialTypes },
                                                    { label: "PROFESSIONAL", types: superUsefulTypes },
                                                    { label: "CUSTOM", types: customTypes }
                                                ].map(group => (
                                                    <div key={group.label} className="space-y-1">
                                                        <p className="text-[10px] text-muted-foreground px-2 mb-1 font-medium">{group.label}</p>
                                                        {group.types.map(type => (
                                                            <Button
                                                                key={type.value}
                                                                variant={columns[activeColumnIndex].type === type.value ? "secondary" : "ghost"}
                                                                className={`w-full justify-start h-8 px-2 text-xs ${columns[activeColumnIndex].type === type.value ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}`}
                                                                onClick={() => {
                                                                    const newList = [...columns]
                                                                    newList[activeColumnIndex] = { ...newList[activeColumnIndex], type: type.value }
                                                                    setColumns(newList)
                                                                }}
                                                            >
                                                                <type.icon className="h-3.5 w-3.5 mr-2 opacity-70" />
                                                                {type.label}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>

                                    {/* Main Config Panel */}
                                    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-background/50">
                                        <ScrollArea className="flex-1 min-h-0">
                                            <div className="p-8 lg:p-10 max-w-2xl mx-auto w-full">
                                                <div className="mb-6 pb-4 border-b">
                                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                                        Looking good!
                                                        <span className="text-muted-foreground font-normal">Configure details for</span>
                                                        <Badge variant="outline">{columns[activeColumnIndex].name}</Badge>
                                                    </h2>
                                                </div>
                                                <ColumnConfigPanel
                                                    column={columns[activeColumnIndex]}
                                                    onUpdate={(updates) => {
                                                        const newList = [...columns]
                                                        newList[activeColumnIndex] = { ...newList[activeColumnIndex], ...updates }
                                                        setColumns(newList)
                                                    }}
                                                    columnTypes={columnTypes}
                                                />
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-background shrink-0 flex justify-between items-center z-10">
                            <div className="text-xs text-muted-foreground">
                                Step 2 of 2
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={handleBack}>Back</Button>
                                <Button onClick={handleComplete} disabled={loading} className="px-6">
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                                    Create Table
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
