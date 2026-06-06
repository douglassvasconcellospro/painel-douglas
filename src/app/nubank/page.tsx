'use client'
import { useEffect, useState } from 'react'
import { supabase, Lancamento } from '@/lib/supabase'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

const fmt  = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtK = (v: number) => v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v.toFixed(0)}`

import { gerarMeses, MES_ATUAL } from '@/lib/meses'
const MESES = gerarMeses(6)
const CORES = ['#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#06b6d4','#84cc16']

import { KEYWORDS_ASSINATURA } from '@/app/importar/page'

export default function NubankPage() {
  const [lancamentos, setLancamentos]   = useState<Lancamento[]>([])
  const [config, setConfig]             = useState<Record<string, string>>({})
  const [pluggy, setPluggy]             = useState<any>(null)
  const [loading, setLoading]           = useState(true)
  const [mes, setMes]                   = useState(MES_ATUAL)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: lancs }, { data: cfgs }] = await Promise.all([
        supabase.from('lancamentos').select('*').order('data', { ascending: false }),
        supabase.from('configuracoes').select('chave,valor'),
      ])
      setLancamentos(lancs || [])
      const map: Record<string, string> = {}
      for (const c of (cfgs || [])) map[c.chave] = c.valor || ''
      setConfig(map)

      // Pluggy se conectado
      const itemId = map.pluggy_nubank_item_id
      if (itemId) {
        try {
          const r = await fetch(`/api/pluggy/accounts?itemId=${itemId}`)
          if (r.ok) setPluggy(await r.json())
        } catch {}
      }
      setLoading(false)
    }
    load()
  }, [])

  // Lançamentos Nubank do mês selecionado
  const nubankMes  = lancamentos.filter(l => l.banco?.toLowerCase().includes('nubank') && l.mes === mes)
  const saidas     = nubankMes.filter(l => l.tipo === 'saida')
  const entradas   = nubankMes.filter(l => l.tipo === 'entrada')
  const totalSaida = saidas.reduce((s, l)  => s + Number(l.valor), 0)
  const totalEntra = entradas.reduce((s, l) => s + Number(l.valor), 0)

  // Assinaturas = categoria 'Assinaturas' OU keywords na descrição (compatível com dados antigos)
  const todasSaidasNubank = lancamentos.filter(l =>
    l.banco?.toLowerCase().includes('nubank') && l.tipo === 'saida'
  )
  const isAssinatura = (l: any) => {
    if (l.categoria === 'Assinaturas') return true
    const desc = (l.descricao || '').toLowerCase()
    return KEYWORDS_ASSINATURA.some(k => desc.includes(k))
  }
  const todasAssinaturas = todasSaidasNubank.filter(isAssinatura)

  // Agrupa por keyword/serviço identificado
  const assinaturaMap: Record<string, { total: number; vezes: number; ultima: string; keyword: string }> = {}
  todasAssinaturas.forEach(l => {
    const desc = (l.descricao || '').toLowerCase()
    const kw = KEYWORDS_ASSINATURA.find(k => desc.includes(k)) || (l.descricao || '').split(' ')[0].toLowerCase()
    if (!assinaturaMap[kw]) assinaturaMap[kw] = { total: 0, vezes: 0, ultima: '', keyword: kw }
    assinaturaMap[kw].total += Number(l.valor)
    assinaturaMap[kw].vezes += 1
    if (!assinaturaMap[kw].ultima || (l.data || '') > assinaturaMap[kw].ultima) {
      assinaturaMap[kw].ultima = l.data || ''
    }
  })
  const assinaturas: { nome: string; total: number; vezes: number; ultima: string }[] =
    Object.entries(assinaturaMap)
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.total - a.total)

  // Gastos por categoria do mês
  const catMap: Record<string, number> = {}
  saidas.forEach(l => { catMap[l.categoria || 'Outros'] = (catMap[l.categoria || 'Outros'] || 0) + Number(l.valor) })
  const pizzaData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([name, value]) => ({ name, value }))

  // Evolução de gastos por mês
  const evolucao = MESES.map(m => ({
    mes: m.l.split(' ')[0],
    gastos: lancamentos.filter(l => l.banco?.toLowerCase().includes('nubank') && l.tipo === 'saida' && l.mes === m.v).reduce((s, l) => s + Number(l.valor), 0),
    receitas: lancamentos.filter(l => l.banco?.toLowerCase().includes('nubank') && l.tipo === 'entrada' && l.mes === m.v).reduce((s, l) => s + Number(l.valor), 0),
  })).reverse()

  const saldoConta  = pluggy?.saldoTotal ?? parseFloat(config.saldo_nubank || '0')
  const limiteCartao = parseFloat(config.limite_cartao_nubank || '0')
  const pluggyAuto  = !!pluggy?.saldoTotal

  const totalAssinaturasMes = assinaturas.reduce((s, a) => s + (a.total / a.vezes), 0)

  if (loading) return <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>Carregando...</div>

  return (
    <div style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
            🟣 Nubank — Finanças Pessoais
          </h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '3px' }}>
            Conta corrente, cartão, assinaturas e gastos pessoais
            {pluggyAuto && <span style={{ marginLeft: '8px', background: '#f3e8ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 600 }}>🔗 Open Finance ativo</span>}
          </p>
        </div>
        <select value={mes} onChange={e => setMes(e.target.value)}
          style={{ border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', background: '#fff', fontWeight: 600 }}>
          {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius: '14px', padding: '18px', color: '#fff' }}>
          <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 600, marginBottom: '6px' }}>💳 SALDO CONTA</div>
          <div style={{ fontSize: '26px', fontWeight: 800 }}>{fmt(saldoConta)}</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>{pluggyAuto ? 'Open Finance (automático)' : 'Atualizado em Configurações'}</div>
        </div>
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>💸 Gastos no Mês</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626' }}>{fmt(totalSaida)}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{saidas.length} transações</div>
        </div>
        <div style={{ background: '#f0fdf4', borderLeft: '4px solid #16a34a', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>💰 Entradas no Mês</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a' }}>{fmt(totalEntra)}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{entradas.length} transações</div>
        </div>
        <div style={{ background: '#faf5ff', borderLeft: '4px solid #7c3aed', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>🔄 Assinaturas/mês</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#7c3aed' }}>{fmt(totalAssinaturasMes)}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{assinaturas.length} serviços identificados</div>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '16px' }}>📊 Gastos vs Receitas — Últimos 6 meses</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={evolucao} barSize={16}>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Bar dataKey="gastos"   name="Gastos"   fill="#dc2626" radius={[4,4,0,0]} />
              <Bar dataKey="receitas" name="Receitas" fill="#16a34a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '8px' }}>🏷️ Gastos por Categoria</div>
          {pizzaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pizzaData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                  {pizzaData.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '13px' }}>Nenhum dado no mês</div>}
        </div>
      </div>

      {/* Assinaturas + Últimos lançamentos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Assinaturas */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '16px' }}>🔄 Assinaturas Identificadas</div>
          {assinaturas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '13px' }}>
              Importe seu extrato Nubank para identificar assinaturas
            </div>
          ) : assinaturas.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{a.nome}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{a.vezes}x no histórico · última: {a.ultima}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#7c3aed' }}>{fmt(a.total / a.vezes)}<span style={{ fontSize: '10px', fontWeight: 400, color: '#9ca3af' }}>/mês</span></div>
              </div>
            </div>
          ))}
          {assinaturas.length > 0 && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#faf5ff', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>Total mensal estimado</span>
              <span style={{ fontWeight: 800, color: '#7c3aed' }}>{fmt(totalAssinaturasMes)}</span>
            </div>
          )}
        </div>

        {/* Últimos lançamentos */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '16px' }}>
            📋 Últimos Lançamentos Nubank — {MESES.find(m => m.v === mes)?.l}
          </div>
          {nubankMes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '13px' }}>
              Nenhum lançamento Nubank neste mês.<br/>
              <span style={{ fontSize: '12px' }}>Importe seu extrato em "Importar Extrato"</span>
            </div>
          ) : nubankMes.slice(0, 10).map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.descricao}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{l.data} · {l.categoria}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: l.tipo === 'entrada' ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                {l.tipo === 'entrada' ? '+' : '-'}{fmt(Number(l.valor))}
              </div>
            </div>
          ))}
          {nubankMes.length > 10 && (
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '10px' }}>
              +{nubankMes.length - 10} mais em Lançamentos
            </div>
          )}
        </div>
      </div>

      {/* Limite cartão */}
      {limiteCartao > 0 && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: '24px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '12px' }}>💳 Cartão Nubank</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Limite total</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#7c3aed' }}>{fmt(limiteCartao)}</div>
            </div>
            <div style={{ fontSize: '24px', color: '#e5e7eb' }}>|</div>
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Usado no mês</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>{fmt(totalSaida)}</div>
            </div>
            <div style={{ fontSize: '24px', color: '#e5e7eb' }}>|</div>
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Disponível estimado</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>{fmt(Math.max(0, limiteCartao - totalSaida))}</div>
            </div>
            <div style={{ flex: 1, marginLeft: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: '#9ca3af' }}>
                <span>Uso do limite</span>
                <span>{limiteCartao > 0 ? Math.min(100, (totalSaida / limiteCartao * 100)).toFixed(0) : 0}%</span>
              </div>
              <div style={{ height: '10px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${limiteCartao > 0 ? Math.min(100, totalSaida / limiteCartao * 100) : 0}%`, background: totalSaida / limiteCartao > 0.8 ? '#dc2626' : '#7c3aed', borderRadius: '99px', transition: 'width .5s' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aviso Pluggy */}
      {!pluggyAuto && (
        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>🔗</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#7c3aed' }}>Conecte o Nubank via Open Finance para dados automáticos</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Vá em Configurações → Conectar Nubank para ativar saldo e extrato em tempo real</div>
          </div>
        </div>
      )}
    </div>
  )
}
export const dynamic = 'force-dynamic'
