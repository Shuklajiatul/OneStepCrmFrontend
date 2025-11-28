import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Edit } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function OrganizationDialogs({
    isCreateOpen, setIsCreateOpen,
    isEditOpen, setIsEditOpen,
    isViewOpen, setIsViewOpen,
    formData, setFormData,
    selectedOrganization,
    submitting,
    onCreate,
    onUpdate,
    onEditFromView
}) {
    const formatDate = (dateString) => {
        if (!dateString) return "N/A"
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })
        } catch (error) {
            return dateString
        }
    }

    return (
        <>
            {/* Create Organization Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Organization</DialogTitle>
                        <DialogDescription>
                            Enter the organization details below. Organization name is required.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="create-name">Organization Name *</Label>
                            <Input
                                id="create-name"
                                placeholder="e.g., Acme Corporation"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create-subscription-tier">Subscription Tier</Label>
                            <Select
                                value={formData.subscription_tier}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, subscription_tier: value })
                                }
                            >
                                <SelectTrigger id="create-subscription-tier">
                                    <SelectValue placeholder="Select subscription tier" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button onClick={onCreate} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Organization"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Organization Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Organization</DialogTitle>
                        <DialogDescription>
                            Update organization information. Organization name is required.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Organization Name *</Label>
                            <Input
                                id="edit-name"
                                placeholder="e.g., Acme Corporation"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-subscription-tier">Subscription Tier</Label>
                            <Select
                                value={formData.subscription_tier}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, subscription_tier: value })
                                }
                            >
                                <SelectTrigger id="edit-subscription-tier">
                                    <SelectValue placeholder="Select subscription tier" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button onClick={onUpdate} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Organization"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Organization Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Organization Details</DialogTitle>
                        <DialogDescription>View detailed information about this organization</DialogDescription>
                    </DialogHeader>
                    {selectedOrganization && (
                        <div className="space-y-4 py-4">
                            <div>
                                <Label className="text-muted-foreground">Organization Name</Label>
                                <p className="text-sm font-medium">{selectedOrganization.name || "N/A"}</p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Subscription Tier</Label>
                                    <div className="mt-2">
                                        <Badge
                                            variant={
                                                selectedOrganization.subscription_tier === "enterprise" ? "default" :
                                                    selectedOrganization.subscription_tier === "pro" ? "secondary" :
                                                        selectedOrganization.subscription_tier === "basic" ? "outline" :
                                                            "outline"
                                            }
                                        >
                                            {selectedOrganization.subscription_tier
                                                ? selectedOrganization.subscription_tier.charAt(0).toUpperCase() + selectedOrganization.subscription_tier.slice(1)
                                                : "Free"}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Created At</Label>
                                    <p className="text-sm font-medium">{formatDate(selectedOrganization.created_at)}</p>
                                </div>
                            </div>
                            {selectedOrganization.settings && (
                                <>
                                    <Separator />
                                    <div>
                                        <Label className="text-muted-foreground">Settings</Label>
                                        <div className="mt-2 p-3 bg-muted rounded-md">
                                            <pre className="text-xs overflow-auto">
                                                {JSON.stringify(selectedOrganization.settings, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </>
                            )}
                            {selectedOrganization.organization_id && (
                                <>
                                    <Separator />
                                    <div>
                                        <Label className="text-muted-foreground">Organization ID</Label>
                                        <p className="text-sm font-medium font-mono">{selectedOrganization.organization_id}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                            Close
                        </Button>
                        <Button onClick={() => {
                            setIsViewOpen(false)
                            if (onEditFromView) onEditFromView(selectedOrganization)
                        }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Organization
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
