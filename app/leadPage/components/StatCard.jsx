import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp } from "lucide-react"

export default function StatCard({ icon: Icon, label, value, trend, trendValue, accent, loading, onClick, bgGradient }) {
   const trendUp = trend === "up"
   return (
      <Card
         className={cn(
            "relative overflow-hidden group border-0 transition-all duration-500 hover:shadow-xl cursor-pointer",
            bgGradient || "bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-950 dark:to-gray-900/50"
         )}
         onClick={onClick}
      >
         {/* Animated background pattern */}
         <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
         </div>

         <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                  {loading ? (
                     <Skeleton className="h-7 w-16" />
                  ) : (
                     <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{value}</p>
                  )}
                  {trend && (
                     <div className="flex items-center gap-1">
                        <span className={cn(
                           "text-[11px] font-medium flex items-center gap-0.5",
                           trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                           {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                           {trendValue}
                        </span>
                        <span className="text-[10px] text-muted-foreground">vs last week</span>
                     </div>
                  )}
               </div>
               <div className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
                  "bg-gradient-to-br shadow-md",
                  accent
               )}>
                  <Icon className="h-4 w-4" />
               </div>
            </div>
         </CardContent>
      </Card>
   )
}