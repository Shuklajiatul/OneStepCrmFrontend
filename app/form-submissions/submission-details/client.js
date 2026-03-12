"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    ArrowLeft,
    FileText,
    RefreshCw,
    Settings,
    Clock,
    History,
    AlertCircle
} from "lucide-react"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import {
    safeParseJSON,
    formatDateOnly,
    formatLocationDisplay,
    formatPhoneDisplay,
    inferFilenameFromDataUrl
} from "@/lib/utils"

export default function SubmissionDetailsClient({
    formId,
    submissionId,
    tableId,
    initialForm,
    initialRecord,
    initialSubmissionData,
    initialUsers,
    initialHistory
}) {
    const router = useRouter()

    const [form] = useState(initialForm)
    const [record] = useState(initialRecord)
    const [submissionData] = useState(initialSubmissionData)
    const [users] = useState(initialUsers || [])
    const [history] = useState(initialHistory || [])

    const [isFileModalOpen, setIsFileModalOpen] = useState(false)
    const [filePreview, setFilePreview] = useState(null)
    const [isNestedModalOpen, setIsNestedModalOpen] = useState(false)
    const [nestedData, setNestedData] = useState(null)
    const [currentField, setCurrentField] = useState(null)

    const openFileModal = (dataUrl, field) => {
        if (!dataUrl || typeof dataUrl !== "string") return
        const match = dataUrl.match(/^data:([^;]+);base64,/)
        const mime = match ? match[1] : "application/octet-stream"
        const name = inferFilenameFromDataUrl(dataUrl, field)
        setFilePreview({ name, mime, dataUrl })
        setIsFileModalOpen(true)
    }

    const downloadDataUrl = (dataUrl, filename) => {
        try {
            const a = document.createElement("a")
            a.href = dataUrl
            a.download = filename || "download"
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } catch (e) {
            console.error("Download failed", e)
        }
    }

    const parseNestedData = (fieldValue, field) => {
        try {
            const parsed = typeof fieldValue === 'string' ? safeParseJSON(fieldValue) : fieldValue
            let options = field.options ? (typeof field.options === "string" ? safeParseJSON(field.options) : field.options) : []

            const normalizeOptionsRecursively = (opts) => {
                if (!Array.isArray(opts)) return []
                return opts.map((option) => {
                    if (typeof option === "object" && option !== null) {
                        const normalizedOption = { ...option }
                        if (normalizedOption.nestedFields && Array.isArray(normalizedOption.nestedFields)) {
                            normalizedOption.nestedFields = normalizedOption.nestedFields.map((nestedField) => {
                                const normalized = {
                                    id: nestedField.id,
                                    name: nestedField.name || nestedField.label || nestedField.id,
                                    label: nestedField.label || nestedField.name || nestedField.id,
                                    type: nestedField.type || "text",
                                    nestedFields: nestedField.nestedFields ? normalizeOptionsRecursively([{ nestedFields: nestedField.nestedFields }])[0].nestedFields : [],
                                    options: nestedField.options ? normalizeOptionsRecursively(nestedField.options) : [],
                                }
                                return normalized
                            })
                        }
                        return normalizedOption
                    }
                    return option
                })
            }

            options = normalizeOptionsRecursively(options)
            const isMulti = Array.isArray(parsed)

            const result = {
                fieldName: field.label || field.name,
                isMulti: isMulti,
                selectedValue: isMulti ? parsed.map((item) => item.value) : parsed.value,
                options: options,
                formData: {},
            }

            const extractFormData = (nestedValues, parentFields) => {
                const formData = {}
                if (!nestedValues || typeof nestedValues !== "object") return formData

                Object.entries(nestedValues).forEach(([fieldId, fieldData]) => {
                    let fieldDef = null
                    if (parentFields && Array.isArray(parentFields)) {
                        fieldDef = parentFields.find((f) => f.id === fieldId)
                    }

                    if (fieldData && typeof fieldData === "object") {
                        if (fieldData.value !== undefined) {
                            let nestedFieldsForThisField = []

                            if (fieldDef) {
                                if (fieldDef.options && Array.isArray(fieldDef.options)) {
                                    const selectedOption = fieldDef.options.find(
                                        (opt) => opt.value === fieldData.value || opt.label === fieldData.value,
                                    )
                                    if (selectedOption && selectedOption.nestedFields && Array.isArray(selectedOption.nestedFields)) {
                                        nestedFieldsForThisField = selectedOption.nestedFields
                                    }
                                } else if (fieldDef.nestedFields && Array.isArray(fieldDef.nestedFields)) {
                                    nestedFieldsForThisField = fieldDef.nestedFields
                                }
                            }

                            formData[fieldId] = {
                                fieldDef: fieldDef || { id: fieldId, label: fieldId, type: "text" },
                                value: fieldData.value,
                                nestedData: fieldData.nestedValues
                                    ? extractFormData(fieldData.nestedValues, nestedFieldsForThisField)
                                    : {},
                            }
                        }
                    }
                })
                return formData
            }

            if (isMulti) {
                parsed.forEach((item, index) => {
                    if (item.nestedValues && Object.keys(item.nestedValues).length > 0) {
                        const selectedOption = options.find((opt) => opt.value === item.value || opt.label === item.value)
                        const nestedFields = selectedOption?.nestedFields || []
                        const itemFormData = extractFormData(item.nestedValues, nestedFields)

                        Object.entries(itemFormData).forEach(([fieldId, fieldInfo]) => {
                            const prefixedFieldId = `${index}_${fieldId}`
                            result.formData[prefixedFieldId] = {
                                ...fieldInfo,
                                _originalFieldId: fieldId,
                                _selectionIndex: index,
                                _selectionValue: item.value,
                            }
                        })
                    }
                })
            } else {
                if (parsed.nestedValues) {
                    const selectedOption = options.find((opt) => opt.value === parsed.value || opt.label === parsed.value)
                    const nestedFields = selectedOption?.nestedFields || []
                    result.formData = extractFormData(parsed.nestedValues, nestedFields)
                }
            }

            return result
        } catch (error) {
            console.error("Error parsing nested data:", error)
            return null
        }
    }

    const openNestedModal = (fieldValue, field) => {
        const nData = parseNestedData(fieldValue, field)
        if (nData) {
            setNestedData(nData)
            setCurrentField(field)
            setIsNestedModalOpen(true)
        }
    }

    const renderOptionsDropdown = (displayNode, field, selectedValues, onOpenNested) => {
        const options = Array.isArray(field?.options) ? field.options : []
        const selectedSet = new Set(
            (Array.isArray(selectedValues) ? selectedValues : [selectedValues]).filter(Boolean).map((v) => String(v)),
        )

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="px-2 py-1 rounded border border-border hover:bg-muted/50 transition-colors flex items-center gap-2">
                        {displayNode}
                        {onOpenNested && <Settings className="h-3 w-3 text-muted-foreground animate-pulse" />}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Options</div>
                    {options.length > 0 ? (
                        options.map((opt) => {
                            const label = String(opt?.label ?? opt?.value ?? "")
                            const value = String(opt?.value ?? label)
                            const isSelected = selectedSet.has(value) || selectedSet.has(label)
                            return (
                                <DropdownMenuItem key={value} className="flex items-center gap-2">
                                    <span className={isSelected ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
                                    {isSelected && <Badge variant="default" className="ml-auto h-4 px-1 text-[10px]" suppressHydrationWarning>Selected</Badge>}
                                </DropdownMenuItem>
                            )
                        })
                    ) : (
                        <div className="px-2 py-4 text-center text-xs text-muted-foreground italic">No options defined</div>
                    )}
                    {onOpenNested && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onOpenNested} className="text-primary font-medium focus:text-primary">
                                View nested details
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    const renderNestedFormFields = (formData, level = 0) => {
        if (!formData || Object.keys(formData).length === 0) return null

        return (
            <div className={`space-y-4 ${level > 0 ? "ml-6 pl-4 border-l-2 border-primary/20" : ""}`}>
                {Object.entries(formData).map(([fieldId, fieldInfo]) => {
                    const { fieldDef, value, nestedData } = fieldInfo

                    const renderVal = () => {
                        if (!value && value !== 0) return <span className="text-muted-foreground italic">-</span>
                        if (typeof value === "string" && value.startsWith("data:")) {
                            const fileName = inferFilenameFromDataUrl(value, fieldDef)
                            return (
                                <button
                                    onClick={() => openFileModal(value, fieldDef)}
                                    className="text-blue-600 hover:underline text-sm font-medium"
                                >
                                    {fileName}
                                </button>
                            )
                        }
                        if (Array.isArray(value)) {
                            return (
                                <div className="flex flex-wrap gap-1">
                                    {value.map((v, i) => <Badge key={i} variant="secondary" className="text-[10px]" suppressHydrationWarning>{String(v)}</Badge>)}
                                </div>
                            )
                        }
                        return <span className="text-foreground font-medium" suppressHydrationWarning>{String(value)}</span>
                    }

                    return (
                        <div key={fieldId} className="space-y-2 group">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-tight">
                                    {fieldDef?.label || fieldDef?.name || fieldId}
                                </label>
                                <Badge variant="outline" className="text-[10px] opacity-70">
                                    {fieldDef?.type || "text"}
                                </Badge>
                            </div>
                            <div className="text-sm min-h-[1.5rem] flex items-center">{renderVal()}</div>
                            {nestedData && Object.keys(nestedData).length > 0 && (
                                <Card className="mt-3 bg-gradient-to-br from-primary/5 to-transparent border-primary/10 shadow-sm overflow-hidden">
                                    <div className="bg-primary/5 px-4 py-2 border-b border-primary/10 text-[10px] font-bold text-primary uppercase">Nested Details</div>
                                    <CardContent className="px-4 py-4">{renderNestedFormFields(nestedData, level + 1)}</CardContent>
                                </Card>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    const getUserName = (userId) => {
        if (!userId || userId === 'NA' || userId === 'System') return userId || 'System'
        const user = users.find(u => (u.user_id || u.id) === userId)
        if (!user) return userId
        return `${user.first_name || user.name || ''} ${user.last_name || ''}`.trim() || user.email || userId
    }

    const formatFieldValue = (rawValue, field) => {
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return <span className="text-muted-foreground italic">-</span>
        }

        const type = field?.type || 'text'
        const parsed = typeof rawValue === 'string' ? safeParseJSON(rawValue) : undefined;

        let valueToDisplay = rawValue
        if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
            valueToDisplay = parsed.value
        } else if (parsed !== undefined) {
            valueToDisplay = parsed
        }

        // Structural Detection
        if (typeof valueToDisplay === 'object' && valueToDisplay !== null) {
            if (valueToDisplay.countryCode || valueToDisplay.dial_code || valueToDisplay.number) return formatPhoneDisplay(valueToDisplay)
            if (valueToDisplay.address || valueToDisplay.city) return formatLocationDisplay(valueToDisplay)
        }

        if (Array.isArray(valueToDisplay)) {
            const hasNested = valueToDisplay.some(
                (item) => item && typeof item === "object" && item.nestedValues && Object.keys(item.nestedValues).length > 0,
            )
            const badgesNode = (
                <div className="flex flex-wrap gap-1">
                    {valueToDisplay.map((item, i) => {
                        const label = (typeof item === 'object' && item !== null) ? (item.label || item.value || JSON.stringify(item)) : String(item)
                        return <Badge key={i} variant="secondary" className="text-[10px]" suppressHydrationWarning>{label}</Badge>
                    })}
                </div>
            )
            const onOpenNested = hasNested ? () => openNestedModal(JSON.stringify(valueToDisplay), field) : undefined
            return renderOptionsDropdown(badgesNode, field, valueToDisplay.map(v => typeof v === 'object' ? v.value : v), onOpenNested)
        }

        const hasNested = parsed?.nestedValues && Object.keys(parsed.nestedValues).length > 0

        switch (type) {
            case 'email': return <a href={`mailto:${valueToDisplay}`} className="text-blue-600 hover:underline text-sm truncate max-w-full inline-block" suppressHydrationWarning>{String(valueToDisplay)}</a>
            case 'boolean': return <Badge variant={valueToDisplay ? 'default' : 'secondary'} suppressHydrationWarning>{valueToDisplay ? 'Yes' : 'No'}</Badge>
            case 'date':
            case 'datetime': return <span className="text-sm truncate max-w-full inline-block" suppressHydrationWarning>{formatDateOnly(valueToDisplay) || String(valueToDisplay)}</span>
            case 'select':
            case 'radio':
            case 'checkbox': {
                const displayNode = <span className="truncate max-w-[200px] text-sm inline-block" suppressHydrationWarning>{String(valueToDisplay)}</span>
                const onOpenNested = hasNested ? () => openNestedModal(JSON.stringify(parsed || { value: valueToDisplay }), field) : undefined
                return renderOptionsDropdown(displayNode, field, valueToDisplay, onOpenNested)
            }
            case 'file':
                if (typeof valueToDisplay === "string" && valueToDisplay.startsWith("data:")) {
                    const fileName = inferFilenameFromDataUrl(valueToDisplay, field)
                    return (
                        <button
                            onClick={() => openFileModal(valueToDisplay, field)}
                            className="text-blue-600 hover:underline text-sm font-medium truncate max-w-[200px] inline-block"
                            title="Click to preview/download"
                        >
                            {fileName}
                        </button>
                    )
                }
                return <span className="truncate max-w-[200px] text-sm inline-block" suppressHydrationWarning>{String(valueToDisplay)}</span>
            default:
                if (typeof valueToDisplay === "string" && valueToDisplay.startsWith("data:image/")) {
                    return (
                        <button onClick={() => openFileModal(valueToDisplay, field)} className="border rounded overflow-hidden h-12 w-12 hover:opacity-80 transition-opacity">
                            <img src={valueToDisplay} alt="preview" className="h-full w-full object-cover" />
                        </button>
                    )
                }
                if (hasNested) {
                    const displayNode = <span className="truncate max-w-[200px] text-sm inline-block" suppressHydrationWarning>{String(valueToDisplay)}</span>
                    const onOpenNested = () => openNestedModal(JSON.stringify(parsed), field)
                    return renderOptionsDropdown(displayNode, field, valueToDisplay, onOpenNested)
                }
                if (typeof valueToDisplay === 'object' && valueToDisplay !== null) return <span className="truncate max-w-[200px] text-sm inline-block" suppressHydrationWarning>{JSON.stringify(valueToDisplay)}</span>
                return <span className="truncate max-w-[200px] text-sm inline-block" suppressHydrationWarning>{String(valueToDisplay)}</span>
        }
    }

    const parseHistoryValue = (val) => {
        if (val === null || val === undefined || val === "") return "-";
        const parsed = typeof val === 'string' ? safeParseJSON(val) : undefined;
        const value = (parsed && typeof parsed === 'object' && parsed.value !== undefined) ? parsed.value : (parsed !== undefined ? parsed : val);

        if (Array.isArray(value)) {
            return value.map(item => (typeof item === 'object' && item !== null ? (item.label || item.value || JSON.stringify(item)) : String(item))).join(", ");
        }
        if (typeof value === 'object' && value !== null) {
            if (value.number || value.countryCode || value.dial_code) {
                const code = value.countryCode || value.dial_code || ''
                return `${code} ${value.number || ''}`.trim()
            }
            if (value.address || value.city) return [value.address, value.city, value.state].filter(Boolean).join(', ');
            return JSON.stringify(value);
        }
        return String(value);
    }

    return (
        <main className="min-h-screen bg-muted/20 w-full overflow-x-hidden">
            <div className="w-full max-w-full px-2 sm:px-4 md:px-6 space-y-4 sm:space-y-6 pb-20 mt-4 md:mt-0">
                <PageBreadcrumb
                    customItems={[
                        { label: "My Forms", href: "/my-forms" },
                        { label: "Form Submissions", href: `/form-submissions/${formId}` },
                        { label: "Submission Details" }
                    ]}
                />
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                    <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                        <Button variant="outline" size="icon" onClick={() => router.push(`/form-submissions/${formId}?table_id=${tableId}`)} className="rounded-full h-9 w-9 sm:h-10 sm:w-10 shrink-0 mt-1 sm:mt-0">
                            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 truncate">
                                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
                                <span className="truncate">Submission Details</span>
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">Detailed view for {form?.form_name || 'form submission'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2 h-8 text-xs sm:text-sm sm:h-9">
                            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" /> Refresh
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 w-full">
                    {/* Left Column - Details */}
                    <div className="lg:col-span-12 xl:col-span-7 space-y-4 sm:space-y-6 w-full min-w-0">
                        {/* Form Info Section */}
                        <Card className="shadow-sm overflow-hidden border-t-4 border-t-primary w-full">
                            <CardHeader className="bg-muted/30 p-4 sm:p-6">
                                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                    Form Information
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">Submission metadata and source</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase">Form name</Label>
                                        <p className="text-xs sm:text-sm font-medium truncate" title={form?.form_name}>{form?.form_name || '-'}</p>
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase">Form ID</Label>
                                        <p className="text-xs sm:text-sm font-mono truncate" title={formId}>{formId}</p>
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase">Submission ID</Label>
                                        <p className="text-xs sm:text-sm font-mono truncate" title={submissionId}>{submissionId}</p>
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase">Linked Table</Label>
                                        <p className="text-xs sm:text-sm font-mono truncate" title={tableId || submissionData?.table_id}>{tableId || submissionData?.table_id || '-'}</p>
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase">Edit Count</Label>
                                        <div><Badge variant="outline" className="text-xs">{submissionData?.edit_count || 0}</Badge></div>
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <Label className="text-[10px] sm:text-xs text-muted-foreground uppercase">Last Updated</Label>
                                        <p className="text-xs sm:text-sm truncate" suppressHydrationWarning>{submissionData?.last_edited_at ? new Date(submissionData.last_edited_at).toLocaleString() : '-'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submission Values */}
                        <Card className="shadow-sm w-full">
                            <CardHeader className="p-4 sm:p-6">
                                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                                    Field Values
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {form?.fields?.map((field, idx) => {
                                        const parsedField = typeof field === 'string' ? safeParseJSON(field) : field
                                        const fieldId = parsedField?.id || parsedField?.name || (typeof field === 'string' ? field : idx)

                                        let rawValue = undefined;
                                        if (record?.field_values?.[fieldId] !== undefined) {
                                            rawValue = record.field_values[fieldId];
                                        } else if (record?.[fieldId] !== undefined) {
                                            rawValue = record[fieldId];
                                        } else if (submissionData?.values?.[fieldId] !== undefined) {
                                            rawValue = submissionData.values[fieldId];
                                        }

                                        return (
                                            <div key={fieldId} className="p-3 sm:p-4 bg-muted/10 rounded-lg border space-y-1.5 min-w-0 flex flex-col justify-between">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1">
                                                    <Label className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase truncate" title={parsedField?.label || parsedField?.name || fieldId}>
                                                        {parsedField?.label || parsedField?.name || fieldId}
                                                    </Label>
                                                    <Badge variant="outline" className="text-[8px] sm:text-[10px] opacity-70 w-fit shrink-0">{parsedField?.type || 'text'}</Badge>
                                                </div>
                                                <div className="text-xs sm:text-sm font-medium min-h-[1.5rem] flex items-center w-full overflow-hidden">
                                                    <div className="w-full flex">
                                                        {formatFieldValue(rawValue, parsedField)}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {(!form?.fields || form.fields.length === 0) && (
                                        <div className="col-span-full py-8 text-center text-muted-foreground text-sm">
                                            No field data available to display.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - History */}
                    <div className="lg:col-span-12 xl:col-span-5 space-y-4 sm:space-y-6 w-full min-w-0">
                        <Card className="shadow-sm h-[400px] sm:h-[600px] flex flex-col border-t-4 border-t-amber-500 w-full">
                            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-3 bg-muted/30 shrink-0">
                                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" /> Activity History
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">Audit trail for this submission</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 sm:pt-6">
                                {history.length > 0 ? (
                                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[1.125rem] before:w-0.5 before:bg-muted-foreground/20">
                                        {history.map((item, idx) => {
                                            const isCreate = item.event_type === 'CREATE'
                                            const isUpdate = item.event_type === 'UPDATE'
                                            
                                            // Find field name from form fields using the changed_field ID
                                            let fieldName = item.changed_field
                                            if (item.changed_field && form?.fields) {
                                                const field = form.fields.find(f => {
                                                    const parsedField = typeof f === 'string' ? safeParseJSON(f) : f
                                                    return parsedField?.id === item.changed_field
                                                })
                                                if (field) {
                                                    const parsedField = typeof field === 'string' ? safeParseJSON(field) : field
                                                    fieldName = parsedField?.label || parsedField?.name || item.changed_field
                                                }
                                            }
                                            
                                            return (
                                                <div key={item.event_id || idx} className="relative flex items-start gap-3 sm:gap-4 group">
                                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-background border-2 z-10 flex items-center justify-center shrink-0 ml-0.5 mt-0.5 ${
                                                        isCreate ? 'border-green-500' : isUpdate ? 'border-blue-500' : 'border-primary'
                                                    }`}>
                                                        {isCreate ? (
                                                            <div className="h-3 w-3 sm:h-4 sm:w-4 bg-green-500 rounded-full" />
                                                        ) : isUpdate ? (
                                                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                                                        ) : (
                                                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 bg-muted/10 p-3 sm:p-4 rounded-xl border min-w-0 overflow-hidden">
                                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center text-[10px] sm:text-xs mb-1 sm:mb-2 gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-primary truncate" title={getUserName(item.user_id)}>{getUserName(item.user_id)}</span>
                                                                <Badge variant={isCreate ? 'default' : isUpdate ? 'secondary' : 'outline'} className="text-[8px] h-4">
                                                                    {item.event_type || 'UNKNOWN'}
                                                                </Badge>
                                                            </div>
                                                            <span className="text-muted-foreground whitespace-nowrap" suppressHydrationWarning>{new Date(item.event_timestamp).toLocaleString()}</span>
                                                        </div>
                                                        <div className="text-xs sm:text-sm break-words overflow-hidden">
                                                            {isCreate ? (
                                                                <div className="text-green-600 font-medium">
                                                                    {item.note || 'Record created'}
                                                                </div>
                                                            ) : isUpdate && item.changed_field ? (
                                                                <div>
                                                                    Changed <span className="font-semibold">{fieldName}</span> from{' '}
                                                                    <span className="text-red-500 line-through opacity-70 break-all">{parseHistoryValue(item.old_value)}</span> to{' '}
                                                                    <span className="text-green-600 font-medium break-all">{parseHistoryValue(item.new_value)}</span>
                                                                    {item.note && (
                                                                        <div className="text-muted-foreground text-[10px] mt-1 italic">{item.note}</div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="text-muted-foreground">
                                                                    {item.note || 'Activity recorded'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 space-y-2 h-full flex flex-col items-center justify-center">
                                        <History className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto" />
                                        <p className="text-sm text-muted-foreground italic">No history records found.</p>
                                        {!record && <p className="text-[10px] sm:text-xs text-muted-foreground max-w-[200px] sm:max-w-xs mx-auto">History is typically available once the submission is synced to a table record.</p>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* File Preview Modal */}
            <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
                <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] p-0 flex flex-col bg-background">
                    <DialogHeader className="p-4 sm:p-6 border-b shrink-0 bg-background">
                        <DialogTitle className="text-base sm:text-lg">File Preview</DialogTitle>
                        <DialogDescription className="truncate text-xs sm:text-sm">{filePreview?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto p-2 sm:p-6 bg-muted/10">
                        {filePreview?.dataUrl ? (
                            (() => {
                                const isImage = filePreview.mime?.startsWith("image/")
                                const isPdf = filePreview.mime === "application/pdf"
                                if (isImage) {
                                    return (
                                        <div className="flex items-center justify-center min-h-[50vh]">
                                            <img
                                                src={filePreview.dataUrl || "/placeholder.svg"}
                                                alt={filePreview.name}
                                                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm border bg-background"
                                            />
                                        </div>
                                    )
                                }
                                if (isPdf) {
                                    return (
                                        <div className="w-full h-[60vh] sm:h-[70vh] border rounded-lg overflow-hidden bg-background">
                                            <iframe src={filePreview.dataUrl} title={filePreview.name} className="w-full h-full border-0" />
                                        </div>
                                    )
                                }
                                return (
                                    <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground space-y-4">
                                        <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
                                        <p className="text-sm">Preview not available for this file type.</p>
                                    </div>
                                )
                            })()
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground space-y-4">
                                <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
                                <p className="text-sm">No file available</p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 sm:p-6 border-t shrink-0 flex items-center justify-end gap-2 sm:gap-3 bg-background">
                        {filePreview?.dataUrl && (
                            <Button size="sm" onClick={() => filePreview && downloadDataUrl(filePreview.dataUrl, filePreview.name)} className="h-9 sm:h-10">
                                Download
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setIsFileModalOpen(false)} className="h-9 sm:h-10">
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Nested Data Modal */}
            <Dialog open={isNestedModalOpen} onOpenChange={setIsNestedModalOpen}>
                <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] p-0 flex flex-col bg-background">
                    <DialogHeader className="p-4 sm:p-6 border-b shrink-0 bg-muted/10">
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            <span className="truncate">Nested Details: {nestedData?.fieldName}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            Viewing nested values for {nestedData?.isMulti ? "multi-selection" : "selection"}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-1 p-4 sm:p-6 bg-background">
                        {nestedData && (
                            <div className="space-y-6">
                                {nestedData.isMulti ? (
                                    <div className="space-y-4 sm:space-y-6">
                                        {(() => {
                                            const groupedBySelection = {}
                                            Object.entries(nestedData.formData).forEach(([key, info]) => {
                                                const idx = info._selectionIndex
                                                if (!groupedBySelection[idx]) {
                                                    groupedBySelection[idx] = { value: info._selectionValue, fields: {} }
                                                }
                                                groupedBySelection[idx].fields[info._originalFieldId] = info
                                            })

                                            return Object.keys(groupedBySelection)
                                                .sort()
                                                .map((index) => (
                                                    <Card key={index} className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20 shadow-sm overflow-hidden">
                                                        <CardHeader className="py-2 px-3 sm:py-3 sm:px-4 bg-primary/5 border-b border-primary/10">
                                                            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                                                                <Badge variant="default" className="text-[10px] h-5 shrink-0">Selection {Number(index) + 1}</Badge>
                                                                <span className="font-bold text-xs sm:text-sm text-primary truncate min-w-0" suppressHydrationWarning>{groupedBySelection[index].value}</span>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="p-3 sm:p-4 bg-background/50">
                                                            {renderNestedFormFields(groupedBySelection[index].fields)}
                                                        </CardContent>
                                                    </Card>
                                                ))
                                        })()}
                                    </div>
                                ) : (
                                    renderNestedFormFields(nestedData.formData)
                                )}
                            </div>
                        )}
                    </ScrollArea>
                    <div className="p-4 sm:p-6 border-t shrink-0 flex items-center justify-end bg-background">
                        <Button size="sm" variant="outline" onClick={() => setIsNestedModalOpen(false)} className="h-9 sm:h-10">Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </main>
    )
}
