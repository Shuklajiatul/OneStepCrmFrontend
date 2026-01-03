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

    // If custom items are provided, use them
    if (customItems) {
        return (
            <div className={`mb-6 ${className}`}>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/dashboard" className="flex items-center gap-1.5">
                                    <Home className="h-3.5 w-3.5" />
                                    <span>Home</span>
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {customItems.map((item, index) => (
                            <React.Fragment key={index}>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    {item.href ? (
                                        <BreadcrumbLink asChild>
                                            <Link
                                                href={item.href}
                                                onClick={item.onClick}
                                                className="cursor-pointer"
                                            >
                                                {item.label}
                                            </Link>
                                        </BreadcrumbLink>
                                    ) : item.onClick ? (
                                        <BreadcrumbLink asChild>
                                            <button
                                                onClick={item.onClick}
                                                className="cursor-pointer hover:text-foreground transition-colors"
                                            >
                                                {item.label}
                                            </button>
                                        </BreadcrumbLink>
                                    ) : (
                                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                    )}
                                </BreadcrumbItem>
                            </React.Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        )
    }

    // Generate breadcrumb items from pathname
    const pathSegments = pathname.split("/").filter(Boolean)

    // If we're on the home/dashboard page, show minimal breadcrumb
    if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === "dashboard")) {
        return (
            <div className={`mb-6 ${className}`}>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbPage className="flex items-center gap-1.5">
                                <Home className="h-3.5 w-3.5" />
                                <span>Home</span>
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        )
    }

    // Build breadcrumb items
    const breadcrumbItems = pathSegments.map((segment, index) => {
        const href = "/" + pathSegments.slice(0, index + 1).join("/")
        const isLast = index === pathSegments.length - 1

        // Get label from mapping or format the segment
        let label = ROUTE_LABELS[segment] || segment

        // If it's a UUID or ID-like string, show a shortened version
        if (segment.match(/^[a-f0-9-]{36}$/i) || segment.match(/^[a-f0-9]{8,}$/i)) {
            label = `ID: ${segment.slice(0, 8)}...`
        }

        // Capitalize if not in mapping
        if (!ROUTE_LABELS[segment] && !segment.match(/^[a-f0-9-]{36}$/i)) {
            label = segment
                .split("-")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")
        }

        // Determine if this should be a link
        const shouldBeLink = !isLast && !NON_CLICKABLE_SEGMENTS.has(segment)

        return {
            label,
            href: shouldBeLink ? href : null,
            isLast,
        }
    })

    return (
        <div className={`mb-6 ${className}`}>
            <Breadcrumb>
                <BreadcrumbList>
                    {/* Home link */}
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/dashboard" className="flex items-center gap-1.5">
                                <Home className="h-3.5 w-3.5" />
                                <span>Home</span>
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>

                    {/* Dynamic breadcrumb items */}
                    {breadcrumbItems.map((item, index) => (
                        <React.Fragment key={index}>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {item.href ? (
                                    <BreadcrumbLink asChild>
                                        <Link href={item.href}>{item.label}</Link>
                                    </BreadcrumbLink>
                                ) : (
                                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                )}
                            </BreadcrumbItem>
                        </React.Fragment>
                    ))}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    )
}
