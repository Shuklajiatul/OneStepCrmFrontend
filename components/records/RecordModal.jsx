"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Database, UserPlus } from "lucide-react"
import { RecordFormFields } from "./RecordFormFields"
import { toast } from "sonner"
import { authUtils } from "@/lib/auth-utils"
import { recordsApi } from "@/lib/api-endpoint"
import { updateNestedState, buildFieldValuePayload, getColumnFieldType, normalizeFieldValueForForm, getFieldValue } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export function RecordModal({
    open,
    onOpenChange,
    table,
    countries,
    onSuccess,
    recordToEdit = null, // If provided, it's an edit modal
    users = [] // Optional: list of users for assigned_to
}) {
    const [formData, setFormData] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (open) {
            if (recordToEdit) {
                // Initialize with record data
                const initialFormState = {
                    assigned_to: recordToEdit.assigned_to === "NA" || !recordToEdit.assigned_to ? null : recordToEdit.assigned_to
                }

                if (table?.columns) {
                    table.columns.forEach(column => {
                        const fieldId = column.id || column.column_id
                        // We use getFieldValue to handle cases where record might have different structures
                        const rawValue = getFieldValue(recordToEdit, fieldId, column)
                        initialFormState[fieldId] = normalizeFieldValueForForm(rawValue, column)
                    })
                }
                setFormData(initialFormState)
            } else {
                // Initialize empty form
                const initialFormState = { assigned_to: null }
                if (table?.columns) {
                    table.columns.forEach((column) => {
                        const fieldId = column.id || column.column_id
                        const fieldType = getColumnFieldType(column)
                        if (fieldType === 'checkbox') {
                            initialFormState[fieldId] = []
                        } else if (fieldType === 'select' || fieldType === 'radio') {
                            initialFormState[fieldId] = { value: '', nestedValues: {} }
                        } else if (fieldType === 'phone') {
                            initialFormState[fieldId] = { countryCode: column.validation?.defaultCountry || '+91', number: '' }
                        } else if (fieldType === 'location') {
                            initialFormState[fieldId] = { country: undefined, state: undefined, city: undefined }
                        } else {
                            initialFormState[fieldId] = ''
                        }
                    })
                }
                setFormData(initialFormState)
            }
        }
    }, [open, table, recordToEdit])

    const handleFieldChange = (fieldId, newValue, path = []) => {
        setFormData(prev => updateNestedState(prev, [...path, fieldId], newValue))
    }

    const handleCheckboxToggle = (fieldId, optionValue, path = []) => {
        setFormData(prev => {
            let currentData = prev
            for (const key of path) {
                currentData = currentData?.[key]
            }
            const currentValues = Array.isArray(currentData?.[fieldId]) ? currentData[fieldId] : []
            const index = currentValues.findIndex(item => (typeof item === 'object' ? item.value : item) === optionValue)

            let newFieldVal
            if (index > -1) {
                newFieldVal = [...currentValues]
                newFieldVal.splice(index, 1)
            } else {
                newFieldVal = [...currentValues, { value: optionValue, nestedValues: {} }]
            }
            return updateNestedState(prev, [...path, fieldId], newFieldVal)
        })
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            const gIds = authUtils.getGIds()
            const pIds = authUtils.getPIds()
            const currentGId = gIds?.[0]

            if (!currentGId) {
                toast.error("User session expired. Please login again.")
                setIsSubmitting(false)
                return
            }

            const fieldValues = {}
            if (table?.columns) {
                table.columns.forEach(column => {
                    const fieldId = column.id || column.column_id
                    const value = formData[fieldId]
                    const payloadValue = buildFieldValuePayload(column, value)
                    if (payloadValue !== null) {
                        fieldValues[fieldId] = payloadValue
                    }
                })
            }

            const payload = {
                g_id: currentGId,
                g_ids: gIds,
                p_id: pIds,
                assigned_to: formData.assigned_to === "none" || !formData.assigned_to ? null : formData.assigned_to,
                field_values: fieldValues
            }

            let response
            if (recordToEdit?.record_id || recordToEdit?.id) {
                const id = recordToEdit.record_id || recordToEdit.id
                response = await recordsApi.update(table.id || table.table_id, id, payload)
            } else {
                response = await recordsApi.create(table.id || table.table_id, payload)
            }

            if (response.data) {
                toast.success(recordToEdit ? "Record updated successfully!" : "Record added successfully!")
                onOpenChange(false)
                if (onSuccess) onSuccess()
            }
        } catch (error) {
            console.error("Error submitting record:", error)
            toast.error(recordToEdit ? "Failed to update record" : "Failed to add record")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${recordToEdit ? 'bg-blue-100 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                            {recordToEdit ? <Database className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">
                                {recordToEdit ? "Edit Record" : "Add New Record"}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {recordToEdit ? `Updating record in ${table?.name}` : `Create a new entry in ${table?.name}`}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
                    {/* Internal CRM Fields */}
                    {users.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-8 bg-primary rounded-full" />
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Internal Assignment</h3>
                            </div>
                            <div className="p-4 rounded-xl border bg-muted/20 space-y-2 group hover:border-primary/50 transition-colors">
                                <Label className="text-sm font-semibold">Assign To</Label>
                                <Select
                                    value={formData.assigned_to || "none"}
                                    onValueChange={val => handleFieldChange('assigned_to', val)}
                                >
                                    <SelectTrigger className="h-10 bg-background border-muted group-hover:border-primary/30 transition-all">
                                        <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Unassigned / System</SelectItem>
                                        {users.map(user => (
                                            <SelectItem key={user.user_id || user.id} value={user.user_id || user.id}>
                                                {user.first_name || user.name} {user.last_name || ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Dynamic Table Fields */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-1 w-8 bg-blue-500 rounded-full" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data Fields</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <RecordFormFields
                                fields={table?.columns || []}
                                formData={formData}
                                onFieldChange={handleFieldChange}
                                onCheckboxToggle={handleCheckboxToggle}
                                countries={countries}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-muted/10 shrink-0 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="px-6 h-10 font-semibold">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="px-8 h-10 font-bold shadow-lg shadow-primary/20">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {recordToEdit ? "Updating..." : "Saving..."}
                            </>
                        ) : (
                            recordToEdit ? "Update Record" : "Save Record"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
