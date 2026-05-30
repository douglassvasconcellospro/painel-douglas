'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/lancamentos', label: 'Lançamentos', icon: '↕️' },
  { href: '/importar', label: 'Importar Extrato', icon: '📥' },
  { href: '/clientes', label: 'Clientes & Leads', icon: '👥' },
  { href: '/fechamentos', label: 'Fechamentos', icon: '📅' },
  { href: '/categorias', label: 'Categorias', icon: '🏷️' },
  { href: '/configuracoes', label: 'Configurações', icon: '⚙️' },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      minHeight: '100vh',
      background: '#111827',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      alignSelf: 'flex-start',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #374151',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: '#4f46e5',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '13px',
          flexShrink: 0,
        }}>DV</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Douglas Vasconcellos</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>Painel Financeiro</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px', overflowY: 'auto', overflowX: 'hidden' }}>
        {nav.map(item => {
          const active = path === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '2px',
                textDecoration: 'none',
                color: active ? '#fff' : '#9ca3af',
                background: active ? '#4f46e5' : 'transparent',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #374151',
        fontSize: '11px',
        color: '#6b7280',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        douglasvasconcellosatleta@gmail.com
      </div>
    </aside>
  )
}
