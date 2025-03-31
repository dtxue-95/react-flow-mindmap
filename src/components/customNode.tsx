// src/components/CustomNode.tsx
import React, {
	useState,
	useCallback,
	ChangeEvent,
	KeyboardEvent,
	FocusEvent,
} from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { CustomNodeData } from "../types";
import "./customNode.css"; // We'll create this for styling

const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({
	id,
	data,
	isConnectable,
}) => {
	const {
		label,
		isCollapsed = false, // Default to not collapsed
		childrenCount = 0, // Default count
		mode,
		onToggleCollapse,
		onAddNode,
		onDeleteNode,
		onLabelChange,
	} = data;

	const [isEditing, setIsEditing] = useState(false);
	const [currentLabel, setCurrentLabel] = useState(label);

	// --- Edit Handling ---
	const handleDoubleClick = useCallback(() => {
		if (mode === "edit") {
			setCurrentLabel(label); // Reset edit text to current label
			setIsEditing(true);
		}
	}, [mode, label]);

	const handleLabelChangeInput = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			setCurrentLabel(event.target.value);
		},
		[]
	);

	const handleLabelSave = useCallback(() => {
		setIsEditing(false);
		// Only call update if label actually changed
		if (currentLabel.trim() && currentLabel !== label && onLabelChange) {
			onLabelChange(id, currentLabel.trim());
		} else {
			setCurrentLabel(label); // Revert if empty or unchanged
		}
	}, [id, label, currentLabel, onLabelChange]);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key === "Enter") {
				handleLabelSave();
			} else if (event.key === "Escape") {
				setCurrentLabel(label); // Revert changes
				setIsEditing(false);
			}
		},
		[handleLabelSave, label]
	);

	const handleBlur = useCallback(
		(event: FocusEvent<HTMLInputElement>) => {
			// Prevent saving if blur is due to clicking +/- buttons
			if (
				event.relatedTarget instanceof HTMLElement &&
				(event.relatedTarget.classList.contains("edit-button--add") ||
					event.relatedTarget.classList.contains("edit-button--delete"))
			) {
				return;
			}
			handleLabelSave();
		},
		[handleLabelSave]
	);

	// --- Button Clicks ---
	const handleAddClick = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent node drag/selection
		onAddNode?.(id);
	};

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		// Add confirmation maybe?
		onDeleteNode?.(id);
	};

	const handleToggleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onToggleCollapse?.(id);
	};

	// Determine if the node has potential children (based on edges originating from it)
	// This is a simplification; a more robust check might involve looking at the original data structure
	const canCollapse = childrenCount > 0; // Assume childrenCount is accurately passed

	return (
		<div
			className={`mindmap-node ${mode === "edit" ? "edit-mode" : ""} ${
				isCollapsed ? "collapsed" : ""
			}`}
		>
			{/* Input Handle (connection target) - Always present? */}
			<Handle
				type='target'
				position={Position.Left}
				isConnectable={isConnectable}
				className='mindmap-handle'
			/>

			{/* Node Body */}
			<div className='node-content' onDoubleClick={handleDoubleClick}>
				{isEditing ? (
					<input
						type='text'
						value={currentLabel}
						onChange={handleLabelChangeInput}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur} // Use onBlur for saving when clicking away
						autoFocus
						className='node-label-input'
					/>
				) : (
					<div className='node-label'>{label}</div>
				)}
			</div>

			{/* Collapse/Expand Toggle (Circle with +/- or count) */}
			{canCollapse && (
				<button
					className={`collapse-toggle ${isCollapsed ? "expand" : "collapse"}`}
					onClick={handleToggleClick}
					title={isCollapsed ? `Expand (${childrenCount})` : "Collapse"}
				>
					{isCollapsed ? `+${childrenCount}` : "-"}
				</button>
			)}

			{/* Edit Mode Buttons (+/-) */}
			{mode === "edit" && (
				<div className='edit-controls'>
					<button
						onClick={handleAddClick}
						className='edit-button edit-button--add'
						title='Add Child Node'
					>
						+
					</button>
					{/* Optionally prevent deleting the root node */}
					{id !== "root" && (
						<button
							onClick={handleDeleteClick}
							className='edit-button edit-button--delete'
							title='Delete Node'
						>
							-
						</button>
					)}
				</div>
			)}

			{/* Output Handle (connection source) - Hide when collapsed */}
			{!isCollapsed && (
				<Handle
					type='source'
					position={Position.Right}
					isConnectable={isConnectable}
					className='mindmap-handle'
				/>
			)}
		</div>
	);
};

export default React.memo(CustomNode); // Memoize for performance
