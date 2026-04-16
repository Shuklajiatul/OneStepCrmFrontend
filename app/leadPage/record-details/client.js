"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    ArrowLeft,
    Database,
    RefreshCw,
    Eye,
    Settings,
    History,
    ListTodo,
    Clock,
    Plus,
    User
} from "lucide-react"
import { toast } from "sonner"
import { authUtils } from '@/lib/auth-utils'
import { parseOptionalValuesArray, inferTypeFromColumnName, getColumnFieldType, getColumnOptions, hasNestedData, formatDateOnly, formatLocationDisplay, getFieldValue, safeParseJSON, formatPhoneDisplay } from '@/lib/utils'
import { activitiesApi, strategyApi, stageApi } from '@/lib/api-endpoint'
import CreateActivityDialog from "@/app/activities/components/create-activity-dialog"
import { AlertCircle } from "lucide-react"
export default function RecordDetailsClient({
    tableId,
    recordId,
    initialRecord,
    initialColumns,
    initialUsers,
    initialHistory,
    initialActivities,
    newAccessToken: propNewAccessToken = null
}) {
    // Sync new token from server to browser cookies if it was refreshed
    useEffect(() => {
        if (propNewAccessToken) {
            console.log('Syncing new server-side token to cookies in record-details');
            authUtils.setTokens({ accessToken: propNewAccessToken });
        }
    }, [propNewAccessToken]);

    // State initialization with props
    const [record, setRecord] = useState(initialRecord)
    const [columns, setColumns] = useState(initialColumns || [])
    const [users, setUsers] = useState(initialUsers || [])
    const [history, setHistory] = useState(initialHistory || [])
    const [activities, setActivities] = useState(initialActivities || [])
    const [stages, setStages] = useState([])

    useEffect(() => {
        const fetchStages = async () => {
            try {
                const strategyResponse = await strategyApi.getAll(tableId)
                const strategies = Array.isArray(strategyResponse.data) ? strategyResponse.data : (strategyResponse.data?.data || [])
                const activeStrategy = strategies[0]
                if (activeStrategy) {
                    const stagesResponse = await stageApi.getAll(tableId, activeStrategy.strategy_id)
                    const fetchedStages = Array.isArray(stagesResponse.data) ? stagesResponse.data : (stagesResponse.data?.data || [])
                    setStages(fetchedStages)
                }
            } catch (err) {
                console.error("Error fetching stages for colors:", err)
            }
        }
        fetchStages()
    }, [tableId])

    const stageColorConfig = {
        new: { dot: 'bg-gray-400', bar: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700 border-gray-200', chart: '#9ca3af' },
        contacted: { dot: 'bg-blue-500', bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 border-blue-200', chart: '#3b82f6' },
        qualified: { dot: 'bg-purple-500', bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 border-purple-200', chart: '#a855f7' },
        proposal: { dot: 'bg-amber-500', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', chart: '#f59e0b' },
        negotiation: { dot: 'bg-orange-500', bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200', chart: '#f97316' },
        won: { dot: 'bg-green-500', bar: 'bg-green-500', badge: 'bg-green-100 text-green-700 border-green-200', chart: '#22c55e' },
        lost: { dot: 'bg-red-500', bar: 'bg-red-400', badge: 'bg-red-100 text-red-700 border-red-200', chart: '#ef4444' },
    }

    // UI Loading state
    const [loadingActivities, setLoadingActivities] = useState(false)
    const [isCreateActivityOpen, setIsCreateActivityOpen] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [isFileModalOpen, setIsFileModalOpen] = useState(false)
    const [filePreview, setFilePreview] = useState(null)
    const [isNestedModalOpen, setIsNestedModalOpen] = useState(false)
    const [nestedData, setNestedData] = useState(null)
    const [currentField, setCurrentField] = useState(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        // Get current user for activity creation
        const tokens = authUtils.getTokens()
        if (tokens?.user) {
            setCurrentUser(tokens.user)
        }
    }, [])

    const fetchActivities = async () => {
        setLoadingActivities(true)
        try {
            const response = await activitiesApi.getByOrganization()
            const allActivities = response.data?.data || response.data || []
            const filtered = allActivities.filter(activity =>
                String(activity.related_table_id) === String(tableId) &&
                String(activity.related_record_id) === String(recordId)
            )
            setActivities(filtered)
        } catch (err) {
            console.error("Error fetching activities:", err)
        } finally {
            setLoadingActivities(false)
        }
    }

    const getUserName = (userId) => {
        if (!userId || userId === 'NA' || userId === 'System') return userId || 'System'
        const user = users.find(u => (u.user_id || u.id) === userId)
        if (!user) return userId
        return `${user.first_name || user.name || ''} ${user.last_name || ''}`.trim() || user.email || userId
    }

    const inferFilenameFromDataUrl = (dataUrl, column) => {
        if (!dataUrl) return "file"
        const extensionMatch = dataUrl.match(/^data:([^;]+);/)
        const mimeType = extensionMatch ? extensionMatch[1] : ""
        const extension = mimeType.split("/")[1] || "bin"
        const baseName = column?.column_name || column?.name || "upload"
        return `${baseName}.${extension}`
    }

    const openFileModal = (dataUrl, column) => {
        setFilePreview({
            url: dataUrl,
            name: inferFilenameFromDataUrl(dataUrl, column),
            type: dataUrl.split(";")[0].split(":")[1],
        })
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

    const parseNestedData = (fieldValue, column) => {
        try {
            const parsed = typeof fieldValue === 'string' ? JSON.parse(fieldValue) : fieldValue
            let options = parseOptionalValuesArray(column.properties?.options || column.options || column.optional_values)

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
                fieldName: column.column_name || column.name,
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

                    if (fieldData && typeof fieldData === "object" && fieldData !== null) {
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
                        } else {
                            // Handle object structure without explicitly named 'value' key (e.g. phone/location)
                            formData[fieldId] = {
                                fieldDef: fieldDef || { id: fieldId, label: fieldId, type: "text" },
                                value: fieldData,
                                nestedData: {}
                            }
                        }
                    } else if (fieldData !== undefined && fieldData !== null) {
                        // Handle primitive values (string, number, etc.)
                        formData[fieldId] = {
                            fieldDef: fieldDef || { id: fieldId, label: fieldId, type: "text" },
                            value: fieldData,
                            nestedData: {}
                        }
                    }
                })
                return formData
            }

            if (isMulti) {
                parsed.forEach((item, index) => {
                    if (item && typeof item === 'object') {
                        const selectedOption = options.find((opt) => opt.value === item.value || opt.label === item.value)
                        const nestedFields = selectedOption?.nestedFields || []

                        // Always process the item, even if nestedValues is empty
                        const itemFormData = item.nestedValues && Object.keys(item.nestedValues).length > 0
                            ? extractFormData(item.nestedValues, nestedFields)
                            : {}

                        // If there are nested fields, add them to formData
                        if (Object.keys(itemFormData).length > 0) {
                            Object.entries(itemFormData).forEach(([fieldId, fieldInfo]) => {
                                const prefixedFieldId = `${index}_${fieldId}`
                                result.formData[prefixedFieldId] = {
                                    ...fieldInfo,
                                    _originalFieldId: fieldId,
                                    _selectionIndex: index,
                                    _selectionValue: item.value,
                                }
                            })
                        } else {
                            // Even if no nested data, create a placeholder to show the selection
                            result.formData[`${index}_placeholder`] = {
                                fieldDef: { id: 'placeholder', label: 'Selected Option', type: 'text' },
                                value: item.value,
                                nestedData: {},
                                _originalFieldId: 'placeholder',
                                _selectionIndex: index,
                                _selectionValue: item.value,
                            }
                        }
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

    const openNestedModal = (fieldValue, column) => {
        const nData = parseNestedData(fieldValue, column)
        if (nData) {
            setNestedData(nData)
            setCurrentField(column)
            setIsNestedModalOpen(true)
        }
    }

    const renderOptionsDropdown = (displayNode, column, selectedValues, onOpenNested) => {
        const options = getColumnOptions(column)
        const selectedSet = new Set(
            (Array.isArray(selectedValues) ? selectedValues : [selectedValues]).filter(Boolean).map((v) => String(v)),
        )

        if (!hasNestedData(column)) {
            return (
                <div className="px-2 py-1 rounded border border-border bg-background inline-flex items-center gap-2">
                    {displayNode}
                </div>
            )
        }

        return (
            <DropdownMenu>
                <DropdownMenuTrigger className="px-2 py-1 rounded border border-border hover:bg-muted/50 transition-colors flex items-center gap-2 outline-none w-full">
                    {displayNode}
                    {hasNestedData(column) && <Settings className="h-3 w-3 text-muted-foreground animate-pulse" />}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Options</div>
                    {options.length > 0 ? (
                        options.map((opt, idx) => {
                            const label = String(opt?.label ?? opt?.value ?? "")
                            const value = String(opt?.value ?? label)
                            const isSelected = selectedSet.has(value) || selectedSet.has(label)
                            return (
                                <DropdownMenuItem key={value || idx} className="flex items-center gap-2">
                                    <span className={isSelected ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
                                    {isSelected && <Badge variant="default" className="ml-auto h-4 px-1 text-[10px]">Selected</Badge>}
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



    const formatFieldValue = (rawValue, dataType, column = null) => {
        if (rawValue === null || rawValue === undefined || rawValue === "") {
            return <span className="text-muted-foreground italic">-</span>
        }

        const fieldType = getColumnFieldType(column) || dataType || 'text'
        const parsed = safeParseJSON(rawValue);

        // Robustly extract the value to display
        let valueToDisplay = rawValue
        if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
            valueToDisplay = parsed.value
        } else if (parsed !== undefined) {
            valueToDisplay = parsed
        }

        // Handle Phone and Location types early
        if (fieldType === 'phone') {
            return formatPhoneDisplay(rawValue)
        }
        if (fieldType === 'location') {
            return formatLocationDisplay(rawValue)
        }

        if (Array.isArray(valueToDisplay)) {
            const hasNested = valueToDisplay.some(
                (item) => item && typeof item === "object" && item.nestedValues && Object.keys(item.nestedValues).length > 0,
            )
            const badgesNode = (
                <div className="flex flex-wrap gap-1">
                    {valueToDisplay.map((item, i) => {
                        const displayItem = (typeof item === 'object' && item !== null) ? (item.label || item.value || JSON.stringify(item)) : String(item)
                        return (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                                {displayItem}
                            </Badge>
                        )
                    })}
                </div>
            )
            const onOpenNested = hasNested ? () => openNestedModal(JSON.stringify(parsed || { value: valueToDisplay }), column) : undefined
            return renderOptionsDropdown(badgesNode, column, valueToDisplay.map(v => typeof v === 'object' ? v.value : v), onOpenNested)
        }

        const hasNested = parsed?.nestedValues && Object.keys(parsed.nestedValues).length > 0

        switch (fieldType) {
            case 'email':
                return <a href={`mailto:${valueToDisplay}`} className="text-blue-600 hover:underline">{String(valueToDisplay)}</a>
            case 'boolean':
                return <Badge variant={valueToDisplay ? 'default' : 'secondary'}>{valueToDisplay ? 'Yes' : 'No'}</Badge>
            case 'date':
            case 'datetime': {
                const formatted = formatDateOnly(valueToDisplay)
                return <span suppressHydrationWarning>{formatted || String(valueToDisplay)}</span>
            }
            case 'select':
            case 'radio':
            case 'checkbox': {
                const displayNode = <span className="truncate max-w-[200px]" suppressHydrationWarning>{String(valueToDisplay)}</span>
                const onOpenNested = hasNested ? () => openNestedModal(JSON.stringify(parsed || { value: valueToDisplay }), column) : undefined
                return renderOptionsDropdown(displayNode, column, valueToDisplay, onOpenNested)
            }
            case 'file':
                if (typeof valueToDisplay === "string" && valueToDisplay.startsWith("data:")) {
                    const fileName = inferFilenameFromDataUrl(valueToDisplay, column)
                    return (
                        <button
                            onClick={() => openFileModal(valueToDisplay, column)}
                            className="text-blue-600 hover:underline text-sm font-medium"
                            title="Click to preview/download"
                        >
                            {fileName}
                        </button>
                    )
                }
                return <span className="truncate max-w-[200px]" suppressHydrationWarning>{String(valueToDisplay)}</span>
            default:
                // Final avoid [object Object] check
                if (typeof valueToDisplay === 'object' && valueToDisplay !== null) {
                    // Try to format as phone or location if structure matches
                    if (valueToDisplay.countryCode || valueToDisplay.dial_code || valueToDisplay.number) {
                        return formatPhoneDisplay(valueToDisplay)
                    }
                    if (valueToDisplay.address || valueToDisplay.city || valueToDisplay.state || valueToDisplay.country) {
                        return formatLocationDisplay(valueToDisplay)
                    }
                    if (hasNested) {
                        const displayNode = <span>{JSON.stringify(valueToDisplay)}</span>
                        const onOpenNested = () => openNestedModal(JSON.stringify(parsed), column)
                        return renderOptionsDropdown(displayNode, column, valueToDisplay, onOpenNested)
                    }
                    return <span>{JSON.stringify(valueToDisplay)}</span>
                }
                if (typeof valueToDisplay === "string" && valueToDisplay.startsWith("data:image/")) {
                    return (
                        <button onClick={() => openFileModal(valueToDisplay, column)} className="border rounded overflow-hidden h-12 w-12 hover:opacity-80 transition-opacity">
                            <img src={valueToDisplay} alt="preview" className="h-full w-full object-cover" />
                        </button>
                    )
                }
                if (hasNested) {
                    const displayNode = <span>{String(valueToDisplay)}</span>
                    const onOpenNested = () => openNestedModal(JSON.stringify(parsed), column)
                    return renderOptionsDropdown(displayNode, column, valueToDisplay, onOpenNested)
                }
                return <span suppressHydrationWarning>{String(valueToDisplay)}</span>
        }
    }

    const parseHistoryValue = (val) => {
        if (val === null || val === undefined || val === "") return "-";
        const parsed = safeParseJSON(val);

        let valueToDisplay = val
        if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
            valueToDisplay = parsed.value
        } else if (parsed !== undefined) {
            valueToDisplay = parsed
        }

        if (Array.isArray(valueToDisplay)) {
            return valueToDisplay.map(item => (typeof item === 'object' && item !== null ? (item.label || item.value || JSON.stringify(item)) : item)).join(", ");
        }

        if (typeof valueToDisplay === 'object' && valueToDisplay !== null) {
            // Check for phone object structure inside value
            if (valueToDisplay.number || valueToDisplay.countryCode || valueToDisplay.dial_code) {
                const code = valueToDisplay.countryCode || valueToDisplay.dial_code || ''
                return `${code} ${valueToDisplay.number || valueToDisplay.value || ''}`.trim();
            }
            // Check for location object structure
            if (valueToDisplay.address || valueToDisplay.city) {
                return [valueToDisplay.address || valueToDisplay.name, valueToDisplay.city, valueToDisplay.state].filter(Boolean).join(', ');
            }
            return JSON.stringify(valueToDisplay);
        }

        return String(valueToDisplay);
    };

    if (!record) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <AlertCircle className="h-10 w-10 text-destructive mb-4" />
                <p className="text-lg font-medium">Record not found or failed to load.</p>
                <Button className="mt-4" asChild>
                    <Link href={`/leadPage?tableId=${tableId}`}>Back to Tables</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/leadPage?tableId=${tableId}`}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Eye className="h-6 w-6 text-primary" />
                            Record Details
                        </h1>
                        <p className="text-muted-foreground">Detailed view for record ID: {recordId}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Details */}
                <div className="lg:col-span-12 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-7 space-y-6">
                            <Card className="border-l-4 border-l-primary shadow-sm h-fit">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Database className="h-5 w-5 text-primary" />
                                        Record Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Assigned To</Label>
                                            <p className="text-sm font-medium flex items-center gap-2">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                {getUserName(record?.assigned_to)}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Created By</Label>
                                            <p className="text-sm font-medium">
                                                {getUserName(record?.created_by)}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Created At</Label>
                                            <p className="text-sm" suppressHydrationWarning>
                                                {record?.created_at ? new Date(record.created_at).toLocaleString() : '-'}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Updated By</Label>
                                            <p className="text-sm font-medium">
                                                {getUserName(record?.updated_by)}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Updated At</Label>
                                            <p className="text-sm" suppressHydrationWarning>
                                                {record?.updated_at ? new Date(record.updated_at).toLocaleString() : '-'}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-blue-50/50 rounded-lg space-y-1 border border-blue-100/50">
                                            <Label className="text-xs font-semibold text-blue-600 uppercase">Lead Score</Label>
                                            <p className="text-sm font-bold text-blue-700">
                                                {record?.lead_score ?? '-'}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-blue-50/50 rounded-lg space-y-1 border border-blue-100/50">
                                            <Label className="text-xs font-semibold text-blue-600 uppercase">Lead Score %</Label>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-muted h-1.5 rounded-full overflow-hidden max-w-[100px]">
                                                    <div 
                                                        className="bg-blue-500 h-full transition-all" 
                                                        style={{ width: `${Math.min(100, Math.max(0, parseFloat(record?.lead_score_percentage || 0)))}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-bold text-blue-700">{record?.lead_score_percentage != null ? parseFloat(record.lead_score_percentage).toFixed(2) : '0.00'}%</span>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-blue-50/50 rounded-lg space-y-1 border border-blue-100/50">
                                            <Label className="text-xs font-semibold text-blue-600 uppercase">Lead Stage</Label>
                                            <div>
                                                {(() => {
                                                    const stage = record?.lead_stage;
                                                    if (!stage) return <span className="text-sm text-muted-foreground">-</span>;
                                                    
                                                    const sc = stageColorConfig[stage.toLowerCase()] || stageColorConfig.new;
                                                    const stageObj = stages.find(s => (s.stage_name || s.name || s.label)?.toLowerCase() === stage.toLowerCase());
                                                    const customColour = stageObj?.colour || null;
                                                    
                                                    if (customColour) {
                                                        return (
                                                            <Badge variant="secondary" className="uppercase text-[10px]" style={{ backgroundColor: `${customColour}18`, borderColor: `${customColour}50`, color: customColour }}>
                                                                {stage}
                                                            </Badge>
                                                        );
                                                    }
                                                    return (
                                                        <Badge variant="secondary" className={`uppercase text-[10px] ${sc.badge}`}>
                                                            {stage}
                                                        </Badge>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-blue-500 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Settings className="h-5 w-5 text-blue-500" />
                                        Custom Fields
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {columns.map((column) => {
                                            const value = getFieldValue(record, column.column_id, column)
                                            const type = getColumnFieldType(column)
                                            return (
                                                <div key={column.column_id} className="p-4 bg-muted/20 rounded-lg border group space-y-1.5 hover:border-blue-200 transition-colors">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{column.column_name}</Label>
                                                        <Badge variant="outline" className="text-[10px] bg-background scale-90">
                                                            {type || 'text'}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm min-h-[44px] flex items-center bg-background/50 p-2 rounded border border-transparent group-hover:bg-background">
                                                        {formatFieldValue(value, type, column)}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-5 space-y-6">
                            {mounted ? (
                                <Tabs defaultValue="history" className="h-full flex flex-col">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="history" className="flex items-center gap-2">
                                            <History className="h-4 w-4" /> History
                                        </TabsTrigger>
                                        <TabsTrigger value="activities" className="flex items-center gap-2">
                                            <ListTodo className="h-4 w-4" /> Activities
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="history" className="mt-4 flex-1">
                                    <Card className="shadow-sm h-[400px] sm:h-[600px] flex flex-col border-t-4 border-t-amber-500 w-full">
                                        <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-3 bg-muted/30 shrink-0">
                                            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" /> Record History
                                            </CardTitle>
                                            <CardDescription className="text-xs sm:text-sm">Audit trail for this record</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 sm:pt-6">
                                            {history.length > 0 ? (
                                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[1.125rem] before:w-0.5 before:bg-muted-foreground/20">
                                                    {history.map((item, idx) => {
                                                        const isCreate = item.event_type === 'CREATE'
                                                        const isUpdate = item.event_type === 'UPDATE'
                                                        
                                                        // Find field name from columns using the changed_field ID
                                                        const fieldName = columns.find(c => c.column_id === item.changed_field)?.column_name || item.changed_field

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
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    </TabsContent>

                                    <TabsContent value="activities" className="mt-4 flex-1">
                                        <Card className="shadow-sm">
                                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                    <ListTodo className="h-4 w-4 text-blue-500" /> Recent Activities
                                                </CardTitle>
                                                <Button size="sm" variant="outline" onClick={() => setIsCreateActivityOpen(true)} className="gap-1">
                                                    <Plus className="h-4 w-4" /> Add
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="h-[600px] overflow-y-auto">
                                                {loadingActivities ? (
                                                    <div className="space-y-3">
                                                        {[1, 2, 3].map(i => (
                                                            <div key={i} className="p-4 bg-muted/5 rounded-xl border space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <Skeleton className="h-5 w-16" />
                                                                    <Skeleton className="h-4 w-20" />
                                                                </div>
                                                                <Skeleton className="h-5 w-3/4" />
                                                                <Skeleton className="h-4 w-full" />
                                                                <div className="pt-2 flex items-center justify-between">
                                                                    <Skeleton className="h-5 w-16" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : activities.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {activities.map((activity) => (
                                                            <div key={activity.activity_id} className="p-4 bg-muted/5 rounded-xl border hover:bg-muted/20 transition-all cursor-pointer group shadow-sm">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <Badge variant="outline" className="bg-background text-[10px]">{activity.activity_type}</Badge>
                                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1" suppressHydrationWarning>
                                                                        <Clock className="h-3 w-3" />
                                                                        {new Date(activity.due_date).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{activity.title}</h4>
                                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{activity.description || 'No description provided'}</p>
                                                                <div className="mt-3 pt-2 border-t flex items-center justify-between">
                                                                    <Badge variant={activity.completed ? "default" : "secondary"} className="text-[9px] scale-90">
                                                                        {activity.completed ? "Completed" : "Pending"}
                                                                    </Badge>
                                                                    <span className="text-[10px] font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity">View Details →</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                                        <ListTodo className="h-10 w-10 opacity-20 mb-2" />
                                                        <p>No activities scheduled</p>
                                                        <Button variant="link" size="sm" onClick={() => setIsCreateActivityOpen(true)}>Create one now</Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                            ) : (
                                <div className="h-full flex flex-col">
                                    <div className="grid w-full grid-cols-2 bg-muted p-1 rounded-md mb-4 h-10">
                                        <div className="flex items-center justify-center gap-2 text-sm font-medium h-full">
                                            <History className="h-4 w-4" /> History
                                        </div>
                                        <div className="flex items-center justify-center gap-2 text-sm font-medium h-full">
                                            <ListTodo className="h-4 w-4" /> Activities
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CreateActivityDialog
                open={isCreateActivityOpen}
                onOpenChange={setIsCreateActivityOpen}
                initialData={{
                    related_table_id: tableId,
                    related_record_id: recordId
                }}
                currentUser={currentUser}
                onSuccess={fetchActivities}
            />

            {/* File Preview Modal */}
            <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden bg-background/95 backdrop-blur">
                    <DialogHeader className="p-6 border-b shrink-0 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <Eye className="h-5 w-5 text-primary" />
                                    {filePreview?.name}
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    File Preview • {filePreview?.type}
                                </DialogDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadDataUrl(filePreview?.url, filePreview?.name)}
                                className="gap-2"
                            >
                                <RefreshCw className="h-4 w-4" /> Download
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/10">
                        {filePreview?.type?.startsWith("image/") ? (
                            <img src={filePreview.url} alt={filePreview.name} className="max-w-full h-auto shadow-2xl rounded-lg" />
                        ) : filePreview?.type === "application/pdf" ? (
                            <iframe src={filePreview.url} className="w-full h-full min-h-[60vh] rounded-lg shadow-xl" title={filePreview.name} />
                        ) : (
                            <div className="text-center p-20 bg-background rounded-3xl shadow-xl border border-primary/10">
                                <Database className="h-20 w-20 text-primary/20 mx-auto mb-6" />
                                <p className="text-xl font-bold">No preview available</p>
                                <p className="text-muted-foreground mt-2">This file type ({filePreview?.type}) cannot be previewed in the browser.</p>
                                <Button className="mt-8" onClick={() => downloadDataUrl(filePreview?.url, filePreview?.name)}>
                                    Download to view
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Nested Data Modal */}
            <Dialog open={isNestedModalOpen} onOpenChange={setIsNestedModalOpen}>
                <DialogContent className="w-[95vw] max-w-[800px] max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0 bg-muted/20">
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Nested Details: {nestedData?.fieldName}
                        </DialogTitle>
                        <DialogDescription>
                            Viewing nested values for {nestedData?.isMulti ? "multi-selection" : "selection"}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Scrollable content area */}
                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div className="px-6 py-6">
                            {nestedData && (
                                <div className="space-y-6">
                                    {nestedData.isMulti ? (
                                        <div className="space-y-6">
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
                                                        <Card key={index} className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20 shadow-sm">
                                                            <CardHeader className="py-3 px-4 bg-primary/5 border-b border-primary/10">
                                                                <div className="flex items-center gap-3">
                                                                    <Badge variant="default" className="text-[10px] h-5">Selection {Number(index) + 1}</Badge>
                                                                    <span className="font-bold text-sm text-primary" suppressHydrationWarning>{groupedBySelection[index].value}</span>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="p-4">
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
                        </div>
                    </ScrollArea>

                    <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0">
                        <Button variant="outline" onClick={() => setIsNestedModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
