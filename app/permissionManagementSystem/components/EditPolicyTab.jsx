"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import axios from "axios"
import { authUtils } from "@/lib/auth-utils"
import { Loader2 } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

export function EditPolicyTab({ policy, onPolicyUpdated, onCancel }) {
  const [formData, setFormData] = useState({
    policy_name: "",
    policy_type: "internal",
    description: "",
    is_active: true,
  })
  const [originalData, setOriginalData] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (policy) {
      const original = {
        policy_name: policy.policy_name || policy.name || policy.p_name || "",
        policy_type: policy.policy_type || policy.type || "internal",
        description: policy.description || "",
        is_active: policy.is_active !== false,
      }
      setOriginalData(original)
      setFormData(original)
    }
  }, [policy])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = authUtils.getAuthHeader()
      if (!token) {
        toast.error("Authentication required")
        return
      }

      const policyId = policy?.p_id || policy?.policy_id || policy?.id
      if (!policyId) {
        toast.error("Policy ID is required")
        return
      }

      // Compare current formData with original data and only include changed fields
      const apiPayload = {}
      
      if (originalData) {
        // Check if policy_name changed
        if (formData.policy_name !== originalData.policy_name) {
          apiPayload.p_name = formData.policy_name
        }
        
        // Check if policy_type changed
        if (formData.policy_type !== originalData.policy_type) {
          apiPayload.type = formData.policy_type
        }
        
        // Check if is_active changed
        if (formData.is_active !== originalData.is_active) {
          apiPayload.is_active = formData.is_active
        }
        
        // Check if description changed (only include if it exists and changed)
        if (formData.description !== (originalData.description || "")) {
          apiPayload.description = formData.description
        }
      } else {
        // Fallback: if originalData is not available, send all fields
        apiPayload.p_name = formData.policy_name
        apiPayload.type = formData.policy_type
        apiPayload.is_active = formData.is_active
        if (formData.description) {
          apiPayload.description = formData.description
        }
      }

      // Check if there are any changes
      if (Object.keys(apiPayload).length === 0) {
        toast.info("No changes to update")
        setSubmitting(false)
        return
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/policies/${policyId}`,
        apiPayload,
        {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.data) {
        toast.success("Policy updated successfully")
        if (onPolicyUpdated) {
          onPolicyUpdated()
        }
      }
    } catch (error) {
      console.error("Error updating policy:", error)
      toast.error(error.response?.data?.message || "Failed to update policy. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!policy) {
    return null
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="policy_name">Policy Name *</Label>
            <Input
              id="policy_name"
              value={formData.policy_name}
              onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
              required
              placeholder="Enter policy name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy_type">Policy Type *</Label>
            <Select
              value={formData.policy_type}
              onValueChange={(value) => setFormData({ ...formData, policy_type: value })}
            >
              <SelectTrigger id="policy_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter policy description"
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Active
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Policy"
              )}
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
    </div>
  )
}

