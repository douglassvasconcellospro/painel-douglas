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
    <aside className="fixed top-0 left-0 h-screen w-60 bg-gray-900 text-white flex flex-col z-50">
      <div className="p-5 border-b border-gray-700 flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">DV</div>
        <div>
          <div className="font-bold text-sm">Douglas Vasconcellos</div>
          <div className="text-xs text-gray-400">Painel Financeiro</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              path === item.href
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        douglasvasconcellosatleta@gmail.com
      </div>
    </aside>
  )
}
