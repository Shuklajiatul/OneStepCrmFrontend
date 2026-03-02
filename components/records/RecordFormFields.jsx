"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, MapPin, X } from "lucide-react"
import { PhoneInput } from "./PhoneInput"
import { LocationPicker } from "./LocationPicker"
import { getColumnFieldType, getColumnOptions } from "@/lib/utils"

export function RecordFormFields({
    fields,
    formData,
    onFieldChange,
    onCheckboxToggle,
    countries,
    path = [],
    depth = 0
}) {
    if (!fields || !Array.isArray(fields)) return null

    return fields.map((field) => {
        const fieldId = field.id || field.column_id
        const fieldType = getColumnFieldType(field)
        const fieldName = field.column_name || field.label || field.name
        const storedValue = formData?.[fieldId]
        const columnOptions = getColumnOptions(field)

        const primitiveValue = (fieldType === 'select' || fieldType === 'radio')
            ? (storedValue?.value || '')
            : (typeof storedValue === 'object' ? JSON.stringify(storedValue) : String(storedValue || ''))

        // Location
        if (fieldType === 'location') {
            const locationVal = typeof storedValue === 'object' && storedValue !== null ? storedValue : {}
            return (
                <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1 border-primary/10' : ''} space-y-2`}>
                    <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {fieldName}
                    </Label>
                    <LocationPicker
                        value={locationVal}
                        onChange={val => onFieldChange(fieldId, val, path)}
                        validation={field.validation || field.properties?.validation ? (typeof field.properties.validation === 'string' ? JSON.parse(field.properties.validation) : field.properties.validation) : {}}
                    />
                </div>
            )
        }

        // Phone
        if (fieldType === 'phone') {
            const phoneData = typeof storedValue === 'object' && storedValue !== null
                ? { countryCode: storedValue.countryCode || field.validation?.defaultCountry || '+91', number: storedValue.number || '' }
                : { countryCode: field.validation?.defaultCountry || '+91', number: storedValue || '' }
            return (
                <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1 border-primary/10' : ''} space-y-2`}>
                    <Label>{fieldName}</Label>
                    <PhoneInput
                        value={phoneData}
                        onChange={val => onFieldChange(fieldId, val, path)}
                        countries={countries}
                    />
                </div>
            )
        }

        // Select
        if (fieldType === 'select' && columnOptions.length > 0) {
            const selectedOption = columnOptions.find(opt => {
                const val = typeof opt === 'object' ? (opt.value || opt.label) : opt
                return val === primitiveValue
            })
            const nestedFields = selectedOption?.nestedFields || []

            return (
                <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1 border-primary/10' : ''} space-y-2`}>
                    <Label>{fieldName}</Label>
                    <Select value={primitiveValue} onValueChange={val => onFieldChange(fieldId, { value: val, nestedValues: {} }, path)}>
                        <SelectTrigger><SelectValue placeholder={"Select " + fieldName} /></SelectTrigger>
                        <SelectContent>
                            {columnOptions.map((opt, i) => {
                                const val = typeof opt === 'object' ? (opt.value || opt.label) : opt
                                const label = typeof opt === 'object' ? (opt.label || opt.value) : opt
                                return (
                                    <SelectItem key={i} value={val}>{label}</SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>
                    {nestedFields.length > 0 && primitiveValue && (
                        <div className="mt-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Plus className="h-3 w-3" /> Nested Fields for {primitiveValue}
                        </div>
                    )}
                    {nestedFields.length > 0 && primitiveValue && (
                        <div className="mt-2">
                            <RecordFormFields
                                fields={nestedFields}
                                formData={storedValue?.nestedValues || {}}
                                onFieldChange={onFieldChange}
                                onCheckboxToggle={onCheckboxToggle}
                                countries={countries}
                                path={[...path, fieldId, 'nestedValues']}
                                depth={depth + 1}
                            />
                        </div>
                    )}
                </div>
            )
        }

        // Radio
        if (fieldType === 'radio' && columnOptions.length > 0) {
            const selectedOption = columnOptions.find(opt => {
                const val = typeof opt === 'object' ? (opt.value || opt.label) : opt
                return val === primitiveValue
            })
            const nestedFields = selectedOption?.nestedFields || []

            return (
                <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1 border-primary/10' : ''} space-y-2`}>
                    <Label>{fieldName}</Label>
                    <RadioGroup value={primitiveValue} onValueChange={val => onFieldChange(fieldId, { value: val, nestedValues: {} }, path)}>
                        <div className="grid gap-2">
                            {columnOptions.map((opt, i) => {
                                const val = typeof opt === 'object' ? (opt.value || opt.label) : opt
                                const label = typeof opt === 'object' ? (opt.label || opt.value) : opt
                                const id = `radio-${fieldId}-${i}`
                                return (
                                    <div key={i} className="flex items-center space-x-2">
                                        <RadioGroupItem value={val} id={id} />
                                        <Label htmlFor={id} className="font-normal cursor-pointer">{label}</Label>
                                    </div>
                                )
                            })}
                        </div>
                    </RadioGroup>

                    {nestedFields.length > 0 && primitiveValue && (
                        <div className="mt-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Plus className="h-3 w-3" /> Nested Fields for {primitiveValue}
                        </div>
                    )}
                    {nestedFields.length > 0 && primitiveValue && (
                        <div className="mt-2">
                            <RecordFormFields
                                fields={nestedFields}
                                formData={storedValue?.nestedValues || {}}
                                onFieldChange={onFieldChange}
                                onCheckboxToggle={onCheckboxToggle}
                                countries={countries}
                                path={[...path, fieldId, 'nestedValues']}
                                depth={depth + 1}
                            />
                        </div>
                    )}
                </div>
            )
        }

        // Checkbox
        if (fieldType === 'checkbox' && columnOptions.length > 0) {
            const checkboxSelections = Array.isArray(storedValue)
                ? storedValue.map(item => typeof item === 'object' ? item.value : item)
                : []

            return (
                <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1 border-primary/10' : ''} space-y-3`}>
                    <Label>{fieldName}</Label>
                    <div className="space-y-2">
                        {columnOptions.map((opt, i) => {
                            const optVal = typeof opt === 'object' ? (opt.value || opt.label) : opt
                            const optLabel = typeof opt === 'object' ? (opt.label || opt.value) : opt
                            const isChecked = checkboxSelections.includes(optVal)
                            const selectionIdx = isChecked ? (storedValue || []).findIndex(s => (s.value || s) === optVal) : -1
                            const id = `checkbox-${fieldId}-${i}`

                            return (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id={id}
                                            checked={isChecked}
                                            onCheckedChange={() => onCheckboxToggle(fieldId, optVal, path)}
                                        />
                                        <Label htmlFor={id} className="font-normal cursor-pointer">{optLabel}</Label>
                                    </div>
                                    {isChecked && typeof opt === 'object' && opt.nestedFields && opt.nestedFields.length > 0 && selectionIdx !== -1 && (
                                        <div className="mt-2 ml-6">
                                            <RecordFormFields
                                                fields={opt.nestedFields}
                                                formData={(storedValue || [])[selectionIdx]?.nestedValues || {}}
                                                onFieldChange={onFieldChange}
                                                onCheckboxToggle={onCheckboxToggle}
                                                countries={countries}
                                                path={[...path, fieldId, selectionIdx, 'nestedValues']}
                                                depth={depth + 1}
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }

        // Default
        return (
            <div key={fieldId} className={`${depth > 0 ? 'ml-4 border-l-2 pl-4 py-1 border-primary/10' : ''} space-y-2`}>
                <Label>{fieldName}</Label>
                {fieldType === 'textarea' ? (
                    <Textarea
                        value={primitiveValue}
                        onChange={e => onFieldChange(fieldId, e.target.value, path)}
                        placeholder={"Enter " + fieldName}
                    />
                ) : fieldType === 'number' ? (
                    (() => {
                        const numValue = parseFloat(primitiveValue)
                        const isOutOfRange = primitiveValue && !isNaN(numValue) && (
                            (field.validation?.min !== undefined && numValue < field.validation.min) ||
                            (field.validation?.max !== undefined && numValue > field.validation.max)
                        )
                        return (
                            <div className="space-y-1">
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={primitiveValue}
                                        onChange={e => onFieldChange(fieldId, e.target.value, path)}
                                        min={field.validation?.min}
                                        max={field.validation?.max}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className={`pr-8 ${isOutOfRange ? "border-red-500 text-red-500 placeholder-red-500 focus-visible:ring-red-500" : ""}`}
                                    />
                                    {primitiveValue && (
                                        <button
                                            type="button"
                                            onClick={() => onFieldChange(fieldId, '', path)}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            aria-label="Clear input"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                {isOutOfRange && (
                                    <p className="text-xs text-red-500">
                                        {field.validation?.min !== undefined && field.validation?.max !== undefined
                                            ? `Value must be between ${field.validation.min} and ${field.validation.max}`
                                            : field.validation?.min !== undefined
                                                ? `Value must be at least ${field.validation.min}`
                                                : `Value must be at most ${field.validation.max}`
                                        }
                                    </p>
                                )}
                            </div>
                        )
                    })()
                ) : (
                    <Input
                        value={primitiveValue}
                        onChange={e => onFieldChange(fieldId, e.target.value, path)}
                        type={fieldType === 'email' ? 'email' : fieldType === 'date' ? 'date' : fieldType === 'datetime' ? 'datetime-local' : 'text'}
                        placeholder={"Enter " + fieldName}
                    />
                )}
            </div>
        )
    })
}
