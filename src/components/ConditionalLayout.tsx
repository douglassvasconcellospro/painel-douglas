'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Tutorial from './Tutorial'

const AUTH_PAGES = ['/login', '/reset-password']

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const isAuthPage = AUTH_PAGES.some(p => path?.startsWith(p))

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <Tutorial />
      <Sidebar />
      <main style={{ flex: 1, padding: '2rem', overflowX: 'hidden', minHeight: '100vh', background: '#f9fafb' }}>
        {children}
      </main>
    </div>
  )
}
