// src/types.ts (Example data structure)
import { Node, Edge } from "reactflow";

// Define the structure of your original hierarchical data
export interface MindMapDataNode {
	id: string;
	label: string;
	children?: MindMapDataNode[];
	// Add any other specific properties you might need from the backend
}

// Define the custom data payload for React Flow nodes
export interface CustomNodeData {
	label: string;
	originalData: MindMapDataNode; // Keep original structure if helpful
	isCollapsed?: boolean;
	childrenCount?: number; // For the collapse indicator
	// Callbacks passed down from the main component
	onToggleCollapse?: (nodeId: string) => void;
	onAddNode?: (parentId: string) => void;
	onDeleteNode?: (nodeId: string) => void;
	onLabelChange?: (nodeId: string, newLabel: string) => void;
	mode: "view" | "edit";
}

// Define the type for our custom React Flow node
export type MindMapNode = Node<CustomNodeData>;
export type MindMapEdge = Edge; // Standard edge is often sufficient
