import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [studentId, setStudentId] = useState(() => localStorage.getItem('studentId') || '')

  useEffect(() => {
    if (studentId) localStorage.setItem('studentId', studentId)
    else localStorage.removeItem('studentId')
  }, [studentId])

  return (
    <AuthCtx.Provider value={{ studentId, setStudentId }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

