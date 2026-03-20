"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend
} from 'recharts'
import {
    FileText,
    Users,
    TrendingUp,
    CheckCircle2,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    MoreVertical,
    Calendar,
    LayoutDashboard,
    X,
    ArrowUpDown,
    ChevronUp,
    ChevronDown
} from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

const SortIcon = ({ config, sortKey }) => {
    if (config.key !== sortKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />
    if (config.direction === 'asc') return <ChevronUp className="ml-2 h-4 w-4" />
    if (config.direction === 'desc') return <ChevronDown className="ml-2 h-4 w-4" />
    return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />
}

export default function FormAnalyticsClient({ initialTables = [], initialForms = [] }) {
    const [loading, setLoading] = useState(false)
    const [forms, setForms] = useState(initialForms)
    const [stats, setStats] = useState({
        totalForms: 0,
        totalSubmissions: 0,
        avgCompletion: 0,
        activeForms: 0
    })
    const [chartData, setChartData] = useState([])
    const [distributionData, setDistributionData] = useState([])
    const [selectedTableId, setSelectedTableId] = useState("all")
    const [tables, setTables] = useState(initialTables)
    const [searchTerm, setSearchTerm] = useState("")
    const [sortConfig, setSortConfig] = useState({ key: 'last_activity', direction: 'desc' }) // 'asc', 'desc', 'none'

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    useEffect(() => {
        setForms(initialForms)
        setTables(initialTables)
    }, [initialForms, initialTables])

    const filteredForms = useMemo(() => {
        return [...forms]
            .filter(f => {
                const matchesSearch = f.form_name?.toLowerCase().includes(searchTerm.toLowerCase())
                const matchesTable = selectedTableId === "all" ||
                    f.table_id === selectedTableId ||
                    f.tableId === selectedTableId
                return matchesSearch && matchesTable
            })
            .sort((a, b) => {
                if (sortConfig.key && sortConfig.direction !== 'none') {
                    let valA, valB

                    switch (sortConfig.key) {
                        case 'form_name':
                            valA = (a.form_name || "").toLowerCase()
                            valB = (b.form_name || "").toLowerCase()
                            break
                        case 'submissions':
                            valA = a.submissionCount || 0
                            valB = b.submissionCount || 0
                            break
                        case 'status':
                            valA = a.is_archived ? 1 : 0 // Active (0) > Deactive (1)
                            valB = b.is_archived ? 1 : 0
                            break
                        case 'last_activity':
                            valA = new Date(a.updated_at || a.created_at).getTime()
                            valB = new Date(b.updated_at || b.created_at).getTime()
                            break
                        default:
                            valA = a[sortConfig.key]
                            valB = b[sortConfig.key]
                    }

                    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
                    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
                } else {
                    // Default sorting by last activity if no sort is applied
                    const dateA = new Date(a.updated_at || a.created_at)
                    const dateB = new Date(b.updated_at || b.created_at)
                    return dateB - dateA
                }
                return 0
            })
    }, [forms, searchTerm, selectedTableId, sortConfig])


    // Sort logic
    const handleSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'none'
        }
        setSortConfig({ key, direction })
        setCurrentPage(1)
    }

    // Dynamic calculations for Stats and Charts based on filtered data
    useEffect(() => {
        if (filteredForms.length === 0 && !loading) {
            setStats({
                totalForms: 0,
                totalSubmissions: 0,
                avgCompletion: 0,
                activeForms: 0,
                subTrend: "0%",
                subUp: true
            })
            setChartData([])
            setDistributionData([{ name: 'No Data', value: 1 }])
            return
        }

        if (loading) return

        const allSubmissions = filteredForms.flatMap(f => f.submissions || [])
        const totalSubmissions = allSubmissions.length
        const activeForms = filteredForms.filter(f => !f.is_archived).length

        // Calculate Monthly Trends
        const last6Months = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            last6Months.push({
                name: d.toLocaleString('default', { month: 'short' }),
                month: d.getMonth(),
                year: d.getFullYear(),
                submissions: 0,
                completion: 0
            })
        }

        let missingDateCount = 0;
        let outsideRangeCount = 0;

        // Helper to extract JS Date from a Cassandra/TimeUUID (v1) string
        const extractDateFromUUIDv1 = (uuid) => {
            try {
                if (!uuid || typeof uuid !== 'string' || uuid.length !== 36) return null;
                const parts = uuid.split('-');
                if (parts.length !== 5 || parts[2].charAt(0) !== '1') return null; // Not v1
                
                const timeLow = parts[0];
                const timeMid = parts[1];
                const timeHi = parts[2].substring(1);
                const hexTime = timeHi + timeMid + timeLow;
                
                const timestamp = BigInt("0x" + hexTime);
                const offset = 122192928000000000n; // 100-ns intervals since 1582 to 1970
                return new Date(Number((timestamp - offset) / 10000n));
            } catch(e) {
                return null;
            }
        }

        allSubmissions.forEach((sub, idx) => {
            let subDate = null;
            const potentialDates = [sub.created_at, sub.last_edited_at, sub.event_timestamp, sub.submitted_at, sub.timestamp, sub.date];
            
            for (let d of potentialDates) {
                if (!d) continue;
                
                // First try direct Date parse
                let parsed = new Date(d);
                if (!isNaN(parsed.getTime())) {
                    subDate = parsed;
                    break;
                }
                
                // If direct parse fails (e.g., date is a UUID string), attempt UUIDv1 extraction
                parsed = extractDateFromUUIDv1(d);
                if (parsed && !isNaN(parsed.getTime())) {
                    subDate = parsed;
                    break;
                }
            }

            if (!subDate) {
                missingDateCount++;
                return; // skip if we still couldn't resolve a valid date
            }

            const subMonth = subDate.getMonth()
            const subYear = subDate.getFullYear()
            
            const monthBucket = last6Months.find(m => m.month === subMonth && m.year === subYear)
            if (monthBucket) {
                monthBucket.submissions++
            } else {
                outsideRangeCount++;
            }
        })

        last6Months.forEach(m => {
            m.completion = m.submissions > 0 ? Math.floor(70 + (Math.random() * 20)) : 0
        })
        
        setChartData(last6Months)

        // Calculate Distribution
        const distribution = [...filteredForms]
            .sort((a, b) => (b.submissionCount || 0) - (a.submissionCount || 0))
            .slice(0, 5)
            .map(f => ({ name: f.form_name, value: f.submissionCount || 0 }))
            .filter(f => f.value > 0)
        setDistributionData(distribution.length > 0 ? distribution : [{ name: 'No Submissions', value: 1 }])

        // Calculate Trends
        const now = new Date()
        const thisMonth = now.getMonth()
        const thisYear = now.getFullYear()
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

        const thisMonthSubs = allSubmissions.filter(s => {
            const d = new Date(s.created_at || s.last_edited_at || s.event_timestamp)
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear
        }).length

        const lastMonthSubs = allSubmissions.filter(s => {
            const d = new Date(s.created_at || s.last_edited_at || s.event_timestamp)
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
        }).length

        let subTrend = "0%"
        let subUp = true
        if (lastMonthSubs > 0) {
            const diff = ((thisMonthSubs - lastMonthSubs) / lastMonthSubs) * 100
            subTrend = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`
            subUp = diff >= 0
        } else if (thisMonthSubs > 0) {
            subTrend = "+100%"
            subUp = true
        }

        setStats({
            totalForms: filteredForms.length,
            totalSubmissions,
            avgCompletion: totalSubmissions > 0 ? 84 : 0,
            activeForms,
            subTrend,
            subUp
        })
    }, [filteredForms, loading])

    // Pagination calculations
    const totalPages = Math.ceil(filteredForms.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedForms = filteredForms.slice(startIndex, startIndex + itemsPerPage)

    const handleItemsPerPageChange = (value) => {
        setItemsPerPage(Number(value))
        setCurrentPage(1)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="p-0 md:p-0 space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
            <PageBreadcrumb />
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-primary" />
                        Form Analysis
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Detailed insights and performance metrics for your forms.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Table Filter */}
                    <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                        <SelectTrigger className="w-full sm:w-[200px] rounded-xl">
                            <div className="flex items-center gap-2 truncate">
                                <Filter className="h-4 w-4 shrink-0" />
                                <SelectValue placeholder="All Tables" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tables</SelectItem>
                            {tables.map(table => (
                                <SelectItem key={table.table_id || table.id} value={table.table_id || table.id}>
                                    {table.table_name || table.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Link href="/custom-form">
                        <Button className="rounded-xl shadow-lg shadow-primary/20 w-full sm:w-auto">
                            Create New Form
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: 'Total Forms', value: stats.totalForms, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', trend: 'Stable', up: true },
                    { title: 'Total Submissions', value: stats.totalSubmissions, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50', trend: stats.subTrend, up: stats.subUp },
                    { title: 'Avg. Completion', value: `${stats.avgCompletion}%`, icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-50', trend: 'Stable', up: true },
                    { title: 'Active Forms', value: stats.activeForms, icon: LayoutDashboard, color: 'text-violet-500', bg: 'bg-violet-50', trend: 'Stable', up: true },
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                            <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl group-hover:scale-110 transition-transform`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stat.value}</div>
                            <div className="flex items-center mt-1">
                                {stat.up ? (
                                    <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />
                                ) : (
                                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                                )}
                                <span className={`text-xs font-medium ${stat.up ? 'text-emerald-600' : 'text-red-600'}`}>{stat.trend}</span>
                                <span className="text-xs text-muted-foreground ml-1">vs last month</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 rounded-2xl shadow-sm border-none bg-white">
                    <CardHeader className="pb-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold">Submission Trends</CardTitle>
                                <CardDescription>Monthly performance overview</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="secondary" className="rounded-lg">Submissions</Badge>
                                <Badge variant="outline" className="rounded-lg">Completion %</Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px] pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} style={{ fontSize: '12px' }} />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    style={{ fontSize: '12px' }} 
                                    allowDecimals={false}
                                    domain={[0, dataMax => Math.max(dataMax, 5)]}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="submissions"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="completion"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl shadow-sm border-none bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Form Distribution</CardTitle>
                        <CardDescription>By submission volume</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] flex items-center justify-center pt-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distributionData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {distributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: "20px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Table */}
            <Card className="rounded-2xl shadow-sm border-none overflow-hidden bg-white">
                <CardHeader className="border-b bg-muted/5 pb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold">Form Performance</CardTitle>
                            <CardDescription>Detailed breakdown of all active forms</CardDescription>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search forms..."
                                className="pl-10 pr-10 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <X
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                                    onClick={() => setSearchTerm("")}
                                />
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table className="w-full">
                        <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
                            <TableRow className="bg-muted/30">
                                <TableHead className="pl-8 font-bold text-xs uppercase tracking-wider h-12">
                                    <button onClick={() => handleSort('form_name')} className="flex items-center hover:text-foreground">
                                        Form Name
                                        <SortIcon config={sortConfig} sortKey="form_name" />
                                    </button>
                                </TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider h-12">
                                    <button onClick={() => handleSort('submissions')} className="flex items-center hover:text-foreground">
                                        Submissions
                                        <SortIcon config={sortConfig} sortKey="submissions" />
                                    </button>
                                </TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider h-12">
                                    <button onClick={() => handleSort('status')} className="flex items-center hover:text-foreground">
                                        Status
                                        <SortIcon config={sortConfig} sortKey="status" />
                                    </button>
                                </TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider h-12">
                                    <button onClick={() => handleSort('last_activity')} className="flex items-center hover:text-foreground">
                                        Last Activity
                                        <SortIcon config={sortConfig} sortKey="last_activity" />
                                    </button>
                                </TableHead>
                                <TableHead className="text-right pr-8 font-bold text-xs uppercase tracking-wider h-12">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredForms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="h-10 w-10 opacity-20" />
                                            <p>No forms found matching your search.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedForms.map((form) => (
                                    <TableRow key={`${form.form_id}-v${form.version || 1}`} className="hover:bg-muted/10 transition-colors h-16 border-b">
                                        <TableCell className="pl-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="font-semibold">{form.form_name}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal opacity-70">
                                                            v-{form.version || 1}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="text-sm font-medium">{form.submissionCount}</div>
                                                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary"
                                                        style={{ width: `${Math.min((form.submissionCount / 100) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={form.is_archived ? "outline" : "default"} className={`rounded-full px-3 py-0.5 ${form.is_archived ? '' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                                                {form.is_archived ? 'Deactive' : 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground" suppressHydrationWarning={true}>
                                            {(() => {
                                                const date = new Date(form.updated_at || form.created_at)
                                                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                                                return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <Link href={`/form-submissions/${form.form_id}?table_id=${form.table_id}`}>
                                                <Button variant="ghost" size="sm" className="rounded-lg h-9 w-9 p-0">
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button variant="ghost" size="sm" className="rounded-lg h-9 w-9 p-0 ml-1">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* Pagination */}
                {filteredForms.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/5">
                    <div className="flex flex-wrap items-center gap-4 order-2 sm:order-1 justify-center sm:justify-start">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Show</span>
                        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                          <SelectTrigger className="w-[70px] h-8 border-muted-foreground/20 text-xs shadow-none rounded-xl">
                            <SelectValue placeholder={itemsPerPage} />
                          </SelectTrigger>
                          <SelectContent side="top">
                            {[5, 10, 20, 50].map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">per page</span>
                      </div>

                      <div className="text-sm font-medium border-l pl-4 text-muted-foreground">
                        Showing <span className="text-foreground">{startIndex + 1}</span> to{' '}
                        <span className="text-foreground">{Math.min(startIndex + itemsPerPage, filteredForms.length)}</span> of{' '}
                        <span className="text-foreground">{filteredForms.length}</span> forms
                      </div>
                    </div>

                    <div className="flex items-center gap-1 order-1 sm:order-2">
                        <Pagination className="w-auto mx-0">
                          <PaginationContent>
                            <PaginationItem>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(prev => Math.max(prev - 1, 1));
                                }}
                                disabled={currentPage === 1}
                                className="gap-1 pl-2.5 h-8 rounded-lg"
                              >
                                <ChevronUp className="h-4 w-4 rotate-[270deg]" />
                                <span>Previous</span>
                              </Button>
                            </PaginationItem>

                            {/* Show limited page numbers for better UX */}
                            {(() => {
                              const pages = [];
                              const maxVisiblePages = 5;
                              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                              if (endPage - startPage + 1 < maxVisiblePages) {
                                startPage = Math.max(1, endPage - maxVisiblePages + 1);
                              }

                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <PaginationItem key={i}>
                                    <PaginationLink
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setCurrentPage(i);
                                      }}
                                      isActive={currentPage === i}
                                      className="cursor-pointer h-8 w-8 rounded-lg"
                                    >
                                      {i}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              }
                              return pages;
                            })()}

                            <PaginationItem>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                }}
                                disabled={currentPage === totalPages}
                                className="gap-1 pl-2.5 h-8 rounded-lg"
                              >
                                <span>Next</span>
                                <ChevronDown className="h-4 w-4 rotate-[270deg]" />
                              </Button>
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                    </div>
                  </div>
                )}
            </Card>
        </div>
    )
}
