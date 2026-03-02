"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronDown, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fetchCountries, fetchStates, fetchCities } from "@/lib/constants/location-api"

export function LocationPicker({ value, onChange, validation = {} }) {
    const [countries, setCountries] = useState([])
    const [states, setStates] = useState([])
    const [cities, setCities] = useState([])
    const [loadingStates, setLoadingStates] = useState(false)
    const [loadingCities, setLoadingCities] = useState(false)
    const [open, setOpen] = useState({ country: false, state: false, city: false })
    const [search, setSearch] = useState({ country: "", state: "", city: "" })

    const current = value || { country: undefined, state: undefined, city: undefined }

    useEffect(() => {
        const loadCountries = async () => {
            const data = await fetchCountries()
            setCountries(data)
        }
        loadCountries()
    }, [])

    useEffect(() => {
        const loadStates = async () => {
            if (current.country) {
                setLoadingStates(true)
                try {
                    const data = await fetchStates(current.country)
                    setStates(data)
                } finally {
                    setLoadingStates(false)
                }
            } else {
                setStates([])
            }
        }
        loadStates()
    }, [current.country])

    useEffect(() => {
        const loadCities = async () => {
            if (current.state && current.country) {
                setLoadingCities(true)
                try {
                    const data = await fetchCities(current.country, current.state)
                    setCities(data)
                } finally {
                    setLoadingCities(false)
                }
            } else {
                setCities([])
            }
        }
        loadCities()
    }, [current.state, current.country])

    const filteredCountries = countries.filter(c => {
        if (validation.allowedCountries?.length > 0 && !validation.allowedCountries.includes(c.name)) return false
        return c.name.toLowerCase().includes(search.country.toLowerCase())
    })

    const filteredStates = states.filter(s => {
        if (validation.allowedStates?.[current.country]?.length > 0 && !validation.allowedStates[current.country].includes(s.name)) return false
        return s.name.toLowerCase().includes(search.state.toLowerCase())
    })

    const filteredCities = cities.filter(c => {
        if (validation.allowedCities?.[current.state]?.length > 0 && !validation.allowedCities[current.state].includes(c.name)) return false
        return c.name.toLowerCase().includes(search.city.toLowerCase())
    })

    return (
        <div className="grid gap-4 sm:grid-cols-3">
            {/* Country Select */}
            <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Country</Label>
                <SelectPopover
                    title="Country"
                    open={open.country}
                    setOpen={(o) => setOpen(prev => ({ ...prev, country: o }))}
                    value={current.country}
                    onSelect={(val) => {
                        onChange({ country: val, state: undefined, city: undefined })
                        setOpen(prev => ({ ...prev, country: false, state: true }))
                    }}
                    options={filteredCountries}
                    search={search.country}
                    setSearch={(s) => setSearch(prev => ({ ...prev, country: s }))}
                />
            </div>

            {/* State Select */}
            <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">State</Label>
                <SelectPopover
                    title="State"
                    disabled={!current.country}
                    loading={loadingStates}
                    open={open.state}
                    setOpen={(o) => setOpen(prev => ({ ...prev, state: o }))}
                    value={current.state}
                    onSelect={(val) => {
                        onChange({ ...current, state: val, city: undefined })
                        setOpen(prev => ({ ...prev, state: false, city: true }))
                    }}
                    options={filteredStates}
                    search={search.state}
                    setSearch={(s) => setSearch(prev => ({ ...prev, state: s }))}
                />
            </div>

            {/* City Select */}
            <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">City</Label>
                <SelectPopover
                    title="City"
                    disabled={!current.state}
                    loading={loadingCities}
                    open={open.city}
                    setOpen={(o) => setOpen(prev => ({ ...prev, city: o }))}
                    value={current.city}
                    onSelect={(val) => {
                        onChange({ ...current, city: val })
                        setOpen(prev => ({ ...prev, city: false }))
                    }}
                    options={filteredCities}
                    search={search.city}
                    setSearch={(s) => setSearch(prev => ({ ...prev, city: s }))}
                />
            </div>
        </div>
    )
}

function SelectPopover({ title, open, setOpen, value, onSelect, options, search, setSearch, disabled, loading }) {
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    className="w-full justify-between h-9 text-xs font-normal bg-background"
                >
                    <span className="truncate">{value || `Select ${title}...`}</span>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin opacity-50" /> : <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                {open && (
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder={`Search ${title.toLowerCase()}...`}
                            value={search}
                            onValueChange={setSearch}
                            className="h-8"
                            autoFocus
                        />
                        <CommandList
                            className="max-h-[250px] overflow-y-auto"
                            onWheel={(e) => e.stopPropagation()}
                        >
                            {options.length === 0 ? (
                                <CommandEmpty>No {title.toLowerCase()} found.</CommandEmpty>
                            ) : (
                                <CommandGroup>
                                    {options.map((opt, i) => (
                                        <CommandItem
                                            key={`${opt.name}-${i}`}
                                            onSelect={() => onSelect(opt.name)}
                                            className="flex items-center justify-between cursor-pointer py-1.5 text-xs"
                                        >
                                            <span className="truncate">{opt.name}</span>
                                            <Check
                                                className={cn(
                                                    "h-3.5 w-3.5",
                                                    value === opt.name ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                )}
            </PopoverContent>
        </Popover>
    )
}
