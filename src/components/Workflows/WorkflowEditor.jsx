import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import 'reactflow/dist/style.css';

// Import custom node types
import TaskNode from './nodes/TaskNode';
import StartNode from './nodes/StartNode';
import EndNode from './nodes/EndNode';
import DecisionNode from './nodes/DecisionNode';

// Define node types outside component to prevent recreation on each render
const NODE_TYPES = {
  task: TaskNode,
  start: StartNode,
  end: EndNode,
  decision: DecisionNode,
};

const WorkflowEditor = ({ initialNodes = [], initialEdges = [], onSave }) => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  
  // Use callbacks for node and edge change handlers
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  // Rest of the component...
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES} // Use the memoized node types
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      
      {/* Rest of your component JSX */}
    </div>
  );
};

export default WorkflowEditor;
