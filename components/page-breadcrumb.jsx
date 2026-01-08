"use client"

import React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home } from "lucide-react"
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Route label mapping for better readability
const ROUTE_LABELS = {
    dashboard: "Dashboard",
    leadPage: "Leads",
    "custom-table-builder": "Table Builder",
    "custom-form": "Form Builder",
    "my-forms": "My Forms",
    users: "Users",
    roles: "Roles",
    activities: "Activities",
    organizations: "Organizations",
    profile: "Profile",
    "form-analytics": "Form Analytics",
    "form-submissions": "Form Submissions",
    forms: "Forms",
    migrator: "Data Migrator",
    proxy: "Proxy Settings",
    permissionManagementSystem: "Permissions",
    gene: "Genes",
    geneManagement: "Gene Management",
    geanUser: "Users",
    feature: "Features",
    "form-preview": "Form Preview",
    "record-details": "Record Details",
}

// Segments that don't have a backing page and should not be clickable links
const NON_CLICKABLE_SEGMENTS = new Set([
    "form-submissions",
    "geneManagement",
    "geanUser"
])

export function PageBreadcrumb({ customItems = null, className = "" }) {
    const pathname = usePathname()
    // State to store the history of visited pages
    const [history, setHistory] = React.useState([])
    const [isClient, setIsClient] = React.useState(false)

    React.useEffect(() => {
        setIsClient(true)
        // Initialize history from session storage if available
        try {
            const stored = sessionStorage.getItem("breadcrumb_history")
            if (stored) {
                setHistory(JSON.parse(stored))
            }
        } catch (e) {
            console.error("Failed to load breadcrumb history", e)
        }
    }, [])

    React.useEffect(() => {
        if (!isClient) return

        // Logic to update history
        setHistory(prevHistory => {
            const currentHref = pathname

            // Determine the prospective label logic FIRST to check for duplicates correctly
            let label = "Page"
            if (customItems && customItems.length > 0) {
                label = customItems[customItems.length - 1].label
            } else if (pathname !== "/") {
                const segments = pathname.split('/').filter(Boolean)
                const lastSegment = segments[segments.length - 1]
                if (lastSegment && (lastSegment.length > 20 || !isNaN(lastSegment))) {
                    label = ROUTE_LABELS[lastSegment] || lastSegment
                } else {
                    label = ROUTE_LABELS[lastSegment || ""] || lastSegment || "Page"
                }
                if (label.length > 20) {
                    label = `${label.substring(0, 15)}...`
                } else {
                    label = label.charAt(0).toUpperCase() + label.slice(1)
                }
            } else {
                label = "Home"
            }


            const existingIndex = prevHistory.findIndex(item => {
                if (item.href === currentHref) {
                    if (item.label === label) return true

                    return false
                }
                return false
            })

            let newHistory
            if (existingIndex !== -1) {
                // User navigated BACK to exactly the same state -> Truncate future history
                newHistory = prevHistory.slice(0, existingIndex + 1)
            } else {
                // User navigated to a NEW state (either new URL or same URL different label)
                if (pathname === "/dashboard" || pathname === "/") {
                    newHistory = []
                } else {

                    const newItem = {
                        label: label,
                        href: pathname,
                    }

                    newHistory = [...prevHistory, newItem]
                }
            }

            // Limit history length - removed per user request
            // if (newHistory.length > 6) {
            //     newHistory = newHistory.slice(newHistory.length - 6)
            // }

            sessionStorage.setItem("breadcrumb_history", JSON.stringify(newHistory))
            return newHistory
        })

    }, [pathname, customItems, isClient])

    if (!isClient) {
        return null
    }

    return (
        <div className={`mb-6 ${className}`}>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/dashboard" className="flex items-center gap-1.5" onClick={() => {
                                setHistory([])
                                sessionStorage.removeItem("breadcrumb_history")
                            }}>
                                <Home className="h-3.5 w-3.5" />
                                <span>Home</span>
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>

                    {(customItems || history).map((item, index) => {
                        if (item.href === "/dashboard" || item.href === "/") return null
                        const isLast = index === (customItems || history).length - 1

                        return (
                            <React.Fragment key={index}>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    {!isLast ? (
                                        <BreadcrumbLink asChild>
                                            <Link
                                                href={item.href || "#"}
                                                onClick={item.onClick}
                                            >
                                                {item.label}
                                            </Link>
                                        </BreadcrumbLink>
                                    ) : (
                                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                    )}
                                </BreadcrumbItem>
                            </React.Fragment>
                        )
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    )
}
