import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../lib/theme.jsx'

export default function TopBar({ onCreate, onProfile, onLobby }) {
  const { studentId } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const path = loc.pathname
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="topbar">
      <div className="topbar-left">Logged in as: {studentId}</div>
      <div className="topbar-center">
        <button
          className={`btn btn-sm ${path.startsWith('/join') ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onLobby?.() || navigate('/join')}
        >
          Lobby
        </button>
        <button
          className={`btn btn-sm ${path.startsWith('/create') ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onCreate?.() || navigate('/create')}
        >
          Create
        </button>
      </div>
      <div className="topbar-right">
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Moon size={20} strokeWidth={1.8} aria-hidden="true" /> : <Sun size={20} strokeWidth={1.8} aria-hidden="true" />}
        </button>
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
