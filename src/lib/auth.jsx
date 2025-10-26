import React, { createContext, useContext, useEffect, useState } from 'react'

const STUDENT_ID_PATTERN = /^\d{7}$/

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [studentId, setStudentId] = useState(() => {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('studentId') || ''
    if (!stored) return ''
    if (!STUDENT_ID_PATTERN.test(stored)) {
      localStorage.removeItem('studentId')
      return ''
    }
    return stored
  })

  useEffect(() => {
    if (!studentId) {
      localStorage.removeItem('studentId')
      return
    }
    if (!STUDENT_ID_PATTERN.test(studentId)) {
      setStudentId('')
      localStorage.removeItem('studentId')
      return
    }
    localStorage.setItem('studentId', studentId)
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
