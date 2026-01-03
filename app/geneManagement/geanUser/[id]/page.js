"use client"

import { useState, useEffect } from "react"
import { User, Loader2, AlertCircle, RefreshCw, Network, Users, ArrowLeft, ChevronDown, Eye, Mail, Badge as BadgeIcon, Award } from "lucide-react"
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authUtils } from '@/lib/auth-utils';
import { genesApi, rolesApi, usersApi } from '@/lib/api-endpoint';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  Handle,
} from 'reactflow';

import 'reactflow/dist/style.css';

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PageBreadcrumb } from "@/components/page-breadcrumb"

// API Constants
const API_CONSTANTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  geneDetails: '/api/genes',
  geneMappedUser: '/api/genes/by-geneId',
};

const CustomNode = ({ data }) => {
  return (
    <Card className="min-w-[160px] hover:shadow-xl transition-all cursor-default border-2 relative" style={{ borderColor: data.colors.border }}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-muted-foreground" />
      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-muted-foreground opacity-0" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-muted-foreground opacity-0" />
      <CardContent className="p-3">
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${data.colors.bg}, ${data.colors.border})`,
            }}
          >
            <User size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center w-full">
            <p className="font-semibold text-sm text-foreground truncate mb-0.5">
              {data.label}
            </p>
            <p className="text-xs text-muted-foreground truncate capitalize mb-2">
              {data.role}
            </p>
            <Badge
              className="text-[10px] font-bold text-white"
              style={{
                backgroundColor: data.colors.bg,
              }}
            >
              P{data.priority}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const RolePriorityTree = () => {
  const params = useParams();
  const router = useRouter();
  const gId = params.id;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priorityLevels, setPriorityLevels] = useState([]);
  const [geneDetails, setGeneDetails] = useState(null);
  const [loadingGene, setLoadingGene] = useState(true);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [activeTab, setActiveTab] = useState("tree");
  const [expandedPriorities, setExpandedPriorities] = useState({});

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (gId) {
      fetchGeneDetails();
      fetchRoles();
    }
  }, [gId]);

  useEffect(() => {
    if (gId && geneDetails !== null) {
      fetchGeanMappedUser();
    }
  }, [gId, geneDetails]);

  useEffect(() => {
    if (users.length > 0 && availableRoles.length > 0) {
      const needsReNormalization = users.some(u =>
        !u.role_info?.priority || u.role_info.priority === 999
      );

      if (!needsReNormalization) {
        return;
      }

      const normalizedUsers = users.map((u) => {
        if (u.role_info?.priority && u.role_info.priority !== 999) {
          return u;
        }

        const originalUser = u;
        let roleName = u.role_info?.role_name || 'User';
        let priority = u.role_info?.priority || 999;

        if (u.role_id) {
          const role = availableRoles.find(r =>
            (r.role_id || r.id) === u.role_id ||
            String(r.role_id || r.id) === String(u.role_id)
          );
          if (role) {
            roleName = role.role_name || role.name || roleName;
            priority = role.priority || priority;
          }
        }

        if (roleName !== 'User' && priority === 999) {
          const roleByName = availableRoles.find(r =>
            (r.role_name || r.name || '').toLowerCase() === roleName.toLowerCase()
          );
          if (roleByName) {
            priority = roleByName.priority || priority;
          }
        }

        return {
          ...originalUser,
          role_info: {
            role_name: roleName,
            priority: priority,
          },
        };
      });

      console.log('Re-normalizing users with updated role priorities');
      setUsers(normalizedUsers);
      extractPriorityLevels(normalizedUsers);
      buildPriorityTree(normalizedUsers);
    }
  }, [availableRoles]);

  const getToken = () => {
    const tokens = authUtils.getTokens();
    if (tokens?.accessToken) {
      return tokens.accessToken;
    }
    console.warn('No access token found in cookies');
    return null;
  };

  const handleAuthError = (status) => {
    if (status === 401) {
      authUtils.clearTokens();
      router.push('/login');
    }
  };

  const fetchGeneDetails = async () => {
    try {
      setLoadingGene(true);
      const token = getToken();

      if (!token) {
        console.warn('No token available for fetching gene details');
        setLoadingGene(false);
        return;
      }

      console.log('Fetching gene details for:', gId);

      const response = await genesApi.getDetails(gId);

      console.log('Gene Details Response:', response.data);
      if (response.data.success && response.data.data) {
        setGeneDetails(response.data.data);
      } else if (response.data.data) {
        setGeneDetails(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching gene details:', err);
      if (err.response?.status === 401) {
        handleAuthError(401);
      }
    } finally {
      setLoadingGene(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = getToken();

      if (!token) {
        console.warn('No token available for fetching roles');
        return;
      }

      console.log('Fetching roles');

      const response = await rolesApi.getAll();

      console.log('Roles Response:', response.data);
      if (response.data) {
        const roleData = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.roles || [];
        setAvailableRoles(roleData);
        console.log('Roles fetched:', roleData);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      if (err.response?.status === 401) {
        handleAuthError(401);
      }
      setAvailableRoles([]);
    }
  };

  const fetchGeanMappedUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();

      if (!token) {
        setError('Authentication required. Please login again.');
        handleAuthError(401);
        return;
      }

      const baseUrl = API_CONSTANTS.BASE_URL;
      const endPoint = API_CONSTANTS.geneMappedUser;
      const fullUrl = baseUrl + endPoint + '/' + gId;

      let rawUsers = [];

      try {
        const response = await genesApi.getById(gId);

        const resp = response.data || {};
        console.log('API Response:', resp);

        const isOk = resp.status === 'success' || resp.success === true;
        if (isOk) {
          rawUsers = Array.isArray(resp.data) ? resp.data : [];
        }
      } catch (apiErr) {
        console.warn('Primary API endpoint failed, trying fallback:', apiErr);
        if (apiErr.response?.status === 401) {
          handleAuthError(401);
          return;
        }
      }

      if (!rawUsers || rawUsers.length === 0) {
        console.log('Using fallback: fetching all users and filtering by g_ids');
        try {
          const allUsersResponse = await usersApi.getAll();

          let allUsers = [];
          if (Array.isArray(allUsersResponse.data)) {
            allUsers = allUsersResponse.data;
          } else if (allUsersResponse.data?.success && Array.isArray(allUsersResponse.data.data)) {
            allUsers = allUsersResponse.data.data;
          } else if (Array.isArray(allUsersResponse.data?.data)) {
            allUsers = allUsersResponse.data.data;
          }

          rawUsers = allUsers.filter(user => {
            const gIds = user.g_ids || [];
            if (Array.isArray(gIds)) {
              return gIds.some(id => String(id) === String(gId));
            }
            return String(gIds) === String(gId);
          });

          console.log(`Found ${rawUsers.length} users mapped to gene ${gId}`);
        } catch (fallbackErr) {
          console.error('Fallback also failed:', fallbackErr);
          if (fallbackErr.response?.status === 401) {
            handleAuthError(401);
            return;
          }

          if (geneDetails && geneDetails.users && Array.isArray(geneDetails.users) && geneDetails.users.length > 0) {
            console.log('Using user IDs from gene details as last resort');
            rawUsers = geneDetails.users.map(userId => ({
              user_id: userId,
              id: userId,
              first_name: '',
              last_name: '',
              email: '',
              roles: 'User'
            }));
          }
        }
      }

      const normalizedUsers = rawUsers.map((u) => {
        const id = u.user_id || u.id;
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
        const username = name || u.email || `User ${id || ''}`;

        let roleName = 'User';
        let priority = 999;

        if (u.role_id) {
          const role = availableRoles.find(r =>
            (r.role_id || r.id) === u.role_id ||
            String(r.role_id || r.id) === String(u.role_id)
          );
          if (role) {
            roleName = role.role_name || role.name || 'User';
            priority = role.priority || 999;
          }
        }

        if (roleName === 'User' && priority === 999) {
          if (u.roles && typeof u.roles === 'string') {
            roleName = u.roles;
            const roleByName = availableRoles.find(r =>
              (r.role_name || r.name || '').toLowerCase() === u.roles.toLowerCase()
            );
            if (roleByName) {
              priority = roleByName.priority || 999;
            }
          } else if (u.role && typeof u.role === 'string') {
            roleName = u.role;
            const roleByName = availableRoles.find(r =>
              (r.role_name || r.name || '').toLowerCase() === u.role.toLowerCase()
            );
            if (roleByName) {
              priority = roleByName.priority || 999;
            }
          } else if (u.roles && typeof u.roles === 'object') {
            if (u.roles.role_name || u.roles.name) {
              roleName = u.roles.role_name || u.roles.name;
              priority = u.roles.priority || 999;
            }
          }
        }

        if (u.role_info) {
          if (u.role_info.role_name) {
            roleName = u.role_info.role_name;
          }
          if (u.role_info.priority !== undefined && u.role_info.priority !== null) {
            priority = u.role_info.priority;
          }
        }

        return {
          ...u,
          id,
          username,
          role_info: {
            role_name: roleName,
            priority: priority,
          },
        };
      });

      console.log('Normalized Users:', normalizedUsers);
      setUsers(normalizedUsers);
      extractPriorityLevels(normalizedUsers);
      buildPriorityTree(normalizedUsers);
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        handleAuthError(401);
      } else {
        setError(err.message || 'Failed to fetch users');
        toast.error('Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  const extractPriorityLevels = (usersData) => {
    const levels = new Map();

    usersData.forEach(user => {
      const priority = user.role_info?.priority;
      const roleName = user.role_info?.role_name;

      if (priority && roleName && !levels.has(priority)) {
        levels.set(priority, roleName);
      }
    });

    const sortedLevels = Array.from(levels.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([priority, roleName]) => ({
        priority,
        roleName: roleName.charAt(0).toUpperCase() + roleName.slice(1)
      }));

    setPriorityLevels(sortedLevels);

    const expandedState = {};
    sortedLevels.forEach(level => {
      expandedState[level.priority] = true;
    });
    setExpandedPriorities(expandedState);
  };

  const getPriorityColor = (priority) => {
    const colors = [
      { bg: '#9333ea', border: '#7e22ce', light: '#f3e8ff', text: '#6b21a8' },
      { bg: '#2563eb', border: '#1d4ed8', light: '#dbeafe', text: '#1e40af' },
      { bg: '#16a34a', border: '#15803d', light: '#dcfce7', text: '#166534' },
      { bg: '#d97706', border: '#b45309', light: '#fef3c7', text: '#92400e' },
      { bg: '#dc2626', border: '#b91c1c', light: '#fee2e2', text: '#991b1b' },
      { bg: '#ea580c', border: '#c2410c', light: '#ffedd5', text: '#9a3412' },
      { bg: '#0891b2', border: '#0e7490', light: '#cffafe', text: '#164e63' },
      { bg: '#4f46e5', border: '#4338ca', light: '#e0e7ff', text: '#312e81' },
    ];

    const colorIndex = (priority - 1) % colors.length;
    return colors[colorIndex] || { bg: '#6b7280', border: '#4b5563', light: '#f3f4f6', text: '#1f2937' };
  };

  const buildPriorityTree = (usersData) => {
    if (!usersData || usersData.length === 0) return;

    const sortedUsers = [...usersData].sort((a, b) =>
      (a.role_info?.priority || 999) - (b.role_info?.priority || 999)
    );

    const priorityGroups = {};
    sortedUsers.forEach(user => {
      const priority = user.role_info?.priority || 999;
      if (!priorityGroups[priority]) {
        priorityGroups[priority] = [];
      }
      priorityGroups[priority].push(user);
    });

    const priorities = Object.keys(priorityGroups).map(Number).sort((a, b) => a - b);

    const newNodes = [];
    const newEdges = [];

    const HORIZONTAL_SPACING = 200;
    const VERTICAL_SPACING = 200;

    let nodeIdCounter = 0;
    const priorityNodeMap = {};

    priorities.forEach((priority, levelIndex) => {
      const usersAtLevel = priorityGroups[priority];
      const colors = getPriorityColor(priority);

      priorityNodeMap[priority] = [];

      const totalWidth = (usersAtLevel.length - 1) * HORIZONTAL_SPACING;
      const startX = -(totalWidth / 2);
      const yPosition = levelIndex * VERTICAL_SPACING;

      usersAtLevel.forEach((user, userIndex) => {
        const nodeId = `node-${nodeIdCounter++}`;
        const xPosition = startX + (userIndex * HORIZONTAL_SPACING);

        newNodes.push({
          id: nodeId,
          type: 'custom',
          position: { x: xPosition, y: yPosition },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          data: {
            label: user.username || 'Unknown',
            role: user.role_info?.role_name || 'Unknown',
            priority: priority,
            colors: colors,
            userId: user.id,
            email: user.email
          },
        });

        priorityNodeMap[priority].push({
          nodeId,
          userId: user.id,
          index: userIndex
        });
      });
    });

    priorities.forEach((currentPriority, levelIndex) => {
      // Horizontal connections for the first level (highest priority)
      if (levelIndex === 0) {
        const topLevelNodes = priorityNodeMap[currentPriority];
        for (let i = 0; i < topLevelNodes.length - 1; i++) {
          const sourceNode = topLevelNodes[i];
          const targetNode = topLevelNodes[i + 1];

          newEdges.push({
            id: `edge-horizontal-${sourceNode.nodeId}-${targetNode.nodeId}`,
            source: sourceNode.nodeId,
            target: targetNode.nodeId,
            sourceHandle: 'right',
            targetHandle: 'left',
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: 'hsl(var(--muted-foreground))',
              strokeWidth: 2.5,
              strokeDasharray: '5,5'
            },
          });
        }
      }

      if (levelIndex === priorities.length - 1) return;

      const nextPriority = priorities[levelIndex + 1];
      const currentLevelNodes = priorityNodeMap[currentPriority];
      const nextLevelNodes = priorityNodeMap[nextPriority];

      nextLevelNodes.forEach((targetNode, targetIndex) => {
        const parentIndex = Math.floor(
          (targetIndex / nextLevelNodes.length) * currentLevelNodes.length
        );
        const sourceNode = currentLevelNodes[parentIndex];

        if (sourceNode) {
          newEdges.push({
            id: `edge-${sourceNode.nodeId}-${targetNode.nodeId}`,
            source: sourceNode.nodeId,
            target: targetNode.nodeId,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: 'hsl(var(--muted-foreground))',
              strokeWidth: 2.5
            },
          });
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };



  const togglePriority = (priority) => {
    setExpandedPriorities(prev => ({
      ...prev,
      [priority]: !prev[priority]
    }));
  };

  const handleBack = () => {
    sessionStorage.setItem('intended-tab', 'gene')
    router.push('/gene')
  }

  const getUsersByPriority = (priority) => {
    return users.filter(u => u.role_info?.priority === priority);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <CardTitle>Loading...</CardTitle>
              <CardDescription className="mt-2">Fetching user hierarchy</CardDescription>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center gap-2 mx-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Genes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex gap-2 justify-center mt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Genes
                </Button>
                <Button onClick={fetchGeanMappedUser}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>No Users Found</CardTitle>
              <CardDescription className="mt-2">
                No users are mapped to this gene
              </CardDescription>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center gap-2 mx-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Genes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="px-4 pt-4">
        <PageBreadcrumb />
      </div>
      {/* Header */}
      <Card className="m-0 rounded-none border-x-0 border-t-0 border-b shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Network className="h-5 w-5 text-primary flex-shrink-0" />
                  <CardTitle className="text-2xl truncate">
                    {geneDetails ? (geneDetails.g_name || geneDetails.name || 'User Priority Hierarchy') : 'User Priority Hierarchy'}
                  </CardTitle>
                </div>
                <CardDescription className="truncate">
                  {geneDetails && `${geneDetails.g_name || geneDetails.name} • `}{users.length} users across {priorityLevels.length} priority levels
                </CardDescription>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap justify-end max-w-lg flex-shrink-0">
              {priorityLevels.map(({ priority, roleName }) => {
                const colors = getPriorityColor(priority);
                return (
                  <Badge
                    key={priority}
                    variant="outline"
                    className="flex items-center gap-1.5 px-2 py-1 text-xs"
                    style={{ backgroundColor: colors.light, color: colors.text, borderColor: colors.border }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: colors.bg,
                      }}
                    />
                    <span className="font-semibold">P{priority}</span>
                    <span className="hidden sm:inline">-</span>
                    <span className="hidden sm:inline">{roleName}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* View Tabs */}
      <div className="border-b bg-card/50 sticky top-0 z-40">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-0 bg-transparent px-4 h-12">
            <TabsTrigger value="tree" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Tree View
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BadgeIcon className="h-4 w-4" />
              Statistics
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          {/* Tree View */}
          <TabsContent value="tree" className="h-full m-0">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              nodesDraggable={true}
              nodesConnectable={false}
              elementsSelectable={true}
              fitView
              fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1 }}
              minZoom={0.1}
              maxZoom={2}
              panOnScroll={true}
              panOnDrag={true}
              zoomOnScroll={true}
              zoomOnDoubleClick={true}
              attributionPosition="bottom-left"
            >
              <Background
                color="hsl(var(--muted))"
                gap={20}
                size={1.5}
                variant="dots"
              />

              <Controls
                showInteractive={false}
                position="bottom-right"
              />

              <MiniMap
                nodeColor={(node) => node.data.colors.bg}
                className="bg-card border-2 border-border rounded-lg"
                maskColor="rgba(0, 0, 0, 0.05)"
                position="bottom-left"
              />
            </ReactFlow>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="m-0 p-6">
            <div className="space-y-4 w-full">
              {priorityLevels.map(({ priority, roleName }) => {
                const colors = getPriorityColor(priority);
                const levelUsers = getUsersByPriority(priority);
                const isExpanded = expandedPriorities[priority] !== false;

                return (
                  <Card key={priority} className="overflow-hidden">
                    <div
                      className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between"
                      style={{ backgroundColor: colors.light }}
                      onClick={() => togglePriority(priority)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colors.bg }}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg" style={{ color: colors.text }}>
                            Priority {priority} - {roleName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {levelUsers.length} user{levelUsers.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className="text-white"
                          style={{ backgroundColor: colors.bg }}
                        >
                          {levelUsers.length}
                        </Badge>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 transition-transform flex-shrink-0",
                            isExpanded ? "rotate-0" : "-rotate-90"
                          )}
                          style={{ color: colors.text }}
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <>
                        <Separator />
                        <div className="p-4 space-y-3">
                          {levelUsers.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No users in this priority level</p>
                            </div>
                          ) : (
                            levelUsers.map((user, idx) => (
                              <Card key={user.id || idx} className="bg-muted/30 hover:bg-muted/50 transition-colors">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div
                                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold"
                                      style={{ backgroundColor: colors.bg }}
                                    >
                                      {user.username?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-sm truncate">
                                            {user.username}
                                          </p>
                                          {user.email && (
                                            <div className="flex items-center gap-1 mt-1">
                                              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                              <p className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className="flex-shrink-0 text-xs"
                                          style={{
                                            backgroundColor: colors.light,
                                            color: colors.text,
                                            borderColor: colors.border
                                          }}
                                        >
                                          <Award className="h-3 w-3 mr-1" />
                                          {user.role_info?.role_name}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Statistics View */}
          <TabsContent value="stats" className="m-0 p-6">
            <div className="space-y-6 w-full">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground font-medium">Total Users</p>
                      <p className="text-3xl font-bold text-primary">{users.length}</p>
                      <p className="text-xs text-muted-foreground">
                        Across {priorityLevels.length} priority levels
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground font-medium">Priority Levels</p>
                      <p className="text-3xl font-bold text-blue-600">{priorityLevels.length}</p>
                      <p className="text-xs text-muted-foreground">
                        Role-based hierarchy
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground font-medium">Top Priority</p>
                      <p className="text-2xl font-bold text-green-600">
                        {priorityLevels[0]?.roleName || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getUsersByPriority(priorityLevels[0]?.priority).length} user{getUsersByPriority(priorityLevels[0]?.priority).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                  <CardDescription>Users across priority levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {priorityLevels.map(({ priority, roleName }) => {
                      const colors = getPriorityColor(priority);
                      const levelUsers = getUsersByPriority(priority);
                      const percentage = (levelUsers.length / users.length) * 100;

                      return (
                        <div key={priority}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: colors.bg }}
                              />
                              <span className="font-medium text-sm">
                                P{priority} - {roleName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{levelUsers.length}</span>
                              <span className="text-xs text-muted-foreground">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: colors.bg
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Level Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Level Details</CardTitle>
                  <CardDescription>Breakdown by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {priorityLevels.map(({ priority, roleName }) => {
                      const colors = getPriorityColor(priority);
                      const levelUsers = getUsersByPriority(priority);

                      return (
                        <div
                          key={priority}
                          className="p-4 rounded-lg border-2 transition-all hover:shadow-md"
                          style={{
                            backgroundColor: colors.light,
                            borderColor: colors.border
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold" style={{ color: colors.text }}>
                                {roleName}
                              </p>
                              <p className="text-xs text-muted-foreground">Priority Level {priority}</p>
                            </div>
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                              style={{ backgroundColor: colors.bg }}
                            >
                              {levelUsers.length}
                            </div>
                          </div>
                          <div className="space-y-2 pt-3 border-t" style={{ borderColor: colors.border }}>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Users</span>
                              <span className="font-semibold">{levelUsers.length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Percentage</span>
                              <span className="font-semibold">
                                {((levelUsers.length / users.length) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .react-flow__node-custom:hover {
          transform: scale(1.05);
          z-index: 10;
        }
       
        .react-flow__attribution {
          background: hsl(var(--card));
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 9px;
          color: hsl(var(--muted-foreground));
        }
       
        .react-flow__controls {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
       
        .react-flow__controls button {
          background: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
          color: hsl(var(--foreground)) !important;
          border-radius: 6px !important;
          width: 32px !important;
          height: 32px !important;
        }
       
        .react-flow__controls button:hover {
          background: hsl(var(--accent)) !important;
          color: hsl(var(--accent-foreground)) !important;
        }

        .react-flow__minimap {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
       
        .react-flow__edge-path {
          stroke-width: 2.5 !important;
        }
       
        .react-flow__node {
          cursor: grab;
        }
       
        .react-flow__node.dragging {
          cursor: grabbing;
        }

        .scrollbar-area {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground)) hsl(var(--muted));
        }

        .scrollbar-area::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-area::-webkit-scrollbar-track {
          background: hsl(var(--muted));
        }

        .scrollbar-area::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground));
          border-radius: 3px;
        }

        .scrollbar-area::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
};

export default RolePriorityTree;