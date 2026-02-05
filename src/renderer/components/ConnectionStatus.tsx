import React from 'react'

export const ConnectionStatus: React.FC<{ status: string; lastHeartbeatAt: number | null }> = ({
  status,
  lastHeartbeatAt
}) => {
  return (
    <div className={`connection ${status}`}>
      <span>{status.toUpperCase()}</span>
      {lastHeartbeatAt && (
        <span className="heartbeat">Last heartbeat: {new Date(lastHeartbeatAt).toLocaleTimeString()}</span>
      )}
    </div>
  )
}
