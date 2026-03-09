import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto animate-pulse">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24 rounded-md" />
                    <Skeleton className="h-10 w-32 rounded-md" />
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 pt-4">
                {[...Array(6)].map((_, i) => (
                    <Card key={i} className="border-none shadow-none bg-muted/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-3 w-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
                <div className="col-span-4 space-y-4">
                    {/* Main Chart */}
                    <Card className="col-span-4 shadow-sm h-[400px]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                            <Skeleton className="h-8 w-24 rounded-md" />
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Skeleton className="h-[250px] w-full" />
                        </CardContent>
                    </Card>

                    {/* Leads Table */}
                    <Card className="col-span-4 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                            <Skeleton className="h-8 w-24" />
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-4 space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-3 w-48" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="h-6 w-20 rounded-full" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Sidebar */}
                <div className="col-span-3 space-y-4">
                    {/* Pipeline Chart */}
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-40" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </CardHeader>
                        <CardContent className="pt-6 flex flex-col items-center justify-center">
                            <Skeleton className="h-[200px] w-[200px] rounded-full mb-6" />
                            <div className="w-full space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-12" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-8 w-24" />
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-4 space-y-6">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex gap-4">
                                        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                                        <div className="space-y-2 flex-1 relative top-1">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Access */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-4">
                            <Skeleton className="h-5 w-32" />
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-muted/10 space-y-2">
                                    <Skeleton className="h-6 w-6 rounded-md" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
