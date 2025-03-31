// src/components/MindMapViewer.tsx
import React, {
	useState,
	useCallback,
	useMemo,
	useEffect,
	useRef,
} from "react";
import ReactFlow, {
	ReactFlowProvider, // Needed for useReactFlow hook
	useNodesState,
	useEdgesState,
	useReactFlow,
	Controls,
	Background,
	MiniMap,
	Node,
	Edge,
	MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

import CustomNode from "./CustomNode";
import {
	initialNodes as defaultNodes,
	initialEdges as defaultEdges,
	getAllDescendantIds,
} from "../initialData";
import { MindMapNode, MindMapEdge, CustomNodeData } from "../types";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs

// --- Main Component ---
const MindMapViewerInternal: React.FC = () => {
	const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeData>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [mode, setMode] = useState<"view" | "edit">("view");
	const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
	const { setViewport, fitView } = useReactFlow(); // Get react-flow instance methods

	// Define custom node types
	const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

	// Store all nodes/edges separately from the ones passed to ReactFlow for filtering
	const allNodes = useRef<MindMapNode[]>(defaultNodes);
	const allEdges = useRef<MindMapEdge[]>(defaultEdges);

	// --- Initial Load and Fit View ---
	useEffect(() => {
		// Initialize state from refs on mount
		const initialVisible = getVisibleElements(
			allNodes.current,
			allEdges.current,
			hiddenNodes
		);
		setNodes(initialVisible.visibleNodes);
		setEdges(initialVisible.visibleEdges);

		// Fit view after initial layout
		setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
	}, [setNodes, setEdges, fitView]); // Add dependencies

	// --- Collapse/Expand Logic ---
	const toggleCollapse = useCallback(
		(nodeId: string) => {
			const nodeToToggle = allNodes.current.find((n) => n.id === nodeId);
			if (!nodeToToggle) return;

			const descendants = getAllDescendantIds(
				nodeId,
				allNodes.current,
				allEdges.current
			);
			const isCurrentlyCollapsed =
				!hiddenNodes.has(nodeId) &&
				descendants.size > 0 &&
				Array.from(descendants).every((id) => hiddenNodes.has(id));

			setHiddenNodes((prevHidden) => {
				const newHidden = new Set(prevHidden);
				if (isCurrentlyCollapsed) {
					// Expand: remove direct children (and potentially deeper ones if they weren't hidden independently)
					const childrenEdges = allEdges.current.filter(
						(e) => e.source === nodeId
					);
					childrenEdges.forEach((edge) => {
						// Only unhide if the target wasn't hidden for *another* reason (more complex logic might be needed)
						newHidden.delete(edge.target);
						// Recursively expand children *if* they were hidden ONLY because this parent was collapsed
						// Simplified: just unhide direct children for now
					});
					// Also remove the parent itself if it was marked as hidden for rendering purposes
					newHidden.delete(nodeId); // This logic might need refinement depending on how 'hidden' is used.
					console.log(
						`Expanding ${nodeId}, removing children:`,
						childrenEdges.map((e) => e.target)
					);
				} else if (descendants.size > 0) {
					// Collapse: add all descendants to hidden set
					descendants.forEach((id) => newHidden.add(id));
					// Optionally mark the node itself as visually collapsed (might not need to add to hiddenNodes)
					console.log(`Collapsing ${nodeId}, adding descendants:`, descendants);
				}
				return newHidden;
			});
		},
		[hiddenNodes]
	); // Dependency on hiddenNodes

	// --- Update visible elements when hiddenNodes changes ---
	useEffect(() => {
		const { visibleNodes, visibleEdges } = getVisibleElements(
			allNodes.current,
			allEdges.current,
			hiddenNodes
		);
		// Add interaction callbacks and mode to node data
		const nodesWithCallbacks = visibleNodes.map((node) => ({
			...node,
			data: {
				...node.data,
				mode: mode,
				isCollapsed: isNodeCollapsed(
					node.id,
					hiddenNodes,
					allNodes.current,
					allEdges.current
				),
				childrenCount: getAllDescendantIds(
					node.id,
					allNodes.current,
					allEdges.current
				).size, // Recalculate count
				onToggleCollapse: toggleCollapse,
				onAddNode: addNode,
				onDeleteNode: deleteNode,
				onLabelChange: updateNodeLabel,
			},
		}));
		setNodes(nodesWithCallbacks);
		setEdges(visibleEdges);
	}, [hiddenNodes, mode, setNodes, setEdges, toggleCollapse]); // Add mode and callbacks as dependencies

	// --- Edit Mode Actions ---
	const addNode = useCallback(
		(parentId: string) => {
			const parentNode = allNodes.current.find((n) => n.id === parentId);
			if (!parentNode) return;

			const newId = uuidv4();
			const newNode: MindMapNode = {
				id: newId,
				type: "custom",
				position: {
					// Position relative to parent (adjust as needed)
					x: parentNode.position.x + 200,
					y: parentNode.position.y + Math.random() * 100 - 50, // Add some randomness
				},
				data: {
					label: "New Topic",
					originalData: { id: newId, label: "New Topic" }, // Create minimal original data
					mode: "edit", // Should be in edit mode
					// Pass callbacks down
					onToggleCollapse: toggleCollapse,
					onAddNode: addNode,
					onDeleteNode: deleteNode,
					onLabelChange: updateNodeLabel,
				},
			};

			const newEdge: MindMapEdge = {
				id: `e-${parentId}-${newId}`,
				source: parentId,
				target: newId,
				type: "smoothstep", // Or your preferred edge type
				markerEnd: { type: MarkerType.ArrowClosed },
			};

			allNodes.current = [...allNodes.current, newNode];
			allEdges.current = [...allEdges.current, newEdge];

			// Update visible nodes/edges immediately
			const { visibleNodes, visibleEdges } = getVisibleElements(
				allNodes.current,
				allEdges.current,
				hiddenNodes
			);
			setNodes(
				visibleNodes.map((n) => ({ ...n, data: { ...n.data, mode: "edit" } }))
			); // Ensure new node is interactive
			setEdges(visibleEdges);
		},
		[hiddenNodes, setNodes, setEdges, toggleCollapse]
	); // Dependencies

	const deleteNode = useCallback(
		(nodeId: string) => {
			if (nodeId === "root") {
				// Prevent deleting root node
				alert("Cannot delete the root node.");
				return;
			}

			const descendants = getAllDescendantIds(
				nodeId,
				allNodes.current,
				allEdges.current
			);
			const idsToDelete = new Set([nodeId, ...descendants]);

			allNodes.current = allNodes.current.filter((n) => !idsToDelete.has(n.id));
			allEdges.current = allEdges.current.filter(
				(e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
			);

			// Also remove from hidden set if they were there
			setHiddenNodes((prevHidden) => {
				const newHidden = new Set(prevHidden);
				idsToDelete.forEach((id) => newHidden.delete(id));
				return newHidden;
			});

			// Update visible nodes/edges
			const { visibleNodes, visibleEdges } = getVisibleElements(
				allNodes.current,
				allEdges.current,
				hiddenNodes
			);
			setNodes(
				visibleNodes.map((n) => ({ ...n, data: { ...n.data, mode: mode } }))
			);
			setEdges(visibleEdges);
		},
		[hiddenNodes, mode, setNodes, setEdges]
	); // Dependencies

	const updateNodeLabel = useCallback(
		(nodeId: string, newLabel: string) => {
			// Update the label in the persistent ref
			allNodes.current = allNodes.current.map((node) => {
				if (node.id === nodeId) {
					return { ...node, data: { ...node.data, label: newLabel } };
				}
				return node;
			});
			// Update the currently rendered nodes state as well
			setNodes((nds) =>
				nds.map((node) => {
					if (node.id === nodeId) {
						return { ...node, data: { ...node.data, label: newLabel } };
					}
					return node;
				})
			);
		},
		[setNodes]
	);

	// --- Save Logic ---
	const handleSave = async () => {
		console.log("Saving data...");
		// 1. Prepare data for the backend.
		// You might want to convert `allNodes.current` and `allEdges.current`
		// back into your original hierarchical structure if the backend expects that.
		const dataToSend = {
			nodes: allNodes.current.map((n) => ({
				id: n.id,
				label: n.data.label,
				position: n.position /* ... other needed data */,
			})),
			edges: allEdges.current,
			// or reconstruct hierarchy
		};

		try {
			// 2. Replace with your actual API call
			// const response = await fetch('/api/mindmap', {
			//     method: 'POST',
			//     headers: { 'Content-Type': 'application/json' },
			//     body: JSON.stringify(dataToSend),
			// });
			// if (!response.ok) throw new Error('Save failed');

			console.log("Data to save:", dataToSend); // Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

			alert("Mind map saved successfully!");
			setMode("view"); // Switch back to view mode on success
		} catch (error) {
			console.error("Failed to save mind map:", error);
			alert("Error saving mind map. See console for details.");
		}
	};

	// --- Helper to determine if a node should be visually collapsed ---
	const isNodeCollapsed = (
		nodeId: string,
		currentHiddenNodes: Set<string>,
		allNds: MindMapNode[],
		allEds: MindMapEdge[]
	): boolean => {
		const directChildrenEdges = allEdges.current.filter(
			(e) => e.source === nodeId
		);
		if (directChildrenEdges.length === 0) return false; // No children, cannot be collapsed visually
		// If all direct children are in the hidden set, consider it collapsed
		return directChildrenEdges.every((edge) =>
			currentHiddenNodes.has(edge.target)
		);
	};

	// --- Helper to filter nodes/edges based on hidden set ---
	const getVisibleElements = (
		allNds: MindMapNode[],
		allEds: MindMapEdge[],
		hiddenIds: Set<string>
	): { visibleNodes: MindMapNode[]; visibleEdges: MindMapEdge[] } => {
		const visibleNodes = allNds.filter((node) => !hiddenIds.has(node.id));
		const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
		const visibleEdges = allEds.filter(
			(edge) =>
				visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
		);

		// Enhance visible nodes with collapse state and children count for rendering
		const enhancedVisibleNodes = visibleNodes.map((node) => {
			const isCollapsed = isNodeCollapsed(node.id, hiddenIds, allNds, allEds);
			const childrenCount = getAllDescendantIds(node.id, allNds, allEds).size; // This count includes all descendants
			return {
				...node,
				data: {
					...node.data,
					isCollapsed: isCollapsed,
					childrenCount: childrenCount,
				},
			};
		});

		return { visibleNodes: enhancedVisibleNodes, visibleEdges };
	};

	return (
		<div
			style={{
				height: "90vh",
				width: "100%",
				position: "relative",
				border: "1px solid #eee",
			}}
		>
			<div style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}>
				{mode === "view" ? (
					<button onClick={() => setMode("edit")}>Edit</button>
				) : (
					<>
						<button onClick={handleSave}>Save</button>
						<button onClick={() => setMode("view")} style={{ marginLeft: 5 }}>
							Cancel
						</button>
					</>
				)}
				<button
					onClick={() => fitView({ padding: 0.2 })}
					style={{ marginLeft: 5 }}
				>
					Fit View
				</button>
			</div>

			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange} // Handles drag, selection
				onEdgesChange={onEdgesChange} // Handles edge updates
				// onConnect={onConnect} // Handle new edge creation if needed manually
				nodeTypes={nodeTypes}
				fitView // Initial fit view
				fitViewOptions={{ padding: 0.2 }}
				nodesDraggable={mode === "edit"} // Only allow dragging in edit mode
				nodesConnectable={mode === "edit"} // Only allow connecting in edit mode
				elementsSelectable={mode === "edit"} // Only allow selection in edit mode
			>
				<Controls />
				<MiniMap nodeStrokeWidth={3} zoomable pannable />
				<Background variant='dots' gap={12} size={1} />
			</ReactFlow>
		</div>
	);
};

// Wrap with Provider for useReactFlow hook
const MindMapViewer: React.FC = () => (
	<ReactFlowProvider>
		<MindMapViewerInternal />
	</ReactFlowProvider>
);

export default MindMapViewer;
