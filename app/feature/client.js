"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react" // Add useCallback, useMemo, useRef
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { featuresApi } from "@/lib/api-endpoint"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import {
    Shield,
    ShieldPlus,
    ChevronUp,
    Trash2,
    RefreshCw,
    Search,
    Eye,
    Loader2,
    ArrowLeft,
    Clock,
    X,
    Table2,
    List,
    LayoutGrid,
    BarChart3,
    CheckCircle2,
    Layers,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronDown
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// Shadcn UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

// Debounce hook for search input
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

const SortIcon = ({ config, sortKey }) => {
    if (config.key !== sortKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
    if (config.direction === 'asc') return <ChevronUp className="ml-2 h-4 w-4 text-primary" />;
    if (config.direction === 'desc') return <ChevronDown className="ml-2 h-4 w-4 text-primary" />;
    return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
};

export default function Client({ initialFeatures = [] }) {
    const [view, setView] = useState('table')
    const [features, setFeatures] = useState(initialFeatures)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearchTerm] = useDebounce(searchTerm, 3000) // Debounce search
    const [moduleFilter, setModuleFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")
    const [selectedFeature, setSelectedFeature] = useState(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        feature_name: "",
        action: "",
        description: "",
        module: "",
        is_active: true,
    })
    const [submitting, setSubmitting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(5)
    const [totalResults, setTotalResults] = useState(initialFeatures.length)
    const [sortConfig, setSortConfig] = useState({ key: 'feature_name', direction: 'asc' })

    // Use ref to track if we're just opening the dialog to prevent unnecessary updates
    const isOpeningDialog = useRef(false);

    useEffect(() => {
        setFeatures(initialFeatures)
        setTotalResults(initialFeatures.length)
    }, [initialFeatures])

    // Memoize filtered features to prevent unnecessary recalculations
    const filteredFeatures = useMemo(() => {
        return features.filter((feature) => {
            const featureName = feature.feature_name || feature.name || ""
            const description = feature.description || ""
            const featureModule = feature.module || ""

            // Use debounced search term for filtering
            const matchesSearch =
                !debouncedSearchTerm ||
                featureName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                featureModule.toLowerCase().includes(debouncedSearchTerm.toLowerCase())

            const matchesModule =
                moduleFilter === "all" ||
                (feature.module || "").toLowerCase() === moduleFilter.toLowerCase()

            const featureStatus = feature.is_active !== undefined ? feature.is_active : true
            const statusString = featureStatus ? "active" : "inactive"
            const matchesStatus =
                statusFilter === "all" ||
                statusString === statusFilter.toLowerCase()

            return matchesSearch && matchesModule && matchesStatus
        })
    }, [features, debouncedSearchTerm, moduleFilter, statusFilter])

    // Memoize sorted features
    const sortedFeatures = useMemo(() => {
        const sorted = [...filteredFeatures];
        if (sortConfig.key && sortConfig.direction !== 'none') {
            sorted.sort((a, b) => {
                let valA, valB;

                switch (sortConfig.key) {
                    case 'feature_name':
                    case 'name':
                        valA = (a.feature_name || a.name || "").toLowerCase();
                        valB = (b.feature_name || b.name || "").toLowerCase();
                        break;
                    case 'description':
                        valA = (a.description || "").toLowerCase();
                        valB = (b.description || "").toLowerCase();
                        break;
                    case 'module':
                        valA = (a.module || "").toLowerCase();
                        valB = (b.module || "").toLowerCase();
                        break;
                    case 'is_active':
                        valA = (a.is_active !== undefined ? a.is_active : true) ? 1 : 0;
                        valB = (b.is_active !== undefined ? b.is_active : true) ? 1 : 0;
                        break;
                    case 'created_at':
                        valA = new Date(a.created_at).getTime();
                        valB = new Date(b.created_at).getTime();
                        break;
                    default:
                        valA = a[sortConfig.key];
                        valB = b[sortConfig.key];
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [filteredFeatures, sortConfig])

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedFeatures = useMemo(() => sortedFeatures.slice(startIndex, endIndex), [sortedFeatures, startIndex, endIndex])
    const totalPages = Math.ceil(filteredFeatures.length / pageSize)

    const fetchFeatures = async () => {
        try {
            setLoading(true)
            const response = await featuresApi.getAll()

            if (response.data) {
                const featureData = Array.isArray(response.data)
                    ? response.data
                    : response.data.data || response.data.features || []
                setFeatures(featureData)
                setTotalResults(featureData.length)
            }
        } catch (error) {
            console.error("Error fetching features:", error)
            if (error.response?.status === 404) {
                toast.info("Features API endpoint not found. Using demo mode.")
                setFeatures([])
                setTotalResults(0)
            } else if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.")
            } else {
                toast.error("Failed to fetch features.")
            }
        } finally {
            setLoading(false)
        }
    }

    const openViewDialog = async (feature) => {
        setSelectedFeature(feature)
        // Still fetch for view dialog to get full details
        await fetchFeatureDetails(feature.feature_id || feature.id)
        setIsViewDialogOpen(true)
    }

    const fetchFeatureDetails = async (featureId) => {
        try {
            const response = await featuresApi.getById(featureId)

            if (response.data) {
                const featureData = response.data.data || response.data
                setSelectedFeature(featureData)
                return featureData
            }
        } catch (error) {
            console.error("Error fetching feature details:", error)
            toast.error("Failed to fetch feature details")
            return null
        }
    }

    const handleCreateFeature = async () => {
        if (!formData.feature_name?.trim()) {
            toast.error("Feature name is required")
            return
        }
        if (!formData.action?.trim()) {
            toast.error("Action is required")
            return
        }
        if (!formData.module?.trim()) {
            toast.error("Module is required")
            return
        }

        try {
            setSubmitting(true)
            const payload = {
                feature_name: formData.feature_name.trim(),
                action: formData.action.trim(),
                description: formData.description.trim() || "",
                module: formData.module.trim(),
                is_active: formData.is_active !== undefined ? formData.is_active : true,
            }

            const response = await featuresApi.create(payload)

            if (response.data) {
                toast.success("Feature created successfully")
                setIsCreateDialogOpen(false)
                resetForm()
                fetchFeatures()
            }
        } catch (error) {
            console.error("Error creating feature:", error)
            const errorMessage =
                error.response?.data?.message || error.response?.data?.error || "Failed to create feature"
            toast.error(errorMessage)
        } finally {
            setSubmitting(false)
        }
    }

    const handleToggleStatus = async (featureId, currentStatus) => {
        if (!featureId) {
            toast.error("Feature ID is missing")
            return
        }

        try {
            const newStatus = !currentStatus
            const payload = { is_active: newStatus }

            const response = await featuresApi.update(featureId, payload)

            if (response.data) {
                toast.success(`Feature ${newStatus ? "activated" : "deactivated"} successfully`)
                fetchFeatures()
            }
        } catch (error) {
            console.error("Error updating feature status:", error)
            const errorMessage =
                error.response?.data?.message || error.response?.data?.error || "Failed to update feature status"
            toast.error(errorMessage)
            fetchFeatures()
        }
    }

    const handleDeleteFeature = async (featureId) => {
        if (!featureId) {
            toast.error("Feature ID is missing")
            return
        }

        try {
            setSubmitting(true)
            const response = await featuresApi.delete(featureId)

            if (response.status === 200 || response.status === 204 || response.data) {
                toast.success("Feature deleted successfully")
                fetchFeatures()
            } else {
                toast.error("Unexpected response from server")
            }
        } catch (error) {
            console.error("Error deleting feature:", error)
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Failed to delete feature"
            toast.error(errorMessage)
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setFormData({
            feature_name: "",
            action: "",
            description: "",
            module: "",
            is_active: true,
        })
        setSelectedFeature(null)
    }

    // Handle form input changes - prevent re-renders of parent components
    const handleFormChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }, [])

    const formatDate = (dateString) => {
        if (!dateString) return "N/A"
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            })
        } catch (error) {
            return dateString
        }
    }

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'none';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    }

    const uniqueModules = useMemo(() => [...new Set(features.map(f => f.module).filter(Boolean))], [features])
    const activeFeaturesCount = useMemo(() => features.filter(f => f.is_active !== false).length, [features])

    // Rest of your render functions remain the same...
    const renderCardsView = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {paginatedFeatures.map((feature) => {
                const featureId = feature.feature_id || feature.id
                const featureName = feature.feature_name || feature.name || "N/A"
                const isActive = feature.is_active !== undefined ? feature.is_active : true
                return (
                    <Card key={featureId} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-primary" />
                                        <CardTitle className="text-base truncate">{featureName}</CardTitle>
                                    </div>
                                    <CardDescription className="text-xs truncate">{feature.module}</CardDescription>
                                </div>
                                <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-500 hover:bg-green-600" : ""}>
                                    {isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-sm text-muted-foreground line-clamp-2 h-10">
                                {feature.description || "No description provided"}
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground text-xs">Action:</span>
                                <span className="font-semibold text-xs">{feature.action || "N/A"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground text-xs">Created:</span>
                                <span className="font-semibold text-xs">{formatDate(feature.created_at)}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openViewDialog(feature)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>View</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>


                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Feature</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete the feature <strong>{featureName}</strong>? This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteFeature(featureId)} className="bg-destructive text-white hover:bg-destructive/90">
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TooltipTrigger>
                                        <TooltipContent>Delete</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );

    const renderListView = () => (
        <div className="space-y-3 md:space-y-4">
            {paginatedFeatures.map((feature) => {
                const featureId = feature.feature_id || feature.id
                const featureName = feature.feature_name || feature.name || "N/A"
                const isActive = feature.is_active !== undefined ? feature.is_active : true
                return (
                    <Card key={featureId} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 flex-1 min-w-0">
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Shield className="text-primary h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base truncate">{featureName}</CardTitle>
                                            <Badge variant="outline" className="text-[10px] h-4">
                                                {feature.module}
                                            </Badge>
                                        </div>
                                        <CardDescription className="text-sm truncate">
                                            {feature.description || "No description"} • {feature.action} • Created {formatDate(feature.created_at)}
                                        </CardDescription>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4 ml-6">
                                    <div className="flex items-center gap-2 mr-4">
                                        <Switch
                                            checked={isActive}
                                            onCheckedChange={() => handleToggleStatus(featureId, isActive)}
                                            disabled={submitting}
                                        />
                                        <span className="text-xs text-muted-foreground hidden lg:inline">
                                            {isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openViewDialog(feature)}
                                                    className="h-8 w-8"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View</TooltipContent>
                                        </Tooltip>


                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Feature</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete <strong>{featureName}</strong>?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteFeature(featureId)} className="bg-destructive text-white hover:bg-destructive/90">
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TooltipTrigger>
                                            <TooltipContent>Delete</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );

    const renderTableView = () => (
        <div className="rounded-md border overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
                <Table className="w-full table-auto">
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="font-semibold text-foreground cursor-pointer" onClick={() => handleSort('feature_name')}>
                                <div className="flex items-center">
                                    FEATURE NAME
                                    <SortIcon config={sortConfig} sortKey="feature_name" />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground cursor-pointer" onClick={() => handleSort('description')}>
                                <div className="flex items-center">
                                    DESCRIPTION
                                    <SortIcon config={sortConfig} sortKey="description" />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground cursor-pointer" onClick={() => handleSort('module')}>
                                <div className="flex items-center">
                                    MODULE
                                    <SortIcon config={sortConfig} sortKey="module" />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground cursor-pointer" onClick={() => handleSort('created_at')}>
                                <div className="flex items-center">
                                    CREATED AT
                                    <SortIcon config={sortConfig} sortKey="created_at" />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground cursor-pointer" onClick={() => handleSort('is_active')}>
                                <div className="flex items-center">
                                    STATUS
                                    <SortIcon config={sortConfig} sortKey="is_active" />
                                </div>
                            </TableHead>
                            <TableHead className="w-[120px] whitespace-nowrap text-center font-semibold text-foreground">ACTION</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: pageSize }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="whitespace-nowrap"><Skeleton className="h-5 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="text-right py-4"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : paginatedFeatures.map((feature) => {
                            const featureId = feature.feature_id || feature.id
                            const featureName = feature.feature_name || feature.name || "N/A"
                            const isActive = feature.is_active !== undefined ? feature.is_active : true
                            return (
                                <TableRow
                                    key={featureId}
                                    className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                                >
                                    <TableCell className="py-4">
                                        <span className="font-medium text-primary">
                                            {featureName}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <span className="text-sm text-muted-foreground line-clamp-1">
                                            {feature.description || "N/A"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Badge variant="outline">
                                            {feature.module || "N/A"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">
                                                {formatDate(feature.created_at)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={() => handleToggleStatus(featureId, isActive)}
                                                disabled={submitting}
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="w-[120px] whitespace-nowrap text-right py-4">
                                        <div className="flex items-center justify-end space-x-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openViewDialog(feature)}
                                                            className="h-8 w-8"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>View</TooltipContent>
                                                </Tooltip>


                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete Feature</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you sure you want to delete <strong>{featureName}</strong>?
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteFeature(featureId)} className="bg-destructive text-white hover:bg-destructive/90">
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete</TooltipContent>
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
        </div>
    );

    const renderFeatureView = () => {
        if (filteredFeatures.length === 0) {
            return (
                <div className="text-center py-12 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No features found</p>
                </div>
            );
        }

        switch (view) {
            case 'list':
                return renderListView();
            case 'table':
                return renderTableView();
            case 'cards':
            default:
                return renderCardsView();
        }
    };

    return (
        <main className="min-h-screen bg-background">
            <div className="flex-1 p-0 md:p-0 bg-background">
                <div className="container mx-auto py-0 space-y-4">
                    <PageBreadcrumb />

                    {/* Stats Section */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Features</CardTitle>
                                <Shield className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{features.length}</div>}
                                <p className="text-xs text-muted-foreground">Across all modules</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Features</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{activeFeaturesCount}</div>}
                                <p className="text-xs text-muted-foreground">Currently enabled</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Modules</CardTitle>
                                <Layers className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{uniqueModules.length}</div>}
                                <p className="text-xs text-muted-foreground">Unique functional areas</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-2xl">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => window.history.back()}
                                            className="h-8 w-8">
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>
                                        Feature Management
                                    </CardTitle>
                                    <CardDescription>
                                        Create, manage, and configure features for your system
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" onClick={fetchFeatures} disabled={loading}>
                                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                        Refresh
                                    </Button>
                                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button onClick={resetForm}>
                                                <ShieldPlus className="h-4 w-4 mr-2" />
                                                Create New Feature
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Create New Feature</DialogTitle>
                                                <DialogDescription>
                                                    Add a new feature to the system. Feature name, action, and module are required.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="feature-name">Feature Name *</Label>
                                                    <Input
                                                        id="feature-name"
                                                        placeholder="e.g., ticket_Create, tasks_view"
                                                        value={formData.feature_name}
                                                        onChange={(e) => handleFormChange('feature_name', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="action">Action *</Label>
                                                    <Input
                                                        id="action"
                                                        placeholder="e.g., create, view, update, delete"
                                                        value={formData.action}
                                                        onChange={(e) => handleFormChange('action', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="description">Description</Label>
                                                    <Input
                                                        id="description"
                                                        placeholder="e.g., ticket creations"
                                                        value={formData.description}
                                                        onChange={(e) => handleFormChange('description', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="module">Module *</Label>
                                                    <Input
                                                        id="module"
                                                        placeholder="e.g., ticket, task, organization"
                                                        value={formData.module}
                                                        onChange={(e) => handleFormChange('module', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setIsCreateDialogOpen(false)}
                                                    disabled={submitting}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleCreateFeature} disabled={submitting}>
                                                    {submitting ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Creating...
                                                        </>
                                                    ) : (
                                                        "Create Feature"
                                                    )}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Filters and View Switcher */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-2  rounded-lg">
                                <div className="flex flex-wrap items-center gap-3 flex-1">
                                    <div className="relative w-full md:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search features..."
                                            className="pl-8"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value)
                                                setCurrentPage(1)
                                            }}
                                        />
                                    </div>

                                    <Select
                                        value={moduleFilter}
                                        onValueChange={(value) => {
                                            setModuleFilter(value)
                                            setCurrentPage(1)
                                        }}
                                    >
                                        <SelectTrigger className="w-[150px] bg-background">
                                            <SelectValue placeholder="Module" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Modules</SelectItem>
                                            {uniqueModules.map((mod) => (
                                                <SelectItem key={mod} value={mod}>
                                                    {mod}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={statusFilter}
                                        onValueChange={(value) => {
                                            setStatusFilter(value)
                                            setCurrentPage(1)
                                        }}
                                    >
                                        <SelectTrigger className="w-[150px] bg-background">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {(searchTerm || moduleFilter !== "all" || statusFilter !== "all") && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setSearchTerm("")
                                                setModuleFilter("all")
                                                setStatusFilter("all")
                                                setCurrentPage(1)
                                            }}
                                            className="h-9 px-2 lg:px-3 text-muted-foreground"
                                        >
                                            Reset
                                            <X className="ml-2 h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center bg-background border rounded-md p-1 shadow-sm">
                                        <Button
                                            variant={view === "table" ? "secondary" : "ghost"}
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setView("table")}
                                        >
                                            <Table2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant={view === "list" ? "secondary" : "ghost"}
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setView("list")}
                                        >
                                            <List className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant={view === "cards" ? "secondary" : "ghost"}
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setView("cards")}
                                        >
                                            <LayoutGrid className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="min-h-[200px]">
                                {renderFeatureView()}
                            </div>

                            {/* Pagination */}
                            {filteredFeatures.length > 0 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t bg-muted/5 mt-4 -mx-6 mb-[-24px]">
                                    <div className="flex flex-wrap items-center gap-4 order-2 sm:order-1 justify-center sm:justify-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Show</span>
                                            <Select
                                                value={pageSize.toString()}
                                                onValueChange={(value) => {
                                                    setPageSize(parseInt(value))
                                                    setCurrentPage(1)
                                                }}
                                            >
                                                <SelectTrigger className="w-[70px] h-8 border-muted-foreground/20 text-xs shadow-none rounded-xl">
                                                    <SelectValue placeholder={pageSize} />
                                                </SelectTrigger>
                                                <SelectContent side="top">
                                                    {[5, 10, 15, 20].map((size) => (
                                                        <SelectItem key={size} value={size.toString()}>
                                                            {size}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">per page</span>
                                        </div>

                                        <div className="text-sm font-medium border-l pl-4 text-muted-foreground">
                                            Showing <span className="text-foreground">{Math.min(startIndex + 1, filteredFeatures.length)}</span> to{' '}
                                            <span className="text-foreground">{Math.min(startIndex + pageSize, filteredFeatures.length)}</span> of{' '}
                                            <span className="text-foreground">{filteredFeatures.length}</span> entries
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 order-1 sm:order-2">
                                        <Pagination className="w-auto mx-0">
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={currentPage === 1}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setCurrentPage(prev => Math.max(1, prev - 1));
                                                        }}
                                                        className="gap-1 pl-2.5 h-8"
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                        <span>Previous</span>
                                                    </Button>
                                                </PaginationItem>

                                                {totalPages <= 7 ? (
                                                    Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                        <PaginationItem key={page}>
                                                        <PaginationLink
                                                                isActive={currentPage === page}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setCurrentPage(page);
                                                                }}
                                                                className="cursor-pointer h-8 w-8 rounded-lg"
                                                            >
                                                                {page}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    ))
                                                ) : (
                                                    <>
                                                        <PaginationItem>
                                                            <PaginationLink
                                                                isActive={currentPage === 1}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setCurrentPage(1);
                                                                }}
                                                                className="cursor-pointer h-8 w-8"
                                                            >
                                                                1
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                        {currentPage > 3 && <PaginationEllipsis />}
                                                        {Array.from({ length: 3 }, (_, i) => {
                                                            const page = Math.min(Math.max(currentPage - 1 + i, 2), totalPages - 1);
                                                            if (page === 1 || page === totalPages) return null;
                                                            return (
                                                                <PaginationItem key={page}>
                                                                    <PaginationLink
                                                                        isActive={currentPage === page}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            setCurrentPage(page);
                                                                        }}
                                                                        className="cursor-pointer h-8 w-8"
                                                                    >
                                                                        {page}
                                                                    </PaginationLink>
                                                                </PaginationItem>
                                                            )
                                                        })}
                                                        {currentPage < totalPages - 2 && <PaginationEllipsis />}
                                                        <PaginationItem>
                                                            <PaginationLink
                                                                isActive={currentPage === totalPages}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setCurrentPage(totalPages);
                                                                }}
                                                                className="cursor-pointer h-8 w-8"
                                                            >
                                                                {totalPages}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    </>
                                                )}

                                                <PaginationItem>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={currentPage === totalPages}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                                        }}
                                                        className="gap-1 pl-2.5 h-8"
                                                    >
                                                        <span>Next</span>
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dialogs */}
                    <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-primary" />
                                    Feature Details
                                </DialogTitle>
                                <DialogDescription>
                                    Comprehensive overview of the feature configuration.
                                </DialogDescription>
                            </DialogHeader>
                            {selectedFeature && (
                                <div className="space-y-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">Status</Label>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={(selectedFeature.is_active !== undefined ? selectedFeature.is_active : true) ? "default" : "secondary"}>
                                                    {(selectedFeature.is_active !== undefined ? selectedFeature.is_active : true) ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <Label className="text-muted-foreground">Module</Label>
                                            <p className="font-semibold">{selectedFeature.module || "N/A"}</p>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">Feature Name</Label>
                                            <p className="font-medium text-primary">{selectedFeature.feature_name || selectedFeature.name || "N/A"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">Action</Label>
                                            <p className="font-medium">{selectedFeature.action || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Description</Label>
                                        <p className="text-sm border p-3 rounded-md bg-muted/20">
                                            {selectedFeature.description || "No description provided."}
                                        </p>
                                    </div>
                                    <Separator />
                                    <div>
                                        <Label className="text-muted-foreground">Created At</Label>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-sm font-medium">{formatDate(selectedFeature.created_at)}</p>
                                        </div>
                                    </div>
                                    {(selectedFeature.feature_id || selectedFeature.id) && (
                                        <>
                                            <Separator />
                                            <div>
                                                <Label className="text-muted-foreground">Feature ID</Label>
                                                <p className="text-sm font-medium font-mono">{selectedFeature.feature_id || selectedFeature.id}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                                    Close
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </div>
            </div>
        </main>
    )
}