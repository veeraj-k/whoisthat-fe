import type { PersonDto } from "@/api/core";
import type { Node } from "@xyflow/react";

/**
 * Generate a unique key for the family tree layout based on person IDs
 * This ensures different families have different stored layouts
 */
export function getLayoutKey(persons: PersonDto[]): string {
  const personIds = persons
    .filter((p) => p.id != null)
    .map((p) => String(p.id))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .join(",");

  return `family-tree-layout-${personIds}`;
}

export interface SavedNodePosition {
  id: string;
  position: { x: number; y: number };
}

/**
 * Save node positions to localStorage
 */
export function saveLayoutPositions(
  key: string,
  positions: SavedNodePosition[],
): void {
  try {
    localStorage.setItem(key, JSON.stringify(positions));
  } catch (e) {
    console.error("Failed to save layout positions to localStorage:", e);
  }
}

/**
 * Load saved node positions from localStorage
 */
export function loadLayoutPositions(
  key: string,
): Map<string, { x: number; y: number }> {
  try {
    const data = localStorage.getItem(key);
    if (!data) return new Map();

    const positions: SavedNodePosition[] = JSON.parse(data);
    const map = new Map<string, { x: number; y: number }>();
    positions.forEach((p) => map.set(p.id, p.position));
    return map;
  } catch (e) {
    console.error("Failed to load layout positions from localStorage:", e);
    return new Map();
  }
}

/**
 * Merge auto-generated node positions with saved custom positions
 * Saved positions take precedence over auto-layout positions
 */
export function mergeNodePositions(
  autoLayoutNodes: Node[],
  savedPositions: Map<string, { x: number; y: number }>,
): Node[] {
  return autoLayoutNodes.map((node) => {
    const savedPos = savedPositions.get(node.id);
    return savedPos
      ? {
          ...node,
          position: savedPos,
        }
      : node;
  });
}

/**
 * Extract current positions from nodes
 */
export function extractNodePositions(nodes: Node[]): SavedNodePosition[] {
  return nodes.map((node) => ({
    id: node.id,
    position: node.position,
  }));
}

/**
 * Clear saved layout for a specific family
 */
export function clearLayoutPositions(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error("Failed to clear layout positions:", e);
  }
}
