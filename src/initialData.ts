// src/initialData.ts
import { MindMapNode, MindMapEdge, MindMapDataNode } from "./types";

// Simplified example based on the image's structure
export const initialHierarchicalData: MindMapDataNode = {
	id: "root",
	label: "校圈",
	children: [
		{
			id: "1",
			label: "首页",
			children: [
				{
					id: "1-1",
					label: "热门话题",
					children: [
						{
							id: "1-1-1",
							label: "话题选择",
							children: [
								/* ... more depth ... */ { id: "1-1-1-1", label: "话题概述" },
							],
						},
					],
				},
				{
					id: "1-2",
					label: "发现话题",
					children: [/* ... */ { id: "1-2-1", label: "话题选择" }],
				},
			],
		},
		{ id: "2", label: "好友话题" },
		{ id: "3", label: "发起话题" },
		{ id: "4", label: "搜索" },
		{ id: "5", label: "表白墙" },
		{ id: "6", label: "消息" },
		{
			id: "7",
			label: "附近",
			children: [
				{ id: "7-1", label: "附近动态" },
				{ id: "7-2", label: "附近的人" },
			],
		},
		{ id: "8", label: "我的" },
		{ id: "9", label: "设置" },
	],
};

// --- Manual conversion for demonstration ---
// In a real app, use a layout algorithm (like dagre) or fetch pre-calculated positions
export const initialNodes: MindMapNode[] = [
	{
		id: "root",
		position: { x: 0, y: 300 },
		data: {
			label: "校圈",
			originalData: initialHierarchicalData,
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "1",
		position: { x: 200, y: 0 },
		data: {
			label: "首页",
			originalData: initialHierarchicalData.children![0],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "1-1",
		position: { x: 400, y: -50 },
		data: {
			label: "热门话题",
			originalData: initialHierarchicalData.children![0].children![0],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "1-1-1",
		position: { x: 600, y: -75 },
		data: {
			label: "话题选择",
			originalData:
				initialHierarchicalData.children![0].children![0].children![0],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "1-1-1-1",
		position: { x: 800, y: -90 },
		data: {
			label: "话题概述",
			originalData:
				initialHierarchicalData.children![0].children![0].children![0]
					.children![0],
			mode: "view",
		},
		type: "custom",
	}, // Add deeper nodes similarly...
	{
		id: "1-2",
		position: { x: 400, y: 50 },
		data: {
			label: "发现话题",
			originalData: initialHierarchicalData.children![0].children![1],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "1-2-1",
		position: { x: 600, y: 75 },
		data: {
			label: "话题选择",
			originalData:
				initialHierarchicalData.children![0].children![1].children![0],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "2",
		position: { x: 200, y: 150 },
		data: {
			label: "好友话题",
			originalData: initialHierarchicalData.children![1],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "3",
		position: { x: 200, y: 225 },
		data: {
			label: "发起话题",
			originalData: initialHierarchicalData.children![2],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "4",
		position: { x: 200, y: 300 },
		data: {
			label: "搜索",
			originalData: initialHierarchicalData.children![3],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "5",
		position: { x: 200, y: 375 },
		data: {
			label: "表白墙",
			originalData: initialHierarchicalData.children![4],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "6",
		position: { x: 200, y: 450 },
		data: {
			label: "消息",
			originalData: initialHierarchicalData.children![5],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "7",
		position: { x: 200, y: 525 },
		data: {
			label: "附近",
			originalData: initialHierarchicalData.children![6],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "7-1",
		position: { x: 400, y: 500 },
		data: {
			label: "附近动态",
			originalData: initialHierarchicalData.children![6].children![0],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "7-2",
		position: { x: 400, y: 550 },
		data: {
			label: "附近的人",
			originalData: initialHierarchicalData.children![6].children![1],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "8",
		position: { x: 200, y: 600 },
		data: {
			label: "我的",
			originalData: initialHierarchicalData.children![7],
			mode: "view",
		},
		type: "custom",
	},
	{
		id: "9",
		position: { x: 200, y: 675 },
		data: {
			label: "设置",
			originalData: initialHierarchicalData.children![8],
			mode: "view",
		},
		type: "custom",
	},
];

export const initialEdges: MindMapEdge[] = [
	{
		id: "e-root-1",
		source: "root",
		target: "1",
		type: "smoothstep",
		animated: false,
	},
	{ id: "e-1-1-1", source: "1", target: "1-1", type: "smoothstep" },
	{ id: "e-1-1-2", source: "1", target: "1-2", type: "smoothstep" },
	{ id: "e-1-1-1-1", source: "1-1", target: "1-1-1", type: "smoothstep" },
	{ id: "e-1-1-1-1-1", source: "1-1-1", target: "1-1-1-1", type: "smoothstep" }, // Add deeper edges
	{ id: "e-1-2-1", source: "1-2", target: "1-2-1", type: "smoothstep" },
	{ id: "e-root-2", source: "root", target: "2", type: "smoothstep" },
	{ id: "e-root-3", source: "root", target: "3", type: "smoothstep" },
	{ id: "e-root-4", source: "root", target: "4", type: "smoothstep" },
	{ id: "e-root-5", source: "root", target: "5", type: "smoothstep" },
	{ id: "e-root-6", source: "root", target: "6", type: "smoothstep" },
	{ id: "e-root-7", source: "root", target: "7", type: "smoothstep" },
	{ id: "e-7-1", source: "7", target: "7-1", type: "smoothstep" },
	{ id: "e-7-2", source: "7", target: "7-2", type: "smoothstep" },
	{ id: "e-root-8", source: "root", target: "8", type: "smoothstep" },
	{ id: "e-root-9", source: "root", target: "9", type: "smoothstep" },
];

// Helper to get all descendant IDs (needed for collapse/delete)
export function getAllDescendantIds(
	nodeId: string,
	nodes: MindMapNode[],
	edges: MindMapEdge[]
): Set<string> {
	const descendants = new Set<string>();
	const queue: string[] = [nodeId];
	const directChildren = new Map<string, string[]>();

	// Build adjacency list (child -> parent) for easier traversal
	edges.forEach((edge) => {
		if (!directChildren.has(edge.source)) {
			directChildren.set(edge.source, []);
		}
		directChildren.get(edge.source)!.push(edge.target);
	});

	while (queue.length > 0) {
		const currentId = queue.shift()!;
		const children = directChildren.get(currentId) || [];
		for (const childId of children) {
			if (!descendants.has(childId)) {
				descendants.add(childId);
				queue.push(childId);
			}
		}
	}
	return descendants;
}
