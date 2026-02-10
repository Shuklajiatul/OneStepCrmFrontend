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
    History,
    PieChart,
    CalendarCheck,
    Flag,
    TrendingUp,
    Fingerprint,
    Boxes,
    Cpu
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
import { usersApi, formsApi, datatablesApi, rolesApi, recordsApi, genesApi, featuresApi, policiesApi, activitiesApi } from "@/lib/api-endpoint"
import { authUtils } from "@/lib/auth-utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
import { PageBreadcrumb } from "@/components/page-breadcrumb"

export default function DashboardPage() {
    const [stats, setStats] = useState({
        users: 0,
        forms: 0,
        tables: 0,
        roles: 0,
        genes: 0,
        features: 0
    })
    const [recentForms, setRecentForms] = useState([])
    const [recentTables, setRecentTables] = useState([])
    const [recentLeads, setRecentLeads] = useState([])
    const [userMap, setUserMap] = useState({})
    const [alerts, setAlerts] = useState([])
    const [activities, setActivities] = useState([])
    const [genes, setGenes] = useState([])
    const [policies, setPolicies] = useState([])
    const [roles, setRoles] = useState([])
    const [teamMembers, setTeamMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState(null)
    const [chartData, setChartData] = useState([])
    const [upcomingActivities, setUpcomingActivities] = useState([])

    const pipelineData = [
        { status: 'New', count: 45, color: 'bg-blue-500', percent: 45 },
        { status: 'Contacted', count: 32, color: 'bg-amber-500', percent: 32 },
        { status: 'In Progress', count: 18, color: 'bg-emerald-500', percent: 18 },
        { status: 'Qualified', count: 12, color: 'bg-violet-500', percent: 12 },
    ]



    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Get current user for personalization
                const tokens = authUtils.getTokens()
                if (tokens?.user) {
                    setCurrentUser(tokens.user)
                }

                // Fetch all data in parallel
                const [usersRes, formsRes, tablesRes, rolesRes, genesRes, featuresRes, policiesRes, activitiesRes] = await Promise.all([
                    usersApi.getAll(),
                    formsApi.getAll(),
                    datatablesApi.getAll(),
                    rolesApi.getAll(),
                    genesApi.getAll(),
                    featuresApi.getAll(),
                    policiesApi.getAll(),
                    activitiesApi.getByOrganization().catch(() => ({ data: [] }))
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
                            email: user.email,
                            role_id: user.role_id,
                            reporting_id: user.reporting_id
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

                // Process Roles with user assignments
                const rolesDataRaw = rolesRes.data?.data || rolesRes.data?.roles || []
                const rolesData = Array.isArray(rolesDataRaw) ? rolesDataRaw : []
                const rolesCount = rolesData.length

                // Map users to roles
                const rolesWithUsers = rolesData.map(role => {
                    const roleId = role.role_id || role.id
                    const usersInRole = usersData.filter(user =>
                        (user.role_id || user.roles?.[0]) === roleId
                    )
                    return {
                        ...role,
                        userCount: usersInRole.length,
                        users: usersInRole
                    }
                })

                // Get team members (users reporting to current user)
                const currentUserId = tokens?.user?.user_id || tokens?.user?.id
                const myTeam = usersData.filter(user =>
                    user.reporting_id === currentUserId
                )

                // Fetch Leads from specific table
                let leadsData = []
                const LATEST_LEAD_TABLE_ID = "f3afc7d5-f3f5-443c-a5d9-3c25d736b456"
                try {
                    const leadsRes = await recordsApi.getAll(LATEST_LEAD_TABLE_ID)
                    leadsData = (leadsRes.data?.data || leadsRes.data || []).slice(0, 5)
                } catch (e) {
                    console.warn("Failed to fetch leads for dashboard:", e)
                }

                // Prepare Chart Data
                const activityData = [
                    { name: 'Users', value: usersCount, color: '#3b82f6' },
                    { name: 'Forms', value: formsCount, color: '#10b981' },
                    { name: 'Tables', value: tablesCount, color: '#f59e0b' },
                    { name: 'Roles', value: rolesCount, color: '#8b5cf6' },
                    { name: 'Genes', value: (genesRes.data?.data || []).length, color: '#ec4899' },
                ]

                // Mock Alerts (based on activity)
                const mockAlerts = [
                    { id: 1, title: 'New Form Response', desc: 'Someone submitted "Contact Us" form', time: '2 mins ago', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { id: 2, title: 'Server Health', desc: 'All systems operating at 99.9% uptime', time: '1 hour ago', icon: Server, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { id: 3, title: 'User Access', desc: 'New role "Manager" added to system', time: '3 hours ago', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-50' },
                ]

                // Aggregate Recent Activities
                const allActivities = [
                    // Only show the currently logged-in user's registration activity if they have a valid created_at
                    ...(currentUserId && usersData.find(u => (u.user_id || u.id) === currentUserId)?.created_at
                        ? [{
                            id: `user-${currentUserId}`,
                            title: 'New User',
                            desc: `${currentUser?.first_name || 'You'} joined the platform`,
                            time: usersData.find(u => (u.user_id || u.id) === currentUserId).created_at,
                            icon: UserPlus,
                            color: 'text-blue-500',
                            bg: 'bg-blue-50'
                        }]
                        : []
                    ),
                    ...formsData.filter(f => f.created_at).slice(0, 5).map(f => ({
                        id: `form-${f.form_id}`,
                        title: 'Form Created',
                        desc: `New form "${f.form_name}" is now live`,
                        time: f.created_at,
                        icon: FileText,
                        color: 'text-emerald-500',
                        bg: 'bg-emerald-50'
                    })),
                    ...tablesData.filter(t => t.created_at).slice(0, 5).map(t => ({
                        id: `table-${t.table_id}`,
                        title: 'Table Added',
                        desc: `Schema "${t.table_name}" was initialized`,
                        time: t.created_at,
                        icon: Database,
                        color: 'text-amber-500',
                        bg: 'bg-amber-50'
                    })),
                    ...leadsData.filter(l => l.created_at).slice(0, 5).map(l => ({
                        id: `lead-${l.record_id}`,
                        title: 'Lead Captured',
                        desc: `New record received in ${recentTables.find(t => t.table_id === l.table_id)?.table_name || 'Table'}`,
                        time: l.created_at,
                        icon: Zap,
                        color: 'text-indigo-500',
                        bg: 'bg-indigo-50'
                    })),
                    // Add CRM Activities to the stream
                    ...(activitiesRes.data?.data || activitiesRes.data || [])
                        .filter(a => a.created_at || a.updated_at)
                        .slice(0, 10)
                        .map(a => {
                            const type = (a.activity_type || 'task').toLowerCase();
                            let icon = Flag;
                            let color = 'text-blue-500';
                            let bg = 'bg-blue-50';

                            switch (type) {
                                case 'call':
                                    icon = Activity;
                                    color = 'text-green-500';
                                    bg = 'bg-green-50';
                                    break;
                                case 'meeting':
                                    icon = CalendarCheck;
                                    color = 'text-purple-500';
                                    bg = 'bg-purple-50';
                                    break;
                                case 'email':
                                    icon = Bell;
                                    color = 'text-amber-500';
                                    bg = 'bg-amber-50';
                                    break;
                            }

                            return {
                                id: `activity-${a.activity_id}`,
                                title: a.title || 'New Activity',
                                desc: `${type.charAt(0).toUpperCase() + type.slice(1)} assigned to ${userMap[a.assigned_to]?.name || 'User'}`,
                                time: a.created_at || a.updated_at,
                                icon: icon,
                                color: color,
                                bg: bg
                            }
                        })
                ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15)

                // Process Activities
                const activitiesData = activitiesRes.data?.data || activitiesRes.data || []
                const upcoming = activitiesData
                    .filter(a => !a.completed && new Date(a.due_date) >= new Date())
                    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                    .slice(0, 5)

                setStats({
                    users: usersCount,
                    forms: formsCount,
                    tables: tablesCount,
                    roles: rolesCount,
                    genes: (genesRes.data?.data || []).length,
                    features: (featuresRes.data?.data || []).length
                })
                setRecentForms(sortedForms)
                setRecentTables(sortedTables)
                setRecentLeads(leadsData)
                setAlerts(mockAlerts)
                setActivities(allActivities)
                setUserMap(uMap)
                setGenes(genesRes.data?.data || [])
                setPolicies(policiesRes.data?.data || [])
                setRoles(rolesWithUsers)
                setTeamMembers(myTeam)
                setChartData(activityData)
                setUpcomingActivities(upcoming)

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
        <div className="p-0 md:p-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            {/* Breadcrumb */}
            <PageBreadcrumb />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
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

            {/* Quick Stats Grid - Full Width */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { title: 'System Users', value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { title: 'Total Forms', value: stats.forms, icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                    { title: 'Data Tables', value: stats.tables, icon: Database, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
                    { title: 'Global Roles', value: stats.roles, icon: Shield, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
                    { title: 'Active Genes', value: stats.genes, icon: Boxes, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100' },
                    { title: 'Features', value: stats.features, icon: Cpu, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                ].map((stat, i) => (
                    <Card key={i} className={`border-none ${stat.bg} ${stat.border} rounded-xl`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-1 px-4 pt-4">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase opacity-80">{stat.title}</CardTitle>
                            <div className={`p-1.5 rounded-lg bg-white shadow-sm ${stat.color}`}>
                                <stat.icon className="h-3.5 w-3.5" />
                            </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Layout */}
            <div className="grid gap-4 lg:grid-cols-12">
                {/* Left Content Area (8 Columns) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Analytics Chart */}
                    <Card className="rounded-xl overflow-hidden shadow-sm">
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
                    <Card className="rounded-xl shadow-sm overflow-hidden">
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
                <div className="lg:col-span-4 flex flex-col gap-4">

                    {/* Lead Pipeline Summary */}
                    <Card className="rounded-xl shadow-sm overflow-hidden border-none bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider opacity-90">
                                <PieChart className="h-4 w-4" />
                                Lead Pipeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="text-2xl font-bold">107</div>
                                    <div className="text-[10px] opacity-70 flex items-center gap-1">
                                        <TrendingUp className="h-2.5 w-2.5" />
                                        +12% from last week
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-medium">Qualified</div>
                                    <div className="text-xl font-bold">12%</div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-1">
                                {pipelineData.map((item, i) => (
                                    <div key={i} className="space-y-0.5">
                                        <div className="flex justify-between text-[9px] opacity-80 uppercase font-semibold">
                                            <span>{item.status}</span>
                                            <span>{item.count} Leads</span>
                                        </div>
                                        <Progress value={item.percent} className="h-1 bg-white/10" indicatorClassName={item.color} />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>



                    {/* Recent Activity Log */}
                    <Card className="rounded-xl shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider opacity-80">
                                <Activity className="h-4 w-4 text-primary" />
                                Recent Activity
                            </CardTitle>
                            <Badge className="bg-primary/10 text-primary border-none text-[10px] h-5 px-1.5">{activities.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[180px]">
                                <div className="divide-y">
                                    {activities.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground">
                                            No recent activity detected.
                                        </div>
                                    ) : (
                                        activities.map((activity) => (
                                            <div key={activity.id} className="p-2 flex gap-3 hover:bg-accent/5 transition-colors cursor-pointer group">
                                                <div className={`mt-0.5 h-7 w-7 flex-shrink-0 rounded-lg ${activity.bg} flex items-center justify-center`}>
                                                    <activity.icon className={`h-3.5 w-3.5 ${activity.color}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="font-semibold text-[11px] truncate group-hover:text-primary transition-colors">{activity.title}</span>
                                                        <span className="text-[8px] text-muted-foreground whitespace-nowrap">
                                                            {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground line-clamp-1">{activity.desc}</p>
                                                </div>
                                            </div>
                                        ), console.log("activities", activities))
                                    )}
                                </div>
                            </ScrollArea>
                            <Separator />
                            <div className="p-2">
                                <Button variant="ghost" className="w-full text-[10px] text-muted-foreground h-7 hover:bg-transparent hover:text-primary">
                                    <History className="mr-2 h-3 w-3" /> View Full Audit Log
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Activities */}
                    {/* <Card className="rounded-xl shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider opacity-80">
                                <CalendarCheck className="h-4 w-4 text-primary" />
                                Upcoming Activities
                            </CardTitle>
                            <Badge className="bg-primary/10 text-primary border-none text-[10px] h-5 px-1.5">{upcomingActivities.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[180px]">
                                <div className="divide-y">
                                    {upcomingActivities.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground">
                                            No upcoming activities.
                                        </div>
                                    ) : (
                                        upcomingActivities.map((activity) => {
                                            const activityIcons = {
                                                task: Flag,
                                                call: Activity,
                                                meeting: CalendarCheck,
                                                email: Bell
                                            }
                                            const ActivityIcon = activityIcons[activity.activity_type] || Flag
                                            const activityColors = {
                                                task: 'bg-blue-50 text-blue-600',
                                                call: 'bg-green-50 text-green-600',
                                                meeting: 'bg-purple-50 text-purple-600',
                                                email: 'bg-amber-50 text-amber-600'
                                            }
                                            const colorClass = activityColors[activity.activity_type] || 'bg-gray-50 text-gray-600'

                                            return (
                                                <div key={activity.activity_id} className="p-2 flex gap-3 hover:bg-accent/5 transition-colors cursor-pointer group">
                                                    <div className={`mt-0.5 h-7 w-7 flex-shrink-0 rounded-lg ${colorClass} flex items-center justify-center`}>
                                                        <ActivityIcon className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <span className="font-semibold text-[11px] truncate group-hover:text-primary transition-colors">{activity.title}</span>
                                                            <span className="text-[8px] text-muted-foreground whitespace-nowrap">
                                                                {new Date(activity.due_date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Avatar className="h-4 w-4 border">
                                                                <AvatarFallback className="text-[8px]">
                                                                    {getInitials(userMap[activity.assigned_to]?.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-[10px] text-muted-foreground truncate">
                                                                {userMap[activity.assigned_to]?.name || 'Unassigned'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </ScrollArea>
                            <Separator />
                            <div className="p-2">
                                <Link href="/activities">
                                    <Button variant="ghost" className="w-full text-[10px] text-muted-foreground h-7 hover:bg-transparent hover:text-primary">
                                        <CalendarCheck className="mr-2 h-3 w-3" /> View All Activities
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card> */}

                    {/* Quick Access Grid (Consolidated) */}
                    <Card className="rounded-xl shadow-sm flex-1 flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider opacity-80">
                                <LayoutDashboard className="h-4 w-4 text-primary" />
                                Quick Shortcuts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2 pt-0 pb-2 px-4 flex-1 content-center">
                            {[
                                { name: 'Forms', href: '/my-forms', icon: FileText, color: 'bg-emerald-100 text-emerald-600' },
                                { name: 'Tables', href: '/custom-table-builder', icon: Database, color: 'bg-amber-100 text-amber-600' },
                                { name: 'Users', href: '/users', icon: Users, color: 'bg-blue-100 text-blue-600' },
                                { name: 'Security', href: '/roles', icon: Shield, color: 'bg-slate-100 text-slate-600' },
                            ].map((item, i) => (
                                <Link key={i} href={item.href} className="flex flex-col items-center gap-1 p-2 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all text-center group">
                                    <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <item.icon className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-semibold text-[9px] uppercase tracking-wider">{item.name}</span>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Role Overview & My Team Section */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Role Overview Card */}
                <Card className="rounded-xl shadow-sm overflow-hidden">
                    <CardHeader className="border-b py-3 px-4 bg-muted/10 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider opacity-80">
                                <Shield className="h-4 w-4 text-primary" />
                                Role Overview
                            </CardTitle>
                            <CardDescription className="text-[10px]">User distribution across roles</CardDescription>
                        </div>
                        <Link href="/roles">
                            <Button variant="ghost" size="sm" className="text-[10px] h-7">
                                Manage <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[210px]">
                            <div className="divide-y">
                                {roles.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-muted-foreground">
                                        No roles configured yet.
                                    </div>
                                ) : (
                                    roles.map((role) => (
                                        <div key={role.role_id || role.id} className="p-3 flex items-center justify-between hover:bg-accent/5 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100 group-hover:bg-violet-100 transition-colors">
                                                    <Shield className="h-3.5 w-3.5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-xs">{role.role_name || role.name}</div>
                                                    <div className="text-[9px] text-muted-foreground">
                                                        {role.description || 'No description'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="text-[9px] h-5 px-2 gap-1">
                                                    <Users className="h-2.5 w-2.5" />
                                                    {role.userCount || 0}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* My Team Card */}
                <Card className="rounded-xl shadow-sm overflow-hidden">
                    <CardHeader className="border-b py-3 px-4 bg-muted/10 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider opacity-80">
                                <UserCheck className="h-4 w-4 text-primary" />
                                My Team
                            </CardTitle>
                            <CardDescription className="text-[10px]">Users reporting to you</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{teamMembers.length} Members</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[210px]">
                            <div className="divide-y">
                                {teamMembers.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-muted-foreground">
                                        No team members assigned to you yet.
                                    </div>
                                ) : (
                                    teamMembers.map((member) => {
                                        const userId = member.user_id || member.id
                                        const userName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || 'Unknown'
                                        const userRole = roles.find(r => (r.role_id || r.id) === member.role_id)

                                        return (
                                            <div key={userId} className="p-3 flex items-center justify-between hover:bg-accent/5 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 border">
                                                        <AvatarImage src={member.avatar_url} />
                                                        <AvatarFallback className="text-[10px] font-bold">
                                                            {getInitials(userName)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-semibold text-xs">{userName}</div>
                                                        <div className="text-[9px] text-muted-foreground">{member.email}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {userRole && (
                                                        <Badge variant="outline" className="text-[9px] h-5 px-2">
                                                            {userRole.role_name || userRole.name}
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-[9px] h-5 px-2 ${member.is_active !== false
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-gray-50 text-gray-600 border-gray-200'
                                                            }`}
                                                    >
                                                        {member.is_active !== false ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* System Architecture & Access Section */}

            <div className="grid gap-4 md:grid-cols-2">
                {/* System Blueprint (Genes) */}
                <Card className="rounded-xl shadow-sm overflow-hidden">
                    <CardHeader className="border-b py-3 px-4 bg-muted/10 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider opacity-80">
                                <Boxes className="h-4 w-4 text-primary" />
                                Gene Managements
                            </CardTitle>
                            <CardDescription className="text-[10px]">Active modular genes in the core</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{genes.length} Total</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[210px]">
                            <div className="divide-y">
                                {genes.map((gene, index) => (
                                    <div key={gene.g_id || gene.id || index} className="p-3 flex items-center justify-between hover:bg-accent/5 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600 border border-pink-100 group-hover:bg-pink-100 transition-colors">
                                                <Zap className="h-3.5 w-3.5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-xs">{gene.g_name || gene.name}</div>
                                                <div className="text-[9px] text-muted-foreground uppercase font-mono">{gene.g_id || 'ID-UNKNOWN'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {gene.users && gene.users.length > 0 && (
                                                <Badge variant="ghost" className="text-[9px] h-5 px-1.5 border gap-1">
                                                    <Users className="h-2.5 w-2.5" />
                                                    {gene.users.length}
                                                </Badge>
                                            )}
                                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none text-[9px] h-5 px-1.5">
                                                Active
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* User Access Mapping (Policies) */}
                <Card className="rounded-xl shadow-sm overflow-hidden">
                    <CardHeader className="border-b py-3 px-4 bg-muted/10 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider opacity-80">
                                <Fingerprint className="h-4 w-4 text-primary" />
                                Access Mapping
                            </CardTitle>
                            <CardDescription className="text-[10px]">Policy distribution and user reach</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{policies.length} Policies</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[210px]">
                            <div className="divide-y">
                                {policies.map((policy, index) => (
                                    <div key={policy.p_id || policy.id || index} className="p-3 flex items-center justify-between hover:bg-accent/5 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                                                <Shield className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="font-semibold text-xs">{policy.p_name || policy.name}</div>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-lg">
                                            <Users className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-[10px] font-bold">{policy.type === 'shared' ? 'Shared' : 'Private'} Access</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Section: Forms & Tables */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Forms Table */}
                <Card className="col-span-full lg:col-span-4 rounded-xl shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
                        <div>
                            <CardTitle className="text-lg font-semibold">Latest Forms</CardTitle>
                            <CardDescription className="text-xs">Recently updated form templates</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table className="w-full">
                            <TableHeader>
                                <TableRow className="bg-muted/10">
                                    <TableHead className="pl-6 h-10 text-[10px] uppercase font-bold tracking-wider">Form Identity</TableHead>
                                    <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider">Author</TableHead>
                                    <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider">Created At</TableHead>
                                    <TableHead className="text-right pr-6 h-10 text-[10px] uppercase font-bold tracking-wider">Management</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentForms.map((form, index) => (
                                    <TableRow key={index} className="h-14">
                                        <TableCell className="pl-6 py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <span className="font-medium text-sm truncate max-w-[140px]">{form.form_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <span className="text-sm">{userMap[form.created_by]?.name || 'Admin'}</span>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(form.created_at || Date.now()).toLocaleDateString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right pr-6 py-2">
                                            <Link href={`/forms/${form.form_id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 text-xs">Modify</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Recent Tables Feed */}
                <Card className="col-span-full lg:col-span-3 rounded-xl shadow-sm border-t-4 border-t-amber-500">
                    <CardHeader className="py-4">
                        <CardTitle className="text-lg font-semibold italic">Recent Tables</CardTitle>
                        <CardDescription className="text-xs">Recently added schemas</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-6 px-4">
                        {recentTables.map((table) => (
                            <Link
                                key={table.table_id || table.id || table._id}
                                href={`/leadPage?tableId=${table.table_id || table.id || table._id}`}
                                className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-amber-200 hover:bg-amber-50 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                        <Database className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 font-medium text-xs truncate">{table.table_name || table.name}</div>
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
