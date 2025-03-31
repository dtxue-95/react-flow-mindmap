// src/components/CustomNode.tsx
import React, {
	useEffect,
	useState,
	useCallback,
	ChangeEvent,
	KeyboardEvent,
	FocusEvent,
} from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { CustomNodeData } from "../types";
import "./CustomNode.css";

// Make sure target/sourcePosition are included if layout changes them
const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({
	id,
	data,
	isConnectable,
	targetPosition = Position.Left, // Default if not provided by layout
	sourcePosition = Position.Right, // Default if not provided by layout
}) => {
	const {
		label,
		isCollapsed = false,
		childrenCount = 0,
		mode,
		onToggleCollapse,
		onAddNode,
		onDeleteNode,
		onLabelChange,
	} = data;

	const [isEditing, setIsEditing] = useState(false);
	const [currentLabel, setCurrentLabel] = useState(label);

	// Reset editing state if mode changes externally
	useEffect(() => {
		if (mode === "view") {
			setIsEditing(false);
			setCurrentLabel(label); // Ensure label is current
		}
	}, [mode, label]);

	// --- Edit Handling --- (Keep existing logic)
	const handleDoubleClick = useCallback(() => {
		if (mode === "edit") {
			setCurrentLabel(label);
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
		if (!isEditing) return; // Prevent saving if not editing
		setIsEditing(false);
		if (currentLabel.trim() && currentLabel !== label && onLabelChange) {
			onLabelChange(id, currentLabel.trim());
		} else {
			setCurrentLabel(label); // Revert visual
		}
	}, [id, label, currentLabel, onLabelChange, isEditing]);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key === "Enter") {
				event.preventDefault(); // Prevent potential form submission
				handleLabelSave();
			} else if (event.key === "Escape") {
				setCurrentLabel(label);
				setIsEditing(false);
			}
		},
		[handleLabelSave, label]
	);

	const handleBlur = useCallback(
		(event: FocusEvent<HTMLInputElement>) => {
			// Add slight delay to allow button clicks within node to register first
			setTimeout(() => {
				// Check if focus moved to an element *outside* the current node complex
				// This is tricky, might need a more robust solution if clicks on +/- are missed
				if (!event.currentTarget.parentNode?.contains(document.activeElement)) {
					handleLabelSave();
				}
			}, 0);
		},
		[handleLabelSave]
	);

	// --- Button Clicks ---
	const handleAddClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onAddNode?.(id);
	};

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onDeleteNode?.(id);
	};

	const handleToggleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		// *** Always allow toggle, regardless of mode ***
		onToggleCollapse?.(id);
	};

	// Can collapse if it has children (count passed via props)
	const canCollapse = childrenCount > 0;

	return (
		<div
			className={`mindmap-node ${mode === "edit" ? "edit-mode" : ""} ${
				isCollapsed ? "collapsed" : ""
			}`}
		>
			<Handle
				type='target'
				position={targetPosition} // Use dynamic position
				isConnectable={isConnectable}
				className='mindmap-handle'
			/>

			<div className='node-content' onDoubleClick={handleDoubleClick}>
				{isEditing && mode === "edit" ? ( // Only allow input render in edit mode
					<input
						type='text'
						value={currentLabel}
						onChange={handleLabelChangeInput}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						autoFocus
						className='node-label-input'
						onClick={(e) => e.stopPropagation()} // Prevent node drag when clicking input
					/>
				) : (
					<div className='node-label'>{label}</div>
				)}
			</div>

			{/* Collapse/Expand Toggle - Always visible if canCollapse */}
			{canCollapse && (
				<button
					className={`collapse-toggle ${isCollapsed ? "expand" : "collapse"}`}
					onClick={handleToggleClick} // Directly call toggle
					title={isCollapsed ? `Expand (${childrenCount})` : "Collapse"}
				>
					{isCollapsed ? `+${childrenCount || ""}` : "-"}
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

			{/* Output Handle - Hide visually when collapsed? Or just don't draw edges?
                React Flow handles not drawing edges if target is hidden.
                Keep handle present but maybe style differently if needed.
                Only render if NOT collapsed to avoid visual clutter.
             */}
			{!isCollapsed && (
				<Handle
					type='source'
					position={sourcePosition} // Use dynamic position
					isConnectable={isConnectable}
					className='mindmap-handle'
				/>
			)}
		</div>
	);
};

export default React.memo(CustomNode);
