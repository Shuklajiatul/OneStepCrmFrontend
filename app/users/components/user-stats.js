import { Users, UserCheck, UserX, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function UserStats({ users = [], roles = [] }) {
    const totalUsers = users.length
    const activeUsers = users.filter(u => u.is_active).length
    const inactiveUsers = totalUsers - activeUsers
    const totalRoles = roles.length

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                        Registered users in the system
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <UserCheck className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeUsers}</div>
                    <p className="text-xs text-muted-foreground">
                        Currently active accounts
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
                    <UserX className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{inactiveUsers}</div>
                    <p className="text-xs text-muted-foreground">
                        Deactivated or pending accounts
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                    <Shield className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalRoles}</div>
                    <p className="text-xs text-muted-foreground">
                        Available roles for assignment
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
