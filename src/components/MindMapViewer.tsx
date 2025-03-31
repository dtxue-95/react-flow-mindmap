// src/components/MindMapViewer.tsx
import React, {
	useState,
	useCallback,
	useMemo,
	useEffect,
	useRef,
} from "react";
import ReactFlow, {
	ReactFlowProvider,
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
import { v4 as uuidv4 } from "uuid";

import CustomNode from "./CustomNode";
import {
	initialNodes as defaultNodes,
	initialEdges as defaultEdges,
	getAllDescendantIds,
} from "../initialData";
import { MindMapNode, MindMapEdge, CustomNodeData } from "../types";
import { getLayoutedElements } from "../layout"; // Import the layout function

// --- Main Component ---
const MindMapViewerInternal: React.FC = () => {
	// Keep using useNodesState/useEdgesState for ReactFlow's internal handling
	const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeData>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	// *** Store the *complete* data including positions in refs ***
	const allNodes = useRef<MindMapNode[]>(defaultNodes);
	const allEdges = useRef<MindMapEdge[]>(defaultEdges);

	// State for mode and hidden nodes
	const [mode, setMode] = useState<"view" | "edit">("view");
	const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
	const { setViewport, fitView } = useReactFlow();

	const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

	// --- Helper to calculate visible elements ---
	const getVisibleElements = useCallback(
		(
			currentAllNodes: MindMapNode[],
			currentAllEdges: MindMapEdge[],
			currentHiddenIds: Set<string>
		): { visibleNodes: MindMapNode[]; visibleEdges: MindMapEdge[] } => {
			const visibleNodes = currentAllNodes.filter(
				(node) => !currentHiddenIds.has(node.id)
			);
			const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
			const visibleEdges = currentAllEdges.filter(
				(edge) =>
					visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
			);
			return { visibleNodes, visibleEdges };
		},
		[]
	);

	// --- Helper to determine if a node should be visually collapsed ---
	const isNodeCollapsed = useCallback(
		(nodeId: string, currentHiddenNodes: Set<string>): boolean => {
			const directChildrenEdges = allEdges.current.filter(
				(e) => e.source === nodeId
			);
			if (directChildrenEdges.length === 0) return false;
			// If all direct children are in the hidden set, consider it collapsed
			return directChildrenEdges.every((edge) =>
				currentHiddenNodes.has(edge.target)
			);
		},
		[]
	); // Depends only on allEdges ref

	// --- Helper to calculate descendant count ---
	const getDescendantCount = useCallback((nodeId: string): number => {
		// Pass the refs directly to avoid dependency issues
		return getAllDescendantIds(nodeId, allNodes.current, allEdges.current).size;
	}, []); // Depends only on refs

	// --- Update ReactFlow state when refs, hiddenNodes, or mode change ---
	useEffect(() => {
		const { visibleNodes, visibleEdges } = getVisibleElements(
			allNodes.current,
			allEdges.current,
			hiddenNodes
		);

		const nodesForFlow = visibleNodes.map((node) => ({
			...node,
			// Ensure position is taken from the ref
			position: node.position,
			// Pass necessary data and callbacks
			data: {
				...node.data,
				mode: mode,
				isCollapsed: isNodeCollapsed(node.id, hiddenNodes),
				childrenCount: getDescendantCount(node.id), // Use helper
				// Pass callbacks that operate on refs and hiddenNodes state
				onToggleCollapse: toggleCollapse, // Ensure this uses the latest hiddenNodes
				onAddNode: addNode,
				onDeleteNode: deleteNode,
				onLabelChange: updateNodeLabel,
			},
		}));

		setNodes(nodesForFlow);
		setEdges(visibleEdges);
	}, [
		hiddenNodes, // Re-run when hidden set changes
		mode, // Re-run when mode changes
		setNodes, // ReactFlow state setters
		setEdges,
		getVisibleElements, // Callback dependencies
		isNodeCollapsed,
		getDescendantCount,
		// Callback functions below are stable due to useCallback with ref dependencies
		// toggleCollapse, addNode, deleteNode, updateNodeLabel
	]); // Ensure all dependencies are listed

	// --- Initial Load and Layout ---
	useEffect(() => {
		// Perform initial layout on the data in refs
		const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
			allNodes.current,
			allEdges.current,
			"LR" // Or 'TB'
		);
		// Update refs with layout results
		allNodes.current = layoutedNodes;
		allEdges.current = layoutedEdges;

		// Now update the visible state based on the layouted refs
		const { visibleNodes, visibleEdges } = getVisibleElements(
			allNodes.current,
			allEdges.current,
			hiddenNodes
		);
		setNodes(
			visibleNodes.map((n) => ({ ...n, data: { ...n.data, mode: mode } }))
		); // Map with initial mode
		setEdges(visibleEdges);

		// Fit view after initial layout state is set
		setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
	}, [fitView, getVisibleElements, setNodes, setEdges]); // Run only once on mount

	// --- Collapse/Expand Logic (Operates on hiddenNodes state) ---
	const toggleCollapse = useCallback(
		(nodeId: string) => {
			const nodeToToggle = allNodes.current.find((n) => n.id === nodeId);
			if (!nodeToToggle) return;

			// Calculate descendants based on current refs
			const descendants = getAllDescendantIds(
				nodeId,
				allNodes.current,
				allEdges.current
			);
			if (descendants.size === 0) return; // Nothing to collapse/expand

			const currentlyCollapsed = isNodeCollapsed(nodeId, hiddenNodes);

			setHiddenNodes((prevHidden) => {
				const newHidden = new Set(prevHidden);
				if (currentlyCollapsed) {
					// Expand: Remove direct children from hidden set
					const directChildrenEdges = allEdges.current.filter(
						(e) => e.source === nodeId
					);
					directChildrenEdges.forEach((edge) => {
						newHidden.delete(edge.target);
					});
					console.log(
						`Expanding ${nodeId}, unhiding children:`,
						directChildrenEdges.map((e) => e.target)
					);
				} else {
					// Collapse: Add all descendants to hidden set
					descendants.forEach((id) => newHidden.add(id));
					console.log(`Collapsing ${nodeId}, hiding descendants:`, descendants);
				}
				return newHidden;
			});
			// The useEffect hook will handle updating ReactFlow's nodes/edges state
		},
		[hiddenNodes, isNodeCollapsed]
	); // Depends on hiddenNodes state and isNodeCollapsed helper

	// --- Add Node (Edit Mode) ---
	const addNode = useCallback(
		(parentId: string) => {
			const parentNode = allNodes.current.find((n) => n.id === parentId);
			if (!parentNode) return;

			const newId = uuidv4();

			// --- Improved Initial Position Calculation ---
			const siblingEdges = allEdges.current.filter(
				(e) => e.source === parentId
			);
			const siblingCount = siblingEdges.length;
			const yOffset = 75; // Vertical distance between siblings
			const xOffset = 200; // Horizontal distance from parent

			const newNodePosition = {
				x: parentNode.position.x + xOffset,
				// Position below the last sibling, or just below parent if first child
				y:
					parentNode.position.y +
					siblingCount * yOffset -
					((siblingCount > 0 ? siblingCount - 1 : 0) * yOffset) / 2, // Basic distribution
			};
			// More sophisticated placement could involve checking for overlaps with existing nodes nearby

			const newNode: MindMapNode = {
				id: newId,
				type: "custom",
				position: newNodePosition, // Use calculated position
				data: {
					label: "New Topic",
					originalData: { id: newId, label: "New Topic" },
					mode: "edit", // Start in edit mode
					// Callbacks are added dynamically by the useEffect hook
				},
				// Define default handle positions (will be updated by layout if needed)
				targetPosition: Position.Left,
				sourcePosition: Position.Right,
			};

			const newEdge: MindMapEdge = {
				id: `e-${parentId}-${newId}`,
				source: parentId,
				target: newId,
				type: "smoothstep",
				markerEnd: { type: MarkerType.ArrowClosed },
			};

			// Update the refs first
			allNodes.current = [...allNodes.current, newNode];
			allEdges.current = [...allEdges.current, newEdge];

			// Trigger state update via useEffect by dependencies (indirectly via refs)
			// We manually trigger re-render based on refs change if needed,
			// but the main useEffect watching mode/hiddenNodes should suffice
			// Force a re-evaluation of visible elements in the useEffect hook
			const { visibleNodes, visibleEdges } = getVisibleElements(
				allNodes.current,
				allEdges.current,
				hiddenNodes
			);
			setNodes(
				visibleNodes.map((n) => ({ ...n, data: { ...n.data, mode: "edit" } }))
			); // Ensure mode is edit
			setEdges(visibleEdges);

			// Optionally, gently pan viewport to show the new node
			setTimeout(() => {
				const node = allNodes.current.find((n) => n.id === newId);
				if (node) {
					// This needs refinement - fitView might be too drastic.
					// Panning requires calculating the required delta.
					// fitView({ nodes: [node], duration: 300 }); // Focus on the new node?
				}
			}, 100);
		},
		[getVisibleElements, hiddenNodes, setNodes, setEdges]
	); // Dependencies

	// --- Delete Node (Edit Mode) ---
	const deleteNode = useCallback(
		(nodeId: string) => {
			if (nodeId === "root") {
				alert("Cannot delete the root node.");
				return;
			}

			const descendants = getAllDescendantIds(
				nodeId,
				allNodes.current,
				allEdges.current
			);
			const idsToDelete = new Set([nodeId, ...descendants]);

			// Update refs
			allNodes.current = allNodes.current.filter((n) => !idsToDelete.has(n.id));
			allEdges.current = allEdges.current.filter(
				(e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
			);

			// Remove deleted nodes from hidden set
			setHiddenNodes((prevHidden) => {
				const newHidden = new Set(prevHidden);
				idsToDelete.forEach((id) => newHidden.delete(id));
				return newHidden;
			});

			// Trigger state update via useEffect
			// Force a re-evaluation of visible elements
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
		[getVisibleElements, hiddenNodes, mode, setNodes, setEdges]
	); // Dependencies

	// --- Update Label (Edit Mode) ---
	const updateNodeLabel = useCallback(
		(nodeId: string, newLabel: string) => {
			// Update the label in the persistent ref
			allNodes.current = allNodes.current.map((node) => {
				if (node.id === nodeId) {
					// Preserve existing data, only update label
					return { ...node, data: { ...node.data, label: newLabel } };
				}
				return node;
			});
			// Update the currently rendered nodes state as well (via useEffect trigger)
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
		// 1. Prepare data from refs
		const dataToSend = {
			nodes: allNodes.current.map((n) => ({
				// Send minimal data needed by backend
				id: n.id,
				label: n.data.label,
				// Maybe parent ID if hierarchy is needed?
			})),
			// Send edges if backend needs connection info
			edges: allEdges.current.map((e) => ({
				source: e.source,
				target: e.target,
			})),
			// Maybe send positions if backend should store them? Or rely on layout?
		};

		try {
			// 2. Simulate API call
			console.log("Data to save:", dataToSend);
			await new Promise((resolve) => setTimeout(resolve, 500));
			console.log("Save successful (simulated)");

			// *** 3. Re-layout AFTER successful save ***
			const { nodes: layoutedNodes, edges: layoutedEdges } =
				getLayoutedElements(
					allNodes.current, // Use the latest nodes from the ref
					allEdges.current,
					"LR" // Match initial layout direction
				);

			// Update refs with new layout positions
			allNodes.current = layoutedNodes;
			allEdges.current = layoutedEdges; // Edges usually don't change in layout

			// 4. Switch back to view mode
			setMode("view"); // This will trigger the useEffect hook

			// 5. Fit view to the new layout *after* state update
			setTimeout(() => {
				console.log("Fitting view after layout...");
				fitView({ padding: 0.2, duration: 500 });
			}, 100); // Delay slightly to allow state update
		} catch (error) {
			console.error("Failed to save mind map:", error);
			alert("Error saving mind map. See console for details.");
			// Don't change mode or layout if save fails
		}
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
			{/* Control Buttons */}
			<div
				style={{
					position: "absolute",
					top: 10,
					left: 10,
					zIndex: 10,
					background: "rgba(255,255,255,0.8)",
					padding: "5px",
					borderRadius: "5px",
				}}
			>
				{mode === "view" ? (
					<button onClick={() => setMode("edit")}>Edit</button>
				) : (
					<>
						<button onClick={handleSave}>Save</button>
						<button
							onClick={() => {
								// ** TODO: Add Cancel logic if needed **
								// Reset changes or simply switch mode?
								// For now, just switch mode. Consider resetting state if edits should be discarded.
								setMode("view");
								// Optionally re-run layout on cancel if edits messed things up
							}}
							style={{ marginLeft: 5 }}
						>
							Cancel
						</button>
					</>
				)}
				<button
					onClick={() => fitView({ padding: 0.2, duration: 300 })}
					style={{ marginLeft: 5 }}
				>
					Fit View
				</button>
				<span style={{ marginLeft: 15 }}>Mode: {mode}</span>
			</div>

			<ReactFlow
				nodes={nodes} // Comes from state, updated by useEffect
				edges={edges} // Comes from state, updated by useEffect
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				nodeTypes={nodeTypes}
				// fitView // Remove initial fitView prop, handle it in useEffect
				// fitViewOptions={{ padding: 0.2 }} // Remove initial fitView prop
				nodesDraggable={mode === "edit"}
				nodesConnectable={mode === "edit"}
				elementsSelectable={mode === "edit"} // Allow selection only in edit? Or always?
				// Prevent accidental disconnects in view mode if edges are styled to be interactive
				edgesFocusable={mode === "edit"}
				nodesFocusable={mode === "edit"}
			>
				<Controls />
				<MiniMap nodeStrokeWidth={3} zoomable pannable />
				<Background variant='dots' gap={12} size={1} />
			</ReactFlow>
		</div>
	);
};

// Wrap with Provider
const MindMapViewer: React.FC = () => (
	<ReactFlowProvider>
		<MindMapViewerInternal />
	</ReactFlowProvider>
);

export default MindMapViewer;
