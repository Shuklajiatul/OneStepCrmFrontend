'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Trash2, Users, Loader2, Search, Layers,
  CheckCircle2, AlertCircle, Network
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authUtils } from '@/lib/auth-utils';
import { genesApi, usersApi } from '@/lib/api-endpoint';

// Shadcn UI Components
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
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

function DebouncedInput({ value: initialValue, onChange, debounceTime = 300, ...props }) {
  const [value, setValue] = useState(initialValue || '');
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setValue(initialValue || '');
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Only call onChange if value actually differs to avoid initial render triggers
      if (value !== (initialValue || '')) {
        onChangeRef.current(value);
      }
    }, debounceTime);

    return () => clearTimeout(timeout);
  }, [value, debounceTime, initialValue]);

  return (
    <Input
      {...props}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
}

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
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [openUserPopover, setOpenUserPopover] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [touchedFields, setTouchedFields] = useState({ name: false, levels: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Track if users have been initialized for the current session to avoid overwriting manual selections
  const initializedRef = useRef(false);

  // Initialize selected users when geneData changes
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

  const handleSubmit = async () => {
    setSubmitAttempted(true);

    const isValid = geneData.name &&
      geneData.name.trim() !== '' &&
      geneData.levels.length > 0 &&
      !geneData.levels.some(level => !level.title || level.title.trim() === '');

    if (!isValid) {
      // Mark all fields as touched to show errors
      setTouchedFields({ name: true, levels: true });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        geneData: geneData,
        selectedUsers: selectedUsers,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchTerm('');
    setOpenUserPopover(false);
    setError(null);
    setTouchedFields({ name: false, levels: false });
    setSubmitAttempted(false);
    onClose();
  };

  const handleIsActiveChange = (checked) => {
    setGeneData(prev => ({
      ...prev,
      is_active: checked
    }));
  };

  const handleUserSelect = (user) => {
    const userId = user.id || user.user_id;
    if (!selectedUsers.some(selected => (selected.id || selected.user_id) === userId)) {
      setSelectedUsers(prev => [...prev, user]);
    }
    setSearchTerm('');
  };

  const removeUser = (userId) => {
    setSelectedUsers(prev => prev.filter(user => (user.id || user.user_id) !== userId));
  };

  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  const handlePopoverOpen = (open) => {
    setOpenUserPopover(open);
  };

  const filteredUsers = allUsers.filter(user => {
    const userId = user.id || user.user_id;

    // Only show active users
    const isActive = user.is_active !== false;
    if (!isActive) {
      return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchLower);

    const isSelected = selectedUsers.some(selected => {
      const selectedId = selected.id || selected.user_id;
      return selectedId === userId;
    });
    return matchesSearch && !isSelected;
  });

  const isFormValid = geneData.name &&
    geneData.name.trim() !== '' &&
    geneData.levels.length > 0 &&
    !geneData.levels.some(level => !level.title || level.title.trim() === '');

  // Error visibility logic
  const showNameError = (touchedFields.name || submitAttempted) && !geneData.name && !isSubmitting;
  const showLevelsError = (touchedFields.levels || submitAttempted) && (geneData.levels.length === 0 || geneData.levels.some(level => !level.title || level.title.trim() === '')) && !isSubmitting;

  return (
    <Dialog open={showModal} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Network className="h-5 w-5" />
            {editingGene ? 'Edit Gene' : 'Create New Gene'}
          </DialogTitle>
          <DialogDescription>
            {editingGene ? 'Update your gene structure' : 'Build your gene hierarchy'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Gene Name Input */}
            <div className="space-y-2">
              <Label htmlFor="gene-name" className="text-sm font-semibold">
                Gene Name <span className="text-destructive">*</span>
              </Label>
              <DebouncedInput
                id="gene-name"
                type="text"
                value={geneData.name || ''}
                onChange={(val) => {
                  setGeneData({ ...geneData, name: val });
                  setTouchedFields(prev => ({ ...prev, name: true }));
                }}
                onBlur={() => setTouchedFields(prev => ({ ...prev, name: true }))}
                placeholder="Enter gene name (e.g., test-2)"
                className={cn(
                  "w-full",
                  showNameError && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {showNameError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Gene name is required
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Users Multi-Select Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Assign Users</Label>
                {selectedUsers.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAllUsers}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Selected Users Display */}
              <Popover open={openUserPopover} onOpenChange={handlePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    asChild
                    className="w-full justify-between min-h-[52px] h-auto py-2 px-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex-1 flex items-center min-w-0">
                        {selectedUsers.length === 0 ? (
                          <span className="text-muted-foreground text-sm">Select users...</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 w-full">
                            {selectedUsers.map((user) => {
                              const userId = user.id || user.user_id;

                              // Improved display name logic that handles temporary user objects
                              let displayName = 'Unknown User';

                              const fullName = user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`.trim()
                                : (user.first_name || user.last_name || '').trim();

                              if (fullName) {
                                displayName = fullName;
                              } else if (user.name && user.name.trim() && !user.name.startsWith('User ')) {
                                displayName = user.name;
                              } else if (user.username && user.username.trim() && !user.username.startsWith('User ')) {
                                displayName = user.username;
                              } else if (user.email && user.email.trim()) {
                                displayName = user.email;
                              } else {
                                // Check if this is a temporary placeholder name
                                const tempName = user.username || user.name;
                                if (tempName && tempName.startsWith('User ')) {
                                  displayName = tempName;
                                } else {
                                  displayName = `User ${userId.substring(0, 8)}...`;
                                }
                              }

                              return (
                                <Badge
                                  key={userId}
                                  variant="secondary"
                                  className="flex items-center gap-1 text-xs"
                                >
                                  {displayName}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeUser(userId);
                                    }}
                                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 -mr-1"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <Users className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                  sideOffset={4}
                >
                  <div
                    className="max-h-[300px] overflow-y-auto cursor-pointer scrollbar-area"
                    onWheel={(e) => e.stopPropagation()}
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'hsl(var(--muted-foreground)) hsl(var(--muted))'
                    }}
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search users..."
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                        className="h-9 border-b sticky top-0 bg-background z-10"
                      />
                      <CommandList className="max-h-[250px]">
                        {loadingUsers ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                            <span className="text-sm text-muted-foreground">Loading users...</span>
                          </div>
                        ) : error ? (
                          <div className="p-4 text-center">
                            <Alert variant="destructive" className="py-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                {error}
                              </AlertDescription>
                            </Alert>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onClose()}
                              className="mt-2"
                            >
                              Close
                            </Button>
                          </div>
                        ) : filteredUsers.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <CommandEmpty>
                              {searchTerm ? 'No active users found' : allUsers.length === 0 ? 'No users available' : 'All active users are selected'}
                            </CommandEmpty>
                          </div>
                        ) : (
                          <CommandGroup>
                            {filteredUsers.map((user) => {
                              const userId = user.id || user.user_id;
                              const fullName = user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`.trim()
                                : (user.first_name || user.last_name || '').trim();

                              const displayName = fullName ||
                                (user.name && user.name.trim()) ||
                                (user.username && user.username.trim()) ||
                                (user.email && user.email.trim()) ||
                                `User ${userId}`;
                              const showEmail = user.email && user.email.trim() && user.email !== displayName;
                              return (
                                <CommandItem
                                  key={userId}
                                  value={`${displayName} ${user.email || ''}`}
                                  onSelect={() => {
                                    handleUserSelect(user);
                                  }}
                                  className="cursor-pointer py-2 px-3 flex items-center justify-between gap-2 hover:bg-accent transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                      <Users className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <span className="font-medium truncate text-sm" title={displayName}>
                                        {displayName}
                                      </span>
                                      {showEmail && (
                                        <span className="text-xs text-muted-foreground truncate" title={user.email}>
                                          {user.email}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "w-2 h-2 rounded-full shrink-0",
                                    user.is_active !== false ? 'bg-green-500' : 'bg-gray-300'
                                  )} />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Separator />

            {/* Status Switch */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="gene-status" className="text-sm font-semibold">Active Gene</Label>
                <p className="text-xs text-muted-foreground">
                  {geneData.is_active === true
                    ? 'Gene is active and visible'
                    : 'Gene is inactive and hidden'}
                </p>
              </div>
              <Switch
                id="gene-status"
                checked={geneData.is_active === true}
                onCheckedChange={handleIsActiveChange}
              />
            </div>

            <Separator />

            {/* Hierarchy Levels */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-bold">
                  Hierarchy Levels <span className="text-destructive">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Define your gene hierarchy levels (Level 1, Level 2, Level 3, etc.)
                </p>
              </div>

              {geneData.levels.length === 0 ? (
                <Card className={cn(
                  "border-dashed transition-colors",
                  showLevelsError && "border-destructive"
                )}>
                  <CardContent className="pt-12 pb-12">
                    <div className="text-center">
                      <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground mb-2 font-medium">No hierarchy levels added yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click "Add Level" to start building your gene hierarchy
                      </p>
                      {showLevelsError && geneData.levels.length === 0 && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            At least one level is required
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {geneData.levels.map((level, index) => (
                    <Card key={level.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                <span className="text-primary-foreground text-sm font-bold">
                                  {index + 1}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold">Level {index + 1}</p>
                                <p className="text-xs text-muted-foreground">Level {index + 1} value</p>
                              </div>
                            </div>
                            {geneData.levels.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLevel(level.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`level-${level.id}`}>
                              Level Value <span className="text-destructive">*</span>
                            </Label>
                            <DebouncedInput
                              id={`level-${level.id}`}
                              type="text"
                              value={level.title || ''}
                              onChange={(val) => {
                                updateLevel(level.id, 'title', val);
                                setTouchedFields(prev => ({ ...prev, levels: true }));
                              }}
                              onBlur={() => setTouchedFields(prev => ({ ...prev, levels: true }))}
                              placeholder={`Enter level ${index + 1} value (e.g., "india", "maharashtra", "pune")`}
                              className={cn(
                                "w-full",
                                showLevelsError && (!level.title || level.title.trim() === '') && "border-destructive focus-visible:ring-destructive"
                              )}
                            />
                            {showLevelsError && (!level.title || level.title.trim() === '') && (
                              <Alert variant="destructive" className="py-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  Level value is required
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Button
                type="button"
                onClick={() => {
                  addLevel();
                  setTouchedFields(prev => ({ ...prev, levels: true }));
                }}
                variant="default"
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Level
              </Button>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between px-6 pb-6 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {geneData.levels.length > 0
              ? `${geneData.levels.length} level${geneData.levels.length > 1 ? 's' : ''} configured • Status: ${geneData.is_active === true ? 'Active' : 'Inactive'}`
              : 'Add at least one level to create gene'}
            {editingGene && selectedUsers.length > 0 && (
              <span className="ml-2 text-primary">
                • {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}