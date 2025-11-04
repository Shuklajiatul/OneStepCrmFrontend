"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Edit, Trash2, Users, Calendar, FileText, Tag } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import axios from "axios"
import { authUtils } from "@/lib/auth-utils"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export function PolicyDetailsDialog({ policy, open, onOpenChange, onEdit, onDelete, onViewMappedUsers }) {
  const [policyDetails, setPolicyDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [userCount, setUserCount] = useState(0)
  const [loadingUserCount, setLoadingUserCount] = useState(false)

  useEffect(() => {
    if (open && policy) {
      fetchPolicyDetails()
      fetchUserCount()
    } else {
      setPolicyDetails(null)
      setUserCount(0)
    }
  }, [open, policy])

  const fetchPolicyDetails = async () => {
    if (!policy) return

    const policyId = policy.p_id || policy.policy_id || policy.id
    if (!policyId) {
      toast.error("Policy ID is required")
      return
    }

    setLoading(true)
    try {
      const token = authUtils.getAuthHeader()
      if (!token) {
        toast.error("Authentication required")
        return
      }

      const response = await axios.get(`${API_BASE_URL}/api/policies/${policyId}`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })

      // Handle response structure: { success: true, data: {...} }
      const details = response.data?.data || response.data || null
      setPolicyDetails(details)
    } catch (error) {
      console.error("Error fetching policy details:", error)
      toast.error(error.response?.data?.message || "Failed to load policy details")
      setPolicyDetails(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserCount = async () => {
    if (!policy) return

    const policyId = policy.p_id || policy.policy_id || policy.id
    if (!policyId) return

    setLoadingUserCount(true)
    try {
      const token = authUtils.getAuthHeader()
      if (!token) return

      const response = await axios.get(`${API_BASE_URL}/api/policies/${policyId}/users/count`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      })

      const count = response.data?.count || response.data?.data?.count || 0
      setUserCount(count)
    } catch (error) {
      console.error("Error fetching user count:", error)
      setUserCount(0)
    } finally {
      setLoadingUserCount(false)
    }
  }

  const displayPolicy = policyDetails || policy
  const policyId = displayPolicy?.p_id || displayPolicy?.policy_id || displayPolicy?.id
  const policyName = displayPolicy?.p_name || displayPolicy?.policy_name || displayPolicy?.name || "Unknown Policy"
  const policyType = displayPolicy?.type || displayPolicy?.policy_type || "internal"
  const isActive = displayPolicy?.is_active !== false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Policy Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading policy details...</p>
          </div>
        ) : displayPolicy ? (
          <div className="space-y-6">
            {/* Policy Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">{policyName}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant={policyType === "shared" ? "default" : "secondary"}>
                    <Tag className="h-3 w-3 mr-1" />
                    {policyType}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Policy Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Policy ID</label>
                  <p className="text-sm font-mono mt-1 break-all">{policyId || "N/A"}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Organization ID</label>
                  <p className="text-sm font-mono mt-1 break-all">
                    {displayPolicy.organization_id || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mapped Users</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {loadingUserCount ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-sm font-medium">{userCount} users</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created At</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {displayPolicy.created_at
                        ? new Date(displayPolicy.created_at).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {displayPolicy.updated_at
                        ? new Date(displayPolicy.updated_at).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {displayPolicy.created_by && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created By</label>
                    <p className="text-sm font-mono mt-1 break-all">
                      {displayPolicy.created_by}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Description if available */}
            {displayPolicy.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm mt-1 text-foreground">{displayPolicy.description}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t">
              {onViewMappedUsers && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false)
                    onViewMappedUsers(displayPolicy)
                  }}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  View Mapped Users
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit(displayPolicy)
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Policy
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false)
                    onDelete(displayPolicy)
                  }}
                  className="flex items-center gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Policy
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Failed to load policy details</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

