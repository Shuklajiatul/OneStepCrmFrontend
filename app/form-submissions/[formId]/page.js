"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RefreshCw, AlertCircle, Search, FileText, Send, ArrowLeft, Eye, X } from "lucide-react"
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
import { toast } from "sonner"
import { authUtils } from "@/lib/auth-utils"
import { formsApi, submissionsApi } from "@/lib/api-endpoint"
import { useParams, useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { formatDateTimeDisplay } from "@/lib/utils"
import { extractTimestampFromUUID } from "@/lib/utils"
import { isUUIDv1 } from "@/lib/utils"
import { isValidDate } from "@/lib/utils"
import { PageBreadcrumb } from "@/components/page-breadcrumb"


// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const ORGANIZATION_ID = process.env.NEXT_PUBLIC_ORGANIZATION_ID
const TABLE_ID = process.env.NEXT_PUBLIC_TABLE_ID

export default function FormSubmissionsPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const formId = params.formId
  const isStandaloneRoute = pathname?.startsWith("/form-submissions/")

  const [formDetails, setFormDetails] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isNestedModalOpen, setIsNestedModalOpen] = useState(false)
  const [nestedData, setNestedData] = useState(null)
  const [currentField, setCurrentField] = useState(null)
  const [currentSubmission, setCurrentSubmission] = useState(null)
  const [isFileModalOpen, setIsFileModalOpen] = useState(false)
  const [filePreview, setFilePreview] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    if (formId) {
      fetchFormDetails()
      fetchSubmissions()
    }
  }, [formId])

  const fetchFormDetails = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await formsApi.getById(formId)

      if (response.data.success && response.data.data) {
        setFormDetails(response.data.data)
      } else {
        throw new Error("Form not found")
      }
    } catch (err) {
      const errorMsg = `Failed to fetch form details: ${err.message}`
      setError(errorMsg)
      toast.error(errorMsg)
      console.error("Error fetching form details:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmissions = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await submissionsApi.getAll(ORGANIZATION_ID, formId)

      if (response.data.success && Array.isArray(response.data.data)) {
        const mappedSubmissions = response.data.data.map((submission) => ({
          ...submission,
          created_at: submission.created_at || submission.last_edited_at || new Date().toISOString(),
        }))
        setSubmissions(mappedSubmissions)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      const errorMsg = `Failed to fetch submissions: ${err.message}`
      setError(errorMsg)
      toast.error(errorMsg)
      console.error("Error fetching submissions:", err)
    } finally {
      setLoading(false)
    }
  }

  const parseJsonSafely = (value) => {
    if (value === null || value === undefined) return null
    if (typeof value === "object") return value
    if (typeof value !== "string") return value
    const trimmed = value.trim()
    if (!trimmed) return ""
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return JSON.parse(trimmed)
      } catch (error) {
        console.warn("parseJsonSafely error:", error)
        return value
      }
    }
    return value
  }

  const formatDateOnly = (input) => {
    if (input instanceof Date && !isNaN(input.getTime())) {
      return input.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    if (input === null || input === undefined) return null;

    const str = String(input).trim();
    if (!str) return null;

    // Try direct parsing first
    const direct = new Date(str);
    if (!isNaN(direct.getTime())) {
      return direct.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    // Handle ISO format with time
    const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
    if (isoMatch) {
      const datePart = isoMatch[1];
      const [year, month, day] = datePart.split('-');
      const dateObj = new Date(year, month - 1, day);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    }

    return null;
  };

  const formatPhoneDisplay = (value) => {
    const parsed = parseJsonSafely(value)
    if (parsed && typeof parsed === "object") {
      const countryCode = parsed.countryCode || parsed.code || ""
      const number = parsed.number || parsed.value || ""
      const country = parsed.country || ""
      const line = [countryCode, number].filter(Boolean).join(" ").trim()
      return (
        <div className="text-sm">
          {line && <div className="font-medium">{line}</div>}
          {country && <div className="text-xs text-muted-foreground">{country}</div>}
        </div>
      )
    }
    return <span className="truncate max-w-[200px]">{String(value ?? "")}</span>
  }

  const formatLocationDisplay = (value) => {
    const parsed = parseJsonSafely(value)
    if (parsed && typeof parsed === "object") {
      const title = parsed.address || parsed.name || ""
      const subtitle = [parsed.city, parsed.state, parsed.country].filter(Boolean).join(", ")
      return (
        <div className="text-sm">
          {title && <div className="font-medium">{title}</div>}
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
      )
    }
    return <span className="truncate max-w-[200px]">{String(value ?? "")}</span>
  }

  const normalizeNestedFields = (nestedFields) => {
    if (!nestedFields || !Array.isArray(nestedFields)) return []

    return nestedFields.map((field) => {
      if (typeof field === "object" && field !== null) {
        return {
          id: field.id,
          name: field.name || field.label || field.id,
          label: field.label || field.name || field.id,
          type: field.type || "text",
          nestedFields: field.nestedFields ? normalizeNestedFields(field.nestedFields) : [],
        }
      }
      return field
    })
  }

  const parseNestedData = (fieldValue, field) => {
    try {
      const parsed = JSON.parse(fieldValue)
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

  const inferFilenameFromDataUrl = (dataUrl, field) => {
    try {
      if (typeof dataUrl !== "string") return "file"
      const match = dataUrl.match(/^data:([^;]+);base64,/)
      const mime = match ? match[1] : "application/octet-stream"
      const ext =
        {
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/jpg": "jpg",
          "image/gif": "gif",
          "image/webp": "webp",
          "application/pdf": "pdf",
        }[mime] || "bin"
      const base = (field?.label || field?.name || "file").toString().replace(/\s+/g, "_").toLowerCase()
      return `${base}.${ext}`
    } catch {
      return "file"
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
            <Badge key={idx} variant="secondary" className="text-xs">
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

        const displayNode = <span className="truncate max-w-[200px]">{simpleValue}</span>

        const onOpenNested = hasNested ? () => openNestedModal(JSON.stringify(rawValue), field, submission) : undefined

        if (fieldType === "select" || fieldType === "radio" || fieldType === "checkbox") {
          return renderOptionsDropdown(displayNode, field, simpleValue, onOpenNested)
        }

        switch (fieldType) {
          case "email":
            return (
              <a href={`mailto:${simpleValue}`} className="text-blue-600 hover:underline">
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
              return <span>{formatted}</span>
            }
            return <span className="truncate max-w-[200px]">{String(simpleValue)}</span>
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
            return <span className="truncate max-w-[200px]">{String(simpleValue)}</span>
          default:
            return <span className="truncate max-w-[200px]">{String(simpleValue)}</span>
        }
      }

      if (rawValue.country || rawValue.state || rawValue.city) {
        return formatLocationDisplay(rawValue)
      }

      if (rawValue.countryCode || rawValue.number) {
        return formatPhoneDisplay(rawValue)
      }
    }

    const rawString = String(rawValue)

    switch (fieldType) {
      case "email":
        return (
          <a href={`mailto:${rawString}`} className="text-blue-600 hover:underline">
            {rawString}
          </a>
        )
      case "phone": {
        const phoneData = parseJsonSafely(rawString)
        if (phoneData && typeof phoneData === "object") {
          return formatPhoneDisplay(phoneData)
        }
        return (
          <a href={`tel:${rawString}`} className="text-blue-600 hover:underline">
            {rawString}
          </a>
        )
      }
      case "location": {
        const locationData = parseJsonSafely(rawString)
        if (locationData && typeof locationData === "object") {
          return formatLocationDisplay(locationData)
        }
        return <span className="truncate max-w-[200px]">{rawString}</span>
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
          return <span>{formatted}</span>
        }
        return <span className="truncate max-w-[200px]">{rawString}</span>
      }
      case "number":
        return <span className="truncate max-w-[200px]">{rawString}</span>
      case "textarea":
        return <span className="truncate max-w-[200px] whitespace-pre-wrap">{rawString}</span>
      case "text":
      case "select":
      case "radio":
      case "checkbox":
      default:
        return <span className="truncate max-w-[200px]">{rawString}</span>
    }
  }

  const getFieldValue = (submission, fieldId) => {
    if (!submission.values || !submission.values[fieldId]) return null

    const rawValue = submission.values[fieldId]

    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim()
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
          return JSON.parse(trimmed)
        } catch (e) {
          return rawValue
        }
      }
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
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
          const parsed = JSON.parse(trimmed)
          return extractSearchableText(parsed)
        } catch (e) {
          return value
        }
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
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {String(val)}
                      </Badge>
                    )
                  })}
                </div>
              )
            }

            return <span className="text-foreground">{String(value)}</span>
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
            console.warn("Failed to parse field:", e)
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
      {/* Error Display */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchFormDetails()
                  fetchSubmissions()
                }}
                className="ml-2"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Card */}
      <Card className="w-full">
        <CardHeader className="border-b bg-card/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-8 w-8 shrink-0"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <FileText className="h-6 w-6" />
                  Form Submissions
                </CardTitle>
                <CardDescription>View all submitted data for {formDetails?.form_name || "this form"}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchSubmissions} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Search and Controls Section */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <X
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setSearchTerm("")}
                />
              )}
            </div>

            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm("")} className="whitespace-nowrap">
                Clear Filters
              </Button>
            )}
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
            <div className="text-center py-12 text-muted-foreground">
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
              <div className="rounded-md border overflow-hidden w-full">
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
                              <TableCell key={column.id} className="py-4">
                                {column.render(column.accessor(submission), submission)}
                              </TableCell>
                            ))}
                            {/* Created At Column */}
                            <TableCell className="py-4">
                              {(() => {
                                const createdDateString = submission.created_at;

                                if (!createdDateString) {
                                  return <span className="text-muted-foreground italic">-</span>;
                                }

                                // First, try to parse as regular date
                                if (isValidDate(createdDateString)) {
                                  return formatDateTimeDisplay(createdDateString);
                                }

                                // Check if it's a UUID v1 and try to extract timestamp
                                if (isUUIDv1(createdDateString)) {
                                  const uuidDate = extractTimestampFromUUID(createdDateString);
                                  if (uuidDate) {
                                    return (
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">
                                          {formatDateTimeDisplay(uuidDate.toISOString())}
                                        </span>
                                        {/* <span className="text-xs text-muted-foreground">from UUID timestamp</span> */}
                                      </div>
                                    );
                                  }
                                }

                                // If it's not a UUID v1 or extraction failed, show the raw value
                                return (
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-muted-foreground">-</span>
                                    <span className="text-xs text-muted-foreground break-all max-w-[120px]">
                                      {createdDateString.length > 20 ? `${createdDateString.substring(0, 20)}...` : createdDateString}
                                    </span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            {/* Last Edited At Column */}
                            <TableCell className="py-4">
                              {formatDateTimeDisplay(submission.last_edited_at) ||
                                <span className="text-muted-foreground italic">-</span>}
                            </TableCell>

                            {/* Edit Attempts Column */}
                            <TableCell className="py-4">
                              <Badge variant="secondary" className="font-medium">
                                {typeof submission.edit_count === "number"
                                  ? submission.edit_count
                                  : 0}
                              </Badge>
                            </TableCell>

                            {/* Actions Column */}
                            <TableCell className="py-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  router.push(`/form-submissions/submission-details?form_id=${formId}&submission_id=${submission.submission_id}&table_id=${formDetails?.table_id}`)
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
                <div className="mt-6 px-4 sm:px-0 pb-4 sm:pb-0">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                      {/* Items per page selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Show</span>
                        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">per page</span>
                      </div>

                      {/* Page info */}
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredSubmissions.length)} of {filteredSubmissions.length} submissions
                      </div>
                    </div>

                    {/* Pagination controls */}
                    {totalPages > 1 && (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>

                          {/* Show limited page numbers for better UX */}
                          {(() => {
                            const pages = [];
                            const maxVisiblePages = 5;
                            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                            // Adjust start page if we're near the end
                            if (endPage - startPage + 1 < maxVisiblePages) {
                              startPage = Math.max(1, endPage - maxVisiblePages + 1);
                            }

                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <PaginationItem key={i}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(i)}
                                    isActive={currentPage === i}
                                    className="cursor-pointer"
                                  >
                                    {i}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                            return pages;
                          })()}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Nested Data Modal */}
      <Dialog open={isNestedModalOpen} onOpenChange={setIsNestedModalOpen}>
        <DialogContent className="w-[95vw] max-w-[1200px] max-h-[90vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Nested Data - {nestedData?.fieldName}</DialogTitle>
            <DialogDescription>Detailed view of nested field values</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            {nestedData && (
              <div className="space-y-6 pr-4">
                {/* Root Selected Value */}
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
                            <Badge key={idx} variant="default" className="text-base px-4 py-1">
                              {val}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="default" className="text-base px-4 py-1">
                            {nestedData.selectedValue}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="default" className="text-base px-4 py-1">
                        {nestedData.selectedValue}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Nested Form Fields */}
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
                                    {groupedBySelection[index].value}
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

      {/* File Preview Modal */}
      <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
        <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
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

  if (loading && (!formDetails || submissions.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading form submissions...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background w-full">
      <div className="w-full p-4 md:p-6 bg-background overflow-x-auto">{mainContent}</div>
    </main>
  )
}