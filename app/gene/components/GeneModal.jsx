'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Layers, Network, Users, X, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function GeneModal({
  showModal,
  onClose,
  onSubmit,
  editingGene,
  geneData,
  setGeneData,
  addLevel,
  removeLevel,
  updateLevel,
  allUsers = []
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [openUserPopover, setOpenUserPopover] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const initializedRef = useRef(false);

  // Initialize selected users when modal opens or geneData changes
  useEffect(() => {
    if (!showModal) {
      initializedRef.current = false;
      return;
    }

    if (editingGene && geneData.usersArray && !initializedRef.current) {
      let newUserObjects = [];
      const userIds = geneData.usersArray.map(u => String(u.user_id || u.id));

      if (allUsers.length > 0 && userIds.length > 0) {
        newUserObjects = allUsers.filter(user => {
          const userId = user.id || user.user_id;
          return userIds.some(id =>
            String(userId) === String(id) ||
            String(userId).toLowerCase() === String(id).toLowerCase() ||
            String(userId).replace(/-/g, '') === String(id).replace(/-/g, '')
          );
        });
      } else if (geneData.usersArray.length > 0) {
        newUserObjects = geneData.usersArray.map(user => {
          const uId = user.user_id || user.id;
          const foundUser = allUsers.find(au => {
            const auId = au.id || au.user_id;
            return String(auId) === String(uId) ||
              String(auId).toLowerCase() === String(uId).toLowerCase();
          });
          return foundUser || {
            ...user,
            id: String(uId),
            user_id: String(uId),
            name: user.name || user.username || user.email || `User ${String(uId).substring(0, 8)}...`,
            username: user.username || user.name || user.email || `User ${String(uId).substring(0, 8)}...`
          };
        });
      }

      setSelectedUsers(newUserObjects);
      initializedRef.current = true;
    } else if (!editingGene && !initializedRef.current) {
      setSelectedUsers([]);
      initializedRef.current = true;
    } else if (initializedRef.current && allUsers.length > 0) {
      setSelectedUsers(prev => {
        let changed = false;
        const updated = prev.map(u => {
          const uId = u.id || u.user_id;
          const fullUser = allUsers.find(au => String(au.id || au.user_id) === String(uId));
          if (fullUser && u.name && u.name.startsWith('User ')) {
            changed = true;
            return fullUser;
          }
          return u;
        });
        return changed ? updated : prev;
      });
    }
  }, [geneData.usersArray, editingGene, allUsers, showModal]);

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchTerm('');
    setOpenUserPopover(false);
    setSubmitAttempted(false);
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);

    const isValid =
      geneData.name &&
      geneData.name.trim() !== '' &&
      geneData.levels.length > 0 &&
      !geneData.levels.some(l => !l.title || l.title.trim() === '');

    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ geneData, selectedUsers });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIsActiveChange = (checked) => {
    setGeneData(prev => ({ ...prev, is_active: checked }));
  };

  const handleUserSelect = (user) => {
    const userId = user.id || user.user_id;
    if (!selectedUsers.some(s => (s.id || s.user_id) === userId)) {
      setSelectedUsers(prev => [...prev, user]);
    }
    setSearchTerm('');
  };

  const removeUser = (userId) => {
    setSelectedUsers(prev => prev.filter(u => (u.id || u.user_id) !== userId));
  };

  // Filtered users for dropdown
  const filteredUsers = allUsers.filter(u => {
    if (u.is_active === false) return false;
    const userId = u.id || u.user_id;
    if (selectedUsers.some(s => (s.id || s.user_id) === userId)) return false;
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    const name = u.name || u.username || '';
    const email = u.email || '';
    const firstName = u.first_name || '';
    const lastName = u.last_name || '';
    return (
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      firstName.toLowerCase().includes(q) ||
      lastName.toLowerCase().includes(q)
    );
  });

  const isValid =
    geneData.name &&
    geneData.name.trim() !== '' &&
    geneData.levels.length > 0 &&
    !geneData.levels.some(l => !l.title || l.title.trim() === '');

  const showNameError = submitAttempted && (!geneData.name || geneData.name.trim() === '');
  const showLevelsError = submitAttempted && (geneData.levels.length === 0 || geneData.levels.some(l => !l.title || l.title.trim() === ''));

  return (
    <Dialog open={showModal} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4 text-primary" />
            {editingGene ? 'Edit Gene' : 'Create New Gene'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editingGene ? 'Update your gene structure' : 'Build your gene hierarchy'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-5 overflow-y-auto">
          <div className="space-y-5 pb-4">

            {/* Gene Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Gene Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={geneData.name || ''}
                onChange={(e) => setGeneData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter gene name"
                className={cn('h-9 text-sm', showNameError && 'border-destructive')}
              />
              {showNameError && (
                <p className="text-[10px] text-destructive">Gene name is required</p>
              )}
            </div>

            {/* Assign Users */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Assign Users</Label>
                {selectedUsers.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setSelectedUsers([])}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <Popover open={openUserPopover} onOpenChange={setOpenUserPopover}>
                <PopoverTrigger asChild>
                  <div
                    role="combobox"
                    tabIndex={0}
                    className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm ring-offset-background hover:bg-accent hover:text-accent-foreground cursor-pointer min-h-[38px] h-auto"
                  >
                    <div className="flex-1 flex items-center min-w-0">
                      {selectedUsers.length === 0 ? (
                        <span className="text-muted-foreground text-xs">Select users...</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {selectedUsers.map((u) => {
                            const userId = u.id || u.user_id;
                            const displayName = u.name || u.username || u.email || 'Unknown';
                            return (
                              <Badge key={userId} variant="secondary" className="text-[10px] gap-0.5 py-0">
                                {displayName}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeUser(userId); }}
                                  className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
                  </div>
                </PopoverTrigger>

                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden" align="start">
                  <div onWheel={(e) => e.stopPropagation()} className="overflow-hidden">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search users..."
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                        className="h-8 text-xs"
                      />
                      <CommandList className="max-h-[220px] overflow-y-auto overscroll-contain">
                      <CommandEmpty className="py-4 text-xs text-center">No users found</CommandEmpty>
                      <CommandGroup>
                        {filteredUsers.map((u) => {
                          const userId = u.id || u.user_id;
                          const firstName = u.first_name || '';
                          const lastName = u.last_name || '';
                          const displayName = u.name || u.username || u.email || 'Unknown';
                          const initials = (firstName[0] || '') + (lastName[0] || '') || displayName[0]?.toUpperCase() || '?';
                          return (
                            <CommandItem
                              key={userId}
                              onSelect={() => handleUserSelect(u)}
                              className="cursor-pointer py-1.5 text-xs"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-[9px] font-bold shrink-0">
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{displayName}</p>
                                  {u.email && (
                                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                                  )}
                                </div>
                                <div className={cn(
                                  'w-2 h-2 rounded-full shrink-0',
                                  u.is_active !== false ? 'bg-green-500' : 'bg-gray-300'
                                )} />
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Separator />

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold">Active Gene</Label>
                <p className="text-[10px] text-muted-foreground">
                  {geneData.is_active === true ? 'Gene is active and visible' : 'Gene is inactive'}
                </p>
              </div>
              <Switch
                checked={geneData.is_active === true}
                onCheckedChange={handleIsActiveChange}
              />
            </div>

            <Separator />

            {/* Hierarchy Levels */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">
                  Hierarchy Levels <span className="text-destructive">*</span>
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Define your gene hierarchy levels</p>
              </div>

              {geneData.levels.length === 0 ? (
                <Card className={cn('border-dashed', showLevelsError && 'border-destructive')}>
                  <CardContent className="py-8 text-center">
                    <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">No levels added yet</p>
                    {showLevelsError && (
                      <p className="text-[10px] text-destructive mt-1">At least one level is required</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {geneData.levels.map((level, i) => (
                    <Card key={level.id} className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                            {i + 1}
                          </div>
                          <Input
                            value={level.title || ''}
                            onChange={(e) => updateLevel(level.id, 'title', e.target.value)}
                            placeholder={`Level ${i + 1} name`}
                            className={cn(
                              'h-8 text-sm flex-1',
                              showLevelsError && (!level.title || level.title.trim() === '') && 'border-destructive'
                            )}
                          />
                          {geneData.levels.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => removeLevel(level.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full h-8 text-xs"
                onClick={addLevel}
              >
                <Plus className="mr-1.5 h-3 w-3" />
                Add Level
              </Button>
            </div>

          </div>
        </ScrollArea>

        <DialogFooter className="px-5 pb-5 pt-3 border-t">
          <div className="flex items-center justify-between w-full">
            <p className="text-[10px] text-muted-foreground">
              {geneData.levels.length} level{geneData.levels.length !== 1 ? 's' : ''} • {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || (submitAttempted && !isValid)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingGene ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingGene ? 'Update Gene' : 'Create Gene'
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}