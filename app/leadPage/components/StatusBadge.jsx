import { cn } from "@/lib/utils"
import { CircleCheck, CircleOff } from "lucide-react"

export default function StatusBadge({ isActive, size = "default" }) {
   const statusConfig = {
      active: {
         label: "Active",
         icon: CircleCheck,
         gradient: "from-emerald-500 to-emerald-600",
         bgGradient: "bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30",
         border: "border-emerald-300 dark:border-emerald-700",
         text: "text-emerald-700 dark:text-emerald-300",
         shadow: "shadow-emerald-100/20 dark:shadow-emerald-900/20",
         glow: "hover:shadow-emerald-500/20"
      },
      inactive: {
         label: "Inactive",
         icon: CircleOff,
         gradient: "from-gray-500 to-gray-600",
         bgGradient: "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800/40 dark:to-gray-700/30",
         border: "border-gray-300 dark:border-gray-700",
         text: "text-gray-600 dark:text-gray-400",
         shadow: "shadow-gray-100/20 dark:shadow-gray-900/20",
         glow: "hover:shadow-gray-500/20"
      }
   }

   const config = isActive ? statusConfig.active : statusConfig.inactive
   const Icon = config.icon

   const sizeClasses = {
      sm: "px-2 py-0.5 text-[10px] gap-1",
      default: "px-2.5 py-1 text-xs gap-1.5",
      lg: "px-3 py-1.5 text-sm gap-2"
   }

   return (
      <div className={cn(
         "inline-flex items-center rounded-full font-medium backdrop-blur-sm transition-all duration-300",
         config.bgGradient,
         `border ${config.border}`,
         config.shadow,
         config.glow,
         "hover:scale-105 hover:shadow-md",
         sizeClasses[size]
      )}>
         <Icon className={cn(
            "transition-transform duration-300 group-hover:scale-110",
            size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"
         )} />
         <span className={cn("font-semibold", config.text)}>{config.label}</span>
      </div>
   )
}