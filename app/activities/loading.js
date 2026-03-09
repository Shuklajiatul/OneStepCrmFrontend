import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default function ActivitiesLoading() {
    return (
        <div className="p-0 md:p-0 space-y-6 max-w-[1600px] mx-auto animate-pulse">
            {/* Breadcrumb Area */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
            </div>

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                {/* <Skeleton className="h-10 w-32" /> */}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-none bg-muted/20 rounded-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-12" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card className="rounded-xl">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Skeleton className="h-10 w-full md:w-72" />
                        </div>
                        <Skeleton className="h-10 w-full md:w-[180px]" />
                        <Skeleton className="h-10 w-full md:w-[180px]" />
                        <Skeleton className="h-10 w-full md:w-[180px]" />
                    </div>
                </CardContent>
            </Card>

            {/* Table Area */}
            <Card className="rounded-xl shadow-sm overflow-hidden">
                <CardHeader className="border-b flex flex-row items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="pl-6"><Skeleton className="h-4 w-24" /></TableHead>
                                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                                    <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                                    <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                                    <TableHead className="text-right pr-6"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="h-8 w-8 rounded-lg" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-40" />
                                                    <Skeleton className="h-3 w-32" />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-6 w-6 rounded-full" />
                                                <Skeleton className="h-4 w-24" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-4 w-4" />
                                                <Skeleton className="h-4 w-24" />
                                            </div>
                                        </TableCell>
                                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                        <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
