"use client"

import { useState, useMemo } from "react"
import {
  Users,
  Link as LinkIcon,
  FileText,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Search,
  MoreHorizontal
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { authUtils } from "@/lib/auth-utils"
import { toast } from "sonner"
import { policiesApi } from "@/lib/api-endpoint"

const SortIcon = ({ config, sortKey }) => {
  if (config.key !== sortKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
  if (config.direction === 'asc') return <ChevronUp className="ml-2 h-4 w-4 text-primary" />;
  if (config.direction === 'desc') return <ChevronDown className="ml-2 h-4 w-4 text-primary" />;
  return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export function PolicyOverview({ policies, policyFeatureMappings, allFeatures, userCounts, onModuleClick, onViewMappedUsers, onMappingClick, onEditPolicy, onDeletePolicy, onPolicyUpdate }) {
  const [activeTab, setActiveTab] = useState("all-policies")
  const [currentPageAllPolicies, setCurrentPageAllPolicies] = useState(1)
  const [currentPageFeatureMappings, setCurrentPageFeatureMappings] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfigAllPolicies, setSortConfigAllPolicies] = useState({ key: 'p_name', direction: 'asc' })
  const [sortConfigFeatureMappings, setSortConfigFeatureMappings] = useState({ key: 'p_name', direction: 'asc' })

  const activePolicies = policies.filter(p => p.is_active !== false)
  const inactivePolicies = policies.filter(p => p.is_active === false)

  // Group features by module
  const moduleGroups = allFeatures.reduce((acc, feature) => {
    const module = feature.module || "Uncategorized"
    if (!acc[module]) {
      acc[module] = { total: 0, active: 0, inactive: 0 }
    }
    acc[module].total++
    if (feature.is_active !== false) {
      acc[module].active++
    } else {
      acc[module].inactive++
    }
    return acc
  }, {})

  // Convert module groups to array for carousel
  const moduleGroupsArray = Object.entries(moduleGroups).map(([module, stats]) => ({
    module,
    ...stats
  }))

  const totalMappings = policyFeatureMappings.length

  // Filtering for All Policies
  const filteredPolicies = useMemo(() => {
    return policies.filter(p => {
      const name = (p.p_name || p.policy_name || p.name || "").toLowerCase()
      const type = (p.type || p.policy_type || "").toLowerCase()
      const id = String(p.p_id || p.policy_id || p.id || "").toLowerCase()
      return !searchTerm ||
        name.includes(searchTerm.toLowerCase()) ||
        type.includes(searchTerm.toLowerCase()) ||
        id.includes(searchTerm.toLowerCase())
    })
  }, [policies, searchTerm])

  const handleSortAllPolicies = (key) => {
    let direction = 'asc';
    if (sortConfigAllPolicies.key === key && sortConfigAllPolicies.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfigAllPolicies.key === key && sortConfigAllPolicies.direction === 'desc') {
      direction = 'none';
    }
    setSortConfigAllPolicies({ key, direction });
    setCurrentPageAllPolicies(1);
  };

  const handleSortFeatureMappings = (key) => {
    let direction = 'asc';
    if (sortConfigFeatureMappings.key === key && sortConfigFeatureMappings.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfigFeatureMappings.key === key && sortConfigFeatureMappings.direction === 'desc') {
      direction = 'none';
    }
    setSortConfigFeatureMappings({ key, direction });
    setCurrentPageFeatureMappings(1);
  };

  const getSortedData = (data, config) => {
    if (!config.key || config.direction === 'none') return data;

    return [...data].sort((a, b) => {
      let valA, valB;

      switch (config.key) {
        case 'p_name':
        case 'policy_name':
        case 'name':
          valA = (a.p_name || a.policy_name || a.name || "").toLowerCase();
          valB = (b.p_name || b.policy_name || b.name || "").toLowerCase();
          break;
        case 'type':
        case 'policy_type':
          valA = (a.type || a.policy_type || "").toLowerCase();
          valB = (b.type || b.policy_type || "").toLowerCase();
          break;
        case 'is_active':
          valA = (a.is_active !== false) ? 1 : 0;
          valB = (b.is_active !== false) ? 1 : 0;
          break;
        case 'created_at':
          valA = a.created_at ? new Date(a.created_at).getTime() : 0;
          valB = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        case 'updated_at':
          valA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          valB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          break;
        case 'users':
          valA = userCounts[a.p_id || a.policy_id || a.id] || 0;
          valB = userCounts[b.p_id || b.policy_id || b.id] || 0;
          break;
        case 'mapped_features':
          const mappingA = policyFeatureMappings.find(m => (m.p_id || m.policy_id || m.id || m.policy?.p_id || m.policy?.policy_id || m.policy?.id) === (a.p_id || a.policy_id || a.id));
          const mappingB = policyFeatureMappings.find(m => (m.p_id || m.policy_id || m.id || m.policy?.p_id || m.policy?.policy_id || m.policy?.id) === (b.p_id || b.policy_id || b.id));
          valA = Array.isArray(mappingA?.features) ? mappingA.features.length : (typeof mappingA?.featuresObject === 'object' ? Object.keys(mappingA.featuresObject).length : 0);
          valB = Array.isArray(mappingB?.features) ? mappingB.features.length : (typeof mappingB?.featuresObject === 'object' ? Object.keys(mappingB.featuresObject).length : 0);
          break;
        default:
          valA = a[config.key];
          valB = b[config.key];
      }

      if (valA < valB) return config.direction === 'asc' ? -1 : 1;
      if (valA > valB) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedAllPolicies = useMemo(() => {
    return getSortedData(filteredPolicies, sortConfigAllPolicies);
  }, [filteredPolicies, sortConfigAllPolicies, userCounts]);

  const sortedFeatureMappings = useMemo(() => {
    return getSortedData(filteredPolicies, sortConfigFeatureMappings);
  }, [filteredPolicies, sortConfigFeatureMappings, policyFeatureMappings]);

  // Pagination for All Policies
  const allPoliciesStartIndex = (currentPageAllPolicies - 1) * pageSize
  const allPoliciesEndIndex = allPoliciesStartIndex + pageSize
  const paginatedAllPolicies = sortedAllPolicies.slice(allPoliciesStartIndex, allPoliciesEndIndex)
  const totalPagesAllPolicies = Math.ceil(filteredPolicies.length / pageSize)

  // Pagination for Policy Feature Mappings
  const featureMappingsStartIndex = (currentPageFeatureMappings - 1) * pageSize
  const featureMappingsEndIndex = featureMappingsStartIndex + pageSize
  const paginatedFeatureMappings = sortedFeatureMappings.slice(featureMappingsStartIndex, featureMappingsEndIndex)
  const totalPagesFeatureMappings = Math.ceil(filteredPolicies.length / pageSize)

  // Reset to page 1 when switching tabs
  const handleTabChange = (value) => {
    setActiveTab(value)
    setCurrentPageAllPolicies(1)
    setCurrentPageFeatureMappings(1)
  }

  const handleToggleStatus = async (policy, newStatus) => {
    try {
      const token = authUtils.getAuthHeader()
      if (!token) {
        toast.error("Authentication required")
        return
      }

      const policyId = policy.p_id || policy.policy_id || policy.id
      if (!policyId) {
        toast.error("Policy ID is required")
        return
      }

      await policiesApi.update(policyId, { is_active: newStatus })

      toast.success(`Policy ${newStatus ? "activated" : "deactivated"} successfully`)

      // Call update callback to refresh data
      if (onPolicyUpdate) {
        onPolicyUpdate()
      }
    } catch (error) {
      console.error("Error updating policy status:", error)
      toast.error(error.response?.data?.message || "Failed to update policy status")
    }
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Policies</p>
                <p className="text-2xl font-bold">{policies.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{activePolicies.length} active</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Policies</p>
                <p className="text-2xl font-bold">{activePolicies.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{inactivePolicies.length} inactive</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive Policies</p>
                <p className="text-2xl font-bold">{inactivePolicies.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Require attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Policy Mappings</p>
                <p className="text-2xl font-bold">{totalMappings}</p>
                <p className="text-xs text-muted-foreground mt-1">Active configurations</p>
              </div>
              <LinkIcon className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Modules Section with Carousel */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Modules</CardTitle>
          <CardDescription>
            Total {Object.keys(moduleGroups).length} modules, {allFeatures.length} features
          </CardDescription>
        </CardHeader>
        <CardContent>
          {moduleGroupsArray.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No feature modules found</p>
            </div>
          ) : (
            <div className="relative">
              <Carousel
                className="w-full"
                opts={{
                  align: "start",
                  slidesToScroll: 4
                }}
              >
                <CarouselContent>
                  {moduleGroupsArray.map(({ module, total, active, inactive }) => (
                    <CarouselItem key={module} className="md:basis-1/2 lg:basis-1/4">
                      <div className="p-1">
                        <Card
                          className="cursor-pointer hover:bg-muted/50 transition-colors h-full"
                          onClick={() => onModuleClick(module)}
                        >
                          <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-base mb-2">{module}</p>
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">{total}</span> total features
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium text-green-600">{active}</span> active,{" "}
                                    <span className="font-medium text-orange-600">{inactive}</span> inactive
                                  </p>
                                </div>
                              </div>
                              <BarChart3 className="h-6 w-6 text-primary ml-2 flex-shrink-0" />
                            </div>
                            <div className="mt-3 pt-2 border-t border-border">
                              <p className="text-xs text-muted-foreground text-center">
                                Click to view details
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="absolute top-1/2 left-0 right-0 flex justify-between -translate-y-1/2 pointer-events-none z-10">
                  <div className="pointer-events-auto">
                    <CarouselPrevious className="relative static transform-none -translate-y-0 bg-background/80 hover:bg-background" />
                  </div>
                  <div className="pointer-events-auto">
                    <CarouselNext className="relative static transform-none -translate-y-0 bg-background/80 hover:bg-background" />
                  </div>
                </div>
              </Carousel>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policies Section with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
          <CardDescription>Manage policies and their feature mappings</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Search Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 mb-4  rounded-lg">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPageAllPolicies(1)
                    setCurrentPageFeatureMappings(1)
                  }}
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Show:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value))
                    setCurrentPageAllPolicies(1)
                    setCurrentPageFeatureMappings(1)
                  }}
                >
                  <SelectTrigger className="w-[80px] h-9 bg-background">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList>
              <TabsTrigger value="all-policies">All Policies</TabsTrigger>
              <TabsTrigger value="feature-mappings">Policy Feature Mappings</TabsTrigger>
            </TabsList>

            <TabsContent value="all-policies" className="mt-4">
              {policies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No policies found</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden w-full">
                    <div className="overflow-x-auto w-full">
                      <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                        <Table className="w-full table-auto">
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortAllPolicies('p_name')}>
                                <div className="flex items-center">
                                  Policy Name
                                  <SortIcon config={sortConfigAllPolicies} sortKey="p_name" />
                                </div>
                              </TableHead>
                              <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortAllPolicies('type')}>
                                <div className="flex items-center">
                                  Type
                                  <SortIcon config={sortConfigAllPolicies} sortKey="type" />
                                </div>
                              </TableHead>
                              <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortAllPolicies('users')}>
                                <div className="flex items-center">
                                  Mapped Users
                                  <SortIcon config={sortConfigAllPolicies} sortKey="users" />
                                </div>
                              </TableHead>
                              <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortAllPolicies('is_active')}>
                                <div className="flex items-center">
                                  Status
                                  <SortIcon config={sortConfigAllPolicies} sortKey="is_active" />
                                </div>
                              </TableHead>
                              <TableHead className="hidden md:table-cell font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortAllPolicies('created_at')}>
                                <div className="flex items-center">
                                  Created
                                  <SortIcon config={sortConfigAllPolicies} sortKey="created_at" />
                                </div>
                              </TableHead>
                              <TableHead className="hidden md:table-cell font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortAllPolicies('updated_at')}>
                                <div className="flex items-center">
                                  Updated
                                  <SortIcon config={sortConfigAllPolicies} sortKey="updated_at" />
                                </div>
                              </TableHead>
                              <TableHead className="whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedAllPolicies.map((policy) => {
                              const policyId = policy.p_id || policy.policy_id || policy.id
                              const userCount = userCounts[policyId] || 0
                              const policyName = policy.p_name || policy.policy_name || policy.name || "Unnamed Policy"
                              return (
                                <TableRow
                                  key={policyId}
                                  className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                                >
                                  <TableCell className="py-2.5">
                                    <div className="flex items-center space-x-3">
                                      <div className="min-w-0">
                                        <span className="font-medium text-primary truncate text-sm md:text-base">
                                          {policyName}
                                        </span>
                                        {policyId && (
                                          <div className="text-xs text-muted-foreground mt-1">{String(policyId).substring(0, 8)}...</div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <Badge variant={(policy.type || policy.policy_type) === "shared" ? "default" : "secondary"}>
                                      {policy.type || policy.policy_type || "internal"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span>{userCount} users</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={policy.is_active !== false}
                                        onCheckedChange={(checked) => handleToggleStatus(policy, checked)}
                                      />
                                      <span className="text-sm text-muted-foreground">
                                        {policy.is_active !== false ? "Active" : "Inactive"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell py-4">
                                    <span className="text-sm text-muted-foreground">
                                      {policy.created_at ? new Date(policy.created_at).toLocaleDateString() : "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell py-4">
                                    <span className="text-sm text-muted-foreground">
                                      {policy.updated_at ? new Date(policy.updated_at).toLocaleDateString() : "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell
                                    className="whitespace-nowrap text-center py-4"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onViewMappedUsers(policy)}
                                        className="flex items-center gap-2"
                                      >
                                        View Mapped Users
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  {/* Pagination for All Policies */}
                  {filteredPolicies.length > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-3 border-t mt-3">
                      <div className="text-sm text-muted-foreground font-medium order-2 md:order-1">
                        Showing {Math.min(allPoliciesStartIndex + 1, filteredPolicies.length)} to {Math.min(allPoliciesEndIndex, filteredPolicies.length)} of {filteredPolicies.length} policies
                      </div>
                      <Pagination className="w-auto mx-0 order-1 md:order-2">
                        <PaginationContent>
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPageAllPolicies === 1}
                              onClick={() => setCurrentPageAllPolicies(prev => Math.max(1, prev - 1))}
                              className="gap-1 pl-2.5 h-8"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span>Previous</span>
                            </Button>
                          </PaginationItem>

                          {totalPagesAllPolicies <= 5 ? (
                            Array.from({ length: totalPagesAllPolicies }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  isActive={currentPageAllPolicies === page}
                                  onClick={() => setCurrentPageAllPolicies(page)}
                                  className="cursor-pointer h-8 w-8 text-xs"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))
                          ) : (
                            <>
                              <PaginationItem>
                                <PaginationLink
                                  isActive={currentPageAllPolicies === 1}
                                  onClick={() => setCurrentPageAllPolicies(1)}
                                  className="cursor-pointer h-8 w-8 text-xs"
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                              {currentPageAllPolicies > 3 && <PaginationEllipsis />}
                              {Array.from({ length: 3 }, (_, i) => {
                                const page = Math.min(Math.max(currentPageAllPolicies - 1 + i, 2), totalPagesAllPolicies - 1);
                                if (page === 1 || page === totalPagesAllPolicies) return null;
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      isActive={currentPageAllPolicies === page}
                                      onClick={() => setCurrentPageAllPolicies(page)}
                                      className="cursor-pointer h-8 w-8 text-xs"
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              })}
                              {currentPageAllPolicies < totalPagesAllPolicies - 2 && <PaginationEllipsis />}
                              <PaginationItem>
                                <PaginationLink
                                  isActive={currentPageAllPolicies === totalPagesAllPolicies}
                                  onClick={() => setCurrentPageAllPolicies(totalPagesAllPolicies)}
                                  className="cursor-pointer h-8 w-8 text-xs"
                                >
                                  {totalPagesAllPolicies}
                                </PaginationLink>
                              </PaginationItem>
                            </>
                          )}

                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPageAllPolicies === totalPagesAllPolicies}
                              onClick={() => setCurrentPageAllPolicies(prev => Math.min(totalPagesAllPolicies, prev + 1))}
                              className="gap-1 pl-2.5 h-8"
                            >
                              <span>Next</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="feature-mappings" className="mt-4">
              {policies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No policies found</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden w-full">
                    <div className="overflow-x-auto w-full">
                      <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                        <Table className="w-full table-auto">
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortFeatureMappings('p_name')}>
                                <div className="flex items-center">
                                  Policy Name
                                  <SortIcon config={sortConfigFeatureMappings} sortKey="p_name" />
                                </div>
                              </TableHead>
                              <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortFeatureMappings('type')}>
                                <div className="flex items-center">
                                  Policy Type
                                  <SortIcon config={sortConfigFeatureMappings} sortKey="type" />
                                </div>
                              </TableHead>
                              <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortFeatureMappings('mapped_features')}>
                                <div className="flex items-center">
                                  Mapped Features
                                  <SortIcon config={sortConfigFeatureMappings} sortKey="mapped_features" />
                                </div>
                              </TableHead>
                              <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortFeatureMappings('users')}>
                                <div className="flex items-center">
                                  Mapped Users
                                  <SortIcon config={sortConfigFeatureMappings} sortKey="users" />
                                </div>
                              </TableHead>
                              <TableHead className="font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortFeatureMappings('is_active')}>
                                <div className="flex items-center">
                                  Status
                                  <SortIcon config={sortConfigFeatureMappings} sortKey="is_active" />
                                </div>
                              </TableHead>
                              <TableHead className="hidden md:table-cell font-semibold text-foreground cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSortFeatureMappings('updated_at')}>
                                <div className="flex items-center">
                                  Last Modified
                                  <SortIcon config={sortConfigFeatureMappings} sortKey="updated_at" />
                                </div>
                              </TableHead>
                              <TableHead className="whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedFeatureMappings.map((policy) => {
                              const policyId = policy.p_id || policy.policy_id || policy.id
                              const userCount = userCounts[policyId] || 0
                              const policyName = policy.p_name || policy.policy_name || policy.name || "Unnamed Policy"
                              const policyType = policy.type || policy.policy_type || "internal"

                              // Find the mapping for this policy
                              const policyMapping = policyFeatureMappings.find(mapping => {
                                const mappingPolicyId = mapping.p_id || mapping.policy_id || mapping.policy?.p_id || mapping.policy?.policy_id || mapping.policy?.id
                                return mappingPolicyId === policyId
                              })

                              // Count features mapped to this policy
                              let featureCount = 0
                              if (policyMapping) {
                                if (policyMapping.features && Array.isArray(policyMapping.features)) {
                                  featureCount = policyMapping.features.length
                                } else if (policyMapping.featuresObject && typeof policyMapping.featuresObject === 'object') {
                                  featureCount = Object.keys(policyMapping.featuresObject).length
                                }
                              }

                              return (
                                <TableRow
                                  key={policyId}
                                  className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                                >
                                  <TableCell className="py-2.5">
                                    <div className="flex items-center space-x-3">
                                      <div className="min-w-0">
                                        <span className="font-medium text-primary truncate text-sm md:text-base transition-colors hover:underline cursor-pointer" onClick={() => onMappingClick && onMappingClick(policyMapping || { p_id: policyId, policy: policy })}>
                                          {policyName}
                                        </span>
                                        {policyId && (
                                          <div className="text-xs text-muted-foreground mt-1">ID: {String(policyId).substring(0, 8)}...</div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <Badge variant={policyType === "shared" ? "default" : "secondary"}>
                                      {policyType}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <div className="flex items-center gap-2">
                                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{featureCount}</span>
                                      <span className="text-sm text-muted-foreground">feature{featureCount !== 1 ? 's' : ''}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span>{userCount} user{userCount !== 1 ? 's' : ''}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <Badge variant={policy.is_active !== false ? "default" : "secondary"}>
                                      {policy.is_active !== false ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell py-4">
                                    <span className="text-sm text-muted-foreground">
                                      {policy.updated_at ? new Date(policy.updated_at).toLocaleDateString() : policy.created_at ? new Date(policy.created_at).toLocaleDateString() : "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell
                                    className="whitespace-nowrap text-center py-4"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const mappingData = policyMapping || {
                                            p_id: policyId,
                                            p_name: policyName,
                                            type: policyType,
                                            is_active: policy.is_active,
                                            created_at: policy.created_at,
                                            updated_at: policy.updated_at,
                                            features: [],
                                            featuresObject: {},
                                            policy: policy
                                          }
                                          onMappingClick && onMappingClick(mappingData)
                                        }}
                                        className="flex items-center gap-2"
                                      >
                                        View Features
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  {/* Pagination for Policy Feature Mappings */}
                  {filteredPolicies.length > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-3 border-t mt-3">
                      <div className="text-sm text-muted-foreground font-medium order-2 md:order-1">
                        Showing {Math.min(featureMappingsStartIndex + 1, filteredPolicies.length)} to {Math.min(featureMappingsEndIndex, filteredPolicies.length)} of {filteredPolicies.length} results
                      </div>
                      <Pagination className="w-auto mx-0 order-1 md:order-2">
                        <PaginationContent>
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPageFeatureMappings === 1}
                              onClick={() => setCurrentPageFeatureMappings(prev => Math.max(1, prev - 1))}
                              className="gap-1 pl-2.5 h-8"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span>Previous</span>
                            </Button>
                          </PaginationItem>

                          {totalPagesFeatureMappings <= 5 ? (
                            Array.from({ length: totalPagesFeatureMappings }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  isActive={currentPageFeatureMappings === page}
                                  onClick={() => setCurrentPageFeatureMappings(page)}
                                  className="cursor-pointer h-8 w-8 text-xs"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))
                          ) : (
                            <>
                              <PaginationItem>
                                <PaginationLink
                                  isActive={currentPageFeatureMappings === 1}
                                  onClick={() => setCurrentPageFeatureMappings(1)}
                                  className="cursor-pointer h-8 w-8 text-xs"
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                              {currentPageFeatureMappings > 3 && <PaginationEllipsis />}
                              {Array.from({ length: 3 }, (_, i) => {
                                const page = Math.min(Math.max(currentPageFeatureMappings - 1 + i, 2), totalPagesFeatureMappings - 1);
                                if (page === 1 || page === totalPagesFeatureMappings) return null;
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      isActive={currentPageFeatureMappings === page}
                                      onClick={() => setCurrentPageFeatureMappings(page)}
                                      className="cursor-pointer h-8 w-8 text-xs"
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              })}
                              {currentPageFeatureMappings < totalPagesFeatureMappings - 2 && <PaginationEllipsis />}
                              <PaginationItem>
                                <PaginationLink
                                  isActive={currentPageFeatureMappings === totalPagesFeatureMappings}
                                  onClick={() => setCurrentPageFeatureMappings(totalPagesFeatureMappings)}
                                  className="cursor-pointer h-8 w-8 text-xs"
                                >
                                  {totalPagesFeatureMappings}
                                </PaginationLink>
                              </PaginationItem>
                            </>
                          )}

                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPageFeatureMappings === totalPagesFeatureMappings}
                              onClick={() => setCurrentPageFeatureMappings(prev => Math.min(totalPagesFeatureMappings, prev + 1))}
                              className="gap-1 pl-2.5 h-8"
                            >
                              <span>Next</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
