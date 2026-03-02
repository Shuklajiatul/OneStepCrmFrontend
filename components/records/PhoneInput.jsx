"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function PhoneInput({ value, onChange, countries }) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")

    const selectedCountry = countries?.find(c => c.dial === value?.countryCode)

    const filteredCountries = (countries || []).filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search)
    )

    return (
        <div className="flex gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[110px] justify-between h-10 px-3 shrink-0"
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            {selectedCountry ? (
                                <>
                                    {selectedCountry.flag ? (
                                        <img src={selectedCountry.flag} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
                                    ) : (
                                        <span className="text-lg shrink-0">{selectedCountry.emoji || "🏳️"}</span>
                                    )}
                                    <span className="font-medium truncate">{value?.countryCode || selectedCountry.dial}</span>
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-xs">{countries?.length === 0 ? "Loading..." : "Select"}</span>
                                </div>
                            )}
                        </div>
                        <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    {open && (
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Search country..."
                                value={search}
                                onValueChange={setSearch}
                                autoFocus
                            />
                            <CommandList
                                className="max-h-[250px] overflow-y-auto"
                                onWheel={(e) => e.stopPropagation()}
                            >
                                {filteredCountries.length === 0 ? (
                                    <CommandEmpty>No country found.</CommandEmpty>
                                ) : (
                                    <CommandGroup>
                                        {filteredCountries.map((country) => (
                                            <CommandItem
                                                key={`${country.code}-${country.dial}`}
                                                onSelect={() => {
                                                    onChange({ ...value, countryCode: country.dial })
                                                    setOpen(false)
                                                    setSearch("")
                                                }}
                                                className="flex items-center justify-between cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {country.flag ? (
                                                        <img
                                                            src={country.flag}
                                                            alt=""
                                                            className="w-5 h-3.5 object-cover rounded-sm shrink-0"
                                                            loading="lazy"
                                                            decoding="async"
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
                                                        value?.countryCode === country.dial ? "opacity-100" : "opacity-0"
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
            <Input
                className="flex-1 h-10"
                placeholder="Phone number"
                value={value?.number || ''}
                onChange={e => onChange({ ...value, number: e.target.value })}
            />
        </div>
    )
}
