"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, FileText } from "lucide-react"
import axios from "axios"
import { authUtils } from "@/lib/auth-utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export function ModuleDetailTab({ moduleName, onBack }) {
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchModuleFeatures()
  }, [moduleName])

  const fetchModuleFeatures = async () => {
    try {
      setLoading(true)
      const token = authUtils.getAuthHeader()
      if (!token) return

      const response = await axios.get(`${API_BASE_URL}/api/features?module=${moduleName}`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })

      const featureData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.features || []

      setFeatures(featureData.filter(f => (f.module || "Uncategorized") === moduleName))
    } catch (error) {
      console.error("Error fetching module features:", error)
      setFeatures([])
    } finally {
      setLoading(false)
    }
  }

  const activeFeatures = useMemo(() => {
    return features.filter(f => f.is_active !== false)
  }, [features])

  const inactiveFeatures = useMemo(() => {
    return features.filter(f => f.is_active === false)
  }, [features])

  const totalFeatures = features.length
  const activeCount = activeFeatures.length
  const inactiveCount = inactiveFeatures.length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl">{moduleName} Module</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Module Summary */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              {activeCount} active feature{activeCount !== 1 ? 's' : ''} out of {totalFeatures} total.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Features</p>
                    <p className="text-2xl font-bold">{totalFeatures}</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Features</p>
                    <p className="text-2xl font-bold">{activeCount}</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inactive Features</p>
                    <p className="text-2xl font-bold">{inactiveCount}</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading features...</p>
            </div>
          ) : features.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No features found for this module</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                <div className="w-full [&_[data-slot=table-container]]:w-full [&_[data-slot=table]]:w-full">
                  <Table className="w-full table-auto">
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold text-foreground">Feature Name</TableHead>
                        <TableHead className="font-semibold text-foreground">Description</TableHead>
                        <TableHead className="font-semibold text-foreground">Action</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                        <TableHead className="font-semibold text-foreground">Feature ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {features.map((feature) => {
                        const featureId = feature.feature_id || feature.id
                        return (
                          <TableRow 
                            key={featureId}
                            className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
                          >
                            <TableCell className="py-4">
                              <span className="font-medium text-primary">{feature.feature_name || feature.name || "-"}</span>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="text-sm text-muted-foreground">{feature.description || "-"}</span>
                            </TableCell>
                            <TableCell className="py-4">
                              {feature.action ? (
                                <Badge variant="outline">
                                  {feature.action}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant={feature.is_active !== false ? "default" : "secondary"}>
                                {feature.is_active !== false ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="font-mono text-xs text-muted-foreground">
                                {String(featureId || "").substring(0, 8)}...
                              </span>
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
