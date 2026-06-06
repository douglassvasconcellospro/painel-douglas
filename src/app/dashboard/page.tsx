'use client'
import { useEffect, useState } from 'react'
import { supabase, Lancamento } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { gerarMeses, MES_ATUAL } from '@/lib/meses'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtK = (v: number) => v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v.toFixed(0)}`

const MESES_LISTA = gerarMeses(6)
const CORES_PIZZA = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#0ea5e9','#f97316','#94a3b8']

export default function Dashboard() {
  const [mes, setMes] = useState(MES_ATUAL)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [asaas, setAsaas]               = useState<any>(null)
  const [asaasLoading, setAsaasLoading] = useState(true)
  const [pluggy, setPluggy]             = useState<any>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: lancs }, { data: cfgs }, { data: clis }] = await Promise.all([
        supabase.from('lancamentos').select('*').order('data', { ascending: false }),
        supabase.from('configuracoes').select('chave,valor'),
        supabase.from('clientes').select('*'),
      ])
      setLancamentos(lancs || [])
      setClientes(clis || [])
      const map: Record<string, string> = {}
      for (const c of (cfgs || [])) map[c.chave] = c.valor || ''
      setConfig(map)
      setLoading(false)

      // Se Nubank conectado via Pluggy, busca saldo automático
      const itemId = map.pluggy_nubank_item_id
      if (itemId) {
        try {
          const pr = await fetch(`/api/pluggy/accounts?itemId=${itemId}`)
          if (pr.ok) setPluggy(await pr.json())
        } catch {}
      }
    }
    load()
  }, [])

  useEffect(() => {
    async function loadAsaas() {
      setAsaasLoading(true)
      try {
        const res = await fetch('/api/asaas/stats')
        if (res.ok) setAsaas(await res.json())
      } catch {}
      setAsaasLoading(false)
    }
    loadAsaas()
  }, [])

  const doMes = lancamentos.filter(l => l.mes === mes)
  const entradas = doMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
  const saidas = doMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
  const resultado = entradas - saidas
  const margem = entradas > 0 ? ((resultado / entradas) * 100) : 0
  const meta = parseFloat(config.meta_mensal || '0')
  const metaPct = meta > 0 ? Math.min((entradas / meta) * 100, 100) : 0

  // Métricas profissionais
  const mesAnterior = MESES_LISTA[MESES_LISTA.findIndex(m2 => m2.v === mes) + 1]?.v
  const entradasMesAnterior = mesAnterior ? lancamentos.filter(l => l.mes === mesAnterior && l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0) : 0
  const crescimentoMoM = entradasMesAnterior > 0 ? ((entradas - entradasMesAnterior) / entradasMesAnterior) * 100 : 0

  const clientesAtivos = clientes.filter(c => c.status === 'ativo').length
  const clientesInativos = clientes.filter(c => c.status === 'inativo').length
  const totalClientesHist = clientesAtivos + clientesInativos
  const churnRate = totalClientesHist > 0 ? (clientesInativos / totalClientesHist) * 100 : 0

  // Ticket médio = receita ÷ nº pagamentos do mês
  const qtdPagamentos = doMes.filter(l => l.tipo === 'entrada').length
  const ticketMedio = qtdPagamentos > 0 ? entradas / qtdPagamentos : 0

  // LTV médio = ticket médio × tempo médio de retenção (estimado em meses ativos)
  const ltvMedio = ticketMedio * 12 // estimativa conservadora 12 meses

  // Gráfico 6 meses
  const dadosMeses = MESES_LISTA.map(m => {
    const doM = lancamentos.filter(l => l.mes === m.v)
    return {
      mes: m.l,
      entradas: doM.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0),
      saidas: doM.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0),
    }
  }).reverse()

  // Pizza categorias saída
  const catSaida: Record<string, number> = {}
  doMes.filter(l => l.tipo === 'saida').forEach(l => {
    catSaida[l.categoria] = (catSaida[l.categoria] || 0) + Number(l.valor)
  })
  const pizzaData = Object.entries(catSaida).sort((a,b) => b[1]-a[1]).slice(0,6).map(([name, value]) => ({ name, value }))

  // Saldos e limites
  // Se Nubank conectado via Pluggy usa saldo automático, senão usa o manual
  const saldoNubank  = pluggy?.saldoTotal ?? parseFloat(config.saldo_nubank || '0')
  const nubankAuto   = !!pluggy?.saldoTotal
  const limiteNubank = parseFloat(config.limite_cartao_nubank || '0')
  const saldoAsaas   = asaas?.saldo ?? 0

  return (
    <div style={{ maxWidth: '1400px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>{MESES_LISTA.find(m2 => m2.v === mes)?.l}</p>
        </div>
        <select value={mes} onChange={e => setMes(e.target.value)}
          style={{ border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', background: '#fff', fontWeight: 600 }}>
          {MESES_LISTA.map(m2 => <option key={m2.v} value={m2.v}>{m2.l}</option>)}
        </select>
      </div>

      {/* SALDOS E LIMITES — topo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '20px' }}>
        {/* Saldo Asaas */}
        <div style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: '14px', padding: '18px', color: '#fff' }}>
          <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 600, marginBottom: '6px' }}>💰 SALDO ASAAS</div>
          <div style={{ fontSize: '26px', fontWeight: 800 }}>{asaasLoading ? '...' : fmt(saldoAsaas)}</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Carteira disponível</div>
        </div>
        {/* Saldo Nubank */}
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius: '14px', padding: '18px', color: '#fff' }}>
          <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 600, marginBottom: '6px' }}>🟣 SALDO NUBANK</div>
          <div style={{ fontSize: '26px', fontWeight: 800 }}>{fmt(saldoNubank)}</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
            {nubankAuto ? '🔗 Open Finance (automático)' : 'Atualizado em Config.'}
          </div>
        </div>
        {/* Limite Cartão */}
        <div style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: '14px', padding: '18px', color: '#fff' }}>
          <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 600, marginBottom: '6px' }}>💳 LIMITE CARTÃO</div>
          <div style={{ fontSize: '26px', fontWeight: 800 }}>{fmt(limiteNubank)}</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Limite disponível Nubank</div>
        </div>
        {/* Previsão 30 dias */}
        <div style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', borderRadius: '14px', padding: '18px', color: '#fff' }}>
          <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 600, marginBottom: '6px' }}>📅 PREVISÃO 30 DIAS</div>
          <div style={{ fontSize: '26px', fontWeight: 800 }}>{asaasLoading ? '...' : fmt(asaas?.previsao?.dias30 ?? 0)}</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>{asaas?.previsao?.qtd30 || 0} cobranças pendentes</div>
        </div>
      </div>

      {/* KPIs do mês */}
      {!loading && (
        <>
          {/* KPIs principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '14px' }}>
            {[
              { label: 'Total Entradas', val: entradas, cor: '#16a34a', bg: '#f0fdf4', borda: '#16a34a' },
              { label: 'Total Saídas', val: saidas, cor: '#dc2626', bg: '#fef2f2', borda: '#dc2626' },
              { label: 'Resultado Líquido', val: resultado, cor: resultado >= 0 ? '#2563eb' : '#dc2626', bg: resultado >= 0 ? '#eff6ff' : '#fef2f2', borda: resultado >= 0 ? '#2563eb' : '#dc2626' },
              { label: 'MRR Asaas', val: asaas?.mrr ?? 0, cor: '#7c3aed', bg: '#f5f3ff', borda: '#7c3aed' },
            ].map((k, i) => (
              <div key={i} style={{ background: k.bg, borderLeft: `4px solid ${k.borda}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{k.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: k.cor }}>{fmt(k.val)}</div>
              </div>
            ))}
          </div>

          {/* KPIs profissionais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>📈 Crescimento MoM</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: crescimentoMoM >= 0 ? '#16a34a' : '#dc2626' }}>
                {crescimentoMoM >= 0 ? '+' : ''}{crescimentoMoM.toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>vs mês anterior</div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>🔄 Churn Rate</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: churnRate > 10 ? '#dc2626' : churnRate > 5 ? '#f59e0b' : '#16a34a' }}>
                {churnRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{clientesInativos} de {totalClientesHist} clientes</div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>🎯 Ticket Médio</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb' }}>{fmt(ticketMedio)}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{qtdPagamentos} pagamentos no mês</div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>💎 LTV Médio</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#7c3aed' }}>{fmt(ltvMedio)}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>estimativa 12 meses</div>
            </div>
          </div>

          {/* Meta + Alertas */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Meta vs Realizado */}
            {meta > 0 && (
              <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>🎯 Meta vs Realizado</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{MESES_LISTA.find(m2 => m2.v === mes)?.l}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '18px', color: metaPct >= 100 ? '#16a34a' : '#f59e0b' }}>{metaPct.toFixed(0)}%</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{fmt(entradas)} / {fmt(meta)}</div>
                  </div>
                </div>
                <div style={{ height: '12px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${metaPct}%`, background: metaPct >= 100 ? '#16a34a' : metaPct >= 70 ? '#f59e0b' : '#ef4444', borderRadius: '99px', transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                  <span>R$ 0</span>
                  <span style={{ color: meta - entradas > 0 ? '#ef4444' : '#16a34a', fontWeight: 600 }}>
                    {meta - entradas > 0 ? `Faltam ${fmt(meta - entradas)}` : `✅ Meta atingida! +${fmt(entradas - meta)}`}
                  </span>
                  <span>{fmt(meta)}</span>
                </div>
              </div>
            )}

            {/* Alertas */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '12px' }}>⚠️ Alertas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(asaas?.qtdVencidas ?? 0) > 0 && (
                  <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
                    🔴 {asaas.qtdVencidas} cobrança(s) vencida(s) — {fmt(asaas.totalVencido)}
                  </div>
                )}
                {meta > 0 && metaPct < 70 && (
                  <div style={{ background: '#fff7ed', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#ea580c', fontWeight: 600 }}>
                    🟠 Meta em risco — apenas {metaPct.toFixed(0)}% atingido
                  </div>
                )}
                {(asaas?.qtdPendentes ?? 0) > 0 && (
                  <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                    🟢 {asaas.qtdPendentes} pendente(s) — {fmt(asaas.totalPendente)} a receber
                  </div>
                )}
                {(asaas?.qtdVencidas ?? 0) === 0 && metaPct >= 100 && (
                  <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                    ✅ Tudo em dia! Meta atingida.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', marginBottom: '20px' }}>
            {/* Barras 6 meses */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '16px' }}>📈 Receita vs Despesa — Últimos 6 meses</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dadosMeses} barSize={18}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="#f87171" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Pizza categorias */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '8px' }}>🏷️ Gastos por Categoria</div>
              {pizzaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pizzaData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {pizzaData.map((_, i) => <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '13px' }}>Sem dados</div>}
            </div>
          </div>

          {/* Asaas: Cobranças + Assinaturas + Previsão */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>

            {/* Pendentes */}
            <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ background: '#fef3c7', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#92400e' }}>⏳ Cobranças Pendentes</span>
                <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>{asaas?.qtdPendentes ?? '...'}</span>
              </div>
              <div style={{ padding: '0 16px 8px' }}>
                <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>{asaasLoading ? '...' : fmt(asaas?.totalPendente ?? 0)}</div>
                {(asaas?.pendentes || []).slice(0, 5).map((p: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f9fafb', fontSize: '12px' }}>
                    <span style={{ color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>{p.cliente?.length > 20 ? p.cliente.slice(0, 20) + '...' : p.cliente}</span>
                    <span style={{ fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>{fmt(p.valor)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vencidas */}
            <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ background: '#fef2f2', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#991b1b' }}>🔴 Cobranças Vencidas</span>
                <span style={{ background: '#ef4444', color: '#fff', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>{asaas?.qtdVencidas ?? '...'}</span>
              </div>
              <div style={{ padding: '0 16px 8px' }}>
                <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>{asaasLoading ? '...' : fmt(asaas?.totalVencido ?? 0)}</div>
                {(asaas?.vencidas || []).slice(0, 5).map((p: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f9fafb', fontSize: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cliente?.slice(0, 20)}</div>
                      <div style={{ color: '#ef4444', fontSize: '11px' }}>{p.diasAtraso}d de atraso</div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap' }}>{fmt(p.valor)}</span>
                  </div>
                ))}
                {(asaas?.qtdVencidas ?? 0) === 0 && !asaasLoading && (
                  <div style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>✅ Nenhuma em atraso!</div>
                )}
              </div>
            </div>

            {/* Assinaturas */}
            <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ background: '#ede9fe', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#5b21b6' }}>🔄 Assinaturas Ativas</span>
                <span style={{ background: '#7c3aed', color: '#fff', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>{asaas?.qtdSubscricoes ?? '...'}</span>
              </div>
              <div style={{ padding: '0 16px 8px' }}>
                <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>MRR (Receita Recorrente)</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#7c3aed' }}>{asaasLoading ? '...' : fmt(asaas?.mrr ?? 0)}</div>
                </div>
                {(asaas?.subscricoes || []).slice(0, 5).map((s: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f9fafb', fontSize: '12px' }}>
                    <span style={{ color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>{s.descricao?.slice(0, 22)}</span>
                    <span style={{ fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap' }}>{fmt(s.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Previsão de Caixa + Top Clientes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>

            {/* Previsão */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '16px' }}>🔮 Previsão de Caixa</div>
              {[
                { label: '30 dias', val: asaas?.previsao?.dias30 ?? 0, cor: '#16a34a' },
                { label: '60 dias', val: asaas?.previsao?.dias60 ?? 0, cor: '#2563eb' },
                { label: '90 dias', val: asaas?.previsao?.dias90 ?? 0, cor: '#7c3aed' },
              ].map((p, i) => {
                const max = asaas?.previsao?.dias90 ?? 1
                return (
                  <div key={i} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Próximos {p.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: p.cor }}>{asaasLoading ? '...' : fmt(p.val)}</span>
                    </div>
                    <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${max > 0 ? (p.val/max)*100 : 0}%`, background: p.cor, borderRadius: '99px' }} />
                    </div>
                  </div>
                )
              })}
              <div style={{ marginTop: '8px', padding: '10px', background: '#f9fafb', borderRadius: '8px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                Baseado nas cobranças pendentes no Asaas
              </div>
            </div>

            {/* Top Clientes */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '16px' }}>🏆 Top Clientes por Receita</div>
              {asaasLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>Carregando...</div>
              ) : (
                <div>
                  {(asaas?.topClientes || []).map((c: any, i: number) => {
                    const max = asaas?.topClientes?.[0]?.total ?? 1
                    return (
                      <div key={i} style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', width: '18px' }}>#{i+1}</span>
                            <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{c.nome?.slice(0, 30)}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>{fmt(c.total)}</span>
                            <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '6px' }}>{c.qtd}x</span>
                          </div>
                        </div>
                        <div style={{ height: '5px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(c.total/max)*100}%`, background: i === 0 ? '#16a34a' : i === 1 ? '#2563eb' : i === 2 ? '#f59e0b' : '#94a3b8', borderRadius: '99px' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Consolidado final */}
          <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: '16px', padding: '24px', color: '#fff' }}>
            <h3 style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px', color: '#e0e7ff' }}>📊 Consolidado Geral — {MESES_LISTA.find(m2 => m2.v === mes)?.l}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px' }}>
              {[
                { l: 'Entradas', v: fmt(entradas), c: '#4ade80' },
                { l: 'Saídas', v: fmt(saidas), c: '#f87171' },
                { l: 'Resultado', v: fmt(resultado), c: resultado >= 0 ? '#60a5fa' : '#f87171' },
                { l: 'Margem', v: `${margem.toFixed(1)}%`, c: margem >= 20 ? '#4ade80' : margem >= 0 ? '#fbbf24' : '#f87171' },
                { l: 'MRR', v: asaasLoading ? '...' : fmt(asaas?.mrr ?? 0), c: '#c4b5fd' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>{item.l}</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: item.c }}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Carregando dados...</div>}
    </div>
  )
}
export const dynamic = 'force-dynamic'
