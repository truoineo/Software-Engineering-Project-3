import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { loadRooms, saveRooms, ROOMS_UPDATED_EVENT } from './storage'

const RoomsCtx = createContext(null)

export function RoomsProvider({ children }) {
  const [rooms, setRoomsState] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const syncFromStorage = useCallback(() => {
    setIsLoading(true)
    const next = loadRooms()
    setRoomsState(next)
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => setIsLoading(false))
    } else {
      setTimeout(() => setIsLoading(false), 0)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    syncFromStorage()
    const handle = () => syncFromStorage()
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
      const updated = loadRooms()
      setIsLoading(false)
      return updated
    })
  }, [])

  const value = useMemo(
    () => ({
      rooms,
      setRooms: commit,
      refresh: syncFromStorage,
      isLoading,
    }),
    [rooms, commit, syncFromStorage, isLoading]
  )

  return <RoomsCtx.Provider value={value}>{children}</RoomsCtx.Provider>
}

export function useRooms() {
  const ctx = useContext(RoomsCtx)
  if (!ctx) throw new Error('useRooms must be used within RoomsProvider')
  return ctx
}
