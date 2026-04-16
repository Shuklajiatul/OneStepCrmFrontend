import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LeadPageSkeleton({ displayMode = "card" }) {
    return (
        <div className="space-y-10 w-full animate-pulse">
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-40" />
                    <div className="h-6 w-px bg-border"></div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                {displayMode === "card" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Card key={i} className="flex flex-col border-none shadow-sm">
                                <CardHeader className="pb-4 pt-6 px-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <Skeleton className="h-10 w-10 rounded-xl" />
                                            <div className="min-w-0 flex-1">
                                                <Skeleton className="h-6 w-3/4" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0 flex-1 flex flex-col justify-between px-6 pb-6">
                                    <div className="bg-muted/30 rounded-xl p-4 mb-4 min-h-[72px]">
                                        <Skeleton className="h-4 w-full mb-2" />
                                        <Skeleton className="h-4 w-2/3" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Skeleton className="h-5 w-20" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                        <Skeleton className="h-9 w-full rounded-xl" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="overflow-hidden border-none shadow-xl rounded-2xl bg-card">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table className="w-full">
                                    <TableHeader className="bg-muted/40">
                                        <TableRow className="hover:bg-transparent border-b">
                                            <TableHead className="py-4 px-6 font-extrabold text-foreground uppercase tracking-widest text-[10px]">Table Name</TableHead>
                                            <TableHead className="py-4 px-6 font-extrabold text-foreground uppercase tracking-widest text-[10px]">Description</TableHead>
                                            <TableHead className="py-4 px-6 font-extrabold text-foreground uppercase tracking-widest text-[10px]">Status</TableHead>
                                            <TableHead className="py-4 px-6 font-extrabold text-foreground uppercase tracking-widest text-[10px]">Created At</TableHead>
                                            <TableHead className="py-4 px-6 font-extrabold text-foreground uppercase tracking-widest text-[10px] text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <TableRow key={i}>
                                                <TableCell className="py-4 px-6">
                                                    <div className="flex items-center gap-4">
                                                        <Skeleton className="h-10 w-10 rounded-xl" />
                                                        <div className="space-y-2">
                                                            <Skeleton className="h-4 w-32" />
                                                            <Skeleton className="h-3 w-24" />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 px-6"><Skeleton className="h-4 w-full" /></TableCell>
                                                <TableCell className="py-4 px-6"><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                                <TableCell className="py-4 px-6"><Skeleton className="h-4 w-28" /></TableCell>
                                                <TableCell className="py-4 px-6 text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
