"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Database, Loader2, Search, Check } from "lucide-react"
import axios from "axios"
import { toast } from "sonner"

export function TableColumnSelector({ field, onUpdateField }) {
  const [tableColumns, setTableColumns] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedColumns, setSelectedColumns] = useState([])

  // API configuration
  const API_BASE_URL = 'http://10.10.15.194:3001'
  const TABLE_ID = '040e899d-583a-454e-92e6-d0d5a8095587'
  const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzJhOTg1Y2UtZDM4NS00MzQ5LThmMGMtZDQ2ZTYzMDI3Y2U0Iiwib3JnYW5pemF0aW9uX2lkIjoiYzhjNzJjMjEtN2I1Yy00MzVhLTkxMmEtODAzMTA1ZTdlY2M5IiwiaWF0IjoxNzYxNTQ1NTU4LCJleHAiOjE3NjE2MzE5NTh9.KG9CGv2EvC-DmEiGnS9ob6Ab1hQSStI6tT6dklvbhvM'

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
      console.log('📊 API Response:', result)
      
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

  // Map database data types to form field types
  const mapDataTypeToFieldType = (dataType) => {
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
      console.log('🎯 Adding table columns:', selectedColumns)
      
      const newFields = selectedColumns.map(column => {
        // Use the actual column data from API response
        const columnName = column.column_name || 'Unnamed Column'
        const formattedLabel = columnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        const fieldType = mapDataTypeToFieldType(column.data_type)
        
        console.log('📝 Processing column:', {
          columnName,
          dataType: column.data_type,
          fieldType,
          options: column.optional_values,
          required: column.required
        })

        const fieldData = {
          id: `field-${Date.now()}-${column.column_id}-${Math.random().toString(36).substr(2, 4)}`,
          type: fieldType,
          label: formattedLabel,
          placeholder: `Enter ${columnName.replace(/_/g, ' ').toLowerCase()}`,
          required: column.required || false,
          options: column.optional_values || undefined,
          validation: {
            required: column.required || false,
            unique: (column.properties && column.properties.is_primary === "true") || false
          },
          source: 'table',
          tableColumnId: column.column_id,
          tableColumnName: columnName,
          originalDataType: column.data_type // Keep original for debugging
        }
        
        console.log('✅ Created field data:', fieldData)
        return fieldData
      })

      console.log('🚀 Calling onAddTableColumns with:', newFields)
      // Call the parent function to add all fields at once
      field.onAddTableColumns(newFields)
    }

    toast.success(`Added ${selectedColumns.length} columns as form fields`)
    setSelectedColumns([])
  }

  // Filter columns based on search
  const filteredColumns = tableColumns.filter(column => {
    const columnName = column.column_name || ''
    const dataType = column.data_type || ''
    return columnName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           dataType.toLowerCase().includes(searchTerm.toLowerCase())
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
          {/* Button Container with Better Layout */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <Button 
              onClick={fetchTableColumns} 
              disabled={loading}
              className="flex-1 min-w-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Get Table Columns
                </>
              )}
            </Button>
            
            {selectedColumns.length > 0 && (
              <Button 
                onClick={addColumnsAsFields}
                variant="default"
                className="sm:w-auto w-full flex-shrink-0 whitespace-nowrap"
              >
                Add {selectedColumns.length} {selectedColumns.length === 1 ? 'Column' : 'Columns'}
              </Button>
            )}
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
              <p>Click "Get Table Columns" to load columns from your table</p>
              <p className="text-sm mt-2">Columns will be converted to appropriate form field types</p>
            </div>
          )}
        </CardContent>
      </Card>

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