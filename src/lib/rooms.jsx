import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { loadRooms, saveRooms, ROOMS_UPDATED_EVENT } from './storage'

const RoomsCtx = createContext(null)

export function RoomsProvider({ children }) {
  const [rooms, setRoomsState] = useState(() => loadRooms())

  const syncFromStorage = useCallback(() => {
    setRoomsState(loadRooms())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
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
      return loadRooms()
    })
  }, [])

  const value = useMemo(
    () => ({
      rooms,
      setRooms: commit,
      refresh: syncFromStorage,
    }),
    [rooms, commit, syncFromStorage]
  )

  return <RoomsCtx.Provider value={value}>{children}</RoomsCtx.Provider>
}

export function useRooms() {
  const ctx = useContext(RoomsCtx)
  if (!ctx) throw new Error('useRooms must be used within RoomsProvider')
  return ctx
}
