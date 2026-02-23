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

export function RoleDialogs({
    isCreateOpen, setIsCreateOpen,
    isEditOpen, setIsEditOpen,
    isViewOpen, setIsViewOpen,
    formData, setFormData,
    selectedRole,
    submitting,
    onCreate,
    onUpdate,
    onEditFromView
}) {
    return (
        <>
            {/* Create Role Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New Role</DialogTitle>
                        <DialogDescription>
                            Enter the role details below. Role name is required.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="create-role-name">Role Name *</Label>
                            <Input
                                id="create-role-name"
                                placeholder="e.g., Admin, Manager, User"
                                value={formData.role_name}
                                onChange={(e) =>
                                    setFormData({ ...formData, role_name: e.target.value })
                                }
                            />
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
                                "Create Role"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Role Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Role</DialogTitle>
                        <DialogDescription>
                            Update role information. Role name is required.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-role-name">Role Name *</Label>
                            <Input
                                id="edit-role-name"
                                placeholder="e.g., Admin, Manager, User"
                                value={formData.role_name}
                                onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                            />
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
                                "Update Role"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Role Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Role Details</DialogTitle>
                        <DialogDescription>View detailed information about this role</DialogDescription>
                    </DialogHeader>
                    {selectedRole && (
                        <div className="space-y-4 py-4">
                            <div>
                                <Label className="text-muted-foreground">Role Name</Label>
                                <p className="text-sm font-medium">{selectedRole.role_name || selectedRole.name || "N/A"}</p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Priority</Label>
                                    <div className="mt-1">
                                        <Badge variant="secondary">
                                            {selectedRole.priority || "N/A"}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Role ID</Label>
                                    <p className="text-sm font-medium font-mono truncate" title={selectedRole.role_id || selectedRole.id}>
                                        {selectedRole.role_id || selectedRole.id || "N/A"}
                                    </p>
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <Label className="text-muted-foreground">Organization ID</Label>
                                <p className="text-sm font-medium font-mono truncate" title={selectedRole.organization_id}>
                                    {selectedRole.organization_id || "N/A"}
                                </p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Created At</Label>
                                    <p className="text-sm font-medium">
                                        {selectedRole.created_at ? new Date(selectedRole.created_at).toLocaleString() : "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Updated At</Label>
                                    <p className="text-sm font-medium">
                                        {selectedRole.updated_at ? new Date(selectedRole.updated_at).toLocaleString() : "N/A"}
                                    </p>
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <Label className="text-muted-foreground">Created By</Label>
                                <p className="text-sm font-medium">{selectedRole.created_by || "N/A"}</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                            Close
                        </Button>
                        <Button onClick={() => {
                            setIsViewOpen(false)
                            if (onEditFromView) onEditFromView(selectedRole)
                        }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
