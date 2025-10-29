"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Database, Loader2, Search, Check, RefreshCw } from "lucide-react"
import axios from "axios"
import { toast } from "sonner"
import { v4 as uuidv4 } from 'uuid'

export function TableColumnSelector({ field, onUpdateField, existingFields = [] }) {
  const [tableColumns, setTableColumns] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedColumns, setSelectedColumns] = useState([])
  const [autoFetched, setAutoFetched] = useState(false)

  // Auto-fetch columns when component mounts
  useEffect(() => {
    if (!autoFetched) {
      fetchTableColumns()
      setAutoFetched(true)
    }
  }, [autoFetched])

  // Get list of already used column IDs from existing fields
  const getUsedColumnIds = () => {
    return existingFields
      .filter(field => field.source === 'table' && field.tableColumnId)
      .map(field => field.tableColumnId)
  }

  // Filter out already used columns from available columns
  const getAvailableColumns = () => {
    const usedColumnIds = getUsedColumnIds()
    return tableColumns.filter(column => !usedColumnIds.includes(column.column_id))
  }

  // API configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
  const TABLE_ID = process.env.NEXT_PUBLIC_TABLE_ID
  const AUTH_TOKEN = process.env.NEXT_PUBLIC_AUTH_TOKEN

  // Fetch table columns
  const fetchTableColumns = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/datatables/${TABLE_ID}/columns`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      })
      const result = response.data
      console.log('Table columns:', result)
      
      // Handle array response directly
      if (Array.isArray(result)) {
        setTableColumns(result)
        toast.success(`Loaded ${result.length} columns`)
      } else if (result.success && result.columns) {
        setTableColumns(result.columns)
        toast.success(`Loaded ${result.columns.length} columns`)
      } else if (Array.isArray(result.data)) {
        setTableColumns(result.data)
        toast.success(`Loaded ${result.data.length} columns`)
      } else {
        console.warn('Unexpected API response format:', result)
        throw new Error('Unexpected API response format')
      }
    } catch (error) {
      console.error('❌ Failed to fetch table columns:', error)
      toast.error(`Failed to fetch columns: ${error.message}`)
      setTableColumns([])
    } finally {
      setLoading(false)
    }
  }

  // Parse optional_values JSON string into proper field options
  const parseOptionalValues = (optionalValues) => {
    if (!optionalValues || !Array.isArray(optionalValues) || optionalValues.length === 0) {
      return []
    }

    try {
      const jsonString = optionalValues[0]
      if (typeof jsonString !== 'string') {
        return []
      }

      const parsed = JSON.parse(jsonString)
      if (!Array.isArray(parsed)) {
        return []
      }

      return parsed.map(option => {
        const processedOption = {
          value: option.value || '',
          label: option.label || option.value || '',
          nestedFields: option.nestedFields ? processNestedFields(option.nestedFields) : []
        }
        return processedOption
      })
    } catch (error) {
      console.error('Error parsing optional_values:', error)
      return []
    }
  }

  // Process nested fields recursively
  const processNestedFields = (nestedFields) => {
    if (!Array.isArray(nestedFields)) {
      return []
    }

    return nestedFields.map(nestedField => {
      const processedNestedField = {
        id: nestedField.id || uuidv4(),
        name: nestedField.name || '',
        label: nestedField.label || '',
        type: nestedField.type || 'text',
        required: nestedField.required || false,
        // Use validation (singular) as expected by form components, fall back to validations (plural)
        validation: nestedField.validation || nestedField.validations || {},
        hasNested: nestedField.hasNested || false,
        isLeadColumn: nestedField.isLeadColumn || false,
        // Process options correctly - options should be an array of option objects, not nested fields
        options: nestedField.options ? nestedField.options.map(option => ({
          value: option.value || '',
          label: option.label || option.value || '',
          nestedFields: option.nestedFields ? processNestedFields(option.nestedFields) : []
        })) : []
      }

      // If this nested field has nested fields, process them recursively
      if (nestedField.nestedFields && Array.isArray(nestedField.nestedFields)) {
        processedNestedField.nestedFields = processNestedFields(nestedField.nestedFields)
      }

      return processedNestedField
    })
  }

  // Map database data types to form field types
  const mapDataTypeToFieldType = (dataType, optionalValues) => {
    // If column has optional_values, determine field type based on the structure
    if (optionalValues && Array.isArray(optionalValues) && optionalValues.length > 0) {
      try {
        const parsed = JSON.parse(optionalValues[0])
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if it's a select/radio/checkbox based on structure
          const hasNestedFields = parsed.some(option => option.nestedFields && option.nestedFields.length > 0)
          if (hasNestedFields) {
            // Determine if it's radio or select based on the data structure
            // For now, default to select, but this could be enhanced based on your business logic
            return 'select'
          } else if (parsed.length > 0) {
            // Simple options without nested fields
            return 'select'
          }
        }
      } catch (error) {
        console.error('Error parsing optional_values for field type detection:', error)
      }
    }

    // Fallback to original mapping
    const typeMap = {
      'text': 'text',
      'varchar': 'text',
      'string': 'text',
      'email': 'email',
      'number': 'number',
      'integer': 'number',
      'float': 'number',
      'decimal': 'number',
      'dropdown': 'select',
      'dropDown': 'select',
      'select': 'select',
      'checkbox': 'checkbox',
      'radio': 'radio',
      'textarea': 'textarea',
      'file': 'file',
      'datetime': 'datetime',
      'date': 'datetime',
      'phone': 'phone',
      'location': 'location'
    }
    return typeMap[dataType?.toLowerCase()] || 'text'
  }

  // Handle column selection
  const toggleColumnSelection = (column) => {
    setSelectedColumns(prev => {
      const isSelected = prev.some(col => col.column_id === column.column_id)
      
      if (isSelected) {
        return prev.filter(col => col.column_id !== column.column_id)
      } else {
        return [...prev, column]
      }
    })
  }

  // Add selected columns as form fields
  const addColumnsAsFields = () => {
    if (selectedColumns.length === 0) {
      toast.error('Please select at least one column')
      return
    }

    if (field.onAddTableColumns) {
      const newFields = selectedColumns.map(column => {
        // Use the actual column data from API response
        const columnName = column.column_name || 'Unnamed Column'
        const formattedLabel = columnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        const fieldType = mapDataTypeToFieldType(column.data_type, column.optional_values)

        // Generate unique field ID
        const generateUniqueFieldId = (prefix = 'field') => {
          return uuidv4()
        }

        // Parse optional values to get proper options structure
        const parsedOptions = parseOptionalValues(column.optional_values)
        
        const fieldData = {
          id: generateUniqueFieldId(),
          type: fieldType,
          label: formattedLabel,
          placeholder: `Enter ${columnName.replace(/_/g, ' ').toLowerCase()}`,
          required: column.required || false,
          options: parsedOptions.length > 0 ? parsedOptions : undefined,
          validation: {
            required: column.required || false,
            unique: (column.properties && column.properties.is_primary === "true") || false
          },
          source: 'table',
          tableColumnId: column.column_id,
          tableColumnName: columnName,
          originalDataType: column.data_type // Keep original for debugging
        }
        
        return fieldData
      })

      // Call the parent function to add all fields at once
      field.onAddTableColumns(newFields)
    }

    toast.success(`Added ${selectedColumns.length} columns as form fields`)
    setSelectedColumns([])
  }

  // Filter columns based on search (only from available columns)
  const filteredColumns = getAvailableColumns().filter(column => {
    const columnName = column.column_name || ''
    const dataType = column.data_type || ''
    return columnName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           dataType.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Get used columns for display
  const usedColumns = tableColumns.filter(column => {
    const usedColumnIds = getUsedColumnIds()
    return usedColumnIds.includes(column.column_id)
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4" />
            Table Columns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           {/* Button Container */}
           <div className="flex justify-between items-center">
             {selectedColumns.length > 0 && (
               <Button 
                 onClick={addColumnsAsFields}
                 variant="default"
                 size="sm"
                 className="gap-2"
               >
                 Add {selectedColumns.length} {selectedColumns.length === 1 ? 'Column' : 'Columns'}
               </Button>
             )}
             
             <Button 
               onClick={() => {
                 fetchTableColumns()
                 setSelectedColumns([])
               }} 
               disabled={loading}
               size="sm"
               variant="outline"
               className="gap-2"
             >
               {loading ? (
                 <>
                   <Loader2 className="h-3 w-3 animate-spin" />
                   Loading...
                 </>
               ) : (
                 <>
                   <RefreshCw className="h-3 w-3" />
                   Refresh Columns
                 </>
               )}
             </Button>
           </div>

          {tableColumns.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Search Columns</Label>
                <Input
                  placeholder="Search by column name or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-input"
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Select</TableHead>
                        <TableHead>Column Name</TableHead>
                        <TableHead>Data Type</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Options</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredColumns.map((column) => (
                        <TableRow 
                          key={column.column_id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleColumnSelection(column)}
                        >
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                                selectedColumns.some(col => col.column_id === column.column_id) 
                                  ? 'bg-primary border-primary' 
                                  : 'border-border'
                              }`}>
                                {selectedColumns.some(col => col.column_id === column.column_id) && (
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {column.column_name || 'Unnamed'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {column.data_type || 'text'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {column.required ? (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Optional
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {column.optional_values && column.optional_values.length > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                {column.optional_values.length} options
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {filteredColumns.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No columns found matching your search.
                </div>
              )}
            </>
          )}

           {tableColumns.length === 0 && !loading && (
             <div className="text-center py-8 text-muted-foreground">
               <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
               <p>Click "Refresh Columns" to load columns from your table</p>
               <p className="text-sm mt-2">Columns will be converted to appropriate form field types</p>
               <p className="text-xs mt-1 text-muted-foreground/70">Refresh also clears all selected columns</p>
             </div>
           )}
        </CardContent>
      </Card>

      {usedColumns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Already Used Columns ({usedColumns.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {usedColumns.map(column => (
                <Badge key={column.column_id} variant="secondary" className="flex items-center gap-1">
                  {column.column_name || 'Unnamed'}
                  <Check className="w-3 h-3" />
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              These columns are already added to your form and cannot be selected again.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedColumns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Selected Columns ({selectedColumns.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedColumns.map(column => (
                <Badge key={column.column_id} variant="default" className="flex items-center gap-1">
                  {column.column_name || 'Unnamed'}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleColumnSelection(column)
                    }}
                    className="ml-1 hover:bg-primary-foreground/20 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}