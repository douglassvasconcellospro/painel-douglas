'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { gerarMeses } from '@/lib/meses'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const MESES = gerarMeses(6)

type Fechamento = {
  mes: string; mes_label: string; status: 'aberto' | 'fechado'
  entradas: number; saidas: number; resultado: number
  margem: number; qtd_lancamentos: number; fechado_em?: string; observacoes?: string
}

export default function Fechamentos() {
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [fechamentos, setFechamentos] = useState<Record<string, Fechamento>>({})
  const [loading, setLoading] = useState(true)
  const [fechando, setFechando] = useState('')
  const [modalObs, setModalObs] = useState<{ mes: string; label: string } | null>(null)
  const [obs, setObs] = useState('')

  async function load() {
    setLoading(true)
    const [{ data: lancs }, { data: fechs }] = await Promise.all([
      supabase.from('lancamentos').select('*'),
      supabase.from('fechamentos').select('*'),
    ])
    setLancamentos(lancs || [])
    const map: Record<string, Fechamento> = {}
    for (const f of (fechs || [])) map[f.mes] = f
    setFechamentos(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function calcularMes(mes: string, label: string) {
    const doMes = lancamentos.filter(l => l.mes === mes)
    const entradas = doMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
    const saidas = doMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
    const resultado = entradas - saidas
    const margem = entradas > 0 ? parseFloat(((resultado / entradas) * 100).toFixed(2)) : 0
    return { mes, mes_label: label, entradas, saidas, resultado, margem, qtd_lancamentos: doMes.length }
  }

  async function fecharMes(mes: string, label: string) {
    setFechando(mes)
    const dados = calcularMes(mes, label)
    const payload = {
      ...dados,
      status: 'fechado',
      fechado_em: new Date().toISOString(),
      observacoes: obs || null,
    }
    await supabase.from('fechamentos').upsert([payload], { onConflict: 'mes' })
    setModalObs(null)
    setObs('')
    setFechando('')
    load()
  }

  async function reabrirMes(mes: string) {
    if (!confirm('Reabrir este mês? Os dados serão editáveis novamente.')) return
    await supabase.from('fechamentos').update({ status: 'aberto', fechado_em: null }).eq('mes', mes)
    load()
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Fechamentos Mensais</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Feche cada mês para salvar permanentemente o resumo financeiro</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Carregando...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                {['Mês','Lançamentos','Entradas','Saídas','Resultado','Margem','Status',''].map(h => (
                  <th key={h} style={{ textAlign: h === '' || h === 'Status' ? 'center' : 'left', padding: '12px 20px', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MESES.map(({ v, l }) => {
                const saved = fechamentos[v]
                const calc = calcularMes(v, l)
                const dados = saved || calc
                const isFechado = saved?.status === 'fechado'
                const temDados = calc.qtd_lancamentos > 0

                return (
                  <tr key={v} style={{ borderBottom: '1px solid #f9fafb', background: isFechado ? '#f8fafc' : '#fff' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#111827' }}>{l}</td>
                    <td style={{ padding: '14px 20px', color: '#6b7280' }}>{dados.qtd_lancamentos}</td>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#16a34a' }}>{fmt(dados.entradas)}</td>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#dc2626' }}>{fmt(dados.saidas)}</td>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: dados.resultado >= 0 ? '#2563eb' : '#dc2626' }}>{fmt(dados.resultado)}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
                        background: parseFloat(String(dados.margem)) >= 20 ? '#dcfce7' : parseFloat(String(dados.margem)) >= 0 ? '#fef9c3' : '#fee2e2',
                        color: parseFloat(String(dados.margem)) >= 20 ? '#15803d' : parseFloat(String(dados.margem)) >= 0 ? '#92400e' : '#dc2626',
                      }}>
                        {Number(dados.margem).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      {isFechado ? (
                        <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>🔒 Fechado</span>
                      ) : (
                        <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>🔓 Aberto</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      {isFechado ? (
                        <button onClick={() => reabrirMes(v)}
                          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', color: '#6b7280' }}>
                          Reabrir
                        </button>
                      ) : temDados ? (
                        <button onClick={() => setModalObs({ mes: v, label: l })}
                          disabled={fechando === v}
                          style={{ background: '#4f46e5', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
                          {fechando === v ? '⏳' : '🔒 Fechar mês'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#d1d5db' }}>Sem dados</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal observação ao fechar */}
      {modalObs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
          onClick={e => e.target === e.currentTarget && setModalObs(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '400px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>🔒 Fechar {modalObs.label}?</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>O resumo será salvo permanentemente. Você pode reabrir depois se necessário.</p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '5px' }}>Observações (opcional)</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                placeholder="Ex: Meta batida, pendências, notas do mês..."
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalObs(null)} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
              <button onClick={() => fecharMes(modalObs.mes, modalObs.label)}
                style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export const dynamic = 'force-dynamic'
