'use client'
import { useEffect, useState } from 'react'
import { supabase, Lancamento } from '@/lib/supabase'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function Dashboard() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [mes, setMes] = useState('2026-05')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('lancamentos').select('*').order('data', { ascending: false })
      setLancamentos(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const doMes = lancamentos.filter(l => l.mes === mes)
  const entradas = doMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
  const saidas = doMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
  const resultado = entradas - saidas
  const margem = entradas > 0 ? ((resultado / entradas) * 100).toFixed(1) : '0.0'

  const meses = [
    { v: '2026-05', l: 'Maio 2026' }, { v: '2026-04', l: 'Abril 2026' },
    { v: '2026-03', l: 'Março 2026' }, { v: '2026-02', l: 'Fevereiro 2026' },
    { v: '2026-01', l: 'Janeiro 2026' },
  ]

  // categorias saida
  const catSaida: Record<string, number> = {}
  doMes.filter(l => l.tipo === 'saida').forEach(l => {
    catSaida[l.categoria] = (catSaida[l.categoria] || 0) + Number(l.valor)
  })
  const catSaidaTop = Object.entries(catSaida).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const ultimos = doMes.slice(0, 8)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">{meses.find(m => m.v === mes)?.l}</p>
        </div>
        <select
          value={mes} onChange={e => setMes(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
        >
          {meses.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando dados...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-500 mb-1">Total de Entradas</div>
              <div className="text-2xl font-bold text-green-700">{fmt(entradas)}</div>
            </div>
            <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-500 mb-1">Total de Saídas</div>
              <div className="text-2xl font-bold text-red-700">{fmt(saidas)}</div>
            </div>
            <div className={`${resultado >= 0 ? 'bg-blue-50 border-blue-500' : 'bg-red-50 border-red-500'} border-l-4 rounded-xl p-5`}>
              <div className="text-xs font-semibold text-gray-500 mb-1">Resultado Líquido</div>
              <div className={`text-2xl font-bold ${resultado >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmt(resultado)}</div>
            </div>
            <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-500 mb-1">Margem de Resultado</div>
              <div className="text-2xl font-bold text-green-700">{margem}%</div>
            </div>
          </div>

          {/* Barra saídas/entradas */}
          <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Saídas vs Entradas</span>
              <span className="font-medium">{entradas > 0 ? ((saidas / entradas) * 100).toFixed(1) : 0}% comprometido</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(entradas > 0 ? (saidas / entradas) * 100 : 0, 100)}%`,
                  background: entradas > 0 && saidas / entradas > 0.9 ? '#ef4444' : entradas > 0 && saidas / entradas > 0.7 ? '#f59e0b' : '#10b981'
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>R$ 0,00</span><span>{fmt(entradas)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Categorias saída */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Saídas por Categoria</h3>
              <div className="space-y-3">
                {catSaidaTop.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
                ) : catSaidaTop.map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate flex-1">{cat}</span>
                    <span className="font-semibold text-gray-800 ml-4">{fmt(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Últimos lançamentos */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Últimos Lançamentos</h3>
              <div className="space-y-3">
                {ultimos.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sem lançamentos</p>
                ) : ultimos.map(l => (
                  <div key={l.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-base">{l.tipo === 'entrada' ? '⬆️' : '⬇️'}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-700 truncate">{l.descricao}</div>
                        <div className="text-xs text-gray-400">{l.data} · {l.categoria}</div>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ml-3 ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {l.tipo === 'saida' ? '- ' : '+ '}{fmt(Number(l.valor))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Total por banco */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Entradas por Banco — {meses.find(m => m.v === mes)?.l}</h3>
            <div className="grid grid-cols-3 gap-4">
              {['Nubank','Asaas','Manual'].map(banco => {
                const total = doMes.filter(l => l.banco === banco && l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
                return total > 0 ? (
                  <div key={banco} className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-xs text-gray-500 mb-1">{banco}</div>
                    <div className="text-lg font-bold text-gray-800">{fmt(total)}</div>
                  </div>
                ) : null
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
