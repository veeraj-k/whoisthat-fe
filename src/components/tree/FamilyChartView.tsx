import {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import type React from "react";
import {
  Background,
  Controls,
  ReactFlow,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type NodeMouseHandler,
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  type EdgeProps,
  applyEdgeChanges,
  applyNodeChanges,
  type Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import * as dagre from "dagre";
import type { PersonDto } from "@/api/core";
import { getTreeLayout, saveTreeLayout } from "@/api/core";
import PersonNode from "./PersonNode";
import {
  getLayoutKey,
  loadLayoutPositions,
  mergeNodePositions,
  saveLayoutPositions,
  extractNodePositions,
} from "@/lib/tree-layout-storage";

// Extend Edge type to include position properties
type PositionedEdge = Edge & {
  sourcePosition?: Position;
  targetPosition?: Position;
};

// Custom edge component that properly renders edges with labels
function CustomEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    label,
    labelStyle,
    labelBgStyle,
    markerEnd,
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Ensure minimum visibility with explicit styles
  const edgeStyle: React.CSSProperties = {
    stroke: (style as any)?.stroke || "#000000",
    strokeWidth: (style as any)?.strokeWidth || 4,
    strokeDasharray: (style as any)?.strokeDasharray,
    fill: "none",
    opacity: 1,
    pointerEvents: "stroke" as const,
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd as string | undefined}
        style={edgeStyle}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: labelStyle?.fontSize || 10,
              pointerEvents: "all",
              zIndex: 1000,
            }}
            className="nodrag nopan"
          >
            <div
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: labelBgStyle?.fill || "#ffffff",
                border: `1px solid ${labelBgStyle?.stroke || "#ccc"}`,
                color: labelStyle?.fill || "#000",
                fontSize: labelStyle?.fontSize || 10,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// Define edgeTypes outside component to ensure it's stable
const edgeTypes = {
  custom: CustomEdge,
};

type Props = {
  persons: PersonDto[];
  selectedA: string | null;
  selectedB: string | null;
  onPersonClick: (personId: string) => void;
  familyId?: number;
  mePerson?: PersonDto;
};

export type FamilyChartViewHandle = {
  saveLayout: () => Promise<void>;
};

function getRelationStroke(type?: string): {
  stroke: string;
  strokeDasharray?: string;
  animated?: boolean;
  strokeWidth?: number;
} {
  if (type === "PARENT") return { stroke: "#10b981", strokeWidth: 3 };
  if (type === "SIBLING")
    return { stroke: "#6366f1", strokeDasharray: "6 6", strokeWidth: 3 };
  if (type === "SPOUSE")
    return { stroke: "#ec4899", animated: true, strokeWidth: 3 };
  return { stroke: "#94a3b8", strokeWidth: 3 };
}

function layoutTree(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 200,
    ranksep: 180,
  });

  const nodeWidth = 180;
  const nodeHeight = 80;

  for (const n of nodes) {
    g.setNode(n.id, { width: nodeWidth, height: nodeHeight });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id) as { x: number; y: number } | undefined;
    if (!pos) return n;
    return {
      ...n,
      position: {
        x: pos.x - nodeWidth / 2,
        y: pos.y - nodeHeight / 2,
      },
    };
  });
}

const FamilyChartViewComponent = forwardRef<FamilyChartViewHandle, Props>(
  (
    { persons, selectedA, selectedB, onPersonClick, familyId, mePerson },
    ref,
  ) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<PositionedEdge[]>([]);
    const [serverPositions, setServerPositions] = useState<Array<{
      id: string;
      position: { x: number; y: number };
    }> | null>(null);
    // Use familyId for stable layout key - persists across person additions/deletions
    const layoutKey = useMemo(() => {
      if (familyId) {
        return `family-tree-layout-${familyId}`;
      }
      // Fallback to person IDs if familyId not provided
      return getLayoutKey(persons);
    }, [familyId, persons]);

    const nodeTypes = useMemo(
      () => ({ person: PersonNode }) as unknown as NodeTypes,
      [],
    );

    // Load layout from API on mount
    useEffect(() => {
      async function loadLayoutFromServer() {
        if (!familyId) return;
        try {
          const layout = await getTreeLayout(familyId);
          if (layout?.layout) {
            // Parse the layout JSON string
            const positions = JSON.parse(layout.layout).positions;
            const layoutPositions = positions.map((p: any) => ({
              id: p.nodeId,
              position: { x: p.x, y: p.y },
            }));
            setServerPositions(layoutPositions);
            saveLayoutPositions(layoutKey, layoutPositions);
          }
        } catch (err) {
          console.warn("Failed to load layout from server:", err);
          // Silently fail - will use auto-layout instead
        }
      }
      void loadLayoutFromServer();
    }, [familyId, layoutKey]);

    // Save layout to API
    async function saveLayoutToServer() {
      if (!familyId || nodes.length === 0) return;

      try {
        const positions = extractNodePositions(nodes).map((p) => ({
          nodeId: p.id,
          x: p.position.x,
          y: p.position.y,
        }));

        await saveTreeLayout(familyId, { positions });
      } catch (err) {
        console.error("Failed to save layout:", err);
        throw err;
      }
    }

    useImperativeHandle(ref, () => ({
      saveLayout: saveLayoutToServer,
    }));

    useEffect(() => {
      const parentsMap = new Map<string, Set<string>>();
      const spousesMap = new Map<string, Set<string>>();
      const childrenMap = new Map<string, Set<string>>();
      const siblingsMap = new Map<string, Set<string>>();

      for (const person of persons) {
        if (person.id == null) continue;
        const pid = String(person.id);

        for (const rel of person.relations ?? []) {
          const otherId = rel.person?.id;
          const type = rel.relationType;
          if (otherId == null || !type) continue;

          const other = String(otherId);

          if (type === "PARENT") {
            // person is parent of other
            pushUnique(childrenMap, pid, other);
            pushUnique(parentsMap, other, pid);
          } else if (type === "SPOUSE") {
            pushUnique(spousesMap, pid, other);
            pushUnique(spousesMap, other, pid);
          } else if (type === "SIBLING") {
            // siblings are bidirectional
            pushUnique(siblingsMap, pid, other);
            pushUnique(siblingsMap, other, pid);
          }
        }
      }

      const baseNodes: Node[] = persons
        .filter((p) => p.id != null)
        .map((p) => {
          const id = String(p.id);
          return {
            id,
            type: "person",
            position: { x: 0, y: 0 },
            data: {
              label: p.name ?? `Person ${id}`,
              gender: p.gender,
              selectedA: selectedA === id,
              selectedB: selectedB === id,
              isMe: mePerson?.id === p.id,
            },
          };
        });

      // Create a set of valid node IDs to ensure edges only connect to existing nodes
      const validNodeIds = new Set(baseNodes.map((n) => n.id));

      const nextEdges: PositionedEdge[] = [];
      for (const person of persons) {
        if (person.id == null) continue;
        const pid = String(person.id);
        if (!validNodeIds.has(pid)) continue;

        const parents = parentsMap.get(pid);
        const spouses = spousesMap.get(pid);

        if (parents) {
          for (const parent of parents) {
            if (!validNodeIds.has(parent)) continue;
            const theme = getRelationStroke("PARENT");
            nextEdges.push({
              id: `${parent}-${pid}-PARENT`,
              source: parent,
              target: pid,
              type: "custom",
              label: "PARENT",
              labelStyle: { fontSize: 10, fill: "#10b981" },
              labelBgStyle: {
                fill: "#ffffff",
                stroke: "#10b981",
                strokeWidth: 1,
              },
              animated: theme.animated ?? false,
              style: {
                stroke: theme.stroke,
                strokeWidth: theme.strokeWidth ?? 3,
                strokeDasharray: theme.strokeDasharray,
              },
              markerEnd: "arrowclosed",
            });
          }
        }

        if (spouses) {
          for (const spouse of spouses) {
            if (!validNodeIds.has(spouse)) continue;
            // Only create edge once per pair (use sorted IDs to avoid duplicates)
            const edgeId = [pid, spouse].sort().join("-") + "-SPOUSE";
            if (nextEdges.some((e) => e.id === edgeId)) continue;

            const theme = getRelationStroke("SPOUSE");
            nextEdges.push({
              id: edgeId,
              source: pid,
              target: spouse,
              sourceHandle: "spouse-right",
              targetHandle: "spouse-left",
              type: "custom",
              label: "SPOUSE",
              labelStyle: { fontSize: 10, fill: "#ec4899" },
              labelBgStyle: {
                fill: "#ffffff",
                stroke: "#ec4899",
                strokeWidth: 1,
              },
              animated: theme.animated ?? false,
              style: {
                stroke: theme.stroke,
                strokeWidth: theme.strokeWidth ?? 3,
                strokeDasharray: theme.strokeDasharray,
              },
              markerEnd: "arrowclosed",
            });
          }
        }
      }

      // Add sibling edges for visual connection (optional)
      const addedSiblingPairs = new Set<string>();
      for (const person of persons) {
        if (person.id == null) continue;
        const pid = String(person.id);
        const siblings = siblingsMap.get(pid);

        if (siblings) {
          for (const sibling of siblings) {
            const pairKey = [pid, sibling].sort().join("-");
            if (addedSiblingPairs.has(pairKey)) continue;
            addedSiblingPairs.add(pairKey);

            const theme = getRelationStroke("SIBLING");
            const edgeId = `${pid}-${sibling}-SIBLING`;
            nextEdges.push({
              id: edgeId,
              source: pid,
              target: sibling,
              sourceHandle: "sibling-left",
              targetHandle: "sibling-right-target",
              type: "custom",
              label: "SIBLING",
              labelStyle: { fontSize: 10, fill: "#6366f1" },
              labelBgStyle: {
                fill: "#ffffff",
                stroke: "#6366f1",
                strokeWidth: 1,
              },
              animated: theme.animated ?? false,
              style: {
                stroke: theme.stroke,
                strokeWidth: theme.strokeWidth ?? 6,
                strokeDasharray: theme.strokeDasharray,
              },
            });
          }
        }
      }

      console.log(
        "Nodes:",
        baseNodes.length,
        "Edges:",
        nextEdges.length,
        nextEdges,
      );

      const laidOutNodes = layoutTree(baseNodes, nextEdges);

      // Use server positions if available, otherwise fall back to localStorage
      let savedPositions: Map<string, { x: number; y: number }>;
      if (serverPositions) {
        // Convert server positions array to Map
        savedPositions = new Map(
          serverPositions.map((p) => [p.id, p.position]),
        );
      } else {
        // Load from localStorage
        savedPositions = loadLayoutPositions(layoutKey);
      }

      const nodesWithSavedPositions = mergeNodePositions(
        laidOutNodes,
        savedPositions,
      );

      setNodes(nodesWithSavedPositions);
      setEdges(nextEdges);
    }, [persons, selectedA, selectedB, layoutKey, serverPositions, mePerson]);

    const onNodesChange: OnNodesChange = (changes) =>
      setNodes((nds) => applyNodeChanges(changes, nds));
    const onEdgesChange: OnEdgesChange = (changes) =>
      setEdges((eds) => applyEdgeChanges(changes, eds));

    const onNodeClick: NodeMouseHandler = (_, node) => {
      onPersonClick(node.id);
    };

    return (
      <div
        className="w-full h-full"
        style={{ width: "100%", height: "100%", minHeight: "400px" }}
      >
        <ReactFlow
          minZoom={0.1}
          maxZoom={1.8}
          fitViewOptions={{ padding: 0.2 }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          fitView
          defaultEdgeOptions={{
            animated: false,
          }}
          connectionLineComponent={() => null}
          style={{ background: "#fafafa", width: "100%", height: "100%" }}
        >
          <Background />
          {/* <MiniMap pannable zoomable /> */}
          <Controls />
        </ReactFlow>
      </div>
    );
  },
);

FamilyChartViewComponent.displayName = "FamilyChartView";

const FamilyChartView = FamilyChartViewComponent as any;
export default FamilyChartView;

function pushUnique(map: Map<string, Set<string>>, key: string, value: string) {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}
