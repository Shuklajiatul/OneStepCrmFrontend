import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function CustomTableBuilderLoading() {
    return (
        <div className="space-y-6">
            <div className="animate-pulse">
                {/* Breadcrumb Skeleton */}
                <div className="flex items-center gap-2 mb-6">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                </div>

                {/* Premium Header Skeleton */}
                <div className="relative overflow-hidden rounded-2xl p-4 border mb-6">
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-12 w-12 rounded-xl" />
                                <div>
                                    <Skeleton className="h-8 w-48 mb-2" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-5 w-24 rounded-full" />
                                        <Skeleton className="h-4 w-64" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Skeleton className="h-11 w-28 rounded-md" />
                            <Skeleton className="h-11 w-36 rounded-md" />
                        </div>
                    </div>
                </div>

                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <div className="flex gap-2 items-baseline">
                                        <Skeleton className="h-8 w-12" />
                                        <Skeleton className="h-4 w-16 px-2 rounded-full" />
                                    </div>
                                    <div className="flex gap-2 items-center mt-2">
                                        <Skeleton className="h-3 w-3" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Controls Bar */}
                <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between p-6 rounded-2xl border mb-10 bg-card">
                    <div className="flex gap-4 w-full xl:w-autov items-center">
                        <Skeleton className="h-10 w-80 rounded-md" />
                        <Skeleton className="h-10 w-48 rounded-md" />
                    </div>
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-44 rounded-md" />
                        <div className="h-6 w-px bg-border hidden sm:block mx-2"></div>
                        <Skeleton className="h-10 w-24 rounded-xl" />
                    </div>
                </div>

                {/* List Skeleton */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-7 w-32" />
                        <div className="h-6 w-px bg-border"></div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Card key={i} className="h-[260px] flex flex-col border-none shadow-sm">
                                <CardHeader className="pb-3 pt-5 px-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-3 flex-1 items-center">
                                            <Skeleton className="h-9 w-9 rounded-lg" />
                                            <Skeleton className="h-5 w-3/4" />
                                        </div>
                                        <Skeleton className="h-7 w-7 rounded-sm" />
                                    </div>
                                </CardHeader>
                                <CardContent className="px-5 pb-5 flex-1 flex flex-col justify-between">
                                    <Skeleton className="h-[60px] w-full rounded-md mb-3" />
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <Skeleton className="h-5 w-16 rounded-full" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                        <Skeleton className="h-9 w-full rounded-md" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}
