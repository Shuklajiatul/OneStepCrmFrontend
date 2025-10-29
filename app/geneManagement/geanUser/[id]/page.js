"use client"

import { useState, useEffect } from "react"
import { User, Loader2, AlertCircle, RefreshCw, Network, Users } from "lucide-react"
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

// API Constants placeholder
const API_CONSTANTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  geneMappedUser: '/api/genes/mapped-users',
};

// Dummy data for demonstration
const DUMMY_USERS = [
  {
    id: 1,
    username: 'John Smith',
    email: 'john.smith@company.com',
    role_info: {
      role_name: 'director',
      priority: 1
    }
  },
  {
    id: 2,
    username: 'Sarah Johnson',
    email: 'sarah.j@company.com',
    role_info: {
      role_name: 'director',
      priority: 1
    }
  },
  {
    id: 3,
    username: 'Mike Chen',
    email: 'mike.chen@company.com',
    role_info: {
      role_name: 'manager',
      priority: 2
    }
  },
  {
    id: 4,
    username: 'Emily Davis',
    email: 'emily.davis@company.com',
    role_info: {
      role_name: 'manager',
      priority: 2
    }
  },
  {
    id: 5,
    username: 'Robert Wilson',
    email: 'robert.w@company.com',
    role_info: {
      role_name: 'manager',
      priority: 2
    }
  },
  {
    id: 6,
    username: 'Lisa Brown',
    email: 'lisa.brown@company.com',
    role_info: {
      role_name: 'team lead',
      priority: 3
    }
  },
  {
    id: 7,
    username: 'David Miller',
    email: 'david.m@company.com',
    role_info: {
      role_name: 'team lead',
      priority: 3
    }
  },
  {
    id: 8,
    username: 'Amanda Taylor',
    email: 'amanda.t@company.com',
    role_info: {
      role_name: 'team lead',
      priority: 3
    }
  },
  {
    id: 9,
    username: 'James Anderson',
    email: 'james.a@company.com',
    role_info: {
      role_name: 'team lead',
      priority: 3
    }
  },
  {
    id: 10,
    username: 'Jennifer Lee',
    email: 'jennifer.lee@company.com',
    role_info: {
      role_name: 'specialist',
      priority: 4
    }
  },
  {
    id: 11,
    username: 'Kevin Martinez',
    email: 'kevin.m@company.com',
    role_info: {
      role_name: 'specialist',
      priority: 4
    }
  },
  {
    id: 12,
    username: 'Michelle Garcia',
    email: 'michelle.g@company.com',
    role_info: {
      role_name: 'specialist',
      priority: 4
    }
  },
  {
    id: 13,
    username: 'Thomas Clark',
    email: 'thomas.c@company.com',
    role_info: {
      role_name: 'specialist',
      priority: 4
    }
  },
  {
    id: 14,
    username: 'Jessica White',
    email: 'jessica.w@company.com',
    role_info: {
      role_name: 'specialist',
      priority: 4
    }
  },
  {
    id: 15,
    username: 'Daniel Harris',
    email: 'daniel.h@company.com',
    role_info: {
      role_name: 'associate',
      priority: 5
    }
  },
  {
    id: 16,
    username: 'Sophia Martin',
    email: 'sophia.m@company.com',
    role_info: {
      role_name: 'associate',
      priority: 5
    }
  },
  {
    id: 17,
    username: 'Christopher Young',
    email: 'chris.y@company.com',
    role_info: {
      role_name: 'associate',
      priority: 5
    }
  },
  {
    id: 18,
    username: 'Elizabeth King',
    email: 'elizabeth.k@company.com',
    role_info: {
      role_name: 'associate',
      priority: 5
    }
  }
];

const RolePriorityTree = () => {
  const params = useParams();
  const router = useRouter();
  const gId = params.id;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priorityLevels, setPriorityLevels] = useState([]);
  const [useDummyData, setUseDummyData] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    fetchGeanMappedUser();
  }, [gId, useDummyData]);

  const fetchGeanMappedUser = async () => {
    try {
      setLoading(true);
      setError(null);
     
      // Use dummy data if enabled
      if (useDummyData) {
        console.log('Using dummy data for user hierarchy');
        setTimeout(() => {
          setUsers(DUMMY_USERS);
          extractPriorityLevels(DUMMY_USERS);
          buildPriorityTree(DUMMY_USERS);
          setLoading(false);
        }, 1500);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please login again.');
        // router.push('/login');
        return;
      }
     
      const baseUrl = API_CONSTANTS.BASE_URL;
      const endPoint = API_CONSTANTS.geneMappedUser;
      const fullUrl = baseUrl + endPoint;
     
      const response = await axios.post(
        fullUrl,
        { gid: gId },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 30000
        }
      );
     
      if (response.data.status === 'success') {
        const userData = response.data.data || [];
        setUsers(userData);
        extractPriorityLevels(userData);
        buildPriorityTree(userData);
      } else {
        setError('Failed to fetch mapped users');
        console.log('Falling back to dummy data due to API error');
        setUseDummyData(true);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        router.push('/login');
      } else {
        setError(err.message || 'Failed to fetch users');
        toast.error('Failed to fetch users');
        console.log('Falling back to dummy data due to network error');
        setUseDummyData(true);
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

  // Toggle between dummy data and real API
  const toggleDataMode = () => {
    setUseDummyData(!useDummyData);
    toast.info(useDummyData ? 'Switching to real API data' : 'Using demo data');
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
              {useDummyData && (
                <Badge variant="secondary" className="mt-2">Using demo data</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !useDummyData) {
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
                <Button onClick={fetchGeanMappedUser}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
                <Button variant="outline" onClick={toggleDataMode}>
                  Use Demo Data
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
              <Button onClick={toggleDataMode} variant="outline" className="mt-4">
                Load Demo Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Demo Data Notice */}
      {useDummyData && (
        <Alert className="m-0 rounded-none border-x-0 border-t-0">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Demo Mode</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Using sample user hierarchy data</span>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDataMode}
              className="ml-4"
            >
              Switch to Live Data
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <Card className="m-0 rounded-none border-x-0 border-t-0 border-b shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Network className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">User Priority Hierarchy</CardTitle>
              </div>
              <CardDescription>
                Role-based tree visualization • {users.length} users across {priorityLevels.length} levels
                {useDummyData && " • Demo Data"}
              </CardDescription>
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
           
              <Button
                variant={useDummyData ? "default" : "secondary"}
                onClick={toggleDataMode}
                size="sm"
              >
                {useDummyData ? 'Demo Mode' : 'Live Mode'}
              </Button>
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