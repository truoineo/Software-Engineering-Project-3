import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadRooms, saveRooms, saveRoomsSilent, ROOMS_UPDATED_EVENT } from './storage'
import { fetchRoomsFromApi } from './api'
import { useAuth } from './auth'

const RoomsCtx = createContext(null)

export function RoomsProvider({ children }) {
  const { studentId } = useAuth()
  const [rooms, setRoomsState] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [supportsApi, setSupportsApi] = useState(true)
  const [error, setError] = useState(null)
  const isSyncingRef = useRef(false)
  const storageDebounceRef = useRef(null)
  const lastStorageSyncAtRef = useRef(0)
  const abortRef = useRef(null)

  const syncFromStorage = useCallback(async () => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setIsLoading(true)
    try {
      // Cancel any in-flight request when switching users
      if (abortRef.current) {
        try { abortRef.current.abort() } catch {}
      }
      abortRef.current = new AbortController()
      const fromApi = await fetchRoomsFromApi(studentId, abortRef.current.signal)
      setSupportsApi(true)
      setRoomsState(fromApi)
      // Persist without re-broadcasting to avoid triggering our own listener
      saveRoomsSilent(fromApi)
      setError(null)
    } catch (err) {
      console.warn('Falling back to local storage for rooms', err)
      setSupportsApi(false)
      setError(err?.message || 'Unable to reach server')
      const fallback = loadRooms()
      setRoomsState(fallback)
    } finally {
      setIsLoading(false)
      isSyncingRef.current = false
    }
  }, [studentId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    syncFromStorage()
    const handleStorage = (event) => {
      if (event && event.key && event.key !== 'rooms') return
      const now = Date.now()
      if (now - lastStorageSyncAtRef.current < 1500) return
      if (storageDebounceRef.current) clearTimeout(storageDebounceRef.current)
      storageDebounceRef.current = setTimeout(() => {
        lastStorageSyncAtRef.current = Date.now()
        syncFromStorage()
      }, 150)
    }
    const handleRoomsUpdated = () => { syncFromStorage() }
    window.addEventListener('storage', handleStorage)
    window.addEventListener(ROOMS_UPDATED_EVENT, handleRoomsUpdated)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(ROOMS_UPDATED_EVENT, handleRoomsUpdated)
      if (storageDebounceRef.current) clearTimeout(storageDebounceRef.current)
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
