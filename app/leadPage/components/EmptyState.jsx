import { Button } from "@/components/ui/button"
import { FolderOpen, Plus, X } from "lucide-react"

export default function EmptyState({ searchTerm, onClear, onCreate }) {
   return (
      <div className="relative flex flex-col items-center justify-center py-16 text-center overflow-hidden rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm border border-border/50 animate-in fade-in zoom-in-95 duration-300">
         <div className="absolute inset-0 opacity-30">
            <div className="absolute top-10 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
         </div>

         <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-5 shadow-sm">
               <FolderOpen className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
               {searchTerm ? "No results found" : "No tables yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
               {searchTerm
                  ? `No tables match "${searchTerm}". Try adjusting your search or filters.`
                  : "Get started by creating your first data table to organize and manage your leads effectively."}
            </p>
            {searchTerm ? (
               <Button variant="outline" size="default" onClick={onClear} className="gap-2">
                  <X className="h-4 w-4" /> Clear search
               </Button>
            ) : (
               <Button size="default" onClick={onCreate} className="gap-2 shadow-sm hover:shadow transition-all">
                  <Plus className="h-4 w-4" /> Create your first table
               </Button>
            )}
         </div>
      </div>
   )
}