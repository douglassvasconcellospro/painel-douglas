'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const MESES_CONFIG = [
  { key: 'meta_jan', label: 'Janeiro', v: '2026-01' },
  { key: 'meta_fev', label: 'Fevereiro', v: '2026-02' },
  { key: 'meta_mar', label: 'Março', v: '2026-03' },
  { key: 'meta_abr', label: 'Abril', v: '2026-04' },
  { key: 'meta_mai', label: 'Maio', v: '2026-05' },
  { key: 'meta_jun', label: 'Junho', v: '2026-06' },
  { key: 'meta_jul', label: 'Julho', v: '2026-07' },
  { key: 'meta_ago', label: 'Agosto', v: '2026-08' },
  { key: 'meta_set', label: 'Setembro', v: '2026-09' },
  { key: 'meta_out', label: 'Outubro', v: '2026-10' },
  { key: 'meta_nov', label: 'Novembro', v: '2026-11' },
  { key: 'meta_dez', label: 'Dezembro', v: '2026-12' },
]

export default function Metas() {
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: lancs }, { data: metas }] = await Promise.all([
        supabase.from('lancamentos').select('mes,tipo,valor'),
        supabase.from('metas').select('*').eq('ano', 2026).single(),
      ])
      setLancamentos(lancs || [])
      setMeta(metas)
      if (metas) {
        const f: Record<string, string> = { meta_anual: String(metas.meta_anual) }
        MESES_CONFIG.forEach(m => { f[m.key] = String(metas[m.key] || 0) })
        setForm(f)
      }
      setLoading(false)
    }
    load()
  }, [])

  function distribuirIgual() {
    const anual = parseFloat(form.meta_anual || '0')
    const mensal = (anual / 12).toFixed(2)
    const novo = { ...form }
    MESES_CONFIG.forEach(m => { novo[m.key] = mensal })
    setForm(novo)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const payload: any = { ano: 2026, meta_anual: parseFloat(form.meta_anual || '0'), updated_at: new Date().toISOString() }
    MESES_CONFIG.forEach(m => { payload[m.key] = parseFloat(form[m.key] || '0') })
    await supabase.from('metas').upsert([payload], { onConflict: 'ano' })
    setSucesso(true)
    setTimeout(() => setSucesso(false), 3000)
    setSalvando(false)
  }

  const realizado = (mesV: string) => lancamentos.filter(l => l.mes === mesV && l.tipo === 'entrada').reduce((s: number, l: any) => s + Number(l.valor), 0)
  const totalRealizado = MESES_CONFIG.reduce((s, m) => s + realizado(m.v), 0)
  const totalMeta = MESES_CONFIG.reduce((s, m) => s + parseFloat(form[m.key] || '0'), 0)
  const mesAtual = new Date().toISOString().slice(0, 7)
  const projecaoAnual = (() => {
    const mesesPassados = MESES_CONFIG.filter(m => m.v <= mesAtual).length
    if (mesesPassados === 0) return 0
    return (totalRealizado / mesesPassados) * 12
  })()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>Metas Anuais — 2026</h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>Defina e acompanhe suas metas mês a mês</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Carregando...</div>
      ) : (
        <>
          {/* Cards de resumo anual */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: '🎯 Meta Anual', val: parseFloat(form.meta_anual || '0'), cor: '#4f46e5', bg: '#f5f3ff' },
              { label: '✅ Realizado Ano', val: totalRealizado, cor: '#16a34a', bg: '#f0fdf4' },
              { label: '📈 Projeção Anual', val: projecaoAnual, cor: projecaoAnual >= parseFloat(form.meta_anual || '0') ? '#16a34a' : '#f59e0b', bg: '#fff7ed' },
              { label: '📊 % Atingido', val: null, texto: `${totalMeta > 0 ? ((totalRealizado / totalMeta) * 100).toFixed(1) : 0}%`, cor: totalRealizado >= totalMeta ? '#16a34a' : '#f59e0b', bg: '#f9fafb' },
            ].map((k, i) => (
              <div key={i} style={{ background: k.bg, borderRadius: '14px', padding: '18px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>{k.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: k.cor }}>{k.val !== null ? fmt(k.val!) : k.texto}</div>
              </div>
            ))}
          </div>

          {/* Barra geral */}
          <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>Progresso Anual</span>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>{fmt(totalRealizado)} de {fmt(parseFloat(form.meta_anual || '0'))}</span>
            </div>
            <div style={{ height: '14px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(totalMeta > 0 ? (totalRealizado/totalMeta)*100 : 0, 100)}%`, background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', borderRadius: '99px', transition: 'width 0.5s' }} />
            </div>
            {projecaoAnual > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: projecaoAnual >= parseFloat(form.meta_anual || '0') ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>
                {projecaoAnual >= parseFloat(form.meta_anual || '0')
                  ? `✅ No ritmo atual, vai fechar o ano com ${fmt(projecaoAnual)}`
                  : `⚠️ No ritmo atual, vai fechar com ${fmt(projecaoAnual)} (${fmt(parseFloat(form.meta_anual || '0') - projecaoAnual)} abaixo da meta)`}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Tabela de metas por mês */}
            <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>📅 Meta vs Realizado por Mês</div>
              </div>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Mês</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Meta</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Realizado</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MESES_CONFIG.map(m => {
                    const metaM = parseFloat(form[m.key] || '0')
                    const realM = realizado(m.v)
                    const isFuturo = m.v > mesAtual
                    const pctM = metaM > 0 ? (realM / metaM) * 100 : 0
                    return (
                      <tr key={m.v} style={{ borderBottom: '1px solid #f9fafb', background: m.v === mesAtual ? '#fafaf9' : '#fff' }}>
                        <td style={{ padding: '10px 16px', fontWeight: m.v === mesAtual ? 700 : 400, color: '#374151' }}>
                          {m.label} {m.v === mesAtual && <span style={{ fontSize: '10px', background: '#4f46e5', color: '#fff', padding: '1px 6px', borderRadius: '99px', marginLeft: '4px' }}>atual</span>}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6b7280' }}>{fmt(metaM)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: isFuturo ? '#d1d5db' : realM >= metaM ? '#16a34a' : '#374151' }}>
                          {isFuturo ? '—' : fmt(realM)}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          {isFuturo ? (
                            <span style={{ fontSize: '11px', color: '#d1d5db' }}>futuro</span>
                          ) : realM >= metaM ? (
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>✅ {pctM.toFixed(0)}%</span>
                          ) : (
                            <span style={{ background: pctM >= 70 ? '#fef9c3' : '#fef2f2', color: pctM >= 70 ? '#92400e' : '#dc2626', padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>{pctM.toFixed(0)}%</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Form de edição */}
            <form onSubmit={salvar} style={{ background: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginBottom: '16px' }}>✏️ Editar Metas</div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: '5px' }}>Meta Anual Total</label>
                <input type="number" value={form.meta_anual || ''} onChange={e => setForm({ ...form, meta_anual: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #4f46e5', borderRadius: '8px', fontSize: '16px', fontWeight: 700, outline: 'none', boxSizing: 'border-box', color: '#4f46e5' }} />
              </div>

              <button type="button" onClick={distribuirIgual}
                style={{ width: '100%', padding: '8px', background: '#f5f3ff', color: '#4f46e5', border: '1px dashed #7c3aed', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}>
                📐 Distribuir igualmente por mês
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {MESES_CONFIG.map(m => (
                  <div key={m.key}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#9ca3af', marginBottom: '3px' }}>{m.label}</label>
                    <input type="number" value={form[m.key] || ''} onChange={e => setForm({ ...form, [m.key]: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>

              {sucesso && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
                  ✅ Metas salvas!
                </div>
              )}

              <button type="submit" disabled={salvando}
                style={{ width: '100%', padding: '12px', background: salvando ? '#c7d2fe' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer' }}>
                {salvando ? '⏳ Salvando...' : '💾 Salvar Metas'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
export const dynamic = 'force-dynamic'
