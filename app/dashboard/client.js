"use client"

import { useState, useEffect, useMemo } from "react"
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
    Cpu,
    ExternalLink,
    Flame,
    TriangleAlert,
    DollarSign,
    BarChart2
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
import { authUtils } from "@/lib/auth-utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    BarChart,
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    AreaChart,
    Area
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { recordsApi, stageApi, strategyApi } from "@/lib/api-endpoint"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { getInitials } from "@/lib/utils"

export default function DashboardClient({
    initialStats,
    initialRecentForms,
    initialRecentTables,
    initialRecentLeads,
    initialUserMap,
    initialActivities,
    initialGenes,
    initialPolicies,
    initialRoles,
    initialTeamMembers,
    initialChartData,
    initialUpcomingActivities,
    initialCurrentUser,
    initialAllUsers = [],
    initialActiveTables = [],
}) {
    const [stats, setStats] = useState(initialStats)
    const [recentForms, setRecentForms] = useState(initialRecentForms)
    const [recentTables, setRecentTables] = useState(initialRecentTables)
    const [recentLeads, setRecentLeads] = useState(initialRecentLeads)
    const [userMap, setUserMap] = useState(initialUserMap)
    const [activities, setActivities] = useState(initialActivities)
    const [genes, setGenes] = useState(initialGenes)
    const [policies, setPolicies] = useState(initialPolicies)
    const [roles, setRoles] = useState(initialRoles)
    const [teamMembers, setTeamMembers] = useState(initialTeamMembers)
    const [currentUser, setCurrentUser] = useState(initialCurrentUser)
    const [chartData, setChartData] = useState(initialChartData)
    const [upcomingActivities, setUpcomingActivities] = useState(initialUpcomingActivities)
    const [activeTables, setActiveTables] = useState(initialActiveTables)

    // ── Lead Analytics States ──
    const [selectedTableId, setSelectedTableId] = useState(
        initialActiveTables?.[0]?.table_id || initialActiveTables?.[0]?.id || ''
    )
    const [tableRecords, setTableRecords] = useState([])
    const [tableStages, setTableStages] = useState([])
    const [loadingAnalytics, setLoadingAnalytics] = useState(false)

    const [alerts] = useState([
        { id: 1, title: 'New Form Response', desc: 'Someone submitted "Contact Us" form', time: '2 mins ago', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
        { id: 2, title: 'Server Health', desc: 'All systems operating at 99.9% uptime', time: '1 hour ago', icon: Server, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { id: 3, title: 'User Access', desc: 'New role "Manager" added to system', time: '3 hours ago', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-50' },
    ])

    const ICON_MAP = {
        UserPlus, FileText, Database, Zap, Activity, Bell, CalendarCheck, Flag
    }

    // Resolve serialized iconKey strings from server to actual components
    const resolvedActivities = activities.map(a => ({
        ...a,
        icon: ICON_MAP[a.iconKey] || Flag
    }))

    const [mounted, setMounted] = useState(false)

    // Get current user from client-side cookies for personalization if not passed from server
    useEffect(() => {
        setMounted(true)
        if (!currentUser) {
            const tokens = authUtils.getTokens()
            if (tokens?.user) {
                setCurrentUser(tokens.user)
            }
        }

        const user = authUtils.getUser()
        if (user?.features) {
            const modules = user.features.map(f => f.module?.toLowerCase())
            const filteredTables = initialActiveTables.filter(t => modules.includes((t.table_name || t.name)?.toLowerCase()))
            setActiveTables(filteredTables)
            setSelectedTableId(prevId => {
                if (filteredTables.length > 0 && !filteredTables.find(t => (t.table_id || t.id) === prevId)) {
                    return filteredTables[0].table_id || filteredTables[0].id
                }
                return filteredTables.length > 0 ? prevId : ''
            })
        }
    }, [currentUser, initialActiveTables])

    // Re-calculate team members on the client once currentUser is available
    useEffect(() => {
        if (currentUser && initialAllUsers.length > 0) {
            const currentUserId = currentUser.user_id || currentUser.id
            if (currentUserId) {
                const myTeam = initialAllUsers.filter(u => u.reporting_id === currentUserId)
                setTeamMembers(myTeam)
            }
        }
    }, [currentUser, initialAllUsers])

    // ── Fetch analytics data when table selection changes ──
    useEffect(() => {
        if (!selectedTableId) return
        let cancelled = false
        const fetchAnalytics = async () => {
            setLoadingAnalytics(true)
            try {
                const [recordsRes, strategyRes] = await Promise.all([
                    recordsApi.getAll(selectedTableId, { limit: 200 }),
                    strategyApi.getAll(selectedTableId)
                ])
                if (cancelled) return
                const recs = recordsRes?.data?.data ||
                    (Array.isArray(recordsRes?.data) ? recordsRes.data : [])
                setTableRecords(recs)

                const strats = Array.isArray(strategyRes?.data)
                    ? strategyRes.data
                    : (strategyRes?.data?.data || [])
                if (strats[0]) {
                    const stagesRes = await stageApi.getAll(selectedTableId, strats[0].strategy_id)
                    if (!cancelled) {
                        setTableStages(
                            Array.isArray(stagesRes?.data) ? stagesRes.data : (stagesRes?.data?.data || [])
                        )
                    }
                } else {
                    setTableStages([])
                }
            } catch (err) {
                console.error('Failed to load table analytics:', err)
            } finally {
                if (!cancelled) setLoadingAnalytics(false)
            }
        }
        fetchAnalytics()
        return () => { cancelled = true }
    }, [selectedTableId])

    // ── Analytics Computations ──
    const safeRecords = useMemo(() => Array.isArray(tableRecords) ? tableRecords : [], [tableRecords])
    const totalLeads = safeRecords.length

    const oneWeekAgo = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d }, [])
    const recentLeadsList = useMemo(() => safeRecords.filter(r => new Date(r.created_at || 0) >= oneWeekAgo), [safeRecords, oneWeekAgo])
    const recentLeadsCount = recentLeadsList.length
    const hotLeadsCount = useMemo(() => safeRecords.filter(r => r.lead_score != null && parseFloat(r.lead_score) >= 70).length, [safeRecords])

    const avgScore = useMemo(() =>
        safeRecords.length > 0
            ? Math.round(safeRecords.reduce((s, r) => s + (parseFloat(r.lead_score) || 0), 0) / safeRecords.length)
            : 0
    , [safeRecords])

    const avgScoreTrend = useMemo(() => {
        const oldLeads = safeRecords.filter(r => new Date(r.created_at || 0) < oneWeekAgo)
        const oldAvg = oldLeads.length > 0
            ? Math.round(oldLeads.reduce((s, r) => s + (parseFloat(r.lead_score) || 0), 0) / oldLeads.length)
            : avgScore
        return avgScore - oldAvg
    }, [safeRecords, oneWeekAgo, avgScore])

    const pipelineVal = useMemo(() =>
        safeRecords.reduce((s, r) => s + (parseFloat(r.deal_value || r.value || 0) || 0), 0)
    , [safeRecords])
    const recentPipelineVal = useMemo(() =>
        recentLeadsList.reduce((s, r) => s + (parseFloat(r.deal_value || r.value || 0) || 0), 0)
    , [recentLeadsList])

    const staleLeadsCount = useMemo(() =>
        safeRecords.filter(r => {
            const last = r.updated_at || r.created_at
            return last && (Date.now() - new Date(last).getTime()) / 86400000 > 7
        }).length
    , [safeRecords])

    const stageColorConfig = {
        new: { chart: '#9ca3af' }, contacted: { chart: '#3b82f6' },
        qualified: { chart: '#a855f7' }, proposal: { chart: '#f59e0b' },
        negotiation: { chart: '#f97316' }, won: { chart: '#22c55e' }, lost: { chart: '#ef4444' },
    }

    const sortedStages = useMemo(() =>
        tableStages.length > 0
            ? [...tableStages].sort((a, b) => (a.min_score || 0) - (b.min_score || 0))
            : []
    , [tableStages])

    const stageDistribution = useMemo(() => {
        const order = sortedStages.length > 0
            ? sortedStages.map(s => s.stage_name || s.name || s.label).filter(Boolean)
            : ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']
        return order.map(s => ({
            stage: s,
            count: safeRecords.filter(r => s && r.lead_stage?.toLowerCase() === s.toLowerCase()).length
        }))
    }, [sortedStages, safeRecords])

    const fallbackMapping = [
        { label: '0–19', min: 0, max: 19, color: 'bg-gray-400', customColour: null, name: 'New' },
        { label: '20–39', min: 20, max: 39, color: 'bg-blue-500', customColour: null, name: 'Contacted' },
        { label: '40–59', min: 40, max: 59, color: 'bg-purple-500', customColour: null, name: 'Qualified' },
        { label: '60–74', min: 60, max: 74, color: 'bg-amber-500', customColour: null, name: 'Proposal' },
        { label: '75–89', min: 75, max: 89, color: 'bg-orange-500', customColour: null, name: 'Negotiation' },
        { label: '90–100', min: 90, max: 100, color: 'bg-green-500', customColour: null, name: 'Won' },
    ]
    const stageBuckets = useMemo(() =>
        sortedStages.length > 0
            ? sortedStages.map(s => {
                const name = s.stage_name || s.name || s.label
                const sc = stageColorConfig[name?.toLowerCase()] || stageColorConfig.new
                const cc = s.colour || null
                return { label: `${s.min_score}–${s.max_score}`, min: s.min_score, max: s.max_score, color: cc ? null : 'bg-gray-400', customColour: cc, name }
            })
            : fallbackMapping
    , [sortedStages])

    const scoreBuckets = useMemo(() => {
        const maxCount = Math.max(...stageBuckets.map(b => {
            const cnt = safeRecords.filter(r => { const v = parseFloat(r.lead_score); return !isNaN(v) && v >= b.min && v <= b.max }).length
            return cnt
        }), 1)
        return stageBuckets.map(b => ({
            ...b,
            count: safeRecords.filter(r => { const v = parseFloat(r.lead_score); return !isNaN(v) && v >= b.min && v <= b.max }).length,
            maxCount
        }))
    }, [stageBuckets, safeRecords])

    const currentMonthName = useMemo(() => new Date().toLocaleString('default', { month: 'short' }), [])
    const avgScoreTrendData = useMemo(() => {
        const now = new Date(), cm = now.getMonth(), cy = now.getFullYear()
        const grouped = {}
        safeRecords.forEach(r => {
            if (!r.created_at || r.lead_score == null) return
            const d = new Date(r.created_at)
            if (d.getMonth() === cm && d.getFullYear() === cy) {
                const day = d.getDate().toString()
                if (!grouped[day]) grouped[day] = { sum: 0, count: 0 }
                grouped[day].sum += parseFloat(r.lead_score) || 0
                grouped[day].count += 1
            }
        })
        const days = Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b))
        return days.length > 0
            ? days.map(day => ({ date: day, score: Math.round(grouped[day].sum / grouped[day].count) }))
            : [{ date: now.getDate().toString(), score: 0 }]
    }, [safeRecords])

    const openFormInNewTab = (form) => {
        const tokens = authUtils.getTokens()
        const userId = tokens?.user?.user_id || tokens?.user?.id || tokens?.user_id || ''
        const orgId = authUtils.getOrganizationId()
        const tableId = form.table_id || ''
        const version = form.version || 1
        const url = `${window.location.origin}/forms/${form.form_id}?user_id=${userId}&version=${version}&org_id=${orgId}&table_id=${tableId}`
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const getLeadName = (lead) => {
        if (!lead || !lead.field_values) return 'Unknown Lead'
        return lead.field_values.name || lead.field_values.full_name || lead.field_values.first_name || 'New Lead #' + (lead.record_id || '').slice(0, 4)
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

            {/* Quick Stats Grid */}
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

                    {/* ── TABLE ANALYTICS HUB ── */}
                    <Card className="rounded-xl overflow-hidden shadow-sm border">
                        <CardHeader className="bg-muted/30 pb-4 border-b">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-primary" />
                                        Table Analytics Hub
                                    </CardTitle>
                                    <CardDescription>Lead metrics for selected table</CardDescription>
                                </div>
                                {activeTables.length > 0 && (
                                    <div className="w-full sm:w-[220px] shrink-0">
                                        <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                                            <SelectTrigger className="h-9 bg-background shadow-sm">
                                                <SelectValue placeholder="Select a table" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {activeTables.map(t => (
                                                    <SelectItem key={t.table_id || t.id} value={t.table_id || t.id}>
                                                        {t.table_name || t.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {/* ── 5 STAT MINI-CARDS ── */}
                            <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
                                <Card className="border shadow-none bg-blue-50/50">
                                    <CardContent className="p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Total</p>
                                            <Users className="h-3 w-3 text-blue-500" />
                                        </div>
                                        {loadingAnalytics ? <Skeleton className="h-5 w-8" /> : <p className="text-lg font-extrabold tracking-tight">{totalLeads}</p>}
                                        <p className="text-[9px] text-green-600 mt-0.5">+{recentLeadsCount} this wk</p>
                                    </CardContent>
                                </Card>
                                <Card className="border shadow-none bg-orange-50/50">
                                    <CardContent className="p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Hot</p>
                                            <Flame className="h-3 w-3 text-orange-500" />
                                        </div>
                                        {loadingAnalytics ? <Skeleton className="h-5 w-8" /> : <p className="text-lg font-extrabold tracking-tight">{hotLeadsCount}</p>}
                                        <p className="text-[9px] text-muted-foreground mt-0.5">Score ≥ 70</p>
                                    </CardContent>
                                </Card>
                                <Card className="border shadow-none bg-purple-50/50">
                                    <CardContent className="p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Avg</p>
                                            <BarChart2 className="h-3 w-3 text-purple-500" />
                                        </div>
                                        {loadingAnalytics ? <Skeleton className="h-5 w-8" /> : <p className="text-lg font-extrabold tracking-tight">{avgScore}</p>}
                                        <p className={`text-[9px] mt-0.5 ${avgScoreTrend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {avgScoreTrend > 0 ? '+' : ''}{avgScoreTrend} vs prev
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="border shadow-none bg-green-50/50">
                                    <CardContent className="p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Pipeline</p>
                                            <DollarSign className="h-3 w-3 text-green-500" />
                                        </div>
                                        {loadingAnalytics ? <Skeleton className="h-5 w-8" /> : (
                                            <p className="text-lg font-extrabold tracking-tight">
                                                {pipelineVal > 0 ? `$${pipelineVal >= 1000 ? Math.round(pipelineVal / 1000) + 'K' : pipelineVal}` : '$0'}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                                <Card className="border shadow-none bg-red-50/50 relative overflow-hidden">
                                    <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <CardContent className="p-2.5">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Stale</p>
                                            <Clock className="h-3 w-3 text-red-500" />
                                        </div>
                                        {loadingAnalytics ? <Skeleton className="h-5 w-8" /> : <p className="text-lg font-extrabold tracking-tight text-red-600">{staleLeadsCount}</p>}
                                        <p className="text-[9px] text-red-500 mt-0.5">&gt; 1 week old</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* ── CHARTS ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Stage Distribution */}
                                <div className="p-4 rounded-xl border bg-blue-50/10 flex flex-col">
                                    <h4 className="text-[12px] font-semibold text-foreground mb-3">Stage Distribution</h4>
                                    <div className="h-36 w-full">
                                        <ChartContainer config={{ count: { label: 'Leads', theme: { light: 'hsl(var(--primary))', dark: 'hsl(var(--primary))' } } }} className="h-full w-full">
                                            <RechartsBarChart data={stageDistribution} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                                <XAxis dataKey="stage" tickLine={false} axisLine={false} tickMargin={6} fontSize={9} tickFormatter={v => v.length > 7 ? v.slice(0, 7) + '…' : v} />
                                                <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={9} allowDecimals={false} />
                                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                                <Bar dataKey="count" radius={[3, 3, 0, 0]} barSize={28}>
                                                    {stageDistribution.map((entry, i) => {
                                                        const sc = stageColorConfig[entry.stage?.toLowerCase()] || { chart: 'hsl(var(--primary))' }
                                                        const stageObj = sortedStages.find(s => (s.stage_name || s.name || s.label)?.toLowerCase() === entry.stage?.toLowerCase())
                                                        return <Cell key={i} fill={stageObj?.colour || sc.chart} fillOpacity={0.9} />
                                                    })}
                                                </Bar>
                                            </RechartsBarChart>
                                        </ChartContainer>
                                    </div>
                                </div>

                                {/* Avg Score Trend */}
                                <div className="p-4 rounded-xl border bg-violet-50/10 flex flex-col">
                                    <h4 className="text-[12px] font-semibold text-foreground mb-3">
                                        Score Trend <span className="font-normal text-muted-foreground">({new Date().toLocaleString('default', { month: 'short', year: 'numeric' })})</span>
                                    </h4>
                                    <div className="h-36 w-full">
                                        <ChartContainer config={{ score: { label: 'Avg Score', theme: { light: 'oklch(0.58 0.09 200)', dark: 'oklch(0.58 0.09 200)' } } }} className="h-full w-full">
                                            <AreaChart data={avgScoreTrendData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="dashScoreGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="var(--color-score)" stopOpacity={0.18} />
                                                        <stop offset="95%" stopColor="var(--color-score)" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={6} fontSize={9} tickFormatter={v => `${currentMonthName} ${v}`} />
                                                <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={9} domain={[0, 100]} />
                                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                                <Area type="monotone" dataKey="score" stroke="var(--color-score)" fill="url(#dashScoreGrad)" strokeWidth={2.5} />
                                            </AreaChart>
                                        </ChartContainer>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Latest 5 Leads */}
                    <Card className="rounded-xl shadow-sm overflow-hidden gap-0 py-2">
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
                                                        {lead._source_table_name || 'CRM Table'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 text-sm text-muted-foreground" suppressHydrationWarning={true}>
                                                    {(() => {
                                                        const d = new Date(lead.created_at || Date.now())
                                                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                                                        return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
                                                    })()}
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

                    {/* ── SCORE DISTRIBUTION ── */}
                    <Card className="rounded-xl shadow-sm overflow-hidden border">
                        <CardHeader className="py-3 px-4 bg-muted/10 border-b">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider opacity-80">
                                <PieChart className="h-4 w-4 text-primary" />
                                Score Distribution
                            </CardTitle>
                            <CardDescription className="text-[10px]">Lead score breakdown for selected table</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2.5">
                            {scoreBuckets.map(({ label, color, customColour, count, maxCount, name }) => (
                                <div key={label} className="flex items-center gap-3 group cursor-pointer" title={`${name}: ${count} leads in ${label}`}>
                                    <span className="text-[9px] text-muted-foreground w-10 shrink-0 tabular-nums">{label}</span>
                                    <div className="flex-1 h-3 bg-muted/40 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all group-hover:brightness-110 ${customColour ? '' : (color || 'bg-gray-400')}`}
                                            style={customColour
                                                ? { backgroundColor: customColour, width: `${(count / maxCount) * 100}%` }
                                                : { width: `${(count / maxCount) * 100}%` }}
                                        />
                                    </div>
                                    <div className="w-16 shrink-0 flex items-center gap-1">
                                        {customColour
                                            ? <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: customColour }} />
                                            : <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${color || 'bg-gray-400'}`} />}
                                        <span className="text-xs font-bold tabular-nums">{count}</span>
                                        <span className="text-[9px] text-muted-foreground truncate capitalize">{name}</span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Recent Activity Log */}
                    <Card className="rounded-xl shadow-sm gap-0 py-2">
                        <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider opacity-80">
                                <Activity className="h-4 w-4 text-primary" />
                                Recent Activity
                            </CardTitle>
                            <Badge className="bg-primary/10 text-primary border-none text-[10px] h-5 px-1.5">{resolvedActivities.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[180px]">
                                <div className="divide-y">
                                    {resolvedActivities.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground">
                                            No recent activity detected.
                                        </div>
                                    ) : (
                                        resolvedActivities.map((activity) => (
                                            <div key={activity.id} className="p-2 flex gap-3 hover:bg-accent/5 transition-colors cursor-pointer group">
                                                <div className={`mt-0.5 h-7 w-7 flex-shrink-0 rounded-lg ${activity.bg} flex items-center justify-center`}>
                                                    <activity.icon className={`h-3.5 w-3.5 ${activity.color}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="font-semibold text-[11px] truncate group-hover:text-primary transition-colors">{activity.title}</span>
                                                        <span className="text-[8px] text-muted-foreground whitespace-nowrap" suppressHydrationWarning={true}>
                                                            {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground line-clamp-1">{activity.desc}</p>
                                                </div>
                                            </div>
                                        ))
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

                    {/* Quick Access Grid */}
                    <Card className="rounded-xl shadow-sm flex-1 flex flex-col gap-0">
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
                                { name: 'Roles', href: '/roles', icon: Shield, color: 'bg-slate-100 text-slate-600' },
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
                <Card className="rounded-xl shadow-sm overflow-hidden gap-0 py-2">
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
                <Card className="rounded-xl shadow-sm overflow-hidden gap-0 py-2">
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
                <Card className="rounded-xl shadow-sm overflow-hidden gap-0 py-2">
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
                <Card className="rounded-xl shadow-sm overflow-hidden gap-0 py-2">
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
                <Card className="col-span-full lg:col-span-4 rounded-xl shadow-sm overflow-hidden gap-0 py-2">
                    <CardHeader className="flex flex-row items-center justify-between py-0 border-b">
                        <div>
                            <CardTitle className="text-lg font-semibold">Latest Forms</CardTitle>
                            <CardDescription className="text-xs">Recently updated form templates</CardDescription>
                        </div>
                        <Link href="/my-forms">
                            <Button variant="ghost" size="sm" className="group">
                                View All <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table className="w-full">
                            <TableHeader>
                                <TableRow className="bg-muted/10">
                                    <TableHead className="pl-6 h-10 text-[10px] uppercase font-bold tracking-wider">Form Identity</TableHead>
                                    <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider">Author</TableHead>
                                    <TableHead className="h-10 text-[10px] uppercase font-bold tracking-wider">Created At</TableHead>
                                    <TableHead className="text-right pr-6 h-10 text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentForms.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                            No forms found.
                                        </TableCell>
                                    </TableRow>
                                ) : recentForms.map((form) => (
                                    <TableRow key={`${form.form_id || form.id}-${form.version || 1}`} className="h-14">
                                        <TableCell className="pl-6 py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-medium text-sm truncate max-w-[140px] block">{form.form_name}</span>
                                                    <span className="text-[10px] text-muted-foreground">v-{form.version || 1}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <span className="text-sm">{userMap[form.created_by]?.name || 'Admin'}</span>
                                        </TableCell>
                                        <TableCell className="py-2" suppressHydrationWarning={true}>
                                            <span className="text-sm text-muted-foreground">
                                                {(() => {
                                                    const d = new Date(form.created_at || Date.now())
                                                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                                                    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
                                                })()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right pr-6 py-2">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href="/my-forms">
                                                    <Button variant="ghost" size="sm" className="h-8 text-xs">Modify</Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                    onClick={() => openFormInNewTab(form)}
                                                    title={`Open form v-${form.version || 1} in new tab`}
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Open (v-{form.version || 1})
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Recent Tables Feed */}
                <Card className="col-span-full lg:col-span-3 rounded-xl shadow-sm border-t-4 border-t-amber-500 gap-0 py-2">
                    <CardHeader className="py-0">
                        <CardTitle className="text-lg font-semibold italic">Recent Tables</CardTitle>
                        <CardDescription className="text-xs">Recently active table</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-6 px-4 py-4">
                        {recentTables.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No active tables found.
                            </div>
                        ) : recentTables.map((table) => (
                            <Link
                                key={table.table_id || table.id || table._id}
                                href={`/custom-table-builder?tableId=${table.table_id || table.id || table._id}`}
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
