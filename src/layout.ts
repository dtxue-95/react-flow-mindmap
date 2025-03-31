// src/layout.ts
import dagre from "dagre";
import { Node, Edge, Position } from "reactflow";
import { MindMapNode } from "./types"; // Assuming MindMapNode extends Node

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Define typical node dimensions (adjust based on your styling)
const nodeWidth = 172;
const nodeHeight = 36;

export const getLayoutedElements = (
	nodes: MindMapNode[],
	edges: Edge[],
	direction = "LR" // 'LR' (Left to Right) or 'TB' (Top to Bottom)
): { nodes: MindMapNode[]; edges: Edge[] } => {
	const isHorizontal = direction === "LR";
	dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 }); // Adjust spacing

	nodes.forEach((node) => {
		dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
	});

	edges.forEach((edge) => {
		dagreGraph.setEdge(edge.source, edge.target);
	});

	dagre.layout(dagreGraph);

	const layoutedNodes = nodes.map((node): MindMapNode => {
		const nodeWithPosition = dagreGraph.node(node.id);
		const newPosition = {
			x: nodeWithPosition.x - nodeWidth / 2, // Adjust for center position dagre gives
			y: nodeWithPosition.y - nodeHeight / 2,
		};

		return {
			...node,
			// Update position
			position: newPosition,
			// Adjust handle positions based on direction
			targetPosition: isHorizontal ? Position.Left : Position.Top,
			sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
		};
	});

	return { nodes: layoutedNodes, edges }; // Edges don't change position
};
