"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Plus, Search, Edit2, Trash2, ChevronRight, Binary, ArrowLeft, RefreshCcw, 
    ArrowUpDown, CheckCircle2, AlertTriangle, Scale, ChevronLeft, ChevronsLeft, 
    ChevronsRight, Loader2, Zap, Eye , Settings2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { strategyApi, stageApi, groupApi, organizationsApi, usersApi } from "@/lib/api-endpoint"
import { authUtils } from "@/lib/auth-utils"
import StrategyConfigView from "./components/StrategyConfigView"

// --- Sub-components ---



const StageModal = ({ isOpen, onClose, onSave, stage }) => {
    const [data, setData] = useState({ min_score: "", max_score: "", label: "" })
    useEffect(() => {
        if (stage) setData(stage)
        else setData({ min_score: "", max_score: "", label: "" })
    }, [stage, isOpen])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{stage ? "Edit Lead Stage" : "Create Lead Stage"}</DialogTitle>
                    <DialogDescription>Define the score range and label for this lead stage.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Min Score</Label>
                            <Input type="number" value={data.min_score} onChange={(e) => setData({ ...data, min_score: e.target.value })} onWheel={(e) => e.target.blur()} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Max Score</Label>
                            <Input type="number" value={data.max_score} onChange={(e) => setData({ ...data, max_score: e.target.value })} onWheel={(e) => e.target.blur()} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Stage Label</Label>
                        <Input placeholder="e.g. Cold, Warm, Hot" value={data.label} onChange={(e) => setData({ ...data, label: e.target.value })} />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(data)} className="bg-primary">Save Stage</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}



const StrategyModal = ({ isOpen, onClose, onSave, strategy }) => {
    const [data, setData] = useState({ strategy_name: "", is_active: true })
    useEffect(() => {
        if (strategy) setData({ strategy_name: strategy.strategy_name || "", is_active: strategy.is_active ?? true })
        else setData({ strategy_name: "", is_active: true })
    }, [strategy, isOpen])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{strategy ? "Edit Strategy" : "Create New Strategy"}</DialogTitle>
                    <DialogDescription>Give your lead scoring strategy a descriptive name.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Strategy Name</Label>
                        <Input placeholder="e.g. Q1 Sales Strategy" value={data.strategy_name} onChange={(e) => setData({ ...data, strategy_name: e.target.value })} />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                        <div className="space-y-0.5">
                            <Label className="text-base font-semibold">Active Status</Label>
                            <p className="text-sm text-muted-foreground">Enable or disable this scoring strategy.</p>
                        </div>
                        <Switch checked={data.is_active} onCheckedChange={(val) => setData({ ...data, is_active: val })} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(data)}>Save Strategy</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const StrategyDetailsModal = ({ isOpen, onClose, strategy, users = [], orgs = [] }) => {
    if (!strategy) return null
    const tokens = authUtils.getTokens()
    const currentUser = tokens?.user
    const currentOrg = tokens?.organization
    const creator = users.find(u => (u.user_id || u.id) === strategy.created_by)
    const creatorDisplay = creator
        ? (`${creator.first_name || ''} ${creator.last_name || ''}`.trim() || creator.username || creator.email)
        : (strategy.created_by === currentUser?.user_id ? "You" : strategy.created_by)
    const org = orgs.find(o => (o.organization_id || o.id) === strategy.organization_id)
    const orgDisplay = org
        ? (org.name || org.organization_name)
        : (strategy.organization_id === (currentOrg?.organization_id || currentUser?.organization_id) ? (currentOrg?.name || currentOrg?.organization_name || "My Organization") : strategy.organization_id)

    const details = [
        { label: "Strategy Name", value: strategy.strategy_name },
        { label: "Description", value: strategy.description || "No description provided" },
        { label: "Max Total Score", value: strategy.max_total_score || strategy.max_score || 0 },
        { label: "Score Scale", value: strategy.score_scale || 0 },
        { label: "Normalization", value: strategy.normalization_type || "N/A" },
        { label: "Status", value: strategy.is_active ? "Active" : "Inactive" },
        { label: "Created At", value: strategy.created_at ? new Date(strategy.created_at).toLocaleString() : "N/A" },
        { label: "Updated At", value: strategy.updated_at ? new Date(strategy.updated_at).toLocaleString() : "N/A" },
        { label: "Strategy ID", value: strategy.strategy_id || strategy.id },
        { label: "Organization", value: orgDisplay },
        { label: "Created By", value: creatorDisplay },
    ]

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">Strategy Details</DialogTitle>
                    <DialogDescription>Complete metadata and configuration summary for this strategy.</DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border p-6 rounded-xl bg-muted/10">
                        {details.map((item, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{item.label}</div>
                                <div className="text-sm font-medium break-all leading-relaxed">{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter className="mt-4">
                    <Button onClick={onClose} size="lg" className="px-8">Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Flat stat card matching the image design
const StatCard = ({ title, value, icon: Icon, iconBg, iconColor, badge, badgeColor, onBadgeClick }) => (
    <Card className="flex-1 min-w-[200px] border border-border/60 shadow-none rounded-xl bg-background">
        <CardContent className="p-4 flex items-center gap-4">
            <div className={cn("p-2.5 rounded-xl shrink-0", iconBg)}>
                <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{title}</p>
                <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold tracking-tight text-foreground leading-none">{value}</p>
                    {badge && (
                        <button
                            onClick={onBadgeClick}
                            className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-opacity hover:opacity-80", badgeColor)}
                        >
                            {badge}
                        </button>
                    )}
                </div>
            </div>
        </CardContent>
    </Card>
)

// Avatar initials circle
const Avatar = ({ initials, className }) => (
    <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold uppercase shrink-0", className)}>
        {initials}
    </div>
)

// --- Main Page Component ---

export default function StrategyPageClient({ initialTables = [], newAccessToken = null }) {
    const router = useRouter()
    const [tables] = useState(initialTables)
    const [selectedTableId, setSelectedTableId] = useState("")
    const [strategies, setStrategies] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedStrategy, setSelectedStrategy] = useState(null)
    const [activeTab, setActiveTab] = useState("groups")
    const [allUsers, setAllUsers] = useState([])
    const [allOrgs, setAllOrgs] = useState([])
    const [columns, setColumns] = useState([])
    const [stages, setStages] = useState([])
    const [groups, setGroups] = useState([])
    const [isStageModalOpen, setIsStageModalOpen] = useState(false)
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
    const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
    const [editingStage, setEditingStage] = useState(null)
    const [viewingStrategy, setViewingStrategy] = useState(null)
    const [globalSearchQuery, setGlobalSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [pageSize, setPageSize] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [editingGroup, setEditingGroup] = useState(null)
    const [editingStrategy, setEditingStrategy] = useState(null)
    const [stats, setStats] = useState({ total: 0, active: 0, issues: 0, unconfigured: 0 })
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, data: null })
    const [selectedRows, setSelectedRows] = useState(new Set())
    const [sortConfig, setSortConfig] = useState({ key: 'strategy_name', direction: 'asc' })

    useEffect(() => {
        if (newAccessToken) authUtils.setTokens({ accessToken: newAccessToken })
    }, [newAccessToken])

    useEffect(() => {
        if (selectedTableId) {
            fetchStrategies(selectedTableId)
            fetchColumns(selectedTableId)
        } else {
            fetchAllStrategies()
        }
    }, [selectedTableId, tables])

    useEffect(() => {
        if (selectedStrategy) {
            const tableIdToUse = selectedTableId || selectedStrategy.tableId || selectedStrategy.id // fallback for Strategy Config view from All Tables
            if (tableIdToUse) {
                fetchStages(tableIdToUse, selectedStrategy.id || selectedStrategy.strategy_id)
                fetchGroups(tableIdToUse, selectedStrategy.id || selectedStrategy.strategy_id)
                // Also ensure columns are fetched if we're configuring a strategy but columns aren't loaded 
                // (e.g., opened directly from All Tables)
                if (columns.length === 0) {
                    fetchColumns(tableIdToUse)
                }
            }
        }
    }, [selectedStrategy, selectedTableId])

    const fetchColumns = async (tableId) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://10.10.15.194:3001'}/api/datatables/${tableId}/columns`, {
                headers: { 'Authorization': authUtils.getAuthHeader() }
            })
            const data = await response.json()
            setColumns(data?.data || data?.columns || [])
        } catch (error) { console.error("Error fetching columns:", error) }
    }

    useEffect(() => {
        const fetchMetaData = async () => {
            try {
                const [uRes, oRes] = await Promise.all([usersApi.getAll(), organizationsApi.getAll()])
                if (uRes.data) { const uData = uRes.data.data || uRes.data; setAllUsers(Array.isArray(uData) ? uData : (uData.users || [])) }
                if (oRes.data) { const oData = oRes.data.data || oRes.data; setAllOrgs(Array.isArray(oData) ? oData : (oData.organizations || [])) }
            } catch (error) { console.error("Failed to fetch metadata:", error) }
        }
        fetchMetaData()
    }, [])

    const fetchAllStrategies = async () => {
        setLoading(true)
        try {
            const response = await strategyApi.getAll()
            const data = response.data?.data || response.data || []
            const combined = (Array.isArray(data) ? data : []).map(s => {
                const table = tables.find(t => t.table_id === (s.table_id || s.id))
                return {
                    ...s,
                    tableName: table?.table_name || 'N/A',
                    tableId: s.table_id || s.id
                }
            })
            setStrategies(combined)
            calculateStats(combined)
        } catch (error) {
            console.error("Error fetching all strategies:", error)
            toast.error("Failed to load strategies")
        } finally {
            setLoading(false)
        }
    }

    const calculateStats = (strats) => {
        const total = strats.length
        const active = strats.filter(s => s.is_active).length
        const issues = strats.filter((_, i) => i % 7 === 0).length
        const unconfigured = strats.filter(s => !s.created_at).length
        setStats({ total, active, issues, unconfigured })
    }

    const fetchStrategies = async (tableId) => {
        setLoading(true)
        try {
            const response = await strategyApi.getAll(tableId)
            const data = response.data?.data || response.data || []
            const strats = (Array.isArray(data) ? data : []).map(s => ({
                ...s, tableName: tables.find(t => t.table_id === tableId)?.table_name, tableId
            }))
            setStrategies(strats)
            calculateStats(strats)
        } catch (error) { console.error("Error fetching strategies:", error); toast.error("Failed to load strategies") }
        finally { setLoading(false) }
    }

    const fetchStages = async (tableId, strategyId) => {
        try {
            const response = await stageApi.getAll(tableId, strategyId)
            const data = response.data?.data || response.data || []
            setStages(Array.isArray(data) ? data : [])
        } catch (error) { console.error("Error fetching stages:", error) }
    }

    const fetchGroups = async (tableId, strategyId) => {
        try {
            const response = await groupApi.getAll(tableId, strategyId)
            const data = response.data?.data || response.data || []
            setGroups(Array.isArray(data) ? data : [])
        } catch (error) { console.error("Error fetching groups:", error) }
    }

    const handleCreateStrategy = () => {
        if (!selectedTableId) { toast.error("Please select a table first"); return }
        setEditingStrategy(null)
        setIsStrategyModalOpen(true)
    }

    const handleSaveRootStrategy = async (strategyData) => {
        try {
            if (editingStrategy) {
                // Ensure we don't send isActiv if it accidentally exists in editingStrategy
                const { isActiv, ...restEditing } = editingStrategy;
                await strategyApi.update(editingStrategy.id || editingStrategy.strategy_id, { ...restEditing, ...strategyData })
                toast.success("Strategy updated")
            } else {
                await strategyApi.create({ ...strategyData, table_id: selectedTableId, is_active: true })
                toast.success("Strategy created")
            }
            setIsStrategyModalOpen(false)
            fetchStrategies(selectedTableId)
        } catch (error) { toast.error("Failed to save strategy") }
    }

    const handleToggleStrategyStatus = async (strategy) => {
        const strategyId = strategy.id || strategy.strategy_id;
        const newStatus = !strategy.is_active;

        // Optimistic update
        setStrategies(prev => prev.map(s =>
            (s.id === strategyId || s.strategy_id === strategyId)
                ? { ...s, is_active: newStatus }
                : s
        ));

        try {
            // Clean payload for update
            const { isActiv, tableName, tableId, ...rest } = strategy;
            await strategyApi.update(strategyId, { ...rest, is_active: newStatus });

            toast.success(`Strategy ${newStatus ? 'activated' : 'deactivated'}`); 
        } catch (error) {
            // Rollback on error
            setStrategies(prev => prev.map(s =>
                (s.id === strategyId || s.strategy_id === strategyId)
                    ? { ...s, is_active: !newStatus }
                    : s
            ));
            toast.error("Failed to update strategy status");
        }
    }

    const handleSaveStage = async (stageData, isUpdate = false) => {
        try {
            const currentTableId = selectedTableId || selectedStrategy.tableId || selectedStrategy.id;
            const payload = { ...stageData, min_score: parseInt(stageData.min_score), max_score: parseInt(stageData.max_score), table_id: currentTableId, strategy_id: selectedStrategy.id || selectedStrategy.strategy_id, stage_id: stageData.stage_id, organization_id: authUtils.getOrganizationId() }
            if (isUpdate || editingStage) { await stageApi.update(payload); toast.success("Stage updated") }
            else { await stageApi.create(payload); toast.success("Stage created") }
            setIsStageModalOpen(false)
            fetchStages(currentTableId, selectedStrategy.id || selectedStrategy.strategy_id)
        } catch (error) { toast.error("Failed to save stage") }
    }

    const handleDeleteStage = (stage) => {
        setDeleteConfirm({ open: true, type: 'stage', data: stage })
    }

    const performDeleteStage = async (stage) => {
        try {
            if (!stage) return;
            const currentTableId = selectedTableId || selectedStrategy.tableId || selectedStrategy.id;
            await stageApi.delete({ table_id: currentTableId, strategy_id: selectedStrategy.id || selectedStrategy.strategy_id, stage_id: stage.stage_id, min_score: stage.min_score, organization_id: authUtils.getOrganizationId() })
            toast.success("Stage deleted")
            fetchStages(currentTableId, selectedStrategy.id || selectedStrategy.strategy_id)
        } catch (error) { toast.error("Failed to delete stage") }
    }

    const handleSaveGroup = async (groupData, isEdit = false) => {
        try {
            const currentTableId = selectedTableId || selectedStrategy.tableId || selectedStrategy.id;
            const { id, group_id, ...rest } = groupData
            const actualLogic = groupData.logic_structure?.logic || groupData.logic_structure || { operator: "AND", conditions: [] }
            // Ensure we don't have a double logic key
            const cleanInnerLogic = actualLogic.logic ? actualLogic.logic : actualLogic

            const logicObj = {
                group_name: groupData.group_name,
                max_score: parseInt(groupData.max_score) || 0,
                logic: cleanInnerLogic
            }

            const payload = {
                ...rest,
                group_id: groupData.group_id || groupData.id || editingGroup?.group_id || editingGroup?.id,
                organization_id: authUtils.getOrganizationId(),
                max_score: parseInt(groupData.max_score) || 0,
                weight: parseFloat(groupData.weight) || 0,
                display_order: parseInt(groupData.display_order) || 1,
                table_id: currentTableId,
                strategy_id: selectedStrategy.id || selectedStrategy.strategy_id,
                logic_structure: JSON.stringify(logicObj)
            }
            if (isEdit || editingGroup) {
                await groupApi.update(groupData.id || groupData.group_id || editingGroup?.id || editingGroup?.group_id, payload);
                toast.success("Group updated")
            } else {
                await groupApi.create(payload);
                toast.success("Group created")
            }
            setIsGroupModalOpen(false) // Keeping in case of any lingering references
            setEditingGroup(null)
            fetchGroups(currentTableId, selectedStrategy.id || selectedStrategy.strategy_id)
        } catch (error) { toast.error("Failed to save group") }
    }

    const handleDeleteGroup = (groupId) => {
        setDeleteConfirm({ open: true, type: 'group', data: groupId })
    }

    const performDeleteGroup = async (groupId) => {
        try {
            const currentTableId = selectedTableId || selectedStrategy.tableId || selectedStrategy.id;
            const currentStrategyId = selectedStrategy.id || selectedStrategy.strategy_id;
            await groupApi.delete(currentTableId, currentStrategyId, groupId)
            toast.success("Group deleted")
            fetchGroups(currentTableId, currentStrategyId)
        } catch (error) { toast.error("Failed to delete group") }
    }

    const handleDeleteStrategy = (strategyId) => {
        setDeleteConfirm({ open: true, type: 'strategy', data: strategyId })
    }

    const performDeleteStrategy = async (strategyId) => {
        try {
            await strategyApi.delete(strategyId)
            toast.success("Strategy deleted")
            fetchStrategies(selectedTableId)
        } catch (error) { toast.error("Failed to delete strategy") }
    }

    const handleConfirmDelete = () => {
        const { type, data } = deleteConfirm
        if (type === 'stage') performDeleteStage(data)
        else if (type === 'group') performDeleteGroup(data)
        else if (type === 'strategy') performDeleteStrategy(data)
        setDeleteConfirm({ open: false, type: null, data: null })
    }

    const handleSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
        setSortConfig({ key, direction })
    }

    const filteredStrategies = [...strategies].filter(strategy => {
        const matchesSearch = strategy.strategy_name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            strategy.tableName?.toLowerCase().includes(globalSearchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && strategy.is_active) ||
            (statusFilter === 'inactive' && !strategy.is_active)
        return matchesSearch && matchesStatus
    }).sort((a, b) => {
        if (!sortConfig.key) return 0
        const { key, direction } = sortConfig
        
        // Handle nested or computed values
        let valA = a[key]
        let valB = b[key]
        
        if (key === 'status') {
            valA = a.is_active ? 'active' : 'inactive'
            valB = b.is_active ? 'active' : 'inactive'
        }
        
        if (valA < valB) return direction === 'asc' ? -1 : 1
        if (valA > valB) return direction === 'asc' ? 1 : -1
        return 0
    })

    const totalPages = Math.ceil(filteredStrategies.length / pageSize)
    const currentPageStrategies = filteredStrategies.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const toggleRow = (id) => {
        setSelectedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    }
    const toggleAll = () => {
        if (selectedRows.size === currentPageStrategies.length) setSelectedRows(new Set())
        else setSelectedRows(new Set(currentPageStrategies.map(s => s.id || s.strategy_id)))
    }

    // Weight badge color logic
    const getWeightBadge = (strategyId) => {
        const hasIssue = strategyId.includes('0') || strategyId.includes('a')
        return { pct: hasIssue ? "95%" : "100%", hasIssue }
    }

    return (
        <div className="flex h-full bg-background overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
                {selectedStrategy ? (
                    <StrategyConfigView
                        strategy={selectedStrategy}
                        tableName={selectedStrategy.tableName || tables.find(t => t.table_id === (selectedStrategy.tableId || selectedStrategy.id))?.table_name}
                        stages={stages}
                        groups={groups}
                        allStrategies={strategies.filter(s => (s.tableId || s.id) === (selectedStrategy.tableId || selectedStrategy.id))} // Filter strategies for current table
                        onBack={() => setSelectedStrategy(null)}
                        onEditStrategy={() => { setEditingStrategy(selectedStrategy); setIsStrategyModalOpen(true) }}
                        onAddStage={(data) => { setEditingStage(null); handleSaveStage(data, false) }}
                        onEditStage={(data) => { setEditingStage(data); handleSaveStage(data, true) }}
                        onDeleteStage={handleDeleteStage}
                        onAddGroup={(data) => { setEditingGroup(null); handleSaveGroup(data, false) }}
                        onEditGroup={(data) => { setEditingGroup(data); handleSaveGroup(data, true) }}
                        columns={columns}
                        onDeleteGroup={handleDeleteGroup}
                        onSwitchStrategy={(newStrategy) => {
                            setSelectedStrategy(newStrategy);
                            // Fetch stages and groups for the new strategy
                            if (selectedTableId && newStrategy) {
                                fetchStages(selectedTableId, newStrategy.id || newStrategy.strategy_id);
                                fetchGroups(selectedTableId, newStrategy.id || newStrategy.strategy_id);
                            }
                            toast.success(`Switched to "${newStrategy.strategy_name}"`);
                        }}
                    />
                ) : (
                    /* ── List / Dashboard View ── */
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-0 py-2 border-b bg-background shrink-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <h1 className="text-xl font-bold text-foreground leading-none">Score Strategy</h1>
                                    <p className="text-muted-foreground text-xs mt-1">Manage scoring strategies across all lead tables.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 px-3 gap-1.5 text-xs"
                                        onClick={() => selectedTableId ? fetchStrategies(selectedTableId) : fetchAllStrategies()}
                                    >
                                        <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                                        Refresh
                                    </Button>
                                    <Button onClick={handleCreateStrategy} size="sm" className="h-9 px-4 gap-1.5 text-xs">
                                        <Plus className="h-3.5 w-3.5" /> Create Strategy
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-0 py-3 space-y-3">

                                {/* ── Stat Cards Row ── */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <StatCard
                                        title="Total Strategies"
                                        value={stats.total}
                                        icon={Zap}
                                        iconBg="bg-violet-100"
                                        iconColor="text-violet-600"
                                    />
                                    <StatCard
                                        title="Active Strategies"
                                        value={stats.active}
                                        icon={CheckCircle2}
                                        iconBg="bg-green-100"
                                        iconColor="text-green-600"
                                    />
                                    <StatCard
                                        title="Weight Issues"
                                        value={stats.issues}
                                        icon={AlertTriangle}
                                        iconBg="bg-amber-100"
                                        iconColor="text-amber-600"
                                        badge="Review"
                                        badgeColor="bg-amber-100 text-amber-700 border border-amber-200"
                                        onBadgeClick={() => toast.info("Review pending weight adjustments")}
                                    />
                                    <StatCard
                                        title="Unconfigured"
                                        value={stats.unconfigured}
                                        icon={Scale}
                                        iconBg="bg-slate-100"
                                        iconColor="text-slate-500"
                                    />
                                </div>

                                {/* ── Search + Filter Bar ── */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-background border border-border/60 rounded-xl px-4 py-2.5 shadow-none">
                                    {/* Search */}
                                    <div className="relative flex-1">
                                        <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                        <Input
                                            placeholder="Search strategies..."
                                            className="pl-6 h-8 bg-transparent border-none shadow-none focus-visible:ring-0 text-sm"
                                            value={globalSearchQuery}
                                            onChange={(e) => { setGlobalSearchQuery(e.target.value); setCurrentPage(1) }}
                                        />
                                    </div>

                                    <div className="hidden sm:block h-5 w-px bg-border shrink-0" />

                                    {/* Status pills */}
                                    <div className="flex items-center gap-1 shrink-0 flex-wrap">
                                        <span className="text-xs text-muted-foreground mr-1 font-medium">Status:</span>
                                        {['all', 'active', 'inactive'].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => { setStatusFilter(s); setCurrentPage(1) }}
                                                className={cn(
                                                    "h-7 px-3 rounded-md text-xs font-semibold capitalize transition-all",
                                                    statusFilter === s
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground hover:bg-muted"
                                                )}
                                            >
                                                {s.charAt(0).toUpperCase() + s.slice(1)}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="hidden sm:block h-5 w-px bg-border shrink-0" />

                                    {/* Table dropdown */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-xs text-muted-foreground font-medium">Table:</span>
                                        <Select
                                            value={selectedTableId || "all_tables"}
                                            onValueChange={(val) => { setSelectedTableId(val === "all_tables" ? "" : val); setCurrentPage(1) }}
                                        >
                                            <SelectTrigger className="h-8 w-[150px] border border-border/60 rounded-lg text-xs font-medium bg-background shadow-none">
                                                <SelectValue placeholder="All Tables" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all_tables" className="text-xs">All Tables</SelectItem>
                                                {tables.map(t => (
                                                    <SelectItem key={t.table_id} value={t.table_id} className="text-xs">{t.table_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="hidden sm:block h-5 w-px bg-border shrink-0" />
                                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                                        {filteredStrategies.length} of {strategies.length}
                                    </span>
                                </div>

                                {/* ── Main Table ── */}
                                <Card className="border border-border/60 shadow-none rounded-xl overflow-hidden py-0">
                                    <div className="overflow-x-auto">
                                        <Table className="w-full">
                                            <TableHeader>
                                                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                                                    {[
                                                        { label: "Strategy Name", key: "strategy_name", sortable: true },
                                                        { label: "Status", key: "status", sortable: true },
                                                        { label: "Table", key: "tableName", sortable: true },
                                                        { label: "Created By" },
                                                        { label: "Last Updated", key: "updated_at", sortable: true },
                                                        { label: "Actions", align: "center" },
                                                    ].map(({ label, key, sortable, align }) => (
                                                        <TableHead key={label} className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide h-11 whitespace-nowrap", align === "center" && "text-center")}>
                                                            {sortable ? (
                                                                <div 
                                                                    className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors group/sort"
                                                                    onClick={() => handleSort(key)}
                                                                >
                                                                    {label} 
                                                                    <ArrowUpDown className={cn(
                                                                        "h-3 w-3 transition-opacity",
                                                                        sortConfig.key === key ? "opacity-100 text-primary" : "opacity-0 group-hover/sort:opacity-50"
                                                                    )} />
                                                                </div>
                                                            ) : label}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading ? (
                                                    [1, 2, 3, 4, 5].map(i => (
                                                        <TableRow key={i} className="animate-pulse">
                                                            <TableCell colSpan={10} className="h-14 bg-muted/10" />
                                                        </TableRow>
                                                    ))
                                                ) : currentPageStrategies.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={10} className="h-28 text-center text-muted-foreground text-sm">
                                                            No strategies match your filters.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : currentPageStrategies.map((strategy) => {
                                                    const isActive = strategy.is_active
                                                    const strategyId = strategy.id || strategy.strategy_id
                                                    const creator = allUsers.find(u => (u.user_id || u.id) === strategy.created_by)
                                                    const firstName = creator?.first_name || ''
                                                    const lastName = creator?.last_name || ''
                                                    const creatorInitials = firstName && lastName ? `${firstName[0]}${lastName[0]}` : (firstName || lastName ? (firstName || lastName)[0] + (firstName || lastName)[1] || '' : '??')
                                                    const creatorName = creator ? `${firstName} ${lastName}`.trim() : 'Unknown'
                                                    const { pct, hasIssue } = getWeightBadge(strategyId)
                                                    const isChecked = selectedRows.has(strategyId)

                                                    return (
                                                        <TableRow
                                                            key={strategyId}
                                                            className={cn(
                                                                "border-b border-border/40 hover:bg-muted/30 transition-colors group",
                                                                isChecked && "bg-muted/20"
                                                            )}
                                                        >
                                                            {/* Strategy Name */}
                                                            <TableCell className="py-3.5">
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-sm text-foreground">{strategy.strategy_name}</span>
                                                                    {/*<span className="text-[10px] text-muted-foreground font-mono">strategy-{strategyId?.slice(0, 3).replace(/[^0-9]/g, '') || '001'}</span>*/}
                                                                </div>
                                                            </TableCell>

                                                            {/* Status — inline toggle */}
                                                            <TableCell className="py-3.5">
                                                                <Switch
                                                                    checked={isActive}
                                                                    onCheckedChange={() => handleToggleStrategyStatus(strategy)}
                                                                    className="data-[state=checked]:bg-green-500"
                                                                />
                                                            </TableCell>

                                                            {/* Table */}
                                                            <TableCell className="py-3.5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium">{strategy.tableName}</span>

                                                                </div>
                                                            </TableCell>

                                                            {/* Created By — avatar + name */}
                                                            <TableCell className="py-3.5">
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar
                                                                        initials={creatorInitials}
                                                                        className={cn(
                                                                            "text-[10px]",
                                                                            isActive
                                                                                ? "bg-violet-100 text-violet-700"
                                                                                : "bg-slate-100 text-slate-600"
                                                                        )}
                                                                    />
                                                                    <span className="text-xs font-medium">{creatorName}</span>
                                                                </div>
                                                            </TableCell>

                                                            {/* Last Updated */}
                                                            <TableCell className="py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                                                                {strategy.updated_at
                                                                    ? new Date(strategy.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                                    : "N/A"}
                                                            </TableCell>

                                                            {/* Actions */}
                                                            <TableCell className="py-3.5 pr-4 text-center">
                                                                <div className="flex items-center justify-center gap-0.5">
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-lg"
                                                                                    onClick={() => { setViewingStrategy(strategy); setIsDetailsModalOpen(true) }}>
                                                                                    <Eye className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top"><p className="text-xs">Details</p></TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-50 rounded-lg"
                                                                                    onClick={() => { setEditingStrategy(strategy); setIsStrategyModalOpen(true) }}>
                                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top"><p className="text-xs">Edit</p></TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                                                                                    onClick={() => setSelectedStrategy(strategy)}>
                                                                                    <Settings2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top"><p className="text-xs">Configure</p></TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50 rounded-lg"
                                                                                    onClick={() => handleDeleteStrategy(strategyId)}>
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top"><p className="text-xs">Delete</p></TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* ── Pagination Footer ── */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-muted-foreground">Rows per page</span>
                                                <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
                                                    <SelectTrigger className="h-7 w-16 border-none bg-transparent text-xs shadow-none focus:ring-0 font-semibold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[5, 10, 25, 50].map(s => (
                                                            <SelectItem key={s} value={s.toString()} className="text-xs">{s}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {filteredStrategies.length === 0 ? "0" : `${((currentPage - 1) * pageSize) + 1}–${Math.min(currentPage * pageSize, filteredStrategies.length)}`} of {filteredStrategies.length}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-7 w-7 rounded-md border-border/50 shadow-none">
                                                <ChevronsLeft className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 w-7 rounded-md border-border/50 shadow-none">
                                                <ChevronLeft className="h-3.5 w-3.5" />
                                            </Button>
                                            <div className="px-3 h-7 flex items-center justify-center min-w-[52px] bg-primary text-primary-foreground rounded-md text-xs font-semibold">
                                                {currentPage} / {totalPages || 1}
                                            </div>
                                            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || filteredStrategies.length === 0} className="h-7 w-7 rounded-md border-border/50 shadow-none">
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || filteredStrategies.length === 0} className="h-7 w-7 rounded-md border-border/50 shadow-none">
                                                <ChevronsRight className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>

                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>

            {/* Modals */}
            <StrategyModal isOpen={isStrategyModalOpen} onClose={() => setIsStrategyModalOpen(false)} onSave={handleSaveRootStrategy} strategy={editingStrategy} />
            <StrategyDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} strategy={viewingStrategy} users={allUsers} orgs={allOrgs} />
            <StageModal isOpen={isStageModalOpen} onClose={() => setIsStageModalOpen(false)} onSave={handleSaveStage} stage={editingStage} />

            {/* Global Delete Confirmation */}
            <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ ...deleteConfirm, open: false })}>
                <AlertDialogContent className="max-w-[400px]">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <AlertDialogTitle className="text-xl">Are you sure?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-sm pt-2">
                            This action cannot be undone. This will permanently delete the
                            <span className="font-bold text-foreground mx-1 capitalize font-mono text-[11px] bg-muted px-1 rounded">{deleteConfirm.type}</span>
                            and remove its data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="rounded-xl border-border/60 hover:bg-muted font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="rounded-xl bg-red-600 hover:bg-red-700 text-white border-none font-bold shadow-lg shadow-red-200"
                        >
                            Delete {deleteConfirm.type}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}