// import { useState } from "react"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Database, Eye, Edit, Trash2, MoreVertical, Calendar, ArrowUpRight } from "lucide-react"
// import { cn } from "@/lib/utils"
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import StatusBadge from "./StatusBadge"

// export default function TableCard({ table, onOpen, onDelete }) {
//    const [isHovered, setIsHovered] = useState(false)

//    const cardColors = table.is_active
//       ? {
//          bg: "bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20",
//          border: "border-slate-200/80 dark:border-slate-800/80",
//          hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
//          gradientBar: "bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500",
//          iconBg: "from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 text-blue-600 dark:text-blue-400",
//          hoverIconBg: "from-blue-500 to-blue-600",
//          buttonBg: "from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-950/30 hover:from-blue-500 hover:to-blue-600"
//       }
//       : {
//          bg: "bg-gradient-to-br from-white via-slate-50/30 to-slate-100/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800/30",
//          border: "border-slate-200/60 dark:border-slate-800/60",
//          hoverBorder: "hover:border-slate-400 dark:hover:border-slate-600",
//          gradientBar: "bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400",
//          iconBg: "from-slate-100 to-slate-200 dark:from-slate-800/50 dark:to-slate-700/50 text-slate-600 dark:text-slate-400",
//          hoverIconBg: "from-slate-500 to-slate-600",
//          buttonBg: "from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30 hover:from-slate-500 hover:to-slate-600"
//       }

//    return (
//       <Card
//          className={cn(
//             "group flex flex-col border transition-all duration-500 cursor-pointer overflow-hidden relative",
//             cardColors.bg,
//             cardColors.border,
//             cardColors.hoverBorder,
//             "hover:shadow-xl"
//          )}
//          onClick={() => onOpen(table)}
//          onMouseEnter={() => setIsHovered(true)}
//          onMouseLeave={() => setIsHovered(false)}
//       >
//          {/* Animated gradient bar */}
//          <div className={cn(
//             "h-1 w-full transition-all duration-500",
//             cardColors.gradientBar,
//             isHovered && "h-1.5"
//          )} />

//          {/* Background glow effect */}
//          <div className={cn(
//             "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none",
//             table.is_active
//                ? "bg-gradient-to-br from-blue-500/5 to-purple-500/5"
//                : "bg-gradient-to-br from-slate-500/5 to-gray-500/5"
//          )} />

//          <CardHeader className="pb-3 pt-4 px-4 relative z-10">
//             <div className="flex items-start justify-between gap-3">
//                <div className="flex items-center gap-3 flex-1 min-w-0">
//                   <div className={cn(
//                      "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center transition-all duration-300",
//                      isHovered
//                         ? cn("bg-gradient-to-br shadow-md", cardColors.hoverIconBg, "text-white")
//                         : cn("bg-gradient-to-br", cardColors.iconBg)
//                   )}>
//                      <Database className="h-4 w-4" />
//                   </div>
//                   <div className="min-w-0">
//                      <CardTitle className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
//                         {table.table_name}
//                      </CardTitle>
//                      <div className="flex items-center gap-2 mt-0.5">
//                         <p className="text-[10px] font-mono text-muted-foreground/60">
//                            ID: {String(table.table_id).slice(0, 8)}…
//                         </p>
//                         <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
//                         <p className="text-[10px] text-muted-foreground/60">
//                            {table.record_count || 0} records
//                         </p>
//                      </div>
//                   </div>
//                </div>

//                <DropdownMenu>
//                   <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
//                      <Button
//                         variant="ghost"
//                         size="icon"
//                         className={cn(
//                            "h-7 w-7 shrink-0 rounded-md transition-all duration-200",
//                            isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
//                         )}
//                      >
//                         <MoreVertical className="h-3.5 w-3.5" />
//                      </Button>
//                   </DropdownMenuTrigger>
//                   <DropdownMenuContent align="end" className="w-48" onClick={e => e.stopPropagation()}>
//                      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
//                         Table Actions
//                      </DropdownMenuLabel>
//                      <DropdownMenuSeparator />
//                      <DropdownMenuItem onClick={() => onOpen(table)} className="cursor-pointer text-sm gap-2">
//                         <Eye className="h-4 w-4" /> View Data
//                      </DropdownMenuItem>
//                      <DropdownMenuItem className="cursor-pointer text-sm gap-2">
//                         <Edit className="h-4 w-4" /> Edit Schema
//                      </DropdownMenuItem>
//                      <DropdownMenuSeparator />
//                      <DropdownMenuItem
//                         onClick={() => onDelete(table)}
//                         className="cursor-pointer text-sm gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
//                      >
//                         <Trash2 className="h-4 w-4" /> Delete Table
//                      </DropdownMenuItem>
//                   </DropdownMenuContent>
//                </DropdownMenu>
//             </div>
//          </CardHeader>

//          <CardContent className="flex-1 flex flex-col px-4 pb-4 pt-0 gap-3 relative z-10">
//             {/* Description */}
//             <div className="flex-1 min-h-[44px]">
//                {table.description ? (
//                   <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
//                      {table.description}
//                   </p>
//                ) : (
//                   <p className="text-xs text-muted-foreground/40 italic">No description provided</p>
//                )}
//             </div>

//             {/* Footer */}
//             <div className="flex items-center justify-between pt-2 border-t border-border/40">
//                <StatusBadge isActive={table.is_active} size="sm" />
//                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
//                   <span className="flex items-center gap-1" suppressHydrationWarning>
//                      <Calendar className="h-3 w-3" />
//                      {new Date(table.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
//                   </span>
//                </div>
//             </div>

//             <Button
//                variant="ghost"
//                size="sm"
//                className={cn(
//                   "w-full h-8 text-xs gap-2 transition-all duration-200 bg-gradient-to-r",
//                   cardColors.buttonBg,
//                   "hover:text-white"
//                )}
//                onClick={e => { e.stopPropagation(); onOpen(table) }}
//             >
//                <span>Open Table</span>
//                <ArrowUpRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
//             </Button>
//          </CardContent>
//       </Card>
//    )
// }




import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Eye, Edit, Trash2, MoreVertical, Calendar, Columns3, HardDrive, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

function formatBytes(bytes) {
  if (!bytes) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

export default function TableCard({ table, onOpen, onDelete }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className={cn(
        "group flex flex-col border border-stone-200 bg-white transition-all duration-300 cursor-pointer overflow-hidden relative h-full hover:shadow-lg hover:border-stone-300"
      )}
      onClick={() => onOpen(table)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header Section */}
      <CardHeader className="pb-3 pt-5 px-6 relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {table.table_name}
            </h3>
            {table.description && (
              <p className="text-sm text-slate-600">
                {table.description}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-stone-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onClick={e => e.stopPropagation()}>
              <DropdownMenuLabel className="text-xs font-semibold text-slate-600">
                Table Actions
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onOpen(table)} className="cursor-pointer text-sm gap-2">
                <Eye className="h-4 w-4" /> View Data
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-sm gap-2">
                <Edit className="h-4 w-4" /> Edit Schema
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(table)}
                className="cursor-pointer text-sm gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Delete Table
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Content Section */}
      <CardContent className="flex-1 flex flex-col px-6 py-4 gap-4 relative z-10">


        {/* Divider */}
        <div className="h-px bg-stone-200" />

        {/* Footer Meta */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="h-3.5 w-3.5" />
            <span suppressHydrationWarning>
              {new Date(table.created_at || Date.now()).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
          
          {/* Status Badge */}
          <div className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium",
            table.is_active
              ? "bg-emerald-50 text-emerald-700"
              : "bg-stone-100 text-slate-600"
          )}>
            {table.is_active ? "Active" : "Inactive"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}