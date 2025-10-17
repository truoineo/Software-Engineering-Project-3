import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import TopBar from './components/TopBar'
import Join from './pages/Join'
import Create from './pages/Create'
import Profile from './pages/Profile'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './lib/auth'

function AppInner() {
  const { studentId } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-container">
      {studentId && (
        <TopBar
          onCreate={() => navigate('/create')}
          onProfile={() => navigate('/profile')}
        />)
      }
      <div className="app-body">
        <Routes>
          <Route path="/" element={studentId ? <Navigate to="/join" /> : <Login />} />
          <Route path="/join" element={<Join />} />
          <Route path="/create" element={<Create />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

