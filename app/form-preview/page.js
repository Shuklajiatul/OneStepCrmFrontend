"use client"

import { useEffect, useState } from "react"
import { FormPreview } from "../component/formbuilder/form-preview"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft, FileText } from "lucide-react"

export default function FormPreviewPage() {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState(null)
  const router = useRouter()

  useEffect(() => {
    // Load fields from localStorage (edit mode) or sessionStorage (create mode)
    const formBuilderData = localStorage.getItem('formBuilderData')
    
    if (formBuilderData) {
      // Edit mode - load from localStorage
      try {
        const data = JSON.parse(formBuilderData)
        if (data.isEditMode && data.fields) {
          console.log('🔍 Loading fields from localStorage for preview:', data.fields)
          console.log('🔍 First field nestedFields from localStorage:', data.fields[0]?.nestedFields)
          
          // Debug: Show the complete structure of the first field
          if (data.fields[0]) {
            console.log('🔍 Complete first field structure:', JSON.stringify(data.fields[0], null, 2))
          }
          
          setFields(data.fields)
          setIsEditMode(true)
          setEditFormData(data)
        }
      } catch (error) {
        console.error('Error parsing formBuilderData:', error)
      }
    } else {
      // Create mode - load from sessionStorage
      const savedFields = sessionStorage.getItem('form-preview-fields')
      if (savedFields) {
        try {
          const parsedFields = JSON.parse(savedFields)
          console.log('🔍 Loading fields from sessionStorage for preview:', parsedFields)
          setFields(parsedFields)
        } catch (error) {
          console.error('Error parsing saved fields:', error)
        }
      }
    }
    setLoading(false)
  }, [])

  // Listen for changes to localStorage in edit mode
  useEffect(() => {
    if (!isEditMode) return

    const handleStorageChange = () => {
      console.log('🔍 Storage change detected in form preview')
      const formBuilderData = localStorage.getItem('formBuilderData')
      if (formBuilderData) {
        try {
          const data = JSON.parse(formBuilderData)
          if (data.isEditMode && data.fields) {
            console.log('🔍 Storage changed - reloading fields for preview:', data.fields)
            console.log('🔍 First field nestedFields from storage:', data.fields[0]?.nestedFields)
            
            // Debug: Show the complete structure of the first field
            if (data.fields[0]) {
              console.log('🔍 Complete first field structure from storage:', JSON.stringify(data.fields[0], null, 2))
            }
            
            setFields(data.fields)
            setEditFormData(data)
          }
        } catch (error) {
          console.error('Error parsing updated formBuilderData:', error)
        }
      }
    }

    // Listen for storage events (cross-tab)
    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events (for same-tab updates)
    window.addEventListener('formBuilderDataUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('formBuilderDataUpdated', handleStorageChange)
    }
  }, [isEditMode])

  const handleBack = () => {
    if (isEditMode) {
      // In edit mode, go directly to custom-form with edit data
      sessionStorage.setItem('directEditAction', 'true')
      router.push('/custom-form')
    } else {
      // In create mode, go back to custom-form normally
      sessionStorage.setItem('intended-tab', 'custom-form')
      router.push('/')
    }
  }

  const handleSaveForm = async () => {
    try {
      if (isEditMode && editFormData) {
        // Update existing form
        console.log('🔍 Updating existing form:', editFormData.formId)
        console.log('🔍 Fields to update:', fields)
        
        // Generate the same payload structure as Generate Link
        const API_BASE_URL = 'http://10.10.15.194:3001'
        const ORGANIZATION_ID = 'c8c72c21-7b5c-435a-912a-803105e7ecc9'
        const TABLE_ID = '040e899d-583a-454e-92e6-d0d5a8095587'
        const USER_ID = 'c2a985ce-d385-4349-8f0c-d46e63027ce4'
        const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzJhOTg1Y2UtZDM4NS00MzQ5LThmMGMtZDQ2ZTYzMDI3Y2U0Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzYwNTA2OTYzLCJleHAiOjE3NjA1OTMzNjN9.SEAwwoCusaotsc_lhb3nh0Fq5tIOWIHtbMYCG1vZ2jU'
        
        // Let FormPreview component handle the processing
        const processFieldData = (field) => {
          return field
        }
        
        // Combine all fields into a single fields array
        console.log('🔍 Raw fields before processing:', fields)
        const allFields = fields.map(processFieldData)
        console.log('🔍 Processed fields:', allFields)
        
        // Prepare the update payload
        const updatePayload = {
          organization_id: ORGANIZATION_ID,
          form_id: editFormData.formId,
          table_id: TABLE_ID,
          form_name: editFormData.formName,
          description: editFormData.description,
          created_by: USER_ID,
          fields: allFields,
          retry_count: editFormData.max_retry_count || 2
        }
        
        console.log('🚀 Update API Payload:', JSON.stringify(updatePayload, null, 2))
        
        // Debug: Show detailed nested fields analysis for the API payload
        console.log('🔍 Detailed nested fields analysis for API payload:')
        updatePayload.fields.forEach((field, fieldIndex) => {
          console.log(`Field ${fieldIndex + 1}: ${field.label} (${field.type}) - hasNested: ${field.hasNested}`)
          
          // Only process options for field types that have options (select, checkbox, radio)
          if (field.options && Array.isArray(field.options)) {
            field.options.forEach((option, optIndex) => {
            if (option.nestedFields && option.nestedFields.length > 0) {
              console.log(`  Option ${optIndex}: "${option.value}" has ${option.nestedFields.length} nested fields`)
              option.nestedFields.forEach((nestedField, nestedIndex) => {
                console.log(`    Nested Field ${nestedIndex}: ${nestedField.label} (${nestedField.type})`)
                if (nestedField.options && nestedField.options.length > 0) {
                  nestedField.options.forEach((nestedOption, nestedOptIndex) => {
                    if (nestedOption.nestedFields && nestedOption.nestedFields.length > 0) {
                      console.log(`      Nested Option ${nestedOptIndex}: "${nestedOption.value}" has ${nestedOption.nestedFields.length} deep nested fields`)
                    }
                  })
                }
              })
            }
          })
          }
        })
        
        // Send update request
        const response = await fetch(`${API_BASE_URL}/api/forms/update`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload)
        })
        
        const result = await response.json()
        console.log('✅ Update API Response:', result)
        
        if (result.success) {
          toast.success(`Form "${editFormData.formName}" updated successfully!`)
          // Clear localStorage and navigate to My Forms
          localStorage.removeItem('formBuilderData')
          sessionStorage.setItem('intended-tab', 'my-forms')
          // Navigate to home page
          router.push('/')
        } else {
          toast.error(`Failed to update form: ${result.message || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Error updating form:', error)
      toast.error(`Error updating form: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Form Builder
            </Button>
            {isEditMode && (
              <Button onClick={handleSaveForm} className="flex items-center gap-2" size="sm">
                <FileText className="h-4 w-4" />
                Update Form
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Form Preview Content */}
      <FormPreview 
        fields={fields} 
        isEditMode={isEditMode} 
        formData={editFormData}
      />
    </div>
  )
}