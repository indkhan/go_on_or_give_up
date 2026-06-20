'use client'
import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'tradeflow-role'

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'buyer' || stored === 'seller') setRoleState(stored)
    setLoaded(true)
  }, [])

  const setRole = next => {
    window.localStorage.setItem(STORAGE_KEY, next)
    setRoleState(next)
  }

  return (
    <RoleContext.Provider value={{ role, setRole, loaded }}>
      {children}
    </RoleContext.Provider>
  )
}

const RoleContext = createContext()
export function useRole() {
  const context = useContext(RoleContext)
  if (!context) throw new Error('useRole must be used within RoleProvider')
  return context
}
