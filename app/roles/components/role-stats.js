import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function RoleStats({ roles, loading }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Skeleton className="h-8 w-16" />
                    ) : (
                        <div className="text-2xl font-bold">{roles.length}</div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Active roles in the system
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
