"use client"

import { Home, Settings, HelpCircle, BookCopy, ClipboardMinus, FileChartColumnIncreasing, X, ChevronLeft, ChevronRight, ChevronDown, FormInput, BarChart3, List, Table, Users, Network, Layers, UserCog, Shield, Building, Lock, CalendarCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import Image from 'next/image'
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authUtils } from '@/lib/auth-utils'

const menuItems = [
    { 
        label: "Dashboard", 
        icon: Home, 
        href: "/dashboard" 
    },
    {
        label: "Leads",
        icon: Users,
        href: "/leadPage"
    },
    { 
        label: "Activities", 
        icon: CalendarCheck, 
        href: "/activities" 
    },
    {
        label: "Forms",
        icon: BookCopy,
        href: "/forms",
        submenu: [
            { label: "Custom Form", icon: FormInput, href: "/custom-form" },
            { label: "My Forms", icon: List, href: "/my-forms" },
            { label: "Form Analytics", icon: BarChart3, href: "/form-analytics" },
        ]
    },
    {
        label: "Gene Management",
        icon: Network,
        href: "/general-management",
        submenu: [
            { label: "Gene", icon: Layers, href: "/gene" },
            { label: "Feature", icon: Shield, href: "/feature" },
            { label: "Permission Management System", icon: Lock, href: "/permissionManagementSystem" },
        ]
    },
    {
        label: "User",
        icon: UserCog,
        href: "/user",
        submenu: [
            { label: "User Management", icon: UserCog, href: "/users" },
            { label: "Role Management", icon: Shield, href: "/roles" },
            { label: "Org Management", icon: Building, href: "/organizations" },
        ]
    },
    { 
        label: "Custom Table", 
        icon: Table, 
        href: "/custom-table-builder" 
    },
    {
        label: "Migrator",
        icon: Network,
        href: "/migrator",
        submenu: [
            { label: "Data Migrator", icon: Network, href: "/migrator" },
            { label: "Migration Status", icon: FileChartColumnIncreasing, href: "/migrator/status" },
        ]
    },
    { 
        label: "Report", 
        icon: ClipboardMinus, 
        href: "/report" 
    },
    { 
        label: "Setting", 
        icon: Settings, 
        href: "/setting" 
    },
    { 
        label: "Help", 
        icon: HelpCircle, 
        href: "/help" 
    },
]

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
    const router = useRouter()
    const pathname = usePathname()
    const [expandedMenus, setExpandedMenus] = useState(new Set())

    // Check authentication and redirect if not authenticated
    useEffect(() => {
        if (!authUtils.isAuthenticated() && pathname !== '/login') {
            router.push('/login')
            return
        }
    }, [router, pathname])

    // Auto-expand parent menus when their submenu items are active
    useEffect(() => {
        const activeSubmenuItems = menuItems.filter(item =>
            item.submenu?.some(subItem => pathname === subItem.href)
        )

        if (activeSubmenuItems.length > 0) {
            setExpandedMenus(prev => {
                const newExpanded = new Set(prev)
                activeSubmenuItems.forEach(item => {
                    newExpanded.add(item.label)
                })
                // Only update if there's a change
                if (newExpanded.size === prev.size &&
                    Array.from(newExpanded).every(label => prev.has(label))) {
                    return prev
                }
                return newExpanded
            })
        }
    }, [pathname])

    const toggleSubmenu = (menuLabel) => {
        const newExpanded = new Set(expandedMenus)
        if (newExpanded.has(menuLabel)) {
            newExpanded.delete(menuLabel)
        } else {
            newExpanded.add(menuLabel)
        }
        setExpandedMenus(newExpanded)
    }

    const isMenuExpanded = (menuLabel) => expandedMenus.has(menuLabel)

    const handleMenuClick = (item) => {
        if (item.submenu) {
            toggleSubmenu(item.label)
        } else {
            router.push(item.href)
        }
    }

    const isActive = (href) => {
        return pathname === href
    }

    const isParentActive = (item) => {
        if (item.submenu) {
            return item.submenu.some(subItem => isActive(subItem.href))
        }
        return isActive(item.href)
    }

    return (
        <aside className={cn(
            "fixed md:sticky top-0 h-screen inset-y-0 left-0 z-50 transition-all duration-300 bg-sidebar border-r border-sidebar-border relative group/sidebar",
            isCollapsed ? "-translate-x-full md:translate-x-0 md:w-16" : "translate-x-0 w-64 md:w-64"
        )}>
            {/* Toggle Button */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "hidden md:flex absolute top-6 -right-3 z-20 h-6 w-6 rounded-full bg-background border border-border shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 ease-out",
                            "opacity-0 group-hover/sidebar:opacity-100 hover:!opacity-100",
                            isCollapsed && "opacity-100"
                        )}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-3 w-3" />
                        ) : (
                            <ChevronLeft className="h-3 w-3" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                    <p>{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
                </TooltipContent>
            </Tooltip>

            <Card className={cn(
                "h-[calc(100vh-1.5rem)] flex flex-col bg-sidebar border-0 shadow-none overflow-hidden",
                isCollapsed ? "m-2 p-2" : "m-2 p-3"
            )}>
                {/* Header Section - Single row layout */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1">
                        <div className={cn(
                            "rounded-md flex items-center justify-center overflow-hidden flex-shrink-0",
                            isCollapsed ? "size-8" : "size-10"
                        )}>
                            <Image
                                src="/SlashLogo.png"
                                alt="SlashRtc Logo"
                                width={isCollapsed ? 32 : 40}
                                height={isCollapsed ? 32 : 40}
                                quality={75}
                                priority
                                className="object-cover"
                            />
                        </div>
                        {!isCollapsed && (
                            <div className="flex items-center justify-between flex-1">
                                <span className="text-xl font-semibold text-sidebar-foreground">Slash CRM</span>
                            </div>
                        )}
                    </div>

                    {/* Mobile Close Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="md:hidden h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/20 flex-shrink-0"
                    >
                        <X className="size-4" />
                    </Button>
                </div>

                <nav className="flex-1 mt-4 overflow-y-auto overflow-x-hidden pr-0 -mr-3">
                    {!isCollapsed && (
                        <div className="text-xs uppercase text-sidebar-foreground/70 px-2 mb-3 font-semibold tracking-wider">
                            General
                        </div>
                    )}
                    <ul className={cn(
                        "space-y-1",
                        isCollapsed && "space-y-1"
                    )}>
                        {menuItems.map((item, index) => {
                            const showGeneManagementSection = !isCollapsed && index === 3 && item.label === "Gene Management"
                            const showUserSection = !isCollapsed && index === 4 && item.label === "User"

                            return (
                                <li key={item.label}>
                                    {showGeneManagementSection && (
                                        <div className="text-xs uppercase text-sidebar-foreground/70 px-2 mb-3 mt-4 font-semibold tracking-wider">
                                            Gene Management
                                        </div>
                                    )}
                                    {showUserSection && (
                                        <div className="text-xs uppercase text-sidebar-foreground/70 px-2 mb-3 mt-4 font-semibold tracking-wider">
                                            User Management
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        {isCollapsed ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant={isParentActive(item) ? "secondary" : "ghost"}
                                                        className={cn(
                                                            "w-full gap-2 transition-all duration-200 group md:justify-center md:p-2 h-9",
                                                            isParentActive(item) && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
                                                        )}
                                                        onClick={() => handleMenuClick(item)}
                                                    >
                                                        <item.icon className={cn(
                                                            "shrink-0",
                                                            isCollapsed ? "size-4" : "size-5"
                                                        )} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                    <p>{item.label}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <Button
                                                variant={isParentActive(item) ? "secondary" : "ghost"}
                                                className={cn(
                                                    "w-full gap-2 transition-all duration-200 group md:justify-center md:p-2 h-9",
                                                    isParentActive(item) && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
                                                )}
                                                onClick={() => handleMenuClick(item)}
                                            >
                                                <item.icon className={cn(
                                                    "shrink-0 size-5"
                                                )} />
                                                <span className="truncate flex-1 text-left">{item.label}</span>
                                                {item.submenu && (
                                                    <ChevronDown className={cn(
                                                        "size-4 transition-transform duration-200",
                                                        isMenuExpanded(item.label) && "rotate-180"
                                                    )} />
                                                )}
                                            </Button>
                                        )}

                                        {/* Submenu */}
                                        {!isCollapsed && item.submenu && isMenuExpanded(item.label) && (
                                            <div className="mt-1 space-y-1 pl-4 border-l-2 border-sidebar-border">
                                                {item.submenu.map((subItem) => (
                                                    <Button
                                                        key={subItem.label}
                                                        variant={isActive(subItem.href) ? "secondary" : "ghost"}
                                                        className={cn(
                                                            "w-full gap-2 justify-start py-2 h-auto text-sm min-h-[2rem] pr-2",
                                                            isActive(subItem.href) && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
                                                        )}
                                                        onClick={() => router.push(subItem.href)}
                                                    >
                                                        <subItem.icon className="size-4 shrink-0" />
                                                        <span className="truncate flex-1">{subItem.label}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                {!isCollapsed && (
                    <div className="mt-auto pt-4 border-t border-sidebar-border">
                        <div className="text-xs text-sidebar-foreground/70 px-2">
                            © 2025 Slash CRM
                        </div>
                    </div>
                )}
            </Card>
        </aside>
    )
}