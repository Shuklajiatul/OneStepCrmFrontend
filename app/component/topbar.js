"use client"

import { Input } from "@/components/ui/input"
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
import { LogOut, Settings, Palette, User, Bell, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import { authUtils } from "@/lib/auth-utils"

export default function Topbar({darkMode, toggleDarkMode, toggleSidebar}) {
    const router = useRouter()

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
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={toggleSidebar}
                    className="md:hidden"
                >
                    <Menu className="size-5" />
                </Button>
                
                <div className="relative flex-1 max-w-md">
                    <Input placeholder="Search..." className="w-full" />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="size-5" />
                    <Badge className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 text-xs">
                        2
                    </Badge>
                </Button>

                <div className="border border-gray-200 dark:border-gray-700 rounded-md">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-2 h-auto py-2">
                                <Avatar className="size-8">
                                    <AvatarFallback>AP</AvatarFallback>
                                </Avatar>
                                <span className="hidden md:inline font-medium">Aspaszin</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
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
                </div>
            </div>
        </div>
    )
}