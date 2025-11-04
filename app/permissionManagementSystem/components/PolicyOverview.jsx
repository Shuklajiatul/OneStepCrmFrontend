"use client"

import { Users, Link as LinkIcon, FileText, CheckCircle2, AlertTriangle, BarChart3, Edit, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function PolicyOverview({ policies, policyFeatureMappings, allFeatures, userCounts, onModuleClick, onViewMappedUsers, onMappingClick, onViewPolicyDetails, onEditPolicy, onDeletePolicy }) {
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

  const totalMappings = policyFeatureMappings.length

  return (
    <div className="space-y-6">
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

      {/* Feature Modules Section */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Modules</CardTitle>
          <CardDescription>
            Total {Object.keys(moduleGroups).length} modules, {allFeatures.length} features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(moduleGroups).map(([module, stats]) => (
              <Card 
                key={module} 
                className="cursor-pointer hover:bg-muted/50 transition-colors" 
                onClick={() => onModuleClick(module)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{module}</p>
                      <p className="text-sm text-muted-foreground">{stats.total} total features</p>
                      <p className="text-xs text-muted-foreground">{stats.active} active, {stats.inactive} inactive</p>
                    </div>
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Policies Section */}
      <Card>
        <CardHeader>
          <CardTitle>All Policies</CardTitle>
          <CardDescription>Complete list of policies with mapped users count</CardDescription>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No policies found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                  <Table className="w-full table-auto">
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold text-foreground">Policy Name</TableHead>
                        <TableHead className="font-semibold text-foreground">Type</TableHead>
                        <TableHead className="font-semibold text-foreground">Mapped Users</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                        <TableHead className="hidden md:table-cell font-semibold text-foreground">Created</TableHead>
                        <TableHead className="hidden md:table-cell font-semibold text-foreground">Updated</TableHead>
                        <TableHead className="whitespace-nowrap text-center font-semibold text-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map((policy) => {
                        const policyId = policy.p_id || policy.policy_id || policy.id
                        const userCount = userCounts[policyId] || 0
                        const policyName = policy.p_name || policy.policy_name || policy.name || "Unnamed Policy"
                        return (
                          <TableRow 
                            key={policyId}
                            className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                          >
                            <TableCell 
                              className="py-4 cursor-pointer"
                              onClick={() => onViewPolicyDetails && onViewPolicyDetails(policy)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="min-w-0">
                                  <span className="font-medium text-primary truncate text-sm md:text-base transition-colors hover:underline">
                                    {policyName}
                                  </span>
                                  {policyId && (
                                    <div className="text-xs text-muted-foreground mt-1">{String(policyId).substring(0, 8)}...</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant={(policy.type || policy.policy_type) === "shared" ? "default" : "secondary"}>
                                {policy.type || policy.policy_type || "internal"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{userCount} users</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant={policy.is_active !== false ? "default" : "secondary"}>
                                {policy.is_active !== false ? "Active" : "Inactive"}
                              </Badge>
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
                                {onEditPolicy && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onEditPolicy(policy)}
                                    className="flex items-center gap-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </Button>
                                )}
                                {onDeletePolicy && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onDeletePolicy(policy)}
                                    className="flex items-center gap-2 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </Button>
                                )}
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}

