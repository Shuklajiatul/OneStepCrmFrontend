import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

export function RoleFilters({
    searchTerm,
    setSearchTerm,
    onClearFilters
}) {
    return (
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or priority..."
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
                <Button
                    variant="outline"
                    onClick={onClearFilters}
                    className="whitespace-nowrap"
                >
                    Clear Filters
                </Button>
            )}
        </div>
    )
}
