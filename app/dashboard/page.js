"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Users,
    FileText,
    Database,
    Shield,
    Activity,
    ArrowUpRight,
    Plus,
    LayoutDashboard,
    Clock,
    UserPlus,
    BarChart3,
    Bell,
    UserCheck,
    AlertCircle,
    Server,
    Zap,
    History
} from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { usersApi, formsApi, datatablesApi, rolesApi, recordsApi } from "@/lib/api-endpoint"
import { authUtils } from "@/lib/auth-utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'

export default function DashboardPage() {
    const [stats, setStats] = useState({
        users: 0,
        forms: 0,
        tables: 0,
        roles: 0
    })
    const [recentForms, setRecentForms] = useState([])
    const [recentTables, setRecentTables] = useState([])
    const [recentLeads, setRecentLeads] = useState([])
    const [userMap, setUserMap] = useState({})
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState(null)
    const [chartData, setChartData] = useState([])

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Get current user for personalization
                const tokens = authUtils.getTokens()
                if (tokens?.user) {
                    setCurrentUser(tokens.user)
                }

                // Fetch all data in parallel
                const [usersRes, formsRes, tablesRes, rolesRes] = await Promise.all([
                    usersApi.getAll(),
                    formsApi.getAll(),
                    datatablesApi.getAll(),
                    rolesApi.getAll()
                ])

                // Process Users
                const usersDataRaw = usersRes.data
                const usersData = Array.isArray(usersDataRaw)
                    ? usersDataRaw
                    : (usersDataRaw?.data || [])

                const usersCount = usersData.length || 0
                const uMap = {}
                usersData.forEach(user => {
                    const userId = user.user_id || user.id || user._id
                    if (userId) {
                        uMap[userId] = {
                            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown',
                            avatar: user.avatar_url,
                            email: user.email
                        }
                    }
                })

                // Process Forms
                const formsData = formsRes.data?.data || []
                const formsCount = formsData.length
                const sortedForms = [...formsData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

                // Process Tables
                const tablesData = tablesRes.data?.data || []
                const tablesCount = tablesData.length
                const sortedTables = [...tablesData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

                // Process Roles
                const rolesCount = rolesRes.data?.data?.length || 0

                // Fetch Leads (from the first available table if exists)
                let leadsData = []
                if (tablesData.length > 0) {
                    try {
                        const leadsRes = await recordsApi.getAll(tablesData[0].table_id)
                        leadsData = (leadsRes.data?.data || leadsRes.data || []).slice(0, 5)
                    } catch (e) {
                        console.warn("Failed to fetch leads for dashboard:", e)
                    }
                }

                // Prepare Chart Data
                const activityData = [
                    { name: 'Users', value: usersCount, color: '#3b82f6' },
                    { name: 'Forms', value: formsCount, color: '#10b981' },
                    { name: 'Tables', value: tablesCount, color: '#f59e0b' },
                    { name: 'Roles', value: rolesCount, color: '#8b5cf6' },
                ]

                // Mock Alerts (based on activity)
                const mockAlerts = [
                    { id: 1, title: 'New Form Response', desc: 'Someone submitted "Contact Us" form', time: '2 mins ago', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { id: 2, title: 'Server Health', desc: 'All systems operating at 99.9% uptime', time: '1 hour ago', icon: Server, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { id: 3, title: 'User Access', desc: 'New role "Manager" added to system', time: '3 hours ago', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-50' },
                ]

                setStats({
                    users: usersCount,
                    forms: formsCount,
                    tables: tablesCount,
                    roles: rolesCount
                })
                setRecentForms(sortedForms)
                setRecentTables(sortedTables)
                setRecentLeads(leadsData)
                setAlerts(mockAlerts)
                setUserMap(uMap)
                setChartData(activityData)

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    const getInitials = (name) => {
        if (!name) return '?'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    }

    const getLeadName = (lead) => {
        if (!lead || !lead.field_values) return 'Unknown Lead'
        return lead.field_values.name || lead.field_values.full_name || lead.field_values.first_name || 'New Lead #' + (lead.record_id || '').slice(0, 4)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 rounded-2xl border shadow-sm">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Welcome back, <span className="text-primary">{currentUser?.first_name || 'Admin'}</span>
                    </h2>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        System overview and recent activity for today.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/users">
                        <Button variant="outline" className="hidden sm:flex rounded-xl">
                            <UserPlus className="mr-2 h-4 w-4" /> Add User
                        </Button>
                    </Link>
                    <Link href="/custom-form">
                        <Button className="rounded-xl shadow-md shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4" /> Create Form
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid gap-6 lg:grid-cols-12">

                {/* Left Content Area (8 Columns) */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { title: 'System Users', value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
                            { title: 'Total Forms', value: stats.forms, icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                            { title: 'Data Tables', value: stats.tables, icon: Database, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
                            { title: 'Global Roles', value: stats.roles, icon: Shield, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
                        ].map((stat, i) => (
                            <Card key={i} className={`border-none ${stat.bg} ${stat.border}`}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                                    <div className={`p-2 rounded-lg bg-white shadow-sm ${stat.color}`}>
                                        <stat.icon className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{stat.value}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Analytics Chart */}
                    <Card className="rounded-2xl overflow-hidden shadow-sm">
                        <CardHeader className="bg-muted/30 pb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-primary" />
                                        Resource Distribution
                                    </CardTitle>
                                    <CardDescription>Overall breakdown of system entities</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[320px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecf0f1" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Latest 5 Leads */}
                    <Card className="rounded-2xl shadow-sm overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                            <div>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <UserCheck className="h-5 w-5 text-primary" />
                                    Latest Leads
                                </CardTitle>
                                <CardDescription>Most recent submissions across your tables</CardDescription>
                            </div>
                            <Link href="/leadPage">
                                <Button variant="ghost" size="sm" className="group">
                                    View All <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table className="w-full">
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="pl-6">Lead Name</TableHead>
                                        <TableHead>Assigned To</TableHead>
                                        <TableHead>Source Table</TableHead>
                                        <TableHead className="text-right pr-6">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentLeads.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                                No leads found. Create a form to start collecting data.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recentLeads.map((lead) => (
                                            <TableRow key={lead.record_id} className="hover:bg-accent/5 transition-colors">
                                                <TableCell className="pl-6 font-medium py-4">
                                                    {getLeadName(lead)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6 border">
                                                            <AvatarFallback className="text-[10px] font-bold">
                                                                {getInitials(userMap[lead.assigned_to]?.name || userMap[lead.created_by]?.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm truncate">
                                                            {userMap[lead.assigned_to]?.name || userMap[lead.created_by]?.name || 'Unassigned'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-normal text-xs">
                                                        {recentTables.find(t => t.table_id === lead.table_id)?.table_name || 'CRM Table'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 text-sm text-muted-foreground">
                                                    {new Date(lead.created_at || Date.now()).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Sidebar Area (4 Columns) */}
                <div className="lg:col-span-4 space-y-6">

                    {/* System Quick View */}
                    <Card className="rounded-2xl bg-slate-900 text-white border-none shadow-xl overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider opacity-80">
                                <Activity className="h-4 w-4" />
                                System Quick View
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-xs opacity-60 mb-1">API Status</div>
                                    <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        Operational
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-xs opacity-60 mb-1">Active Orgs</div>
                                    <div className="font-semibold">01 Unit</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="opacity-60">Storage Usage</span>
                                    <span className="font-mono">12% / 10GB</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[12%]" />
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold py-5">
                                    Open Admin Console
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Alerts */}
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Bell className="h-5 w-5 text-primary" />
                                Recent Alerts
                            </CardTitle>
                            <Badge className="bg-primary/10 text-primary border-none">{alerts.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {alerts.map((alert) => (
                                    <div key={alert.id} className="p-4 flex gap-4 hover:bg-accent/5 transition-colors cursor-pointer group">
                                        <div className={`mt-1 h-10 w-10 flex-shrink-0 rounded-xl ${alert.bg} flex items-center justify-center`}>
                                            <alert.icon className={`h-5 w-5 ${alert.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="font-semibold text-sm truncate">{alert.title}</span>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{alert.time}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{alert.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 border-t">
                                <Button variant="ghost" className="w-full text-xs text-muted-foreground h-8">
                                    <History className="mr-2 h-3 w-3" /> Clear History
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Access Grid (Consolidated) */}
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <LayoutDashboard className="h-5 w-5 text-primary" />
                                Quick Shortcuts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3 pt-0">
                            {[
                                { name: 'Forms', href: '/forms', icon: FileText, color: 'bg-emerald-100 text-emerald-600' },
                                { name: 'Tables', href: '/custom-table', icon: Database, color: 'bg-amber-100 text-amber-600' },
                                { name: 'Users', href: '/users', icon: Users, color: 'bg-blue-100 text-blue-600' },
                                { name: 'Security', href: '/roles', icon: Shield, color: 'bg-slate-100 text-slate-600' },
                            ].map((item, i) => (
                                <Link key={i} href={item.href} className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all text-center group">
                                    <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <span className="font-semibold text-xs">{item.name}</span>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Bottom Section: Forms & Tables */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Forms Table */}
                <Card className="col-span-full lg:col-span-4 rounded-2xl shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                        <div>
                            <CardTitle className="text-lg font-semibold">Latest Forms</CardTitle>
                            <CardDescription>Recently updated form templates</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table className="w-full">
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="pl-6">Form Identity</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead className="text-right pr-6">Management</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentForms.map((form) => (
                                    <TableRow key={form.form_id}>
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <span className="font-medium truncate max-w-[140px]">{form.form_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{userMap[form.created_by]?.name || 'Admin'}</span>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Link href={`/forms/${form.form_id}`}>
                                                <Button variant="ghost" size="sm" className="h-8">Modify</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Recent Tables Feed */}
                <Card className="col-span-full lg:col-span-3 rounded-2xl shadow-sm border-t-4 border-t-amber-500">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold italic">Core Data Structures</CardTitle>
                        <CardDescription>Recently added schemas</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {recentTables.map((table) => (
                            <Link
                                key={table.table_id || table.id || table._id}
                                href={`/leadPage?tableId=${table.table_id || table.id || table._id}`}
                                className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-amber-200 hover:bg-amber-50 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                        <Database className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 font-medium text-sm truncate">{table.table_name || table.name}</div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 opacity-40" />
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
