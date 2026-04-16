import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { getStatusBadge } from "@/lib/utils";

// Render Cards View
export default function GeneCardView({
   loading,
   paginatedGenes,
   pageSize,
   openViewModal,
   openEditModal,
   handleDeleteGene
}) {

   return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
         {loading ? (
            Array.from({ length: pageSize }).map((_, i) => (
               <Card key={i} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                     <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                           <Skeleton className="h-6 w-3/4 mb-2" />
                           <Skeleton className="h-4 w-1/2" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                     </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Organizations</span>
                        <Skeleton className="h-4 w-8" />
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Levels</span>
                        <Skeleton className="h-4 w-8" />
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Users</span>
                        <Skeleton className="h-4 w-8" />
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Updated</span>
                        <Skeleton className="h-4 w-20" />
                     </div>
                     <Separator />
                     <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                     </div>
                  </CardContent>
               </Card>
            ))
         ) : paginatedGenes.map((gene) => {
            const geneName = gene.g_name || gene.name || 'Unnamed Gene';
            return (
               <Card key={gene.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                     <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                           <Link
                              href={`/geneManagement/geanUser/${gene.g_id || gene.id}`}
                              className="font-medium text-primary hover:underline"
                           >
                              <CardTitle className="text-base truncate">{geneName}</CardTitle>
                           </Link>
                           <CardDescription className="text-xs truncate">{gene.type}</CardDescription>
                        </div>
                        {getStatusBadge(gene.is_active)}
                     </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Organizations</span>
                        <span className="font-semibold">{gene.totalMembers}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Levels</span>
                        <span className="font-semibold">{gene.hierarchyLevels}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Users</span>
                        <span className="font-semibold">{gene.users}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Updated</span>
                        <span className="font-semibold text-xs">{gene.lastUpdated}</span>
                     </div>
                     <Separator />
                     <div className="flex items-center justify-between">
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => openViewModal(gene)}
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
                                 size="sm"
                                 onClick={() => openEditModal(gene)}
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
                                 size="sm"
                                 onClick={() => handleDeleteGene(gene.g_id || gene.id)}
                              >
                                 <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                     </div>
                  </CardContent>
               </Card>
            );
         })}
      </div>
   )
}