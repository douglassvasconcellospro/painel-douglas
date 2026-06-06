'use client'
import { useEffect, useState } from 'react'
import { supabase, Lancamento } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const fmt  = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtK = (v: number) => v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v.toFixed(0)}`
import { gerarMeses, MES_ATUAL } from '@/lib/meses'
const MESES = gerarMeses(6)
const CORES = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#94a3b8']

export default function AsaasPage() {
  const [stats, setStats]             = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading]         = useState(true)
  const [mes, setMes]                 = useState(MES_ATUAL)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: lancs } = await supabase.from('lancamentos').select('*').order('data', { ascending: false })
      setLancamentos(lancs || [])
      setLoading(false)
    }
    load()
    async function loadAsaas() {
      setStatsLoading(true)
      try {
        const r = await fetch('/api/asaas/stats')
        if (r.ok) setStats(await r.json())
      } catch {}
      setStatsLoading(false)
    }
    loadAsaas()
  }, [])

  // Lançamentos Asaas do mês
  const asaasMes   = lancamentos.filter(l => l.banco?.toLowerCase().includes('asaas') && l.mes === mes)
  const receitas   = asaasMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
  const despesas   = asaasMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)

  // Evolução 6 meses (lançamentos Asaas)
  const evolucao = MESES.map(m => ({
    mes: m.l.split(' ')[0],
    receitas: lancamentos.filter(l => l.banco?.toLowerCase().includes('asaas') && l.tipo === 'entrada' && l.mes === m.v).reduce((s, l) => s + Number(l.valor), 0),
    despesas: lancamentos.filter(l => l.banco?.toLowerCase().includes('asaas') && l.tipo === 'saida'   && l.mes === m.v).reduce((s, l) => s + Number(l.valor), 0),
  })).reverse()

  // Gastos por categoria Asaas
  const catMap: Record<string, number> = {}
  asaasMes.filter(l => l.tipo === 'saida').forEach(l => {
    catMap[l.categoria || 'Outros'] = (catMap[l.categoria || 'Outros'] || 0) + Number(l.valor)
  })
  const pizzaDespesas = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }))

  return (
    <div style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
            🟢 Asaas — Financeiro Empresarial
          </h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '3px' }}>
            Cobranças, assinaturas, clientes e fluxo de caixa da empresa
          </p>
        </div>
        <select value={mes} onChange={e => setMes(e.target.value)}
          style={{ border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', background: '#fff', fontWeight: 600 }}>
          {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
      </div>

      {/* KPIs Asaas em tempo real */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: '14px', padding: '18px', color: '#fff' }}>
          <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 600, marginBottom: '6px' }}>💰 SALDO ASAAS</div>
          <div style={{ fontSize: '26px', fontWeight: 800 }}>{statsLoading ? '...' : fmt(stats?.saldo ?? 0)}</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Carteira disponível</div>
        </div>
        <div style={{ background: '#f5f3ff', borderLeft: '4px solid #7c3aed', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>🔄 MRR</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#7c3aed' }}>{statsLoading ? '...' : fmt(stats?.mrr ?? 0)}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{stats?.qtdSubscricoes ?? 0} assinaturas ativas</div>
        </div>
        <div style={{ background: '#fef9c3', borderLeft: '4px solid #ca8a04', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>⏳ A Receber</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ca8a04' }}>{statsLoading ? '...' : fmt(stats?.totalPendente ?? 0)}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{stats?.qtdPendentes ?? 0} cobranças pendentes</div>
        </div>
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>🔴 Vencidas</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626' }}>{statsLoading ? '...' : fmt(stats?.totalVencido ?? 0)}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{stats?.qtdVencidas ?? 0} cobranças em atraso</div>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '16px' }}>📈 Receitas vs Despesas Asaas — 6 meses</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={evolucao} barSize={16}>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '8px' }}>🏷️ Despesas por Categoria</div>
          {pizzaDespesas.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pizzaDespesas} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                  {pizzaDespesas.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '13px' }}>Sem dados</div>}
        </div>
      </div>

      {/* Cobranças + Assinaturas + Previsão */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Cobranças Pendentes */}
        <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ background: '#fef3c7', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#92400e' }}>⏳ Pendentes</span>
            <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>{stats?.qtdPendentes ?? '...'}</span>
          </div>
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>{statsLoading ? '...' : fmt(stats?.totalPendente ?? 0)}</div>
            {(stats?.pendentes || []).slice(0, 6).map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb', fontSize: '12px' }}>
                <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '8px' }}>{p.cliente}</span>
                <span style={{ fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>{fmt(p.valor)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cobranças Vencidas */}
        <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ background: '#fef2f2', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#991b1b' }}>🔴 Vencidas</span>
            <span style={{ background: '#ef4444', color: '#fff', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>{stats?.qtdVencidas ?? '...'}</span>
          </div>
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>{statsLoading ? '...' : fmt(stats?.totalVencido ?? 0)}</div>
            {(stats?.vencidas || []).slice(0, 6).map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb', fontSize: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cliente}</div>
                  <div style={{ color: '#ef4444', fontSize: '10px' }}>{p.diasAtraso}d atraso</div>
                </div>
                <span style={{ fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap' }}>{fmt(p.valor)}</span>
              </div>
            ))}
            {(stats?.qtdVencidas ?? 0) === 0 && !statsLoading && (
              <div style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>✅ Nenhuma em atraso!</div>
            )}
          </div>
        </div>

        {/* Assinaturas recorrentes */}
        <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ background: '#ede9fe', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#5b21b6' }}>🔄 Assinaturas de Clientes</span>
            <span style={{ background: '#7c3aed', color: '#fff', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>{stats?.qtdSubscricoes ?? '...'}</span>
          </div>
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>MRR (Receita Recorrente Mensal)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#7c3aed' }}>{statsLoading ? '...' : fmt(stats?.mrr ?? 0)}</div>
            </div>
            {(stats?.subscricoes || []).slice(0, 6).map((s: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb', fontSize: '12px' }}>
                <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '8px' }}>{s.descricao?.slice(0, 24)}</span>
                <span style={{ fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap' }}>{fmt(s.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Previsão de Caixa + Top Clientes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '16px' }}>🔮 Previsão de Caixa</div>
          {[
            { label: '30 dias', val: stats?.previsao?.dias30 ?? 0, cor: '#16a34a' },
            { label: '60 dias', val: stats?.previsao?.dias60 ?? 0, cor: '#2563eb' },
            { label: '90 dias', val: stats?.previsao?.dias90 ?? 0, cor: '#7c3aed' },
          ].map((p, i) => {
            const max = stats?.previsao?.dias90 || 1
            return (
              <div key={i} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Próximos {p.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: p.cor }}>{statsLoading ? '...' : fmt(p.val)}</span>
                </div>
                <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${max > 0 ? (p.val / max) * 100 : 0}%`, background: p.cor, borderRadius: '99px' }} />
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: '8px', padding: '10px', background: '#f9fafb', borderRadius: '8px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
            Baseado em cobranças pendentes no Asaas
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '16px' }}>🏆 Top Clientes por Receita Total</div>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>Carregando...</div>
          ) : (
            <div>
              {(stats?.topClientes || []).map((c: any, i: number) => {
                const max = stats?.topClientes?.[0]?.total ?? 1
                return (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', width: '18px' }}>#{i + 1}</span>
                        <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{c.nome?.slice(0, 30)}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>{fmt(c.total)}</span>
                        <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '6px' }}>{c.qtd}x</span>
                      </div>
                    </div>
                    <div style={{ height: '5px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.total / max) * 100}%`, background: i === 0 ? '#16a34a' : i === 1 ? '#2563eb' : i === 2 ? '#f59e0b' : '#94a3b8', borderRadius: '99px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lançamentos Asaas do mês */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
            📋 Lançamentos Asaas — {MESES.find(m => m.v === mes)?.l}
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>+{fmt(receitas)}</span>
            <span style={{ color: '#dc2626', fontWeight: 700 }}>-{fmt(despesas)}</span>
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>Carregando...</div>
        ) : asaasMes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '13px' }}>
            Nenhum lançamento Asaas neste mês.<br/>
            <span style={{ fontSize: '12px' }}>Use "Importar Extrato" → sincronização Asaas</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6b7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Descrição</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6b7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Categoria</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6b7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Data</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: '#6b7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {asaasMes.slice(0, 15).map((l, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '9px 12px', color: '#374151', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.descricao}</td>
                  <td style={{ padding: '9px 12px', color: '#6b7280', fontSize: '12px' }}>{l.categoria}</td>
                  <td style={{ padding: '9px 12px', color: '#6b7280', fontSize: '12px' }}>{l.data}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: l.tipo === 'entrada' ? '#16a34a' : '#dc2626' }}>
                    {l.tipo === 'entrada' ? '+' : '-'}{fmt(Number(l.valor))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
