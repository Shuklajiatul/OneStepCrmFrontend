import { Table, TableHead, TableRow, TableBody, TableCell, TableHeader } from "@/components/ui/table";
import { ArrowUpDown, ChevronUp, ChevronDown, Eye, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";

const SortIcon = ({ config, sortKey }) => {
    if (!config || config.key !== sortKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
    if (config.direction === 'asc') return <ChevronUp className="ml-2 h-4 w-4 text-primary" />;
    if (config.direction === 'desc') return <ChevronDown className="ml-2 h-4 w-4 text-primary" />;
    return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
};

// Render Table View
export default function GeneTableView({
    loading,
    paginatedGenes,
    pageSize,
    sortConfig,
    handleSort,
    handleToggleStatus,
    openViewModal,
    openEditModal,
    handleDeleteGene
}) {
    return (
        <div className="rounded-md border overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
                <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                    <Table className="w-full table-auto">
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('g_name')}>
                                    <div className="flex items-center">
                                        Gene Name
                                        <SortIcon config={sortConfig} sortKey="g_name" />
                                    </div>
                                </TableHead>
                                <TableHead className="hidden lg:table-cell font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('createdBy')}>
                                    <div className="flex items-center">
                                        Created By
                                        <SortIcon config={sortConfig} sortKey="createdBy" />
                                    </div>
                                </TableHead>
                                <TableHead className="hidden sm:table-cell font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('is_active')}>
                                    <div className="flex items-center">
                                        Status
                                        <SortIcon config={sortConfig} sortKey="is_active" />
                                    </div>
                                </TableHead>
                                <TableHead className="hidden md:table-cell text-center font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('hierarchyLevels')}>
                                    <div className="flex items-center justify-center">
                                        Levels
                                        <SortIcon config={sortConfig} sortKey="hierarchyLevels" />
                                    </div>
                                </TableHead>
                                {/* <TableHead className="hidden md:table-cell text-center font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('users')}>
                  <div className="flex items-center justify-center">
                    Users
                    <SortIcon config={sortConfig} sortKey="users" />
                  </div>
                </TableHead> */}
                                {/* <TableHead className="text-center font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('totalMembers')}>
                  <div className="flex items-center justify-center">
                    Organizations
                    <SortIcon config={sortConfig} sortKey="totalMembers" />
                  </div>
                </TableHead> */}
                                <TableHead className="hidden xl:table-cell whitespace-nowrap font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort('lastUpdated')}>
                                    <div className="flex items-center">
                                        Last Updated
                                        <SortIcon config={sortConfig} sortKey="lastUpdated" />
                                    </div>
                                </TableHead>
                                <TableHead className="w-[120px] whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: pageSize }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="py-4"><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                                        <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : paginatedGenes.map((gene, index) => {
                                const geneName = gene.g_name || gene.name || 'Unnamed Gene';
                                return (
                                    <TableRow
                                        key={gene.id}
                                        className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                                    >
                                        <TableCell className="py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="min-w-0">
                                                    <Link
                                                        href={`/geneManagement/geanUser/${gene.g_id || gene.id}`}
                                                        className="font-medium text-primary hover:underline truncate text-sm md:text-base transition-colors"
                                                    >
                                                        {geneName}
                                                    </Link>
                                                    <div className="text-xs text-muted-foreground truncate lg:hidden mt-0.5">
                                                        By {gene.createdBy}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell truncate py-4">
                                            <span className="text-sm text-foreground">{gene.createdBy}</span>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell py-4">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={gene.is_active}
                                                    onCheckedChange={() => handleToggleStatus(gene.g_id || gene.id, gene.is_active)}
                                                />
                                                <span className={`text-sm ${gene.is_active ? 'text-muted-foreground' : 'text-red-500 font-medium'}`}>
                                                    {gene.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-center py-4">
                                            <span className="font-medium text-foreground">{gene.hierarchyLevels}</span>
                                        </TableCell>
                                        {/* <TableCell className="hidden md:table-cell text-center py-4">
                      <span className="font-medium text-foreground">{gene.users}</span>
                    </TableCell> */}
                                        {/* <TableCell className="text-center py-4">
                      <span className="font-medium text-foreground">{gene.totalMembers}</span>
                    </TableCell> */}
                                        <TableCell className="hidden xl:table-cell whitespace-nowrap py-4">
                                            <span className="text-sm text-muted-foreground">{gene.lastUpdated}</span>
                                        </TableCell>
                                        <TableCell className="w-[120px] whitespace-nowrap text-right py-4">
                                            <div className="flex items-center justify-end space-x-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openViewModal(gene)}
                                                            className="h-8 w-8"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>View</TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditModal(gene)}
                                                            className="h-8 w-8"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit</TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteGene(gene.g_id || gene.id)}
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}