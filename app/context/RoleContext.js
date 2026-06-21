'use client'
import { createContext, useContext, useState } from 'react'

export function RoleProvider({ children }) {
  const [role, setRole] = useState(null)

  return (
    <RoleContext.Provider value={{ role, setRole, loaded: true }}>
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
