import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
    ArrowLeft, Plus, Settings2, CheckCircle2, Edit2, Trash2,
    ChevronRight, ChevronDown, BarChart2, Layers, GripVertical,
    Check, ChevronsUpDown, X, AlertCircle, Binary
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

// ─── Constants ───────────────────────────────────────────────────────────────

const LOGIC_OPERATORS = [
    { value: "=", label: "Equals", requiresValue: true },
    { value: "==", label: "Strict Equals", requiresValue: true },
    { value: "!=", label: "Not Equals", requiresValue: true },
    { value: "<>", label: "Not Equals (<>)", requiresValue: true },
    { value: ">", label: "Greater Than", requiresValue: true },
    { value: "<", label: "Less Than", requiresValue: true },
    { value: ">=", label: "Greater or Equal", requiresValue: true },
    { value: "<=", label: "Less or Equal", requiresValue: true },
    { value: "IN", label: "In List", requiresValue: true, isArray: true },
    { value: "NOT_IN", label: "Not In List", requiresValue: true, isArray: true },
    { value: "CONTAINS", label: "Contains", requiresValue: true, isArray: true },
    { value: "NOT_CONTAINS", label: "Does Not Contain", requiresValue: true, isArray: true },
    { value: "STARTS_WITH", label: "Starts With", requiresValue: true },
    { value: "ENDS_WITH", label: "Ends With", requiresValue: true },
    { value: "BETWEEN", label: "Between", requiresValue: true, isArray: true, maxValues: 2 },
    { value: "IS_EMPTY", label: "Is Empty", requiresValue: false },
    { value: "IS_NOT_EMPTY", label: "Is Not Empty", requiresValue: false },
]

// ─── colour helpers ────────────────────────────────────────────────────────────

const STAGE_COLORS = [
    { key: "unqualified", match: ["unqualified", "disqualified"], dot: "#9CA3AF", bar: "#9CA3AF", text: "text-gray-500" },
    { key: "cold", match: ["cold"], dot: "#60A5FA", bar: "#60A5FA", text: "text-blue-400" },
    { key: "warm", match: ["warm"], dot: "#F97316", bar: "#F97316", text: "text-orange-500" },
    { key: "hot", match: ["hot"], dot: "#EF4444", bar: "#EF4444", text: "text-red-500" },
    { key: "qualified", match: ["qualified", "won"], dot: "#22C55E", bar: "#22C55E", text: "text-green-500" },
]

const GROUP_COLORS = ["#6366F1", "#14B8A6", "#8B5CF6", "#F59E0B", "#3B82F6", "#10B981"]

function stageColor(label = "") {
    const l = label.toLowerCase()
    return STAGE_COLORS.find(c => c.match.some(m => l.includes(m))) || STAGE_COLORS[2]
}

// ─── Score Range Bar ───────────────────────────────────────────────────────────

function ScoreRangeBar({ stages }) {
    if (!stages.length) return null
    const sorted = [...stages].sort((a, b) => parseInt(a.min_score) - parseInt(b.min_score))
    const min = parseInt(sorted[0].min_score)
    const max = parseInt(sorted[sorted.length - 1].max_score)
    const total = max - min || 100

    const ticks = [0, 25, 50, 75, 100]

    return (
        <div className="mt-2 mb-4">
            {/* Tick labels */}
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1 px-0">
                {ticks.map(t => <span key={t}>{t}</span>)}
            </div>
            {/* Bar */}
            <div className="flex w-full h-8 rounded-lg overflow-hidden">
                {sorted.map((stage, i) => {
                    const w = ((parseInt(stage.max_score) - parseInt(stage.min_score) + 1) / (total + 1)) * 100
                    const c = stageColor(stage.label)
                    return (
                        <div
                            key={i}
                            style={{ width: `${w}%`, backgroundColor: c.bar }}
                            className="flex items-center justify-center text-white text-[11px] font-semibold truncate px-1"
                        >
                            {stage.label.charAt(0).toUpperCase() + stage.label.slice(1).toLowerCase()}
                        </div>
                    )
                })}
            </div>
            {/* Labels below */}
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{sorted[0]?.label}</span>
                <span>{sorted[sorted.length - 1]?.label}</span>
            </div>
        </div>
    )
}

// ─── Donut Chart (pure SVG) ────────────────────────────────────────────────────

function DonutChart({ groups }) {
    const total = groups.reduce((s, g) => s + (parseFloat(g.weight) || 0), 0)
    if (!groups.length || total === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                No groups yet
            </div>
        )
    }

    const size = 160
    const cx = size / 2
    const cy = size / 2
    const rings = [{ r: 58, stroke: 14 }, { r: 42, stroke: 14 }, { r: 26, stroke: 14 }, { r: 10, stroke: 14 }]

    // Build arcs per group
    const circumferences = rings.map(r => 2 * Math.PI * r.r)
    const sorted = [...groups].sort((a, b) => a.display_order - b.display_order)

    const arcs = sorted.slice(0, rings.length).map((g, i) => {
        const pct = (parseFloat(g.weight) || 0) / total
        const circ = circumferences[i]
        return {
            color: GROUP_COLORS[i % GROUP_COLORS.length],
            dashArray: `${pct * circ} ${circ}`,
            r: rings[i].r,
            stroke: rings[i].stroke,
            // start from top (rotate -90deg)
        }
    })

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background rings */}
            {rings.slice(0, sorted.length).map((ring, i) => (
                <circle
                    key={`bg-${i}`}
                    cx={cx} cy={cy} r={ring.r}
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth={ring.stroke}
                />
            ))}
            {/* Colored arcs */}
            {arcs.map((arc, i) => (
                <circle
                    key={`arc-${i}`}
                    cx={cx} cy={cy} r={arc.r}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={arc.stroke}
                    strokeDasharray={arc.dashArray}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                />
            ))}
        </svg>
    )
}

// ─── Health Check Bar ──────────────────────────────────────────────────────────

function HealthBar({ strategy, stages, groups }) {
    const isActive = strategy.is_active
    const weightSum = groups.reduce((s, g) => s + (parseFloat(g.weight) || 0), 0)
    const weightOk = Math.abs(weightSum - 1) < 0.01 || Math.abs(weightSum - 100) < 1
    const conditionCount = groups.reduce((s, g) => {
        try {
            const logic = typeof g.logic_structure === 'string' ? JSON.parse(g.logic_structure) : g.logic_structure
            const conditions = logic?.logic?.conditions || logic?.conditions || []
            return s + conditions.length
        } catch { return s }
    }, 0)

    const checks = [
        stages.length > 0,
        groups.length > 0,
        weightOk,
        true, // score coverage — assume ok
        conditionCount > 0,
    ]
    const passed = checks.filter(Boolean).length

    const weightPct = weightOk
        ? "100%"
        : `${Math.round(weightSum > 1 ? weightSum * 100 : weightSum)}%`

    const minScore = stages.length ? Math.min(...stages.map(s => parseInt(s.min_score))) : 0
    const maxScore = stages.length ? Math.max(...stages.map(s => parseInt(s.max_score))) : 100

    return (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-background border border-border/60 rounded-xl text-sm flex-wrap">
            {/* Pass badge */}
            <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border shrink-0",
                passed === checks.length
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
            )}>
                {passed}/{checks.length} checks passed
            </div>

            <div className="h-4 w-px bg-border shrink-0" />

            {/* Strategy name + live badge */}
            <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-sm text-foreground">{strategy.strategy_name}</span>
                {isActive && (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md uppercase tracking-wide">
                        Live
                    </span>
                )}
            </div>

            <div className="h-4 w-px bg-border shrink-0" />

            {/* Checks */}
            {[
                { label: `${stages.length} Lead Stages` },
                { label: `${groups.length} Scoring Groups` },
                { label: `Weight Sum: ${weightPct}`, ok: weightOk },
                { label: `Score Coverage: ${minScore}–${maxScore}` },
                { label: `${conditionCount} Conditions` },
            ].map(({ label, ok }, i) => (
                <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <CheckCircle2 className={cn("h-3.5 w-3.5", (ok === undefined ? checks[i] : ok) ? "text-green-500" : "text-amber-500")} />
                    {label}
                </div>
            ))}
        </div>
    )
}

// ─── Lead Stage Row ────────────────────────────────────────────────────────────

function StageRow({ stage, onEdit, onDelete }) {
    const c = stageColor(stage.label)
    return (
        <div className="flex items-center gap-3 py-3.5 px-1 border-b border-border/40 last:border-b-0 group">
            <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0 cursor-grab" />
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.dot }} />
            <span className="font-semibold text-sm text-foreground flex-1">{stage.label.charAt(0).toUpperCase() + stage.label.slice(1).toLowerCase()}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
                {stage.min_score} <span className="mx-1 text-muted-foreground/40">–</span> {stage.max_score}
            </span>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                    onClick={() => onEdit(stage)}>
                    <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"
                    onClick={() => onDelete(stage)}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    )
}

// ─── Inline Stage Form ─────────────────────────────────────────────────────────

function StageForm({ stage, onSave, onCancel, existingStages = [] }) {
    const [formData, setFormData] = useState({
        label: stage?.label || "",
        min_score: stage?.min_score?.toString() || "",
        max_score: stage?.max_score?.toString() || ""
    })
    const [error, setError] = useState("")

    const validateStage = () => {
        if (!formData.label.trim()) {
            setError("Stage label is required")
            return false
        }
        if (!formData.min_score || !formData.max_score) {
            setError("Min and Max scores are required")
            return false
        }

        const minScore = parseInt(formData.min_score)
        const maxScore = parseInt(formData.max_score)

        if (isNaN(minScore) || isNaN(maxScore)) {
            setError("Please enter valid numbers for scores")
            return false
        }

        if (minScore >= maxScore) {
            setError("Min score must be less than max score")
            return false
        }

        // Check for overlapping ranges with existing stages
        const overlappingStage = existingStages.find(s => {
            if (stage && (s.min_score === stage.min_score && s.max_score === stage.max_score && s.label === stage.label)) {
                return false // Skip the current stage being edited
            }
            return (minScore >= s.min_score && minScore <= s.max_score) ||
                (maxScore >= s.min_score && maxScore <= s.max_score) ||
                (minScore <= s.min_score && maxScore >= s.max_score)
        })

        if (overlappingStage) {
            setError(`Score range overlaps with stage "${overlappingStage.label}" (${overlappingStage.min_score}–${overlappingStage.max_score})`)
            return false
        }

        return true
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        setError("")

        if (validateStage()) {
            onSave({
                label: formData.label.trim(),
                min_score: parseInt(formData.min_score),
                max_score: parseInt(formData.max_score)
            })
        }
    }

    return (
        <div className="mb-4 p-4 border border-border/60 rounded-xl bg-muted/10">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {stage ? "Edit Stage" : "Add New Stage"}
                </span>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Stage Label
                        </Label>
                        <Input
                            placeholder="e.g. Warm, Hot, Qualified"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            className="h-9 text-sm"
                            autoFocus
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Min Score
                        </Label>
                        <Input
                            type="number"
                            placeholder="Score"
                            value={formData.min_score}
                            onChange={(e) => setFormData({ ...formData, min_score: e.target.value })}
                            className="h-9 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Max Score
                        </Label>
                        <Input
                            type="number"
                            placeholder="Score"
                            value={formData.max_score}
                            onChange={(e) => setFormData({ ...formData, max_score: e.target.value })}
                            className="h-9 text-sm"
                        />
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-2 rounded-md bg-red-50 border border-red-200 flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs text-red-600">{error}</span>
                    </div>
                )}

                <div className="flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                        className="h-8 px-3 text-xs"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        size="sm"
                        className="h-8 px-4 text-xs bg-primary hover:bg-primary/90"
                    >
                        {stage ? "Update Stage" : "Add Stage"}
                    </Button>
                </div>
            </form>
        </div>
    )
}

// ─── Multi-Value Input ─────────────────────────────────────────────────────────

const MultiValueInput = ({ value, onChange, placeholder, maxValues }) => {
    // Treat value as a comma-separated string or an array
    const values = Array.isArray(value) ? value : (typeof value === 'string' && value ? value.split(',').filter(Boolean) : [])
    const [inputValue, setInputValue] = useState('')

    const canAdd = !maxValues || values.length < maxValues

    const handleKeyDown = (e) => {
        // Prevent form submission if inside a form
        if (e.key === 'Enter') {
            e.preventDefault()
            const trimmed = inputValue.trim()
            if (trimmed && !values.includes(trimmed) && canAdd) {
                const newValues = [...values, trimmed]
                onChange(Array.isArray(value) ? newValues : newValues.join(','))
            }
            setInputValue('')
        } else if (e.key === ',') {
            e.preventDefault()
            const trimmed = inputValue.trim()
            if (trimmed && !values.includes(trimmed) && canAdd) {
                const newValues = [...values, trimmed]
                onChange(Array.isArray(value) ? newValues : newValues.join(','))
            }
            setInputValue('')
        }
    }

    const removeValue = (indexToRemove) => {
        const newValues = values.filter((_, i) => i !== indexToRemove)
        onChange(Array.isArray(value) ? newValues : newValues.join(','))
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5 p-1 min-h-[36px] border border-input rounded-md bg-transparent focus-within:ring-1 focus-within:ring-ring">
            {values.map((v, i) => (
                <Badge key={i} variant="secondary" className="px-1.5 py-0 rounded-sm font-normal text-[11px] flex items-center gap-1 h-6">
                    {v}
                    <button type="button" onClick={() => removeValue(i)} className="hover:text-destructive shrink-0">
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            ))}
            {canAdd && (
                <input
                    data-allow-enter="true"
                    className="flex-1 bg-transparent border-none shadow-none outline-none text-sm min-w-[60px] h-6 px-1.5 placeholder:text-muted-foreground"
                    placeholder={values.length === 0 ? placeholder : ''}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                        if (inputValue.trim() && !values.includes(inputValue.trim()) && canAdd) {
                            const newValues = [...values, inputValue.trim()]
                            onChange(Array.isArray(value) ? newValues : newValues.join(','))
                            setInputValue('')
                        }
                    }}
                />
            )}
        </div>
    )
}

// ─── Logic Builder ─────────────────────────────────────────────────────────────

const LogicBuilder = ({ logic = { operator: "AND", conditions: [] }, onChange, columns = [], depth = 0 }) => {
    const handleOperatorChange = (op) => onChange({ ...logic, operator: op })

    const addCondition = () => {
        const newCondition = { column_id: "", operator: LOGIC_OPERATORS[0].value, value: "", score: "" }
        onChange({ ...logic, conditions: [...(logic.conditions || []), newCondition] })
    }

    const addSubGroup = () => {
        const newSubGroup = { operator: "AND", conditions: [] }
        onChange({ ...logic, conditions: [...(logic.conditions || []), newSubGroup] })
    }

    const removeCondition = (index) => {
        const newConditions = [...(logic.conditions || [])]
        newConditions.splice(index, 1)
        onChange({ ...logic, conditions: newConditions })
    }

    const updateCondition = (index, condition) => {
        const newConditions = [...(logic.conditions || [])]
        newConditions[index] = condition
        onChange({ ...logic, conditions: newConditions })
    }

    const bgColors = ['bg-muted/10', 'bg-blue-50/20', 'bg-green-50/20', 'bg-amber-50/20', 'bg-rose-50/20']
    const borderColors = ['border-border', 'border-blue-200', 'border-green-200', 'border-amber-200', 'border-rose-200']
    const currentBg = bgColors[Math.min(depth, bgColors.length - 1)]
    const currentBorder = borderColors[Math.min(depth, borderColors.length - 1)]

    return (
        <div className={cn("space-y-4 p-4 border rounded-xl transition-all duration-300 shadow-sm", currentBg, currentBorder)}>
            <div className="flex items-center gap-4">
                <Select value={logic.operator} onValueChange={handleOperatorChange}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex-1 h-px bg-border" />
                <Button type="button" variant="outline" size="sm" onClick={addCondition} className="gap-2">
                    <Plus className="h-3 w-3" /> Condition
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addSubGroup} className="gap-2">
                    <Layers className="h-3 w-3" /> Group
                </Button>
            </div>
            <div className="space-y-3 pl-4 border-l-2">
                {logic.conditions?.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                        {item.operator && (item.conditions || item.operator === "AND" || item.operator === "OR") ? (
                            <div className="flex-1">
                                <LogicBuilder logic={item} onChange={(val) => updateCondition(index, val)} columns={columns} depth={depth + 1} />
                            </div>
                        ) : (
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3 bg-background p-2.5 rounded-lg border shadow-sm items-center">
                                <div className="sm:col-span-4">
                                    <Select value={item.column_id} onValueChange={(val) => updateCondition(index, { ...item, column_id: val })}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Column" /></SelectTrigger>
                                        <SelectContent>
                                            {columns.map(col => (
                                                <SelectItem key={col.column_id} value={col.column_id}>{col.display_name || col.column_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="sm:col-span-3">
                                    <Select value={item.operator} onValueChange={(val) => updateCondition(index, { ...item, operator: val })}>
                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {LOGIC_OPERATORS.map(op => (
                                                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="sm:col-span-3">
                                    {(() => {
                                        const opInfo = LOGIC_OPERATORS.find(o => o.value === item.operator);
                                        if (opInfo?.requiresValue === false) {
                                            return (
                                                <div className="h-9 flex items-center px-3 text-xs text-muted-foreground bg-muted/20 rounded border border-dashed italic">
                                                    No value needed
                                                </div>
                                            );
                                        }
                                        if (opInfo?.isArray) {
                                            return (
                                                <MultiValueInput
                                                    placeholder={item.operator === "BETWEEN" ? "Range (2 values)..." : "Value(s)..."}
                                                    value={item.value}
                                                    maxValues={opInfo.maxValues}
                                                    onChange={(val) => updateCondition(index, { ...item, value: val })}
                                                />
                                            );
                                        }
                                        return (
                                            <Input 
                                                className="h-9 border-primary/20 focus:border-primary" 
                                                placeholder="Value" 
                                                value={Array.isArray(item.value) ? item.value.join(',') : (item.value || "")} 
                                                onChange={(e) => updateCondition(index, { ...item, value: e.target.value })} 
                                            />
                                        );
                                    })()}
                                </div>
                                <div className="sm:col-span-2">
                                    <Input 
                                        className="h-9 border-primary/20 focus:border-primary" 
                                        type="number" 
                                        placeholder="Score" 
                                        value={item.score} 
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            updateCondition(index, { 
                                                ...item, 
                                                score: val === "" ? "" : parseInt(val) 
                                            })
                                        }} 
                                    />
                                </div>
                            </div>
                        )}
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeCondition(index)} className="text-destructive h-9 w-9 shrink-0">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Inline Group Form ─────────────────────────────────────────────────────────

function GroupForm({ group, onSave, onCancel, columns = [] }) {
    const parseLogic = useCallback((raw) => {
        if (!raw) return { operator: "AND", conditions: [] }
        if (typeof raw === 'object') return raw
        try { 
            const parsed = JSON.parse(raw);
            return parsed; // This might be {group_name, max_score, logic} or just the logic
        } catch (e) { 
            console.error("Failed to parse logic_structure:", e);
            return { operator: "AND", conditions: [] };
        }
    }, [])

    const [formData, setFormData] = useState({
        group_name: group?.group_name || "",
        description: group?.description || "",
        max_score: group?.max_score?.toString() || "",
        weight: group?.weight !== undefined ? group.weight.toString() : "",
        display_order: group?.display_order?.toString() || "",
        logic_structure: parseLogic(group?.logic_structure)
    })
    const [error, setError] = useState("")

    useEffect(() => {
        if (group) {
            setFormData({
                group_name: group.group_name || "",
                description: group.description || "",
                max_score: group.max_score?.toString() || "",
                weight: group.weight !== undefined ? group.weight.toString() : "",
                display_order: group.display_order?.toString() || "",
                logic_structure: parseLogic(group.logic_structure)
            })
        }
    }, [group, parseLogic])

    const handleLogicChange = (newLogic) => {
        setFormData(prev => ({ ...prev, logic_structure: { ...(typeof prev.logic_structure === 'object' ? prev.logic_structure : {}), logic: newLogic } }))
    }

    const validateGroup = () => {
        if (!formData.group_name.trim()) { setError("Group name is required"); return false }
        if (!formData.max_score || isNaN(parseInt(formData.max_score))) { setError("Valid max score is required"); return false }
        if (!formData.weight || isNaN(parseFloat(formData.weight))) { setError("Valid weight is required"); return false }
        return true
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        setError("")
        if (validateGroup()) {
            // Transform logic_structure values to arrays for specific operators
            const transformLogic = (node) => {
                if (!node) return node
                const newNode = { ...node }
                if (newNode.conditions) {
                    newNode.conditions = newNode.conditions.map(cond => {
                        if (cond.conditions || cond.operator === "AND" || cond.operator === "OR") {
                            return transformLogic(cond)
                        }
                        const opInfo = LOGIC_OPERATORS.find(o => o.value === cond.operator)
                        if (opInfo?.isArray) {
                            const values = typeof cond.value === 'string' ? cond.value.split(',').filter(Boolean) : (Array.isArray(cond.value) ? cond.value : [])
                            return { ...cond, value: values }
                        }
                        return cond
                    })
                }
                return newNode
            }

            const transformedData = {
                ...formData,
                logic_structure: {
                    ...formData.logic_structure,
                    logic: transformLogic(formData.logic_structure?.logic || formData.logic_structure)
                }
            }
            onSave(transformedData)
        }
    }

    const logicToEdit = useMemo(() => {
        const struct = formData.logic_structure;
        // The structure might be { group_name, max_score, logic: { operator, conditions } }
        // or just { operator, conditions }
        return struct?.logic || struct || { operator: "AND", conditions: [] }
    }, [formData.logic_structure])

    return (
        <div className="mb-4 p-5 border border-border/60 rounded-xl bg-background shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                    {group ? "Edit Scoring Group" : "Create Scoring Group"}
                </span>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Group Name</Label>
                        <Input value={formData.group_name} onChange={(e) => setFormData({ ...formData, group_name: e.target.value })} className="h-9 text-sm" autoFocus />
                    </div>
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Max Score</Label>
                        <Input type="number" value={formData.max_score} onChange={(e) => setFormData({ ...formData, max_score: e.target.value })} className="h-9 text-sm" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Weight (0-1)</Label>
                        <Input type="number" step="0.1" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} className="h-9 text-sm" />
                    </div>
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Display Order</Label>
                        <Input type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: e.target.value })} className="h-9 text-sm" />
                    </div>
                </div>
                <div className="mb-6">
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</Label>
                    <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="h-9 text-sm" />
                </div>

                <div className="mb-6 space-y-3 p-4 bg-muted/10 rounded-xl border border-border/40">
                    <label className="text-sm font-bold text-primary flex items-center gap-2">
                        <Binary className="h-4 w-4" /> Scoring Logic
                    </label>
                    <LogicBuilder columns={columns} logic={logicToEdit} onChange={handleLogicChange} />
                </div>

                {error && (
                    <div className="mb-4 p-2 rounded-md bg-red-50 border border-red-200 flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs text-red-600">{error}</span>
                    </div>
                )}
                <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-8 px-3 text-xs">Cancel</Button>
                    <Button type="submit" size="sm" className="h-8 px-4 text-xs bg-primary hover:bg-primary/90">{group ? "Update Group" : "Save Group"}</Button>
                </div>
            </form>
        </div>
    )
}

// ─── Group Edit Modal ─────────────────────────────────────────────────────────

function GroupModal({ isOpen, onClose, onSave, group, columns = [] }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-6xl max-h-[95vh] p-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle className="text-lg font-bold">Edit Scoring Group</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        Modify the group details and scoring logic below.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-auto">
                    <div className="px-6 py-4">
                        <GroupForm
                            group={group}
                            onSave={onSave}
                            onCancel={onClose}
                            columns={columns}
                        />
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

// ─── Scoring Group Row ─────────────────────────────────────────────────────────

function GroupRow({ group, index, onEdit, onDelete }) {
    const [expanded, setExpanded] = useState(false)
    const color = GROUP_COLORS[index % GROUP_COLORS.length]
    const weightPct = group.weight
        ? (parseFloat(group.weight) <= 1
            ? `${Math.round(parseFloat(group.weight) * 100)}%`
            : `${Math.round(parseFloat(group.weight))}%`)
        : "0%"

    // Count conditions in logic
    let conditionCount = 0
    try {
        const logic = typeof group.logic_structure === 'string' ? JSON.parse(group.logic_structure) : group.logic_structure
        const conditions = logic?.logic?.conditions || logic?.conditions || []
        conditionCount = conditions.length
    } catch { /* noop */ }

    return (
        <div className="border border-border/50 rounded-xl overflow-hidden mb-3 last:mb-0 bg-background">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-muted/30 transition-colors group"
                onClick={() => setExpanded(e => !e)}>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", expanded && "rotate-90")} />
                {/* Numbered badge */}
                <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: color }}>
                    {group.display_order || index + 1}
                </div>
                {/* Name + description */}
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground">{group.group_name}</div>
                    {group.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{group.description}</div>
                    )}
                </div>
                {/* Weight + max score */}
                <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                        <div className="text-sm font-bold text-foreground">{weightPct}</div>
                        <div className="text-[10px] text-muted-foreground">weight</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold" style={{ color }}>{group.max_score}pts</div>
                        <div className="text-[10px] text-muted-foreground">max score</div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                            onClick={() => onEdit(group)}>
                            <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"
                            onClick={() => onDelete(group.id || group.group_id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Expanded logic preview */}
            {expanded && (
                <div className="border-t border-border/40 bg-muted/20 px-5 py-4">
                    {conditionCount === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No conditions defined yet.</p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            {conditionCount} condition{conditionCount !== 1 ? 's' : ''} defined in this group's logic.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Weight Distribution Legend ────────────────────────────────────────────────

function WeightLegend({ groups }) {
    const sorted = [...groups].sort((a, b) => a.display_order - b.display_order)
    const total = sorted.reduce((s, g) => s + (parseFloat(g.weight) || 0), 0)

    return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
            {sorted.map((g, i) => {
                const color = GROUP_COLORS[i % GROUP_COLORS.length]
                const pct = total > 0
                    ? Math.round(((parseFloat(g.weight) || 0) / total) * 100)
                    : 0
                return (
                    <div key={g.id || g.group_id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-xs text-muted-foreground truncate max-w-[110px]">{g.group_name}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground shrink-0">{pct}%</span>
                    </div>
                )
            })}
        </div>
    )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function StrategyConfigView({
    strategy,
    tableName,
    stages = [],
    groups = [],
    allStrategies = [],
    onBack,
    onEditStrategy,
    onAddStage,
    onEditStage,
    onDeleteStage,
    onAddGroup,
    onEditGroup,
    onDeleteGroup,
    onSwitchStrategy,
    columns = []
}) {
    const isActive = strategy.is_active
    const sortedStages = [...stages].sort((a, b) => parseInt(a.min_score) - parseInt(b.min_score))
    const sortedGroups = [...groups].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

    const [showNewStageForm, setShowNewStageForm] = useState(false)
    const [editingStageId, setEditingStageId] = useState(null) // Track which stage is being edited by min_score
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
    const [groupToEdit, setGroupToEdit] = useState(null)

    const totalWeight = groups.reduce((s, g) => s + (parseFloat(g.weight) || 0), 0)
    const weightPct = totalWeight > 0
        ? (totalWeight <= 1 ? `${Math.round(totalWeight * 100)}%` : `${Math.round(totalWeight)}%`)
        : "0%"
    const weightOk = Math.abs(totalWeight - 1) < 0.01 || Math.abs(totalWeight - 100) < 1

    const handleAddStageClick = () => {
        setEditingStageId(null)
        setShowNewStageForm(true)
    }

    const handleEditStageClick = (stage) => {
        setShowNewStageForm(false)
        setEditingStageId(stage.min_score) // Use min_score as unique identifier
    }

    const handleCancelNewStage = () => {
        setShowNewStageForm(false)
        setEditingStageId(null)
    }

    const handleCancelEditStage = () => {
        setEditingStageId(null)
    }

    const handleSaveNewStage = (stageData) => {
        onAddStage(stageData)
        setShowNewStageForm(false)
    }

    const handleSaveEditStage = (stageData) => {
        // Find the stage being edited and update it
        const stageToEdit = sortedStages.find(s => s.min_score === editingStageId)
        if (stageToEdit) {
            onEditStage({
                ...stageToEdit,
                ...stageData
            })
        }
        setEditingStageId(null)
    }

    const handleAddGroupClick = () => {
        setGroupToEdit(null)
        setIsGroupModalOpen(true)
    }

    const handleEditGroupClick = (group) => {
        setGroupToEdit(group)
        setIsGroupModalOpen(true)
    }

    const handleCancelGroupModal = () => {
        setIsGroupModalOpen(false)
        setGroupToEdit(null)
    }

    const handleSaveGroupModal = (groupData) => {
        if (groupToEdit) {
            onEditGroup({
                ...groupToEdit,
                ...groupData
            })
        } else {
            onAddGroup(groupData)
        }
        setIsGroupModalOpen(false)
        setGroupToEdit(null)
    }

    // Render stages with edit forms in place
    const renderStages = () => {
        if (sortedStages.length === 0 && !showNewStageForm) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Layers className="h-10 w-10 opacity-20 mb-3" />
                    <p className="text-sm">No lead stages defined yet.</p>
                    <Button variant="outline" size="sm" className="h-8 text-xs px-4 mt-4" onClick={handleAddStageClick}>
                        Create First Stage
                    </Button>
                </div>
            )
        }

        return (
            <div className="space-y-0">
                {/* New Stage Form - appears at the TOP */}
                {showNewStageForm && (
                    <StageForm
                        stage={null}
                        onSave={handleSaveNewStage}
                        onCancel={handleCancelNewStage}
                        existingStages={sortedStages}
                    />
                )}

                {/* Existing Stages */}
                {sortedStages.map((stage) => {
                    const isEditing = editingStageId === stage.min_score

                    if (isEditing) {
                        return (
                            <StageForm
                                key={`edit-${stage.min_score}`}
                                stage={stage}
                                onSave={handleSaveEditStage}
                                onCancel={handleCancelEditStage}
                                existingStages={sortedStages}
                            />
                        )
                    }

                    return (
                        <StageRow
                            key={stage.stage_id || stage.min_score}
                            stage={stage}
                            onEdit={handleEditStageClick}
                            onDelete={onDeleteStage}
                        />
                    )
                })}
            </div>
        )
    }

    const renderGroups = () => {
        if (sortedGroups.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <BarChart2 className="h-10 w-10 opacity-20 mb-3" />
                    <p className="text-sm">No scoring groups defined yet.</p>
                </div>
            )
        }

        return (
            <div className="space-y-4">
                {sortedGroups.map((group, index) => (
                    <GroupRow
                        key={group.id || group.group_id}
                        group={group}
                        index={index}
                        onEdit={handleEditGroupClick}
                        onDelete={onDeleteGroup}
                    />
                ))}
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">

            {/* ── Page Header ────────────────────────────────────────────── */}
            <div className="px-0 pt-0 pb-4 bg-background border-b shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="h-8 w-8 rounded-lg border border-border/60 flex items-center justify-center hover:bg-muted transition-colors shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2.5">
                                {/* Git-fork style icon */}
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" />
                                        <path d="M6 8v8M6 8c3 0 6 1.5 6 5v1c0 3 3 4 6 4" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-foreground leading-tight">Strategy Configuration</h1>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        Configure lead stages, scoring groups, and condition logic for the selected strategy.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active Strategy Dropdown */}
                    <div className="shrink-0 w-full sm:w-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="border border-border/60 rounded-xl px-4 py-2.5 bg-background w-full sm:min-w-[220px] cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Strategy</div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-semibold text-sm text-foreground truncate">{strategy.strategy_name}</span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isActive
                                                ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Live</span>
                                                : <span className="text-xs font-semibold text-muted-foreground">Inactive</span>
                                            }
                                            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                    </div>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[280px]">
                                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Switch Strategy
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {allStrategies.length > 0 ? (
                                    allStrategies.map((s) => {
                                        const isCurrentStrategy = (s.id || s.strategy_id) === (strategy.id || strategy.strategy_id)
                                        const isStrategyActive = s.is_active
                                        return (
                                            <DropdownMenuItem
                                                key={s.id || s.strategy_id}
                                                onClick={() => onSwitchStrategy(s)}
                                                className={cn(
                                                    "cursor-pointer py-2.5 px-3",
                                                    isCurrentStrategy && "bg-primary/10"
                                                )}
                                            >
                                                <div className="flex items-center justify-between w-full gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">{s.strategy_name}</div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                                            {isStrategyActive ? "Active" : "Inactive"}
                                                        </div>
                                                    </div>
                                                    {isCurrentStrategy && (
                                                        <Check className="h-4 w-4 text-primary shrink-0" />
                                                    )}
                                                </div>
                                            </DropdownMenuItem>
                                        )
                                    })
                                ) : (
                                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                        No other strategies available
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* ── Scrollable content ─────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-[1400px] mx-auto px-0 py-3 space-y-4">

                    {/* Health check bar */}
                    <HealthBar strategy={strategy} stages={sortedStages} groups={sortedGroups} />

                    {/* ── Two-column layout with 50/50 split ───────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

                        {/* LEFT — Lead Stages - 50% */}
                        <div className="bg-background border border-border/60 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-primary" />
                                    <h2 className="font-bold text-base text-foreground">Lead Stages</h2>
                                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold flex items-center justify-center">
                                        {sortedStages.length}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 gap-1.5 text-xs rounded-lg border-border/60"
                                    onClick={handleAddStageClick}
                                    disabled={showNewStageForm || editingStageId !== null}
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Stage
                                </Button>
                            </div>

                            {/* Always show Score Range Bar when there are stages */}
                            {sortedStages.length > 0 && (
                                <ScoreRangeBar stages={sortedStages} />
                            )}

                            {/* Render stages with edit forms in place */}
                            <div className="mt-2 text-sm">
                                {renderStages()}
                            </div>
                        </div>

                        {/* RIGHT column - 50% */}
                        <div className="flex flex-col gap-5">

                            {/* Weight Distribution card */}
                            <div className="bg-background border border-border/60 rounded-xl p-5">
                                <div className="flex items-start justify-between mb-1">
                                    <div>
                                        <h2 className="font-bold text-base text-foreground">Weight Distribution</h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">How scoring weight is allocated across groups</p>
                                    </div>
                                    <span className={cn(
                                        "text-sm font-bold",
                                        weightOk ? "text-green-600" : "text-amber-500"
                                    )}>
                                        Total: {weightPct}
                                    </span>
                                </div>

                                {groups.length > 0 ? (
                                    <>
                                        <div className="flex justify-center my-4">
                                            <DonutChart groups={sortedGroups} />
                                        </div>
                                        <WeightLegend groups={sortedGroups} />
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                                        Add scoring groups to see distribution
                                    </div>
                                )}
                            </div>

                            {/* Scoring Groups card */}
                            <div className="bg-background border border-border/60 rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <BarChart2 className="h-4 w-4 text-primary" />
                                        <h2 className="font-bold text-base text-foreground">Scoring Groups</h2>
                                        <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold flex items-center justify-center">
                                            {sortedGroups.length}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-xs font-semibold border px-2 py-0.5 rounded-md",
                                            weightOk
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                        )}>
                                            Σ weight = {weightPct}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-3 gap-1.5 text-xs rounded-lg border-border/60"
                                            onClick={handleAddGroupClick}
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Add Group
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-2 text-sm">
                                    {renderGroups()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Group Modal for Create/Edit */}
            <GroupModal
                isOpen={isGroupModalOpen}
                onClose={handleCancelGroupModal}
                onSave={handleSaveGroupModal}
                group={groupToEdit}
                columns={columns}
            />
        </div>
    )
}