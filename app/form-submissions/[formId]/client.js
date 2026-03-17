"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RefreshCw, ArrowLeft, FileText, Search, X, Send, Eye, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import {
    formatDateTimeDisplay,
    extractTimestampFromUUID,
    isUUIDv1,
    isValidDate,
    formatDateOnly,
    formatPhoneDisplay,
    formatLocationDisplay,
    inferFilenameFromDataUrl,
    safeParseJSON
} from "@/lib/utils"
import { PageBreadcrumb } from "@/components/page-breadcrumb"

export default function FormSubmissionsClient({ formId, initialFormDetails, initialSubmissions, tableId }) {
    const router = useRouter()

    const [formDetails, setFormDetails] = useState(initialFormDetails)
    const [submissions, setSubmissions] = useState(initialSubmissions || [])
    const [searchTerm, setSearchTerm] = useState("")
    const [isNestedModalOpen, setIsNestedModalOpen] = useState(false)
    const [nestedData, setNestedData] = useState(null)
    const [currentField, setCurrentField] = useState(null)
    const [currentSubmission, setCurrentSubmission] = useState(null)
    const [isFileModalOpen, setIsFileModalOpen] = useState(false)
    const [filePreview, setFilePreview] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Keep these separate from the page loading state
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const parseNestedData = (fieldValue, field) => {
        try {
            const parsed = safeParseJSON(fieldValue)
            if (!parsed || typeof parsed !== 'object') return null
            let options = field.options ? (typeof field.options === "string" ? JSON.parse(field.options) : field.options) : []

            const normalizeOptionsRecursively = (opts) => {
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
                                    nestedFields: [],
                                    options: [],
                                }
                                if (nestedField.nestedFields && Array.isArray(nestedField.nestedFields)) {
                                    normalized.nestedFields = nestedField.nestedFields.map((deepNestedField) => {
                                        return {
                                            id: deepNestedField.id,
                                            name: deepNestedField.name || deepNestedField.label || deepNestedField.id,
                                            label: deepNestedField.label || deepNestedField.name || deepNestedField.id,
                                            type: deepNestedField.type || "text",
                                            nestedFields: [],
                                            options: [],
                                        }
                                    })
                                }
                                if (nestedField.options && Array.isArray(nestedField.options)) {
                                    normalized.options = normalizeOptionsRecursively(nestedField.options)
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

                            const finalFieldDef = fieldDef
                                ? {
                                    id: fieldDef.id || fieldId,
                                    name: fieldDef.name || fieldDef.label || fieldId,
                                    label: fieldDef.label || fieldDef.name || fieldId,
                                    type: fieldDef.type || "text",
                                    nestedFields: nestedFieldsForThisField,
                                    options: fieldDef.options || [],
                                }
                                : {
                                    id: fieldId,
                                    name: fieldId,
                                    label: fieldId,
                                    type: "text",
                                    nestedFields: [],
                                    options: [],
                                }

                            formData[fieldId] = {
                                fieldDef: finalFieldDef,
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

    const openNestedModal = (fieldValue, field, submission) => {
        const nestedData = parseNestedData(fieldValue, field)
        if (nestedData) {
            setNestedData(nestedData)
            setCurrentField(field)
            setCurrentSubmission(submission)
            setIsNestedModalOpen(true)
        }
    }

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

    const renderOptionsDropdown = (displayNode, field, selectedValues, onOpenNested) => {
        const options = Array.isArray(field?.options) ? field.options : []

        const selectedSet = new Set(
            (Array.isArray(selectedValues) ? selectedValues : [selectedValues]).filter(Boolean).map((v) => String(v)),
        )

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="px-2 py-1 rounded border border-border hover:bg-muted/50">{displayNode}</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Options</div>
                    {options.length > 0 ? (
                        options.map((opt) => {
                            const label = String(opt?.label ?? opt?.value ?? "")
                            const value = String(opt?.value ?? label)
                            const isSelected = selectedSet.has(value) || selectedSet.has(label)
                            return (
                                <DropdownMenuItem key={value} className="flex items-center gap-2">
                                    <span className={isSelected ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
                                    {isSelected && <span className="ml-auto text-xs">✓</span>}
                                </DropdownMenuItem>
                            )
                        })
                    ) : (
                        <DropdownMenuItem disabled>No options</DropdownMenuItem>
                    )}
                    {onOpenNested && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onOpenNested}>View nested details</DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    const formatFieldValue = (rawValue, field, submission) => {
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return <span className="text-muted-foreground italic">-</span>
        }

        const fieldType = field.type || "text"

        if (Array.isArray(rawValue)) {
            const values = rawValue
                .map((item) => {
                    if (item && typeof item === "object" && item.value !== undefined) {
                        return String(item.value)
                    }
                    return String(item)
                })
                .filter(Boolean)

            if (values.length === 0) {
                return <span className="text-muted-foreground italic">-</span>
            }

            const hasNested = rawValue.some(
                (item) => item && typeof item === "object" && item.nestedValues && Object.keys(item.nestedValues).length > 0,
            )

            const badgesNode = (
                <div className="flex flex-wrap gap-1">
                    {values.map((val, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs" suppressHydrationWarning>
                            {val}
                        </Badge>
                    ))}
                </div>
            )

            const onOpenNested = hasNested ? () => openNestedModal(JSON.stringify(rawValue), field, submission) : undefined

            return renderOptionsDropdown(badgesNode, field, values, onOpenNested)
        }

        if (typeof rawValue === "object" && rawValue !== null) {
            const hasNested =
                rawValue.nestedValues &&
                typeof rawValue.nestedValues === "object" &&
                Object.keys(rawValue.nestedValues).length > 0

            if (rawValue.value !== undefined) {
                const simpleValue = String(rawValue.value)
                const displayNode = <span className="truncate max-w-[200px]" suppressHydrationWarning>{simpleValue}</span>
                const onOpenNested = hasNested ? () => openNestedModal(JSON.stringify(rawValue), field, submission) : undefined

                if (fieldType === "select" || fieldType === "radio" || fieldType === "checkbox") {
                    return renderOptionsDropdown(displayNode, field, simpleValue, onOpenNested)
                }

                switch (fieldType) {
                    case "email":
                        return (
                            <a href={`mailto:${simpleValue}`} className="text-blue-600 hover:underline" suppressHydrationWarning>
                                {simpleValue}
                            </a>
                        )
                    case "phone":
                        return formatPhoneDisplay(rawValue)
                    case "location":
                        return formatLocationDisplay(rawValue)
                    case "date":
                    case "datetime": {
                        const formatted = formatDateOnly(simpleValue)
                        if (formatted) {
                            return <span suppressHydrationWarning>{formatted}</span>
                        }
                        return <span className="truncate max-w-[200px]" suppressHydrationWarning>{String(simpleValue)}</span>
                    }
                    case "file":
                        if (typeof simpleValue === "string" && simpleValue.startsWith("data:")) {
                            const fileName = inferFilenameFromDataUrl(simpleValue, field)
                            return (
                                <button
                                    onClick={() => openFileModal(simpleValue, field)}
                                    className="text-blue-600 hover:underline text-sm"
                                    title="Click to preview/download"
                                >
                                    {fileName}
                                </button>
                            )
                        }
                        return <span className="truncate max-w-[200px]" suppressHydrationWarning>{String(simpleValue)}</span>
                    default:
                        return <span className="truncate max-w-[200px]" suppressHydrationWarning>{String(simpleValue)}</span>
                }
            }

            if (rawValue.countryCode || rawValue.dial_code || rawValue.number) {
                return formatPhoneDisplay(rawValue)
            }

            if (rawValue.country || rawValue.state || rawValue.city) {
                return formatLocationDisplay(rawValue)
            }
        }

        const rawString = String(rawValue)

        switch (fieldType) {
            case "email":
                return (
                    <a href={`mailto:${rawString}`} className="text-blue-600 hover:underline" suppressHydrationWarning>
                        {rawString}
                    </a>
                )
            case "phone": {
                const phoneData = safeParseJSON(rawString)
                if (phoneData && typeof phoneData === "object") {
                    return formatPhoneDisplay(phoneData)
                }
                return (
                    <a href={`tel:${rawString}`} className="text-blue-600 hover:underline" suppressHydrationWarning>
                        {rawString}
                    </a>
                )
            }
            case "location": {
                const locationData = safeParseJSON(rawString)
                if (locationData && typeof locationData === "object") {
                    return formatLocationDisplay(locationData)
                }
                return <span className="truncate max-w-[200px]" suppressHydrationWarning>{rawString}</span>
            }
            case "boolean":
                return (
                    <Badge variant={rawString === "true" || rawValue === true ? "default" : "secondary"}>
                        {rawString === "true" || rawValue === true ? "Yes" : "No"}
                    </Badge>
                )
            case "date":
            case "datetime": {
                const formatted = formatDateOnly(rawString)
                if (formatted) {
                    return <span suppressHydrationWarning>{formatted}</span>
                }
                return <span className="truncate max-w-[200px]" suppressHydrationWarning>{rawString}</span>
            }
            case "number":
                return <span className="truncate max-w-[200px]" suppressHydrationWarning>{rawString}</span>
            case "textarea":
                return <span className="truncate max-w-[200px] whitespace-pre-wrap" suppressHydrationWarning>{rawString}</span>
            case "text":
            case "select":
            case "radio":
            case "checkbox":
            default:
                return <span className="truncate max-w-[200px]" suppressHydrationWarning>{rawString}</span>
        }
    }

    const getFieldValue = (submission, fieldId) => {
        if (!submission.values || !submission.values[fieldId]) return null

        const rawValue = submission.values[fieldId]

        if (typeof rawValue === "string") {
            const trimmed = rawValue.trim()
            const parsed = safeParseJSON(trimmed)
            if (typeof parsed === 'object') return parsed
            return rawValue
        }

        return rawValue
    }

    const extractSearchableText = (value) => {
        if (value === null || value === undefined) return ""

        if (Array.isArray(value)) {
            return value
                .map((item) => {
                    if (item && typeof item === "object" && item.value !== undefined) {
                        return String(item.value)
                    }
                    return String(item)
                })
                .join(" ")
        }

        if (typeof value === "object" && value.value !== undefined) {
            return String(value.value)
        }

        if (typeof value === "string") {
            const trimmed = value.trim()
            const parsed = safeParseJSON(trimmed)
            if (typeof parsed === 'object') {
                return extractSearchableText(parsed)
            }
            return value
        }

        return String(value)
    }

    const filteredSubmissions = submissions.filter((submission) => {
        if (!searchTerm) return true

        const searchLower = searchTerm.toLowerCase()

        if (submission.values) {
            const fieldValues = Object.values(submission.values)
            if (
                fieldValues.some((value) => {
                    const searchableText = extractSearchableText(value)
                    return searchableText && searchableText.toLowerCase().includes(searchLower)
                })
            ) {
                return true
            }
        }

        if (submission.submission_id && submission.submission_id.toLowerCase().includes(searchLower)) {
            return true
        }

        return false
    })

    const isFileValue = (val) => {
        if (typeof val === "string" && val.startsWith("data:") && val.includes("base64,")) {
            return true
        }
        return false
    }

    const renderNestedFormFields = (formData, level = 0) => {
        if (!formData || Object.keys(formData).length === 0) return null

        return (
            <div className={`space-y-4 ${level > 0 ? "ml-6 pl-4 border-l-2 border-primary/20" : ""}`}>
                {Object.entries(formData).map(([fieldId, fieldInfo]) => {
                    const { fieldDef, value, nestedData } = fieldInfo

                    const renderValue = () => {
                        if (!value && value !== 0) {
                            return <span className="text-muted-foreground italic">-</span>
                        }

                        if (fieldDef.type === "file" || isFileValue(value)) {
                            const dataUrl = typeof value === "string" ? value : null
                            if (dataUrl && dataUrl.startsWith("data:")) {
                                const fileName = inferFilenameFromDataUrl(dataUrl, fieldDef)
                                return (
                                    <button
                                        onClick={() => openFileModal(dataUrl, fieldDef)}
                                        className="text-blue-600 hover:underline text-sm"
                                        title="Click to preview/download"
                                    >
                                        {fileName}
                                    </button>
                                )
                            }
                        }

                        if (Array.isArray(value)) {
                            return (
                                <div className="flex flex-wrap gap-1">
                                    {value.map((val, idx) => {
                                        if (isFileValue(val)) {
                                            const fileName = inferFilenameFromDataUrl(val, fieldDef)
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => openFileModal(val, fieldDef)}
                                                    className="text-blue-600 hover:underline text-xs"
                                                    title="Click to preview/download"
                                                >
                                                    {fileName}
                                                </button>
                                            )
                                        }
                                        return (
                                            <Badge key={idx} variant="secondary" className="text-xs" suppressHydrationWarning>
                                                {String(val)}
                                            </Badge>
                                        )
                                    })}
                                </div>
                            )
                        }

                        return <span className="text-foreground" suppressHydrationWarning>{String(value)}</span>
                    }

                    return (
                        <div key={fieldId} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-foreground">
                                    {fieldDef.name || fieldDef.label || fieldDef.id || fieldId}
                                </label>
                                <Badge variant="outline" className="text-xs">
                                    {fieldDef.type || "text"}
                                </Badge>
                            </div>

                            <div className="text-sm">{renderValue()}</div>

                            {nestedData && Object.keys(nestedData).length > 0 && (
                                <Card className="mt-3 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                                    <CardHeader className="pb-3 px-4 pt-3">
                                        <CardTitle className="text-sm font-semibold text-primary">Nested Fields</CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4">{renderNestedFormFields(nestedData, level + 1)}</CardContent>
                                </Card>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    // Pagination calculations
    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedSubmissions = filteredSubmissions.slice(startIndex, startIndex + itemsPerPage)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    const handleItemsPerPageChange = (value) => {
        setItemsPerPage(Number(value))
        setCurrentPage(1)
    }

    const createDynamicColumns = () => {
        if (!formDetails || !formDetails.fields || !Array.isArray(formDetails.fields)) return []

        return formDetails.fields.map((field) => {
            let parsedField = field
            if (typeof field === "string") {
                try {
                    parsedField = JSON.parse(field)
                } catch (e) {
                    parsedField = { id: field, label: field, type: "text" }
                }
            }

            if (typeof parsedField === "object" && parsedField !== null && !Array.isArray(parsedField)) {
                const keys = Object.keys(parsedField).filter((key) => !isNaN(key))
                if (keys.length > 0) {
                    try {
                        const jsonString = keys
                            .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
                            .map((key) => parsedField[key])
                            .join("")
                        if (jsonString.trim()) {
                            parsedField = JSON.parse(jsonString)
                        }
                    } catch (e) {
                        // Silently fail
                    }
                }
            }

            if (parsedField.options && typeof parsedField.options === "string") {
                try {
                    parsedField.options = JSON.parse(parsedField.options)
                } catch (e) {
                    parsedField.options = []
                }
            }

            const fieldId = parsedField.id || parsedField.name || field

            return {
                id: fieldId,
                label: parsedField.label || parsedField.name || fieldId,
                type: parsedField.type || "text",
                accessor: (submission) => getFieldValue(submission, fieldId),
                render: (value, submission) => formatFieldValue(value, parsedField, submission)
            }
        })
    }

    const columns = createDynamicColumns()

    const mainContent = (
        <div className="space-y-6 w-full">
            <PageBreadcrumb
                customItems={[
                    { label: "My Forms", href: "/my-forms" },
                    { label: "Form Submissions" },
                    { label: formDetails?.form_name || "Submissions" }
                ]}
            />
            {error && (
                <Card className="border-destructive/20 bg-destructive/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span>{error}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.reload()}
                                className="ml-2"
                            >
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Content Card */}
            <Card className="w-full shadow-sm">
                <CardHeader className="border-b bg-card/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/my-forms')}
                                className="h-8 w-8 shrink-0"
                                title="Go back"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>

                            <div>
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <FileText className="h-6 w-6 text-primary" />
                                    Form Submissions
                                </CardTitle>
                                <CardDescription>View all submitted data for {formDetails?.form_name || "this form"}</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => window.location.reload()} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="px-6 border-b-0 pb-6 bg-muted/10">
                    {/* Search Section */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative w-full sm:w-72 md:w-96 lg:w-[28rem]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search submissions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-10 h-9 text-sm"
                            />
                            {searchTerm && (
                                <X
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                                    onClick={() => setSearchTerm("")}
                                />
                            )}
                        </div>
                    </div>

                    {/* Table Section */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <Send className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                                <p className="text-muted-foreground">Loading submissions...</p>
                            </div>
                        </div>
                    ) : filteredSubmissions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-background shadow-xs">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No submissions found</p>
                            {submissions.length === 0 && (
                                <p className="text-sm mt-2">Submissions will appear here once users submit the form</p>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Submission Stats */}
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Results</p>
                                    <p className="text-lg font-semibold">
                                        {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                                <Badge variant="secondary" className="text-base">
                                    {filteredSubmissions.length} of {submissions.length}
                                </Badge>
                            </div>

                            {/* Data Table */}
                            <div className="rounded-md border overflow-hidden w-full bg-background">
                                <div className="overflow-x-auto w-full">
                                    <div className="w-full min-w-full">
                                        <Table className="caption-bottom text-sm w-full table-auto">
                                            <TableHeader>
                                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                    {columns.map((column) => (
                                                        <TableHead
                                                            key={column.id}
                                                            className="font-semibold text-foreground whitespace-nowrap"
                                                        >
                                                            {column.label}
                                                        </TableHead>
                                                    ))}
                                                    <TableHead className="font-semibold text-foreground whitespace-nowrap">
                                                        Submitted At
                                                    </TableHead>
                                                    <TableHead className="font-semibold text-foreground whitespace-nowrap">
                                                        Last Edited At
                                                    </TableHead>
                                                    <TableHead className="font-semibold text-foreground whitespace-nowrap">
                                                        Edit Attempts
                                                    </TableHead>
                                                    <TableHead className="font-semibold text-foreground whitespace-nowrap">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginatedSubmissions.map((submission, index) => (
                                                    <TableRow
                                                        key={submission.submission_id || index}
                                                        className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                                                    >
                                                        {columns.map((column) => (
                                                            <TableCell key={column.id} className="py-2.5">
                                                                {column.render(column.accessor(submission), submission)}
                                                            </TableCell>
                                                        ))}
                                                        {/* Created At Column */}
                                                        <TableCell className="py-2.5">
                                                            {(() => {
                                                                const createdDateString = submission.created_at;

                                                                if (!createdDateString) {
                                                                    return <span className="text-muted-foreground italic">-</span>;
                                                                }

                                                                if (isValidDate(createdDateString)) {
                                                                    return <span suppressHydrationWarning>{formatDateTimeDisplay(createdDateString)}</span>;
                                                                }

                                                                if (isUUIDv1(createdDateString)) {
                                                                    const uuidDate = extractTimestampFromUUID(createdDateString);
                                                                    if (uuidDate) {
                                                                        return (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sm font-medium" suppressHydrationWarning>
                                                                                    {formatDateTimeDisplay(uuidDate.toISOString())}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    }
                                                                }

                                                                return (
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-medium text-muted-foreground">-</span>
                                                                        <span className="text-xs text-muted-foreground break-all max-w-[120px]" suppressHydrationWarning>
                                                                            {createdDateString.length > 20 ? `${createdDateString.substring(0, 20)}...` : createdDateString}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="py-2.5" suppressHydrationWarning>
                                                            {formatDateTimeDisplay(submission.last_edited_at) ||
                                                                <span className="text-muted-foreground italic" suppressHydrationWarning>-</span>}
                                                        </TableCell>
                                                        <TableCell className="py-2.5">
                                                            <Badge variant="secondary" className="font-medium">
                                                                {typeof submission.edit_count === "number"
                                                                    ? submission.edit_count
                                                                    : 0}
                                                            </Badge>
                                                        </TableCell>

                                                        <TableCell className="py-2.5">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    router.push(`/form-submissions/submission-details?form_id=${formId}&submission_id=${submission.submission_id}&table_id=${tableId || formDetails?.table_id}`)
                                                                }}
                                                                className="h-8 flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                View Details
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>

                            {/* Pagination */}
                            {filteredSubmissions.length > 0 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/5 mt-6">
                                    <div className="flex flex-wrap items-center gap-4 order-2 sm:order-1 justify-center sm:justify-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Show</span>
                                            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                                                <SelectTrigger className="w-[70px] h-8 border-muted-foreground/20 text-xs shadow-none rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent side="top">
                                                    <SelectItem value="5">5</SelectItem>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="20">20</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">per page</span>
                                        </div>

                                        <div className="text-sm font-medium border-l pl-4 text-muted-foreground">
                                            Showing <span className="text-foreground">{startIndex + 1}</span> to{' '}
                                            <span className="text-foreground">
                                                {Math.min(startIndex + itemsPerPage, filteredSubmissions.length)}
                                            </span> of{' '}
                                            <span className="text-foreground">{filteredSubmissions.length}</span> entries
                                        </div>
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="order-1 sm:order-2">
                                            <Pagination className="justify-end w-auto mx-0">
                                                <PaginationContent>
                                                    <PaginationItem>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setCurrentPage(prev => Math.max(prev - 1, 1));
                                                            }}
                                                            disabled={currentPage === 1}
                                                            className="gap-1 pl-2.5 h-8 rounded-lg"
                                                        >
                                                            <ChevronLeft className="h-4 w-4" />
                                                            <span>Previous</span>
                                                        </Button>
                                                    </PaginationItem>

                                                    {(() => {
                                                        const pages = [];
                                                        const maxVisiblePages = 5;
                                                        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                                                        if (endPage - startPage + 1 < maxVisiblePages) {
                                                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                                        }

                                                        for (let i = startPage; i <= endPage; i++) {
                                                            pages.push(
                                                                <PaginationItem key={i}>
                                                                    <PaginationLink
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            setCurrentPage(i);
                                                                        }}
                                                                        isActive={currentPage === i}
                                                                        className="cursor-pointer h-8 w-8 rounded-lg"
                                                                    >
                                                                        {i}
                                                                    </PaginationLink>
                                                                </PaginationItem>
                                                            );
                                                        }
                                                        return pages;
                                                    })()}

                                                    <PaginationItem>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                                            }}
                                                            disabled={currentPage === totalPages}
                                                            className="gap-1 pr-2.5 h-8 rounded-lg"
                                                        >
                                                            <span>Next</span>
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </PaginationItem>
                                                </PaginationContent>
                                            </Pagination>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isNestedModalOpen} onOpenChange={setIsNestedModalOpen}>
                <DialogContent className="w-[95vw] max-w-[1200px] max-h-[90vh] p-0 gap-0 flex flex-col">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0 bg-muted/20">
                        <DialogTitle>Nested Data - {nestedData?.fieldName}</DialogTitle>
                        <DialogDescription>Detailed view of nested field values</DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-1 px-6 py-4">
                        {nestedData && (
                            <div className="space-y-6 pr-4">
                                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border-l-4 border-primary">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-sm text-muted-foreground">
                                                Primary Selection{nestedData.isMulti ? "s" : ""}
                                            </h4>
                                        </div>

                                        {nestedData.isMulti ? (
                                            <div className="flex flex-wrap gap-2">
                                                {Array.isArray(nestedData.selectedValue) ? (
                                                    nestedData.selectedValue.map((val, idx) => (
                                                        <Badge key={idx} variant="default" className="text-base px-4 py-1" suppressHydrationWarning>
                                                            {val}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <Badge variant="default" className="text-base px-4 py-1" suppressHydrationWarning>
                                                        {nestedData.selectedValue}
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <Badge variant="default" className="text-base px-4 py-1" suppressHydrationWarning>
                                                {nestedData.selectedValue}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {Object.keys(nestedData.formData).length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <h4 className="font-semibold text-base text-foreground">Nested Form Fields</h4>
                                            <Badge variant="secondary" className="text-xs">
                                                {Object.keys(nestedData.formData).length} fields
                                            </Badge>
                                        </div>
                                        <div className="space-y-4 pb-4">
                                            {nestedData.isMulti
                                                ? (() => {
                                                    const groupedBySelection = {}
                                                    Object.entries(nestedData.formData).forEach(([fieldId, fieldInfo]) => {
                                                        const index = fieldInfo._selectionIndex
                                                        if (index !== undefined) {
                                                            if (!groupedBySelection[index]) {
                                                                groupedBySelection[index] = {
                                                                    value: fieldInfo._selectionValue,
                                                                    fields: {},
                                                                }
                                                            }
                                                            groupedBySelection[index].fields[fieldId] = fieldInfo
                                                        }
                                                    })

                                                    return Object.keys(groupedBySelection)
                                                        .sort()
                                                        .map((index) => (
                                                            <Card
                                                                key={index}
                                                                className="bg-gradient-to-br from-blue-50/50 to-transparent border-blue-200"
                                                            >
                                                                <CardHeader className="pb-3 px-4 pt-3">
                                                                    <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                                                                        <Badge variant="default" className="text-xs">
                                                                            Selection {Number.parseInt(index) + 1}
                                                                        </Badge>
                                                                        <span suppressHydrationWarning>{groupedBySelection[index].value}</span>
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent className="px-4 pb-4">
                                                                    {Object.keys(groupedBySelection[index].fields).length === 0 ? (
                                                                        <div className="text-sm text-muted-foreground italic py-2">
                                                                            No nested fields for this selection
                                                                        </div>
                                                                    ) : (
                                                                        renderNestedFormFields(groupedBySelection[index].fields)
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        ))
                                                })()
                                                : renderNestedFormFields(nestedData.formData)}
                                        </div>
                                    </div>
                                )}

                                {Object.keys(nestedData.formData).length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p className="text-sm">No nested fields available for this selection</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>

                    <div className="px-6 py-4 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-end gap-4">
                        <Button variant="outline" onClick={() => setIsNestedModalOpen(false)}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
                <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] p-0 gap-0 flex flex-col">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0 bg-muted/20">
                        <DialogTitle>File Preview</DialogTitle>
                        <DialogDescription className="truncate">{filePreview?.name}</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 px-6 py-4">
                        {filePreview?.dataUrl ? (
                            (() => {
                                const isImage = filePreview.mime?.startsWith("image/")
                                const isPdf = filePreview.mime === "application/pdf"
                                if (isImage) {
                                    return (
                                        <div className="flex items-center justify-center p-4">
                                            <img
                                                src={filePreview.dataUrl || "/placeholder.svg"}
                                                alt={filePreview.name}
                                                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                                            />
                                        </div>
                                    )
                                }
                                if (isPdf) {
                                    return (
                                        <div className="w-full h-[70vh] border rounded-lg overflow-hidden">
                                            <iframe src={filePreview.dataUrl} title={filePreview.name} className="w-full h-full border-0" />
                                        </div>
                                    )
                                }
                                return (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <p className="text-sm">Preview not available for this file type.</p>
                                    </div>
                                )
                            })()
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                <p className="text-sm">No file available</p>
                            </div>
                        )}
                    </ScrollArea>
                    <div className="px-6 py-4 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-end gap-3">
                        {filePreview?.dataUrl && (
                            <Button onClick={() => filePreview && downloadDataUrl(filePreview.dataUrl, filePreview.name)}>
                                Download
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )

    return (
        <main className="min-h-screen bg-muted/20 w-full">
            <div className="w-full max-w-8xl mx-auto  pb-20">{mainContent}</div>
        </main>
    )
}
