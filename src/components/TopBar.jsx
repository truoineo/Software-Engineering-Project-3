import React from 'react'
import { useAuth } from '../lib/auth'
import { useNavigate, useLocation } from 'react-router-dom'

export default function TopBar({ onCreate, onProfile, onLobby }) {
  const { studentId } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const path = loc.pathname

  return (
    <div className="topbar">
      <div className="topbar-left">Logged in as: {studentId}</div>
      <div className="topbar-center">
        <button
          className={`btn ${path.startsWith('/join') ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onLobby?.() || navigate('/join')}
        >
          Lobby
        </button>
        <button
          className={`btn ${path.startsWith('/create') ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onCreate?.() || navigate('/create')}
          style={{ marginLeft: 8 }}
        >
          Create
        </button>
      </div>
      <div className="topbar-right">
        <button
          aria-label="Profile"
          className="profile-btn"
          onClick={() => onProfile?.() || navigate('/profile')}
          title="Profile"
        >
          👤
        </button>
      </div>
    </div>
  )
}
