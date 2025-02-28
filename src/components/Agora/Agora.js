import React from 'react';
import { useSelector } from 'react-redux';

const Agora = () => {
  const agents = useSelector(state =>
    state.agentsReducer?.activeAgents ?? []
  );

  return (
    <div className="agora-container">
      <h2>Agora - Agent Collaboration Space</h2>
      <div className="agent-grid">
        {agents.map(agent => (
          <div key={agent.id} className="agent-card">
            <h4>{agent.name}</h4>
            <div className="agent-conversation">
              {/* Will integrate with chat system here */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Agora;
