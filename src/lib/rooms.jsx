import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { loadRooms, saveRooms, ROOMS_UPDATED_EVENT } from './storage'
import { fetchRoomsFromApi } from './api'
import { useAuth } from './auth'

const RoomsCtx = createContext(null)

export function RoomsProvider({ children }) {
  const { studentId } = useAuth()
  const [rooms, setRoomsState] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [supportsApi, setSupportsApi] = useState(true)
  const [error, setError] = useState(null)

  const syncFromStorage = useCallback(async () => {
    setIsLoading(true)
    try {
      const fromApi = await fetchRoomsFromApi(studentId)
      setSupportsApi(true)
      setRoomsState(fromApi)
      saveRooms(fromApi)
      setError(null)
    } catch (err) {
      console.warn('Falling back to local storage for rooms', err)
      setSupportsApi(false)
      setError(err?.message || 'Unable to reach server')
      const fallback = loadRooms()
      setRoomsState(fallback)
    } finally {
      setIsLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    syncFromStorage()
    const handle = () => { syncFromStorage() }
    window.addEventListener('storage', handle)
    window.addEventListener(ROOMS_UPDATED_EVENT, handle)
    return () => {
      window.removeEventListener('storage', handle)
      window.removeEventListener(ROOMS_UPDATED_EVENT, handle)
    }
  }, [syncFromStorage])

  const commit = useCallback(updater => {
    setRoomsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (next === prev) return prev
      saveRooms(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      rooms,
      setRooms: commit,
      refresh: syncFromStorage,
      isLoading,
      supportsApi,
      error,
    }),
    [rooms, commit, syncFromStorage, isLoading, supportsApi, error]
  )

  return <RoomsCtx.Provider value={value}>{children}</RoomsCtx.Provider>
}

export function useRooms() {
  const ctx = useContext(RoomsCtx)
  if (!ctx) throw new Error('useRooms must be used within RoomsProvider')
  return ctx
}
