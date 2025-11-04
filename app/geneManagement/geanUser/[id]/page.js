"use client"

import { useState, useEffect } from "react"
import { User, Loader2, AlertCircle, RefreshCw, Network, Users, ArrowLeft } from "lucide-react"
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axios from 'axios';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// API Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001';
const API_CONSTANTS = {
  BASE_URL: API_BASE_URL,
  geneDetails: '/api/genes',
  geneMappedUser: '/api/genes/by-geneId',
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

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (gId) {
      fetchGeneDetails();
      fetchGeanMappedUser();
    }
  }, [gId]);

  const fetchGeneDetails = async () => {
    try {
      setLoadingGene(true);
      // Get token from localStorage
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('accessToken');
      
      if (!token) {
        console.warn('No token available for fetching gene details');
        setLoadingGene(false);
        return;
      }

      const geneDetailsUrl = `${API_CONSTANTS.BASE_URL}${API_CONSTANTS.geneDetails}/${gId}`;
      console.log('Fetching gene details from:', geneDetailsUrl);
      
      const response = await axios.get(
        geneDetailsUrl,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 30000
        }
      );

      console.log('Gene Details Response:', response.data);
      if (response.data.success && response.data.data) {
        setGeneDetails(response.data.data);
      } else if (response.data.data) {
        // Handle case where response might not have success field
        setGeneDetails(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching gene details:', err);
      // Don't show error - just continue without gene details
    } finally {
      setLoadingGene(false);
    }
  };

  const fetchGeanMappedUser = async () => {
    try {
      setLoading(true);
      setError(null);
  
      // Get token from localStorage or sessionStorage
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('accessToken') ||
                   sessionStorage.getItem('token') ||
                   sessionStorage.getItem('accessToken');
      
      if (!token) {
        setError('Authentication required. Please login again.');
        router.push('/login');
        return;
      }
     
      const baseUrl = API_CONSTANTS.BASE_URL;
      const endPoint = API_CONSTANTS.geneMappedUser;
      const fullUrl = baseUrl + endPoint + '/' + gId;
     
      const response = await axios.get(
        fullUrl,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 30000
        }
      );
     
      const resp = response.data || {};
      console.log('API Response:', resp);
      
      const isOk = resp.status === 'success' || resp.success === true;
      if (isOk) {
        const rawUsers = Array.isArray(resp.data) ? resp.data : [];
  
        // Normalize users for UI consumption - FIXED VERSION
        const normalizedUsers = rawUsers.map((u) => {
          const id = u.user_id || u.id;
          const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
          const username = name || u.email || `User ${id || ''}`;
          
          // Extract role and assign priority based on role
          const roleName = u.roles || 'User';
          
          return {
            ...u,
            id,
            username,
            role_info: {
              role_name: roleName,
              // priority: priority
            },
          };
        });
  
        console.log('Normalized Users:', normalizedUsers); 
        setUsers(normalizedUsers);
        extractPriorityLevels(normalizedUsers);
        buildPriorityTree(normalizedUsers);
      } else {
        setError('Failed to fetch mapped users');
        toast.error('Failed to fetch mapped users');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        router.push('/login');
      } else {
        setError(err.message || 'Failed to fetch users');
        toast.error('Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // // Helper function to assign priority based on role
  // const assignPriorityByRole = (roleName) => {
  //   const rolePriorityMap = {
  //     'admin': 1,
  //     'supervisor': 2,
  //     'manager': 3,
  //     'user': 4,
  //     'viewer': 5,
  //     'guest': 6
  //   };
    
  //   const lowerCaseRole = roleName.toLowerCase();
  //   return rolePriorityMap[lowerCaseRole] || 7; // Default priority for unknown roles
  // };

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
  };

  const getPriorityColor = (priority) => {
    const colors = [
      { bg: 'hsl(var(--purple-600))', border: 'hsl(var(--purple-700))', light: 'hsl(var(--purple-50))' },
      { bg: 'hsl(var(--blue-600))', border: 'hsl(var(--blue-700))', light: 'hsl(var(--blue-50))' },
      { bg: 'hsl(var(--green-600))', border: 'hsl(var(--green-700))', light: 'hsl(var(--green-50))' },
      { bg: 'hsl(var(--yellow-600))', border: 'hsl(var(--yellow-700))', light: 'hsl(var(--yellow-50))' },
      { bg: 'hsl(var(--orange-600))', border: 'hsl(var(--orange-700))', light: 'hsl(var(--orange-50))' },
      { bg: 'hsl(var(--pink-600))', border: 'hsl(var(--pink-700))', light: 'hsl(var(--pink-50))' },
      { bg: 'hsl(var(--teal-600))', border: 'hsl(var(--teal-700))', light: 'hsl(var(--teal-50))' },
      { bg: 'hsl(var(--indigo-600))', border: 'hsl(var(--indigo-700))', light: 'hsl(var(--indigo-50))' },
    ];
   
    const colorIndex = (priority - 1) % colors.length;
    return colors[colorIndex] || { bg: 'hsl(var(--gray-600))', border: 'hsl(var(--gray-700))', light: 'hsl(var(--gray-50))' };
  };

  const buildPriorityTree = (usersData) => {
    if (!usersData || usersData.length === 0) return;

    // Sort users by priority
    const sortedUsers = [...usersData].sort((a, b) =>
      (a.role_info?.priority || 999) - (b.role_info?.priority || 999)
    );

    // Group users by priority level
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

    // Create nodes level by level
    priorities.forEach((priority, levelIndex) => {
      const usersAtLevel = priorityGroups[priority];
      const colors = getPriorityColor(priority);
     
      priorityNodeMap[priority] = [];
     
      // Calculate starting X position to center this level
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

    // Create edges connecting each level to the next
    priorities.forEach((currentPriority, levelIndex) => {
      if (levelIndex === priorities.length - 1) return;
     
      const nextPriority = priorities[levelIndex + 1];
      const currentLevelNodes = priorityNodeMap[currentPriority];
      const nextLevelNodes = priorityNodeMap[nextPriority];
     
      // Connect nodes from current level to next level
      nextLevelNodes.forEach((targetNode, targetIndex) => {
        // Calculate which parent node this should connect to
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

  // Custom node component with shadcn styling
  const CustomNode = ({ data }) => {
    return (
      <Card className="min-w-[140px] hover:shadow-lg transition-all cursor-default">
        <CardContent className="p-3">
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shadow-md",
                "bg-gradient-to-br"
              )}
              style={{
                background: `linear-gradient(135deg, ${data.colors.bg}, ${data.colors.border})`,
              }}
            >
              <User size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="text-center w-full">
              <p className="font-semibold text-sm text-foreground truncate mb-1">
                {data.label}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize mb-2">
                {data.role}
              </p>
              <Badge
                variant="secondary"
                className="text-[10px] font-bold"
                style={{
                  backgroundColor: data.colors.light,
                  color: data.colors.border,
                }}
              >
                Priority {data.priority}
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

  const handleBack = () => {
    // Navigate back to home page with gene tab active
    sessionStorage.setItem('intended-tab', 'gene')
    router.push('/')
  }

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
      {/* Header */}
      <Card className="m-0 rounded-none border-x-0 border-t-0 border-b shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Genes
              </Button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Network className="h-5 w-5 text-primary" />
                  <CardTitle className="text-2xl">
                    {geneDetails ? (geneDetails.g_name || geneDetails.name || 'User Priority Hierarchy') : 'User Priority Hierarchy'}
                  </CardTitle>
                </div>
                <CardDescription>
                  {geneDetails && (
                    <>
                      Gene: {geneDetails.g_name || geneDetails.name} • 
                    </>
                  )}{' '}
                  Role-based tree visualization • {users.length} users across {priorityLevels.length} levels
                </CardDescription>
              </div>
            </div>
           
            <div className="flex items-center gap-4">
              <div className="flex gap-2 flex-wrap justify-end max-w-lg">
                {priorityLevels.map(({ priority, roleName }) => {
                  const colors = getPriorityColor(priority);
                  return (
                    <Badge
                      key={priority}
                      variant="outline"
                      className="flex items-center gap-2 px-3 py-1"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: colors.bg,
                          boxShadow: `0 0 0 2px ${colors.light}`
                        }}
                      />
                      <span className="text-xs font-medium">P{priority} - {roleName}</span>
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
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
      `}</style>
    </div>
  );
};

export default RolePriorityTree;