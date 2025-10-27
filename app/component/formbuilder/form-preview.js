"use client"

import { useForm } from "@tanstack/react-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle2, Send, Copy, ExternalLink, Settings } from "lucide-react"
import { FieldRenderer } from "./field-renderer"
import { useState } from "react"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function FormPreview({ fields }) {
  const [generatedLink, setGeneratedLink] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")

  // Filter out table_column type fields from preview
  const previewFields = fields.filter(field => field.type !== "table_column")

  // Separate table columns from regular form fields
  const tableColumnFields = previewFields.filter(field => field.source === 'table')
  const regularFormFields = previewFields.filter(field => field.source !== 'table')

  console.log('📋 Field Separation:', {
    tableColumnFields,
    regularFormFields,
    allFields: previewFields
  })

  // Ensure unique field IDs for form default values
  const getDefaultValues = () => {
    return previewFields.reduce((acc, field) => {
      const fieldKey = field.id
      
      if (["select", "checkbox", "radio"].includes(field.type)) {
        if (field.type === "checkbox" || (field.type === "select" && field.validation?.multiple)) {
          acc[fieldKey] = {
            value: [],
            nestedField: {}
          }
        } else {
          acc[fieldKey] = {
            value: "",
            nestedField: {}
          }
        }
      } else if (field.type === "file") {
        acc[fieldKey] = null
      } else if (field.type === "location" || field.type === "phone") {
        acc[fieldKey] = {}
      } else {
        acc[fieldKey] = ""
      }
      
      return acc
    }, {})
  }

  const form = useForm({
    defaultValues: getDefaultValues(),
    onSubmit: async ({ value }) => {
      console.log("Form submitted:", value)
      toast.success("Form submitted successfully")
    },
  })

  // Update the handleGenerateLink function in form-preview.js
  const handleGenerateLink = async () => {
    if (!formName.trim()) {
      toast.error("Please enter a form name")
      return
    }

    if (fields.length === 0) {
      toast.error("Please add at least one field to the form")
      return
    }

    if (previewFields.length === 0) {
      toast.error("Please add at least one field to the form")
      return
    }

    setIsGenerating(true)
    try {
      // API configuration
      const API_BASE_URL = 'http://10.10.15.194:3001'
      const ORGANIZATION_ID = 'c8c72c21-7b5c-435a-912a-803105e7ecc9'
      const TABLE_ID = '040e899d-583a-454e-92e6-d0d5a8095587'
      const USER_ID = 'c2a985ce-d385-4349-8f0c-d46e63027ce4'
      const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzJhOTg1Y2UtZDM4NS00MzQ5LThmMGMtZDQ2ZTYzMDI3Y2U0Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzYxNTQ1NTU4LCJleHAiOjE3NjE2MzE5NTh9.KG9CGv2EvC-DmEiGnS9ob6Ab1hQSStI6tT6dklvbhvM'

      // Get existing table columns to avoid duplicates
      let existingColumns = []
      try {
        const response = await axios.get(`${API_BASE_URL}/api/datatables/${TABLE_ID}/columns`, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })
        existingColumns = Array.isArray(response.data) ? response.data : []
        console.log('📊 Existing table columns:', existingColumns.map(col => col.column_name))
      } catch (error) {
        console.log('⚠️ Could not fetch existing columns, continuing anyway...')
        console.error('Error details:', error)
      }

      // Prepare table column fields (from table columns) - ALLOW ALL FIELDS
      const tableFields = tableColumnFields
        .map(field => {
          // Ensure nested fields are properly structured for table fields
          const nestedFields = field.nestedFields || {}
          const hasNestedFields = Object.keys(nestedFields).length > 0
          
          const fieldObj = {
            id: field.tableColumnId || field.id,
            name: field.tableColumnName || field.label,
            type: field.type,
            required: String(field.required),
            label: field.label,
            validations: JSON.stringify(field.validation || {}),
            options: field.options ? String(field.options) : undefined,
            nested_fields: JSON.stringify(nestedFields),
            has_nested_fields: String(hasNestedFields)
            // Include nested fields for table fields as well
          }
          console.log('📊 Table Field:', fieldObj)
          console.log('🔍 Nested Fields for table field:', field.label, field.nestedFields)
          return fieldObj
        })

      // Prepare extra fields (regular form fields) - ALLOW ALL FIELDS
      const extraFields = regularFormFields
        .map(field => {
          // Convert options array to proper string format
          let optionsString = ""
          if (field.options && Array.isArray(field.options)) {
            optionsString = field.options.join(', ') // Convert array to comma-separated string
          } else if (field.options) {
            optionsString = String(field.options)
          }

          // Ensure nested fields are properly structured
          const nestedFields = field.nestedFields || {}
          const hasNestedFields = Object.keys(nestedFields).length > 0
          
          const fieldObj = {
            name: field.label,
            type: field.type,
            required: String(field.required),
            isLeadColumn: String(field.isLeadColumn || false),
            label: field.label,
            validations: JSON.stringify(field.validation || {}),
            options: optionsString,
            nested_fields: JSON.stringify(nestedFields),
            has_nested_fields: String(hasNestedFields)
          }

          console.log('📝 Extra Field:', fieldObj)
          console.log('🔍 Nested Fields for field:', field.label, field.nestedFields)
          return fieldObj
        })

      // Check if we have any fields to send after filtering duplicates
      if (tableFields.length === 0 && extraFields.length === 0) {
        toast.error("All fields already exist in the table. No new fields to add.")
        setIsGenerating(false)
        return
      }

      // Prepare the form data for API
      const formData = {
        organization_id: ORGANIZATION_ID,
        table_id: TABLE_ID,
        form_name: formName,
        description: formDescription,
        created_by: USER_ID,
        fields: tableFields,
        extraFields: extraFields,
        published: true
      }

      console.log('🚀 Sending form data to API:', formData)
      console.log('🔍 Detailed nested fields analysis:')
      extraFields.forEach((field, index) => {
        console.log(`Field ${index + 1}: ${field.name}`)
        console.log(`  - Nested fields: ${field.nested_fields}`)
        try {
          const parsedNested = JSON.parse(field.nested_fields)
          console.log(`  - Parsed nested fields:`, parsedNested)
        } catch (e) {
          console.log(`  - Error parsing nested fields:`, e.message)
        }
      })

      // Use only the correct endpoint
      const endpoint = `${API_BASE_URL}/api/forms`
      console.log(`🔄 Using endpoint: ${endpoint}`)

      try {
        const response = await axios.post(`${API_BASE_URL}/api/forms`, formData, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })
        const result = response.data
        console.log('✅ API Success Response:', result)

      if (result.success && result.form) {
        // Generate the public URL using the form_id from API response
        const publicUrl = `${window.location.origin}/forms/${result.form.form_id}`
        setGeneratedLink(publicUrl)

        // Store form data locally for the form view page
        const completeFormData = {
          form_name: formName,
          description: formDescription,
          // Store all preview fields with their complete data including options
          previewFields: previewFields.map(field => ({
            id: field.id,
            type: field.type,
            label: field.label,
            placeholder: field.placeholder,
            required: field.required,
            options: field.options, // Include options array directly for local storage
            validation: field.validation,
            source: field.source,
            tableColumnId: field.tableColumnId,
            tableColumnName: field.tableColumnName
          })),
          tableFields: tableFields,
          extraFields: extraFields,
          generatedAt: new Date().toISOString()
        }

        localStorage.setItem(`form-${result.form.form_id}`, JSON.stringify(completeFormData))
        toast.success("Form link generated successfully!")
        return result
      } else {
        throw new Error('Invalid response from server: ' + JSON.stringify(result))
      }

    } catch (error) {
      console.error('❌ Form creation failed:', error)
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        throw new Error(`Field already exists: ${error.response.data?.error || 'Unknown error'}`)
      } else if (error.response?.status === 500) {
        throw new Error(`Invalid data format: ${error.response.data?.error || 'Unknown error'}`)
      } else {
        throw new Error(error.message || 'Failed to create form')
      }
    }

    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openFormInNewTab = () => {
    if (generatedLink) {
      window.open(generatedLink, '_blank', 'noopener,noreferrer')
      toast.info("Opening form in new tab")
    }
  }

  const PHONE_COUNTRIES = {
    US: { dial: "+1", len: 10 },
    IN: { dial: "+91", len: 10 },
    GB: { dial: "+44", len: 10 },
    CA: { dial: "+1", len: 10 },
    AU: { dial: "+61", len: 9 },
  }
  const validateNestedField = (nestedField, value) => {
    const errors = []

    // Required validation
    const isRequired = nestedField.required || nestedField.validation?.required
    if (isRequired) {
      if (nestedField.type === "select") {
        if (!value || value === "") {
          errors.push("Please select an option")
        }
      } else if (nestedField.type === "checkbox") {
        if (!Array.isArray(value) || value.length === 0) {
          errors.push("Please select at least one option")
        }
      } else if (nestedField.type === "file") {
        if (!value) {
          errors.push("Please select a file")
        }
      } else if (!value || (typeof value === "string" && value.trim() === "")) {
        errors.push("This field is required")
      }
    }

    // File type validation
    if (nestedField.type === "file" && value && nestedField.validation?.accept) {
      const acceptedTypes = nestedField.validation.accept.split(",").map((type) => type.trim())
      const fileName = value.name || ""
      const fileType = value.type || ""

      const isAccepted = acceptedTypes.some((acceptType) => {
        if (acceptType.startsWith(".")) {
          return fileName.toLowerCase().endsWith(acceptType.toLowerCase())
        } else if (acceptType.includes("*")) {
          const baseType = acceptType.split("/")[0]
          return fileType.startsWith(baseType + "/")
        } else {
          return fileType === acceptType
        }
      })

      if (!isAccepted) {
        errors.push(`File type not allowed. Accepted types: ${nestedField.validation.accept}`)
      }
    }

    // File size validation
    if (nestedField.type === "file" && value && nestedField.validation?.maxSize) {
      const maxSizeBytes = nestedField.validation.maxSize * 1024 * 1024
      if (value.size > maxSizeBytes) {
        errors.push(`File size must be less than ${nestedField.validation.maxSize}MB`)
      }
    }

    // Type-specific validation
    if (value && typeof value === "string" && value.trim() !== "") {
      switch (nestedField.type) {
        case "email":
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(value)) {
            errors.push("Please enter a valid email address")
          }
          break

        case "number":
          const numValue = Number(value)
          if (isNaN(numValue)) {
            errors.push("Please enter a valid number")
          } else {
            if (nestedField.validation?.min !== undefined && numValue < nestedField.validation.min) {
              errors.push(`Value must be at least ${nestedField.validation.min}`)
            }
            if (nestedField.validation?.max !== undefined && numValue > nestedField.validation.max) {
              errors.push(`Value must be at most ${nestedField.validation.max}`)
            }
          }
          break

        case "text":
        case "textarea":
          if (nestedField.validation?.pattern && nestedField.validation.pattern.trim() !== "") {
            try {
              const pattern = nestedField.validation.pattern.trim()
              if (pattern) {
                const regex = new RegExp(pattern)
                if (!regex.test(value)) {
                  errors.push("Value does not match the required pattern")
                }
              }
            } catch (e) {
              console.warn("Invalid regex pattern:", nestedField.validation.pattern, e.message)
            }
          }
          if (nestedField.validation?.minLength && value.length < nestedField.validation.minLength) {
            errors.push(`Value must be at least ${nestedField.validation.minLength} characters`)
          }
          if (nestedField.validation?.maxLength && value.length > nestedField.validation.maxLength) {
            errors.push(`Value must be at most ${nestedField.validation.maxLength} characters`)
          }
          break

        case "phone":
          const digits = value.replace(/\D/g, "")
          if (nestedField.validation?.minLength && digits.length < nestedField.validation.minLength) {
            errors.push(`Phone number must be at least ${nestedField.validation.minLength} digits`)
          }
          if (nestedField.validation?.maxLength && digits.length > nestedField.validation.maxLength) {
            errors.push(`Phone number must be at most ${nestedField.validation.maxLength} digits`)
          }
          break
      }
    }

    return errors
  }

  const validateField = (field, value) => {
    const errors = []

    // Required validation - check both field.required and validation.required
    const isRequired = field.required || field.validation?.required
    if (isRequired) {
      if (field.type === "select") {
        if (field.validation?.multiple) {
          // Multiple select - should be array with at least one item
          if (!Array.isArray(value) || value.length === 0) {
            errors.push("Please select at least one option")
          }
        } else {
          // Single select - should have a value
          if (!value || value === "") {
            errors.push("Please select an option")
          }
        }
      } else if (field.type === "checkbox") {
        // Checkbox group - should have at least one selected
        if (!Array.isArray(value) || value.length === 0) {
          errors.push("Please select at least one option")
        }
      } else if (field.type === "file") {
        if (!value) {
          errors.push("Please select a file")
        }
      } else if (field.type === "location") {
        const v = value || {}
        if (!v.country) {
          errors.push("Please select a country")
        } else if (!v.state) {
          errors.push("Please select a state")
        } else if (!v.city) {
          errors.push("Please select a city")
        }
      } else if (field.type === "phone") {
        const v = value || {}
        if (!v.country) {
          errors.push("Please select a country code")
        } else if (!v.number || String(v.number).trim() === "") {
          errors.push("Please enter a phone number")
        }
      } else if (!value || (typeof value === "string" && value.trim() === "")) {
        errors.push("This field is required")
      }
    }

    // File type validation
    if (field.type === "file" && value && field.validation?.accept) {
      const acceptedTypes = field.validation.accept.split(",").map((type) => type.trim())
      const fileName = value.name || ""
      const fileType = value.type || ""

      const isAccepted = acceptedTypes.some((acceptType) => {
        if (acceptType.startsWith(".")) {
          // File extension check
          return fileName.toLowerCase().endsWith(acceptType.toLowerCase())
        } else if (acceptType.includes("*")) {
          // MIME type wildcard check (e.g., image/*)
          const baseType = acceptType.split("/")[0]
          return fileType.startsWith(baseType + "/")
        } else {
          // Exact MIME type check
          return fileType === acceptType
        }
      })

      if (!isAccepted) {
        errors.push(`File type not allowed. Accepted types: ${field.validation.accept}`)
      }
    }

    // Type-specific validation
    if (value && ((typeof value === "string" && value.trim() !== "") || field.type === "phone")) {
      switch (field.type) {
        case "email":
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(value)) {
            errors.push("Please enter a valid email address")
          }
          break

        case "number":
          const numValue = Number(value)
          if (isNaN(numValue)) {
            errors.push("Please enter a valid number")
          } else {
            if (field.validation?.min !== undefined && numValue < field.validation.min) {
              errors.push(`Value must be at least ${field.validation.min}`)
            }
            if (field.validation?.max !== undefined && numValue > field.validation.max) {
              errors.push(`Value must be at most ${field.validation.max}`)
            }
          }
          break

        case "text":
        case "textarea":
          if (field.validation?.pattern && field.validation.pattern.trim() !== "") {
            try {
              const pattern = field.validation.pattern.trim()
              if (pattern) {
                const regex = new RegExp(pattern)
                if (!regex.test(value)) {
                  errors.push("Value does not match the required pattern")
                }
              }
            } catch (e) {
              console.warn("Invalid regex pattern:", field.validation.pattern, e.message)
              // Don't add validation error for invalid regex, just warn
            }
          }
          break

        case "phone": {
          const v = value || {}
          const meta = PHONE_COUNTRIES[v.country || "US"]
          const digits = String(v.number || "").replace(/\D/g, "")
          const minLen =
            typeof field.validation?.minLength === "number" ? field.validation.minLength : (meta?.len ?? 10)
          const maxLen =
            typeof field.validation?.maxLength === "number" ? field.validation.maxLength : (meta?.len ?? 10)
          if (digits.length < minLen || digits.length > maxLen) {
            if (minLen === maxLen) {
              errors.push(`Phone number must be ${minLen} digits for ${v.country || "selected country"}`)
            } else {
              errors.push(`Phone number must be ${minLen}-${maxLen} digits`)
            }
          }
          break
        }
      }
    }

    if (field.nestedFields && value?.nestedFields) {
      Object.entries(field.nestedFields).forEach(([optionIndex, nestedFields]) => {
        const optionNestedValues = value.nestedFields[optionIndex] || {}
        nestedFields.forEach(nestedField => {
          const nestedValue = optionNestedValues[nestedField.id]
          const nestedErrors = validateNestedField(nestedField, nestedValue)
          if (nestedErrors.length > 0) {
            errors.push(`${nestedField.label}: ${nestedErrors[0]}`)
          }
        })
      })
    }

    return errors
  }

  if (previewFields.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Fields to Preview</h3>
          <p className="text-muted-foreground mb-4">
            Switch back to builder mode and add some fields to see the form preview.
          </p>
          <Badge variant="outline" className="text-xs">
            Add fields from the palette to get started
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Form Preview</h2>
          <p className="text-muted-foreground">
            This is how your form will appear to users. All validation rules are active.
          </p>

          {/* Field Statistics */}
          <div className="flex gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              {previewFields.length} total fields
            </Badge>
            {tableColumnFields.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {tableColumnFields.length} from table
              </Badge>
            )}
            {regularFormFields.length > 0 && (
              <Badge variant="default" className="text-xs">
                {regularFormFields.length} custom fields
              </Badge>
            )}
          </div>
        </div>

        {/* Form Configuration Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Form Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-name" className="text-sm font-medium">
                Form Name *
              </Label>
              <Input
                id="form-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter form name"
                className="bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-description" className="text-sm font-medium">
                Description
              </Label>
              <Input
                id="form-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Enter form description"
                className="bg-input"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Form Preview
            </CardTitle>
            <p className="text-sm text-muted-foreground">Fill out the form below to test validation and submission.</p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
              className="space-y-6"
            >
              {previewFields.map((field) => (
                <form.Field
                  key={field.id}
                  name={field.id}
                  validators={{
                    onChange: ({ value }) => {
                      const errors = validateField(field, value)
                      return errors.length > 0 ? errors[0] : undefined
                    },
                    onSubmit: ({ value }) => {
                      const errors = validateField(field, value)
                      return errors.length > 0 ? errors[0] : undefined
                    },
                  }}
                >
                  {(fieldApi) => (
                    <div className="space-y-1">
                      <FieldRenderer
                        field={field}
                        value={fieldApi.state.value}
                        onChange={fieldApi.handleChange}
                        invalid={fieldApi.state.meta.errors.length > 0}
                        error={fieldApi.state.meta.errors.length > 0 ? fieldApi.state.meta.errors[0] : undefined}
                      />
                    </div>
                  )}
                </form.Field>
              ))}

              <Separator />

              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  {previewFields.length} {previewFields.length === 1 ? "field" : "fields"} • {previewFields.filter((f) => f.required).length}{" "}
                  required
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateLink}
                    disabled={isGenerating || previewFields.length === 0}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4" />
                        Generate Link
                      </>
                    )}
                  </Button>
                  <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                    {([canSubmit, isSubmitting]) => (
                      <Button type="submit" disabled={true} className="gap-2">
                        <Send className="h-4 w-4" />
                        {isSubmitting ? "Submitting..." : "Submit Form"}
                      </Button>
                    )}
                  </form.Subscribe>
                </div>
              </div>
            </form>

            {/* Generated Link Section */}
            {generatedLink && (
              <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Form Link Generated
                </Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="bg-background font-mono text-sm flex-1"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className="gap-2 shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={openFormInNewTab}
                    variant="default"
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Form
                  </Button>
                  <Button
                    onClick={() => {
                      copyToClipboard()
                      openFormInNewTab()
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy & Open
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this link with users to collect form responses. Click "Open Form" to view the form in a new tab.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Data Debug Panel */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Form Structure (Debug)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Table Columns ({tableColumnFields.length})</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
                  {JSON.stringify(tableColumnFields.map(f => ({
                    id: f.tableColumnId,
                    name: f.tableColumnName,
                    type: f.type,
                    required: f.required
                  })), null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Extra Fields ({regularFormFields.length})</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
                  {JSON.stringify(regularFormFields.map(f => ({
                    name: f.label,
                    type: f.type,
                    required: f.required
                  })), null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}