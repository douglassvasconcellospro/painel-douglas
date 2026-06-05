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
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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

          {/* Base por banco — entradas e saídas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '0' }}>

            {/* Nubank */}
            {(() => {
              const nb = doMes.filter(l => l.banco === 'Nubank')
              const ent = nb.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
              const sai = nb.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
              const categoriasSaida = nb.filter(l => l.tipo === 'saida').reduce((acc: Record<string,number>, l) => {
                acc[l.categoria] = (acc[l.categoria] || 0) + Number(l.valor); return acc
              }, {})
              const assinaturas = nb.filter(l => l.tipo === 'saida' && (
                l.categoria === 'Fatura do Cartão' ||
                l.descricao?.toLowerCase().includes('assinatura') ||
                l.descricao?.toLowerCase().includes('netflix') ||
                l.descricao?.toLowerCase().includes('spotify') ||
                l.descricao?.toLowerCase().includes('amazon') ||
                l.descricao?.toLowerCase().includes('apple') ||
                l.descricao?.toLowerCase().includes('google')
              )).reduce((s, l) => s + Number(l.valor), 0)
              return nb.length > 0 ? (
                <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(135deg,#820ad1,#6c0eb0)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🟣</div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Nubank</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{nb.length} lançamentos</div>
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Entradas</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#16a34a' }}>{fmt(ent)}</div>
                      </div>
                      <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Saídas</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>{fmt(sai)}</div>
                      </div>
                      <div style={{ background: '#f5f3ff', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Assinaturas</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#7c3aed' }}>{fmt(assinaturas)}</div>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>GASTOS POR CATEGORIA</div>
                      {Object.entries(categoriasSaida).sort((a,b) => b[1]-a[1]).slice(0,4).map(([cat, val]) => (
                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', color: '#374151' }}>{cat}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>{fmt(val as number)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '12px', background: '#f9fafb', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Resultado Nubank</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: ent - sai >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(ent - sai)}</span>
                    </div>
                  </div>
                </div>
              ) : null
            })()}

            {/* Asaas */}
            {(() => {
              const as = doMes.filter(l => l.banco === 'Asaas')
              const ent = as.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
              const sai = as.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
              const categoriasSaida = as.filter(l => l.tipo === 'saida').reduce((acc: Record<string,number>, l) => {
                acc[l.categoria] = (acc[l.categoria] || 0) + Number(l.valor); return acc
              }, {})
              const assinaturas = as.filter(l => l.tipo === 'saida' && l.categoria === 'Taxas Asaas')
                .reduce((s, l) => s + Number(l.valor), 0)
              return as.length > 0 ? (
                <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🟢</div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Asaas</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{as.length} lançamentos</div>
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Cobranças</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#16a34a' }}>{fmt(ent)}</div>
                      </div>
                      <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Saídas</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>{fmt(sai)}</div>
                      </div>
                      <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Taxas</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#ea580c' }}>{fmt(assinaturas)}</div>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>GASTOS POR CATEGORIA</div>
                      {Object.entries(categoriasSaida).sort((a,b) => b[1]-a[1]).slice(0,4).map(([cat, val]) => (
                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', color: '#374151' }}>{cat}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>{fmt(val as number)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '12px', background: '#f9fafb', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Resultado Asaas</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: ent - sai >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(ent - sai)}</span>
                    </div>
                  </div>
                </div>
              ) : null
            })()}
          </div>

          {/* Total Geral Consolidado */}
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: '16px', padding: '24px', marginTop: '20px', color: '#fff' }}>
            <h3 style={{ fontWeight: 700, fontSize: '16px', margin: '0 0 16px', color: '#e0e7ff' }}>📊 Consolidado Geral — {meses.find(m => m.v === mes)?.l}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { label: 'Total Entradas', value: entradas, cor: '#4ade80' },
                { label: 'Total Saídas', value: saidas, cor: '#f87171' },
                { label: 'Resultado Líquido', value: resultado, cor: resultado >= 0 ? '#60a5fa' : '#f87171' },
                { label: 'Margem', value: null, margem: margem + '%', cor: parseFloat(margem) >= 20 ? '#4ade80' : parseFloat(margem) >= 0 ? '#fbbf24' : '#f87171' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>{item.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: item.cor }}>
                    {item.value !== null ? fmt(item.value) : item.margem}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginTop: '16px' }}>
              {['Nubank','Asaas','Manual'].map(banco => {
                const entBanco = doMes.filter(l => l.banco === banco && l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
                const saiBanco = doMes.filter(l => l.banco === banco && l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
                if (entBanco === 0 && saiBanco === 0) return null
                return (
                  <div key={banco} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>{banco}</div>
                    <div style={{ fontSize: '12px', color: '#4ade80' }}>↑ {fmt(entBanco)}</div>
                    <div style={{ fontSize: '12px', color: '#f87171' }}>↓ {fmt(saiBanco)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
export const dynamic = 'force-dynamic'
