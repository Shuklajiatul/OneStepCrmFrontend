import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function RecordDetailsSkeleton() {
    return (
        <div className="p-0 md:p-0 space-y-6 max-w-[1600px] mx-auto animate-pulse">
            {/* Header Area */}
            <div className="flex items-center gap-4 border-b pb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <Skeleton className="h-10 w-32 rounded-md" />
                </div>
            </div>

            {/* Content Display Area (Simulating Tabs + Split View) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Side: Details View */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[1, 2, 3, 4, 5, 6].map((field) => (
                                    <div key={field} className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Activity / History View */}
                <div className="space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader className="bg-muted/30 border-b pb-4 flex flex-row items-center justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {[1, 2, 3].map((activity) => (
                                    <div key={activity} className="p-4 flex gap-4 border-l-4 border-transparent hover:bg-muted/50">
                                        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                                        <div className="space-y-2 flex-1">
                                            <div className="flex justify-between">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                            <Skeleton className="h-8 w-full" />
                                            <div className="flex gap-2 pt-2">
                                                <Skeleton className="h-6 w-20 rounded-full" />
                                                <Skeleton className="h-6 w-24 rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
