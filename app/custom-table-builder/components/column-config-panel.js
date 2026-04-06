"use client"

import { useState, useEffect, useCallback, useRef, memo, Fragment } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Settings2, ChevronDown, ChevronRight, Loader2, Search } from "lucide-react"
import { v4 as uuidv4 } from 'uuid'
import { fetchPhoneCountries, fetchCountries, fetchStates, fetchCities } from "@/lib/constants/location-api"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

// Recursive component for nested column configurations
const NestedColumnConfig = memo(({
    nestedColumn,
    path = [],
    onUpdate,
    onRemove,
    onAddNested,
    columnTypes,
    readOnly = false
}) => {
    const depth = path.length / 2

    const handleUpdate = (updates) => {
        onUpdate(path, updates)
    }

    const bgColors = ['bg-background/50', 'bg-blue-50/50', 'bg-green-50/50', 'bg-purple-50/50', 'bg-orange-50/50']
    const bgColor = bgColors[Math.min(depth, bgColors.length - 1)]

    return (
        <div className={`p-3 border rounded-lg space-y-3 w-full min-w-0 overflow-hidden ${bgColor}`}>
            <div className="flex items-center justify-between min-w-0">
                <Badge variant="outline" className="text-xs flex-shrink-0">
                    Sub-field {depth > 0 && `(Level ${depth + 1})`}
                </Badge>
                {!readOnly && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 ml-2"
                        onClick={() => onRemove(path)}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                )}
            </div>

            <div className="space-y-3">
                <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Field Label</Label>
                    <Input
                        value={nestedColumn.name}
                        onChange={(e) => handleUpdate({ name: e.target.value })}
                        placeholder="Enter field label"
                        className="h-8 text-sm"
                        disabled={readOnly}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Searchable</Label>
                    <Switch
                        checked={nestedColumn.isSearchable ?? true}
                        onCheckedChange={(checked) => handleUpdate({ isSearchable: checked })}
                        disabled={readOnly}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Field Type</Label>
                    <Select
                        value={nestedColumn.type}
                        onValueChange={(value) => {
                            const updates = { type: value }
                            if (["dropdown", "radio", "checkbox", "status"].includes(value) && !nestedColumn.options) {
                                updates.options = ["Option 1", "Option 2"]
                            }
                            handleUpdate(updates)
                        }}
                    >
                        <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {columnTypes.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {nestedColumn.type === "number" && (
                    <div className="space-y-3 pt-2 border-t border-dashed">
                        <Label className="text-xs font-medium text-muted-foreground">Number Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Minimum Value</Label>
                                <Input
                                    type="number"
                                    value={nestedColumn.validation?.min ?? ""}
                                    onChange={(e) => handleUpdate({
                                        validation: {
                                            ...nestedColumn.validation,
                                            min: e.target.value ? Number(e.target.value) : undefined
                                        }
                                    })}
                                    placeholder="No minimum"
                                    className="h-7 text-xs"
                                    disabled={readOnly}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Maximum Value</Label>
                                <Input
                                    type="number"
                                    value={nestedColumn.validation?.max ?? ""}
                                    onChange={(e) => handleUpdate({
                                        validation: {
                                            ...nestedColumn.validation,
                                            max: e.target.value ? Number(e.target.value) : undefined
                                        }
                                    })}
                                    placeholder="No maximum"
                                    className="h-7 text-xs"
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                        {(nestedColumn.validation?.min !== undefined || nestedColumn.validation?.max !== undefined) && (
                            <p className="text-xs text-muted-foreground">
                                {nestedColumn.validation?.min !== undefined && nestedColumn.validation?.max !== undefined
                                    ? `Accepted range: ${nestedColumn.validation.min} to ${nestedColumn.validation.max}`
                                    : nestedColumn.validation?.min !== undefined
                                        ? `Minimum value: ${nestedColumn.validation.min}`
                                        : `Maximum value: ${nestedColumn.validation.max}`
                                }
                            </p>
                        )}
                    </div>
                )}

                {["dropdown", "select", "radio", "checkbox", "status"].includes(nestedColumn.type) && (
                    <div className="space-y-4 pt-2 border-t border-dashed">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Allows Multiple Selection</Label>
                            <Switch
                                checked={nestedColumn.validation?.multiple || false}
                                onCheckedChange={(checked) => handleUpdate({
                                    validation: { ...nestedColumn.validation, multiple: checked }
                                })}
                                disabled={readOnly}
                            />
                        </div>

                        <Label className="text-xs font-medium text-muted-foreground">Options</Label>
                        <div className="space-y-2">
                            {(nestedColumn.options || []).map((option, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex gap-2">
                                        <Input
                                            value={typeof option === 'string' ? option : option.value}
                                            onChange={(e) => {
                                                const newOptions = [...(nestedColumn.options || [])]
                                                if (typeof option === 'string') {
                                                    newOptions[idx] = e.target.value
                                                } else {
                                                    newOptions[idx] = { ...option, value: e.target.value }
                                                }
                                                handleUpdate({ options: newOptions })
                                            }}
                                            className="h-7 text-xs"
                                            disabled={readOnly}
                                        />
                                        {!readOnly && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0"
                                                onClick={() => {
                                                    const newOptions = nestedColumn.options.filter((_, i) => i !== idx)
                                                    handleUpdate({ options: newOptions })
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="pl-4 border-l-2 border-dashed border-muted">
                                        {!readOnly && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 text-[10px] gap-1 opacity-70 hover:opacity-100"
                                                onClick={() => onAddNested([...path, idx], idx)}
                                            >
                                                <Plus className="h-2 w-2" /> Add Nested Field
                                            </Button>
                                        )}

                                        {nestedColumn.nestedFields && nestedColumn.nestedFields[idx] && (
                                            <div className="space-y-2 mt-2">
                                                {nestedColumn.nestedFields[idx].map((subField, sfIdx) => (
                                                    <NestedColumnConfig
                                                        key={subField.id || sfIdx}
                                                        nestedColumn={subField}
                                                        path={[...path, idx, sfIdx]}
                                                        onUpdate={onUpdate}
                                                        onRemove={onRemove}
                                                        onAddNested={onAddNested}
                                                        columnTypes={columnTypes}
                                                        readOnly={readOnly}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                             {!readOnly && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-7 text-xs"
                                    onClick={() => {
                                        const newOptions = [...(nestedColumn.options || []), `Option ${(nestedColumn.options?.length || 0) + 1}`]
                                        handleUpdate({ options: newOptions })
                                    }}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Option
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
})

export function ColumnConfigPanel({ column, onUpdate, columnTypes, readOnly = false }) {
    const [countries, setCountries] = useState([])
    const [isLoadingCountries, setIsLoadingCountries] = useState(false)
    const [countrySearch, setCountrySearch] = useState("")
    const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false)

    // For location field restrictions
    const [allCountries, setAllCountries] = useState([])
    const [statesPerCountry, setStatesPerCountry] = useState({})
    const [citiesPerState, setCitiesPerState] = useState({})
    const [loadingStates, setLoadingStates] = useState({})
    const [loadingCities, setLoadingCities] = useState({})
    const [manualCityInput, setManualCityInput] = useState({})
    const [showManualCityInput, setShowManualCityInput] = useState({})

    useEffect(() => {
        const loadAllCountries = async () => {
            if (column.type === "location") {
                const data = await fetchCountries()
                setAllCountries(data)
            }
        }
        loadAllCountries()
    }, [column.type])

    const loadStatesForCountry = async (countryName) => {
        if (!countryName || statesPerCountry[countryName] || loadingStates[countryName]) return
        setLoadingStates(prev => ({ ...prev, [countryName]: true }))
        try {
            const data = await fetchStates(countryName)
            setStatesPerCountry(prev => ({ ...prev, [countryName]: data }))
        } finally {
            setLoadingStates(prev => ({ ...prev, [countryName]: false }))
        }
    }

    const loadCitiesForState = async (countryName, stateName) => {
        if (!stateName || !countryName || citiesPerState[`${countryName}-${stateName}`] || loadingCities[`${countryName}-${stateName}`]) return
        setLoadingCities(prev => ({ ...prev, [`${countryName}-${stateName}`]: true }))
        try {
            const data = await fetchCities(countryName, stateName)
            setCitiesPerState(prev => ({ ...prev, [`${countryName}-${stateName}`]: data }))
        } finally {
            setLoadingCities(prev => ({ ...prev, [`${countryName}-${stateName}`]: false }))
        }
    }

    const addManualCity = (stateName) => {
        const city = manualCityInput[stateName]
        if (!city?.trim()) return

        const currentAllowed = column.validation?.allowedCities?.[stateName] || []
        if (currentAllowed.includes(city.trim())) return

        handleUpdate({
            validation: {
                ...(column.validation || {}),
                allowedCities: {
                    ...(column.validation?.allowedCities || {}),
                    [stateName]: [...currentAllowed, city.trim()]
                }
            }
        })
        setManualCityInput(prev => ({ ...prev, [stateName]: "" }))
        setShowManualCityInput(prev => ({ ...prev, [stateName]: false }))
    }

    useEffect(() => {
        const loadCountries = async () => {
            if (column.type === "phone" || countries.length === 0) {
                setIsLoadingCountries(true)
                const data = await fetchPhoneCountries()
                setCountries(data)
                setIsLoadingCountries(false)
            }
        }
        loadCountries()
    }, [column.type])

    if (!column) return null

    const handleUpdate = (updates) => {
        onUpdate({ ...column, ...updates })
    }

    const updateNestedField = (path, updates) => {
        const clonedNestedFields = JSON.parse(JSON.stringify(column.nestedFields || {}))
        let current = clonedNestedFields

        // Navigate to the correct level
        for (let i = 0; i < path.length - 1; i += 2) {
            const optIdx = path[i]
            const fieldIdx = path[i + 1]
            if (i + 2 < path.length) {
                if (!current[optIdx][fieldIdx].nestedFields) current[optIdx][fieldIdx].nestedFields = {}
                current = current[optIdx][fieldIdx].nestedFields
            }
        }

        const lastOptIdx = path[path.length - 2]
        const lastFieldIdx = path[path.length - 1]

        if (updates === null) {
            // Remove
            current[lastOptIdx].splice(lastFieldIdx, 1)
        } else {
            // Update
            current[lastOptIdx][lastFieldIdx] = { ...current[lastOptIdx][lastFieldIdx], ...updates }
        }

        handleUpdate({ nestedFields: clonedNestedFields })
    }

    const removeNestedField = (path) => {
        updateNestedField(path, null)
    }

    const addNestedField = (path, optionIndex) => {
        const clonedNestedFields = JSON.parse(JSON.stringify(column.nestedFields || {}))
        const newField = {
            id: uuidv4(),
            name: "New Sub-field",
            type: "text",
            required: false,
            properties: {}
        }

        let current = clonedNestedFields

        // Traverse to the nestedFields object that will hold the new field
        // A path like [rootOptIdx, subFieldIdx, subOptIdx] has an odd length.
        // We traverse pairs [optIdx, fieldIdx] until we reach the last optIdx.
        for (let i = 0; i < path.length - 1; i += 2) {
            const optIdx = path[i]
            const fieldIdx = path[i + 1]

            if (!current[optIdx]) current[optIdx] = []
            if (!current[optIdx][fieldIdx]) {
                // Create placeholders if they don't exist for some reason
                current[optIdx][fieldIdx] = { id: uuidv4(), name: "Sub-field", type: "text" }
            }
            if (!current[optIdx][fieldIdx].nestedFields) current[optIdx][fieldIdx].nestedFields = {}
            current = current[optIdx][fieldIdx].nestedFields
        }

        // The final element in the path is the index of the option we are adding to
        const lastOptIdx = path[path.length - 1]
        if (!current[lastOptIdx]) current[lastOptIdx] = []
        current[lastOptIdx].push(newField)

        handleUpdate({ nestedFields: clonedNestedFields })
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label>Column Name</Label>
                    <Input
                        value={column.name}
                        onChange={(e) => handleUpdate({ name: e.target.value })}
                        placeholder="e.g. Lead Status"
                        disabled={readOnly}
                    />
                </div>


                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Required</Label>
                        <p className="text-xs text-muted-foreground">Force value entry for this column</p>
                    </div>
                    <Switch
                        checked={column.required}
                        onCheckedChange={(checked) => handleUpdate({ required: checked })}
                        disabled={readOnly}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Searchable</Label>
                        <p className="text-xs text-muted-foreground">Include this column in global search</p>
                    </div>
                    <Switch
                        checked={column.isSearchable ?? true}
                        onCheckedChange={(checked) => handleUpdate({ isSearchable: checked })}
                        disabled={readOnly}
                    />
                </div>

                {["datetime", "date"].includes(column.type) && (
                    <div className="space-y-3 border-t pt-4">
                        <Label>Date Format</Label>
                        <Select
                            value={column.validation?.dateFormat || "MM/dd/yyyy"}
                            onValueChange={(value) => handleUpdate({
                                validation: { ...column.validation, dateFormat: value }
                            })}
                            disabled={readOnly}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (01/25/2024)</SelectItem>
                                <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (25/01/2024)</SelectItem>
                                <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (2024-01-25)</SelectItem>
                                <SelectItem value="MMM dd, yyyy">MMM dd, yyyy (Jan 25, 2024)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {column.type === "phone" && (
                    <div className="space-y-3 border-t pt-4">
                        <Label>Default Country / Prefix</Label>
                        <Popover open={isCountryPickerOpen} onOpenChange={setIsCountryPickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isCountryPickerOpen}
                                    className="w-full justify-between h-10"
                                    disabled={readOnly}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        {column.validation?.defaultCountry ? (
                                            <>
                                                {countries.find(c => c.dial === column.validation?.defaultCountry)?.flag ? (
                                                    <img
                                                        src={countries.find(c => c.dial === column.validation?.defaultCountry).flag}
                                                        alt=""
                                                        className="w-5 h-3.5 object-cover rounded-sm shrink-0"
                                                    />
                                                ) : (
                                                    <span className="text-lg">{countries.find(c => c.dial === column.validation?.defaultCountry)?.emoji}</span>
                                                )}
                                                <span className="font-medium">{column.validation?.defaultCountry}</span>
                                                <span className="text-muted-foreground truncate">
                                                    ({countries.find(c => c.dial === column.validation?.defaultCountry)?.label})
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">Select default prefix...</span>
                                        )}
                                    </div>
                                    {isLoadingCountries ? <Loader2 className="h-4 w-4 animate-spin shrink-0 opacity-50" /> : <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Search country or code..."
                                        value={countrySearch}
                                        onValueChange={setCountrySearch}
                                    />
                                    <CommandList className="max-h-[300px]">
                                        {countries.filter(c =>
                                            c.label.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                            c.dial.includes(countrySearch)
                                        ).length === 0 ? (
                                            <CommandEmpty>No country found.</CommandEmpty>
                                        ) : (
                                            <CommandGroup>
                                                {countries.filter(c =>
                                                    c.label.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                                    c.dial.includes(countrySearch)
                                                ).map((country) => (
                                                    <CommandItem
                                                        key={`${country.code}-${country.dial}`}
                                                        onSelect={() => {
                                                            handleUpdate({
                                                                validation: { ...column.validation, defaultCountry: country.dial }
                                                            })
                                                            setIsCountryPickerOpen(false)
                                                            setCountrySearch("")
                                                        }}
                                                        className="flex items-center justify-between cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {country.flag ? (
                                                                <img
                                                                    src={country.flag}
                                                                    alt=""
                                                                    className="w-5 h-3.5 object-cover rounded-sm shrink-0"
                                                                />
                                                            ) : (
                                                                <span className="text-xl">{country.emoji}</span>
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{country.label}</span>
                                                                <span className="text-xs text-muted-foreground">{country.dial}</span>
                                                            </div>
                                                        </div>
                                                        <Check
                                                            className={cn(
                                                                "h-4 w-4",
                                                                column.validation?.defaultCountry === country.dial ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">Sets the default dial code for new phone entries</p>
                    </div>
                )}

                {column.type === "select" && (
                    <div className="flex items-center justify-between border-t pt-4">
                        <div className="space-y-0.5">
                            <Label>Multiple Selection</Label>
                            <p className="text-xs text-muted-foreground">Allow selecting more than one option</p>
                        </div>
                        <Switch
                            checked={column.validation?.multiple || false}
                            onCheckedChange={(checked) => handleUpdate({
                                validation: { ...column.validation, multiple: checked }
                            })}
                            disabled={readOnly}
                        />
                    </div>
                )}

                {column.type === "file" && (
                    <div className="space-y-3 border-t pt-4">
                        <Label>Allowed File Types</Label>
                        <Select
                            value={column.validation?.fileType || "both"}
                            onValueChange={(value) => handleUpdate({
                                validation: { ...column.validation, fileType: value }
                            })}
                            disabled={readOnly}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="images">Images Only</SelectItem>
                                <SelectItem value="pdf">PDF Only</SelectItem>
                                <SelectItem value="both">Images & PDF</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {column.type === "location" && (
                    <div className="space-y-4 border-t pt-4">
                        <Label className="text-sm font-semibold">Location Configuration</Label>

                        <div className="space-y-3">
                            <Label className="text-xs">Default Entry Level</Label>
                            <Select
                                value={column.validation?.defaultLevel || "country"}
                                onValueChange={(value) => handleUpdate({
                                    validation: { ...column.validation, defaultLevel: value }
                                })}
                                disabled={readOnly}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="country">Country</SelectItem>
                                    <SelectItem value="state">State</SelectItem>
                                    <SelectItem value="city">City</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Label className="text-xs">Allowed Countries</Label>
                            <div className="flex flex-wrap gap-2">
                                {(column.validation?.allowedCountries || []).map(countryName => (
                                    <Badge key={countryName} variant="secondary" className="gap-1 px-2 py-0.5">
                                        <span className="pointer-events-none">{countryName}</span>
                                        <button
                                            type="button"
                                            className="ml-0.5 inline-flex items-center justify-center pointer-events-auto"
                                            onClick={(e) => {
                                                if (readOnly) return
                                                e.preventDefault()
                                                e.stopPropagation()
                                                const newList = column.validation.allowedCountries.filter(c => c !== countryName)
                                                handleUpdate({
                                                    validation: { ...column.validation, allowedCountries: newList }
                                                })
                                            }}
                                        >
                                            <X className="h-3 w-3 cursor-pointer hover:text-destructive" />
                                        </button>
                                    </Badge>
                                ))}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={readOnly}>
                                            <Plus className="h-3 w-3" /> Add Country
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[250px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search country..." />
                                            <CommandList
                                                className="max-h-[300px] overflow-y-auto"
                                                onWheel={(e) => e.stopPropagation()}
                                            >
                                                <CommandEmpty>No country found.</CommandEmpty>
                                                <CommandGroup>
                                                    {allCountries
                                                        .filter(c => !(column.validation?.allowedCountries || []).includes(c.name))
                                                        .map((country, idx) => (
                                                            <CommandItem
                                                                key={`${country.name}-${idx}`}
                                                                onSelect={() => {
                                                                    const current = column.validation?.allowedCountries || []
                                                                    handleUpdate({
                                                                        validation: { ...column.validation, allowedCountries: [...current, country.name] }
                                                                    })
                                                                }}
                                                            >
                                                                {country.name}
                                                            </CommandItem>
                                                        ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {(column.validation?.allowedCountries || []).length > 0 && (
                            <div className="space-y-4 pt-2">
                                <Label className="text-xs font-medium text-muted-foreground uppercase">Allowed States & Cities</Label>
                                {column.validation.allowedCountries.map(countryName => {
                                    const allowedStates = column.validation?.allowedStates?.[countryName] || []
                                    return (
                                        <div key={countryName} className="space-y-3 p-3 bg-muted/30 rounded-lg border border-dashed">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-bold">{countryName}</Label>
                                                <Popover onOpenChange={(open) => open && loadStatesForCountry(countryName)}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" disabled={readOnly}>
                                                            <Plus className="h-3 w-3" /> Select States
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[250px] p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Search states..." />
                                                            <CommandList
                                                                className="max-h-[300px] overflow-y-auto"
                                                                onWheel={(e) => e.stopPropagation()}
                                                            >
                                                                {loadingStates[countryName] ? (
                                                                    <div className="p-4 text-center text-xs text-muted-foreground">Loading states...</div>
                                                                ) : (
                                                                    <>
                                                                        <CommandEmpty>No states found.</CommandEmpty>
                                                                        <CommandGroup>
                                                                            {(statesPerCountry[countryName] || [])
                                                                                .filter(s => !allowedStates.includes(s.name))
                                                                                .map((state, idx) => (
                                                                                    <CommandItem
                                                                                        key={`${state.name}-${idx}`}
                                                                                        onSelect={() => {
                                                                                            handleUpdate({
                                                                                                validation: {
                                                                                                    ...(column.validation || {}),
                                                                                                    allowedStates: {
                                                                                                        ...(column.validation?.allowedStates || {}),
                                                                                                        [countryName]: [...allowedStates, state.name]
                                                                                                    }
                                                                                                }
                                                                                            })
                                                                                        }}
                                                                                    >
                                                                                        {state.name}
                                                                                    </CommandItem>
                                                                                ))}
                                                                        </CommandGroup>
                                                                    </>
                                                                )}
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            {allowedStates.length > 0 && (
                                                <div className="space-y-4 mt-2">
                                                    {allowedStates.map(stateName => (
                                                        <div key={stateName} className="space-y-2 pl-2 border-l-2 border-primary/20">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-medium">{stateName}</span>
                                                                    <X
                                                                        className="h-2.5 w-2.5 cursor-pointer text-muted-foreground hover:text-destructive"
                                                                        onClick={() => {
                                                                            const newList = allowedStates.filter(s => s !== stateName)
                                                                            handleUpdate({
                                                                                validation: {
                                                                                    ...(column.validation || {}),
                                                                                    allowedStates: {
                                                                                        ...(column.validation?.allowedStates || {}),
                                                                                        [countryName]: newList
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <Popover onOpenChange={(open) => open && loadCitiesForState(countryName, stateName)}>
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1 px-1.5 opacity-70 hover:opacity-100" disabled={readOnly}>
                                                                            <Plus className="h-2 w-2" /> Add Cities
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-[300px] p-0" align="end">
                                                                        <div className="p-2 border-b bg-muted/20">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quick Add City</span>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-5 text-[9px]"
                                                                                    onClick={() => setShowManualCityInput(prev => ({ ...prev, [stateName]: !prev[stateName] }))}
                                                                                >
                                                                                    {showManualCityInput[stateName] ? "Search List" : "Direct Input"}
                                                                                </Button>
                                                                            </div>
                                                                            {showManualCityInput[stateName] && (
                                                                                <div className="flex gap-1">
                                                                                    <Input
                                                                                        size="sm"
                                                                                        className="h-7 text-xs"
                                                                                        placeholder="City name..."
                                                                                        value={manualCityInput[stateName] || ""}
                                                                                        onChange={e => setManualCityInput(prev => ({ ...prev, [stateName]: e.target.value }))}
                                                                                        onKeyDown={e => e.key === "Enter" && addManualCity(stateName)}
                                                                                    />
                                                                                    <Button size="sm" className="h-7 w-7 p-0" onClick={() => addManualCity(stateName)}>
                                                                                        <Check className="h-3 w-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {!showManualCityInput[stateName] && (
                                                                            <Command>
                                                                                <CommandInput placeholder="Search cities..." />
                                                                                <CommandList
                                                                                    className="max-h-[300px] overflow-y-auto"
                                                                                    onWheel={(e) => e.stopPropagation()}
                                                                                >
                                                                                    {loadingCities[`${countryName}-${stateName}`] ? (
                                                                                        <div className="p-4 text-center text-xs text-muted-foreground">Loading cities...</div>
                                                                                    ) : (
                                                                                        <>
                                                                                            <CommandEmpty>No cities found.</CommandEmpty>
                                                                                            <CommandGroup>
                                                                                                {(citiesPerState[`${countryName}-${stateName}`] || [])
                                                                                                    .filter(c => !(column.validation?.allowedCities?.[stateName] || []).includes(c.name))
                                                                                                    .map((city, idx) => (
                                                                                                        <CommandItem
                                                                                                            key={`${city.name}-${idx}`}
                                                                                                            onSelect={() => {
                                                                                                                const currentCities = column.validation?.allowedCities?.[stateName] || []
                                                                                                                handleUpdate({
                                                                                                                    validation: {
                                                                                                                        ...(column.validation || {}),
                                                                                                                        allowedCities: {
                                                                                                                            ...(column.validation?.allowedCities || {}),
                                                                                                                            [stateName]: [...currentCities, city.name]
                                                                                                                        }
                                                                                                                    }
                                                                                                                })
                                                                                                            }}
                                                                                                        >
                                                                                                            {city.name}
                                                                                                        </CommandItem>
                                                                                                    ))}
                                                                                            </CommandGroup>
                                                                                        </>
                                                                                    )}
                                                                                </CommandList>
                                                                            </Command>
                                                                        )}
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>

                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(column.validation?.allowedCities?.[stateName] || []).map(cityName => (
                                                                    <Badge key={cityName} variant="outline" className="text-[9px] px-1.5 py-0 gap-1 bg-background hover:bg-muted/50">
                                                                        {cityName}
                                                                        <X
                                                                            className="h-2 w-2 cursor-pointer hover:text-destructive"
                                                                            onClick={() => {
                                                                                if (readOnly) return
                                                                                const currentCities = column.validation?.allowedCities?.[stateName] || []
                                                                                const newList = currentCities.filter(c => c !== cityName)
                                                                                handleUpdate({
                                                                                    validation: {
                                                                                        ...(column.validation || {}),
                                                                                        allowedCities: {
                                                                                            ...(column.validation?.allowedCities || {}),
                                                                                            [stateName]: newList
                                                                                        }
                                                                                    }
                                                                                })
                                                                            }}
                                                                        />
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {column.type === "number" && (
                    <div className="space-y-3 border-t pt-4">
                        <Label className="text-sm font-semibold">Number Range</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Minimum Value</Label>
                                <Input
                                    type="number"
                                    value={column.validation?.min ?? ""}
                                    onChange={(e) => handleUpdate({
                                        validation: {
                                            ...column.validation,
                                            min: e.target.value ? Number(e.target.value) : undefined
                                        }
                                    })}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    placeholder="No minimum"
                                    className="h-9"
                                    disabled={readOnly}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Maximum Value</Label>
                                <Input
                                    type="number"
                                    value={column.validation?.max ?? ""}
                                    onChange={(e) => handleUpdate({
                                        validation: {
                                            ...column.validation,
                                            max: e.target.value ? Number(e.target.value) : undefined
                                        }
                                    })}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    placeholder="No maximum"
                                    className="h-9"
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                        {(column.validation?.min !== undefined || column.validation?.max !== undefined) && (
                            <p className="text-xs text-muted-foreground">
                                {column.validation?.min !== undefined && column.validation?.max !== undefined
                                    ? `Accepted range: ${column.validation.min} to ${column.validation.max}`
                                    : column.validation?.min !== undefined
                                        ? `Minimum value: ${column.validation.min}`
                                        : `Maximum value: ${column.validation.max}`
                                }
                            </p>
                        )}
                    </div>
                )}

                {["dropdown", "select", "radio", "checkbox", "status"].includes(column.type) && (
                    <div className="space-y-4 border-t pt-4">
                        <Label className="flex items-center gap-2">
                            Options
                            <Badge variant="secondary" className="font-normal">{column.options?.length || 0}</Badge>
                        </Label>

                        <div className="space-y-3">
                            {(column.options || []).map((option, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex gap-2">
                                        <Input
                                            value={typeof option === 'string' ? option : option.value}
                                            onChange={(e) => {
                                                const newOptions = [...(column.options || [])]
                                                if (typeof option === 'string') {
                                                    newOptions[idx] = e.target.value
                                                } else {
                                                    newOptions[idx] = { ...option, value: e.target.value }
                                                }
                                                handleUpdate({ options: newOptions })
                                            }}
                                            placeholder={`Option ${idx + 1}`}
                                            disabled={readOnly}
                                        />
                                        {!readOnly && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    const newOptions = column.options.filter((_, i) => i !== idx)
                                                    const newNestedFields = { ...column.nestedFields }
                                                    delete newNestedFields[idx]
                                                    handleUpdate({ options: newOptions, nestedFields: newNestedFields })
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="pl-6 border-l-2 border-muted">
                                        {!readOnly && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-[11px] gap-1 opacity-70 hover:opacity-100"
                                                onClick={() => addNestedField([idx], idx)}
                                            >
                                                <Plus className="h-3 w-3" /> Add Conditional Field
                                            </Button>
                                        )}

                                        {column.nestedFields && column.nestedFields[idx] && (
                                            <div className="space-y-3 mt-3">
                                                {column.nestedFields[idx].map((nestedCol, nIdx) => (
                                                    <NestedColumnConfig
                                                        key={nestedCol.id || nIdx}
                                                        nestedColumn={nestedCol}
                                                        path={[idx, nIdx]}
                                                        onUpdate={updateNestedField}
                                                        onRemove={removeNestedField}
                                                        onAddNested={addNestedField}
                                                        columnTypes={columnTypes}
                                                        readOnly={readOnly}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {!readOnly && (
                                <Button
                                    variant="outline"
                                    className="w-full border-dashed"
                                    onClick={() => {
                                        const newOptions = [...(column.options || []), `Option ${(column.options?.length || 0) + 1}`]
                                        handleUpdate({ options: newOptions })
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Add New Option
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
