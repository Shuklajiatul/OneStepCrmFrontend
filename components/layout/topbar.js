"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LogOut, Settings, Palette, User, Bell, Menu, Search, Command } from "lucide-react"
import { useRouter } from "next/navigation"
import { authUtils } from "@/lib/auth-utils"
import GlobalSearch from "@/components/global-search"
import { usePathname } from "next/navigation"

const getInitials = (user) => {
    if (!user) return "User";
    if (user.first_name && user.last_name) {
        return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    } else if (user.name) {
        const nameParts = user.name.trim().split(" ");
        if (nameParts.length >= 2) {
            return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
        } else {
            return nameParts[0][0].toUpperCase();
        }
    } else if (user.username) {
        return user.username.substring(0, 2).toUpperCase();
    } else if (user.email) {
        return user.email.substring(0, 2).toUpperCase();
    }
    return "User";
};

const getUserName = (user) => {
    if (!user) return "User";
    return user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`.trim()
        : user.name || user.username || "User";
};

export default function Topbar({ darkMode, toggleDarkMode, toggleSidebar, initialUser }) {
    const router = useRouter()
    const pathname = usePathname()
    const [userName, setUserName] = useState(getUserName(initialUser))
    const [userEmail, setUserEmail] = useState(initialUser?.email || "")
    const [userInitials, setUserInitials] = useState(getInitials(initialUser))
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Check authentication and redirect if not authenticated
    useEffect(() => {
        if (!authUtils.isAuthenticated() && pathname !== '/login') {
            router.push('/login')
            return
        }
    }, [router, pathname])

    useEffect(() => {
        const tokens = authUtils.getTokens()
        const user = tokens?.user || initialUser;
        if (user) {
            setUserName(getUserName(user))
            setUserEmail(user.email || "")
            setUserInitials(getInitials(user))
        }
    }, [initialUser])

    const handleLogout = async () => {
        try {
            await authUtils.logout()
            router.push('/login')
        } catch (error) {
            console.error('Logout error:', error)
            // Even if logout fails, redirect to login
            router.push('/login')
        }
    }

    return (
        <>
            <div className="flex items-center justify-between gap-4 h-[57px]">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="md:hidden"
                    >
                        <Menu className="size-5" />
                    </Button>

                    {/* Global Search Trigger - Replaced the old search bar */}
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 max-w-md w-full md:w-auto justify-start text-muted-foreground"
                        onClick={() => setIsSearchOpen(true)}
                    >
                        <Search className="size-4" />
                        <span className="hidden sm:inline">Search...</span>
                        <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                            <Command className="size-3" />
                            <span>K</span>
                        </div>
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="size-5" />
                        <Badge className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 text-xs">
                            2
                        </Badge>
                    </Button>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-md">
                        {mounted ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="gap-2 h-auto py-2">
                                        <Avatar className="size-8">
                                            <AvatarFallback>{userInitials}</AvatarFallback>
                                        </Avatar>
                                        <div className="hidden md:flex flex-col items-start min-w-[100px]">
                                            <span className="font-medium text-sm">{userName || "User"}</span>
                                            {userEmail && (
                                                <span className="text-xs text-muted-foreground">{userEmail}</span>
                                            )}
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel className="flex flex-col gap-1">
                                        <span>{userName || "User"}</span>
                                        {userEmail && (
                                            <span className="text-xs font-normal text-muted-foreground">{userEmail}</span>
                                        )}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                                        <User className="mr-2 size-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Settings className="mr-2 size-4" />
                                        <span>Settings</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={toggleDarkMode}>
                                        <Palette className="mr-2 size-4" />
                                        <span>Appearance</span>
                                        <span className="ml-auto text-xs bg-secondary px-2 py-1 rounded">
                                            {darkMode ? 'Dark' : 'Light'}
                                        </span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="mr-2 size-4" />
                                        <span>Logout</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button variant="ghost" className="gap-2 h-auto py-2">
                                <Avatar className="size-8">
                                    <AvatarFallback>{userInitials}</AvatarFallback>
                                </Avatar>
                                <div className="hidden md:flex flex-col items-start min-w-[100px]">
                                    <span className="font-medium text-sm">{userName || "User"}</span>
                                    {userEmail && (
                                        <span className="text-xs text-muted-foreground">{userEmail}</span>
                                    )}
                                </div>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <GlobalSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </>
    )
}