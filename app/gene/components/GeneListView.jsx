import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { getStatusBadge } from "@/lib/utils";

// Render List View
export default function GeneListView({ loading, paginatedGenes, pageSize, openViewModal, openEditModal, handleDeleteGene }) {
   return (
      <div className="space-y-3 md:space-y-4">
         {loading ? (
            Array.from({ length: pageSize }).map((_, i) => (
               <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                           <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                           <div className="flex-1 min-w-0 space-y-2">
                              <Skeleton className="h-5 w-48" />
                              <Skeleton className="h-4 w-64" />
                           </div>
                        </div>
                        <div className="flex items-center space-x-6 text-sm flex-1 justify-end min-w-0">
                           <div className="text-center hidden sm:block space-y-2">
                              <Skeleton className="h-4 w-8 mx-auto" />
                              <Skeleton className="h-3 w-16 mx-auto" />
                           </div>
                           <div className="text-center hidden sm:block space-y-2">
                              <Skeleton className="h-4 w-8 mx-auto" />
                              <Skeleton className="h-3 w-16 mx-auto" />
                           </div>
                           <div className="hidden lg:block">
                              <Skeleton className="h-6 w-16 rounded-full" />
                           </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-6">
                           <Skeleton className="h-8 w-8 rounded-md" />
                           <Skeleton className="h-8 w-8 rounded-md" />
                           <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                     </div>
                     <div className="flex items-center justify-between mt-2 sm:hidden pt-2 border-t">
                        <div className="flex items-center space-x-4">
                           <Skeleton className="h-4 w-16" />
                           <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                     </div>
                  </CardContent>
               </Card>
            ))
         ) : paginatedGenes.map((gene) => {
            const geneName = gene.g_name || gene.name || 'Unnamed Gene';
            return (
               <Card key={gene.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                           <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-bold text-sm">G</span>
                           </div>
                           <div className="flex-1 min-w-0">
                              <Link
                                 href={`/geneManagement/geanUser/${gene.g_id || gene.id}`}
                                 className="font-medium text-primary hover:underline"
                              >
                                 <CardTitle className="text-base truncate">{geneName}</CardTitle>
                              </Link>
                              <CardDescription className="text-sm truncate">
                                 {gene.type} • {gene.hierarchyLevels} levels • Created by {gene.createdBy}
                              </CardDescription>
                           </div>
                        </div>

                        <div className="flex items-center space-x-6 text-sm flex-1 justify-end min-w-0">
                           <div className="text-center hidden sm:block">
                              <div className="font-semibold">{gene.totalMembers}</div>
                              <div className="text-muted-foreground text-xs">Organizations</div>
                           </div>
                           <div className="text-center hidden sm:block">
                              <div className="font-semibold">{gene.users}</div>
                              <div className="text-muted-foreground text-xs">Users</div>
                           </div>
                           <div className="hidden lg:block">
                              {getStatusBadge(gene.is_active)}
                           </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-6">
                           <Tooltip>
                              <TooltipTrigger asChild>
                                 <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openViewModal(gene)}
                                 >
                                    <Eye className="h-5 w-5" />
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
                                 >
                                    <Edit className="h-5 w-5" />
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
                                 >
                                    <Trash2 className="h-5 w-5 text-destructive" />
                                 </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                           </Tooltip>
                        </div>
                     </div>

                     {/* Mobile only stats */}
                     <div className="flex items-center justify-between mt-2 sm:hidden pt-2 border-t">
                        <div className="flex items-center space-x-4 text-sm">
                           <span className="text-muted-foreground">{gene.totalMembers} orgs</span>
                           <span className="text-muted-foreground">{gene.completion}% complete</span>
                        </div>
                        {getStatusBadge(gene.is_active)}
                     </div>
                  </CardContent>
               </Card>
            );
         })}
      </div>
   );
}