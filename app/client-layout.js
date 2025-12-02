"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Sidebar from "./component/sidebar"
import Topbar from "./component/topbar"
import { cn } from "@/lib/utils"

export default function ClientLayout({ children }) {
    const pathname = usePathname()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [darkMode, setDarkMode] = useState(false)

    // Dark mode effect
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

    // Define public routes that should not have the sidebar/topbar
    const publicRoutes = ['/login', '/register', '/forgot-password']
    const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/forms/')

    if (isPublicRoute) {
        return <>{children}</>
    }

    return (
        <main className="min-h-screen bg-background">
            {/* Mobile overlay */}
            {!isCollapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsCollapsed(true)}
                />
            )}

            <div className="flex min-h-screen">
                <Sidebar
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                />

                <section className={cn(
                    "flex-1 transition-all duration-300 flex flex-col min-h-screen",
                    isCollapsed ? "md:ml-0" : "md:ml-0"
                )}>
                    <div className="p-4 border-b border-border bg-card/50">
                        <Topbar
                            darkMode={darkMode}
                            toggleDarkMode={() => setDarkMode(!darkMode)}
                            toggleSidebar={() => setIsCollapsed(!isCollapsed)}
                        />
                    </div>

                    <div className="flex-1 p-4 md:p-6 bg-background">
                        {children}
                    </div>
                </section>
            </div>
        </main>
    )
}
