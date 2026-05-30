'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

type Categoria = { id: number; nome: string; tipo: 'entrada' | 'saida'; cor: string }

const CORES = ['#10b981','#3b82f6','#6366f1','#f59e0b','#ef4444','#8b5cf6','#0ea5e9','#f97316','#dc2626','#94a3b8']

export default function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'entrada', cor: '#10b981' })
  const [salvando, setSalvando] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: cats }, { data: lancs }] = await Promise.all([
      supabase.from('categorias').select('*').order('tipo').order('nome'),
      supabase.from('lancamentos').select('categoria,tipo,valor,mes'),
    ])
    setCategorias(cats || [])
    setLancamentos(lancs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    await supabase.from('categorias').insert([{ nome: form.nome.trim(), tipo: form.tipo, cor: form.cor }])
    setForm({ nome: '', tipo: 'entrada', cor: '#10b981' })
    setShowModal(false)
    setSalvando(false)
    load()
  }

  async function excluir(id: number, nome: string) {
    if (!confirm(`Excluir categoria "${nome}"?`)) return
    await supabase.from('categorias').delete().eq('id', id)
    load()
  }

  // Totais por categoria do mês atual
  const mesAtual = new Date().toISOString().slice(0, 7)
  const totaisPorCat: Record<string, number> = {}
  lancamentos.filter(l => l.mes === mesAtual).forEach(l => {
    totaisPorCat[l.categoria] = (totaisPorCat[l.categoria] || 0) + Number(l.valor)
  })

  const entrada = categorias.filter(c => c.tipo === 'entrada')
  const saida = categorias.filter(c => c.tipo === 'saida')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie as categorias de receitas e despesas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: '#4f46e5', color: '#fff', padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
        >
          + Nova Categoria
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Entradas */}
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 600, color: '#111827', margin: 0 }}>✅ Categorias de Entrada</h3>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>{entrada.length}</span>
            </div>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoria</th>
                  <th style={{ textAlign: 'right', padding: '10px 20px', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mês atual</th>
                  <th style={{ padding: '10px 12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {entrada.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>Nenhuma categoria de entrada</td></tr>
                ) : entrada.map(cat => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.cor, flexShrink: 0 }} />
                        <span style={{ color: '#374151', fontWeight: 500 }}>{cat.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                      {totaisPorCat[cat.nome] ? fmt(totaisPorCat[cat.nome]) : '—'}
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                      <button onClick={() => excluir(cat.id, cat.nome)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '16px' }} title="Excluir">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Saídas */}
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 600, color: '#111827', margin: 0 }}>❌ Categorias de Saída</h3>
              <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>{saida.length}</span>
            </div>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoria</th>
                  <th style={{ textAlign: 'right', padding: '10px 20px', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mês atual</th>
                  <th style={{ padding: '10px 12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {saida.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>Nenhuma categoria de saída</td></tr>
                ) : saida.map(cat => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.cor, flexShrink: 0 }} />
                        <span style={{ color: '#374151', fontWeight: 500 }}>{cat.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                      {totaisPorCat[cat.nome] ? fmt(totaisPorCat[cat.nome]) : '—'}
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                      <button onClick={() => excluir(cat.id, cat.nome)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '16px' }} title="Excluir">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal nova categoria */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '16px', margin: 0 }}>Nova Categoria</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af' }}>✕</button>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '5px' }}>Nome *</label>
              <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Ex: Aluguel, Serviços..." />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '5px' }}>Tipo *</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                <option value="entrada">✅ Entrada (Receita)</option>
                <option value="saida">❌ Saída (Despesa)</option>
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>Cor</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CORES.map(c => (
                  <div key={c} onClick={() => setForm({ ...form, cor: c })}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.cor === c ? '3px solid #111827' : '2px solid transparent', transition: 'border 0.1s' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.nome.trim()}
                style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: (!form.nome.trim() || salvando) ? 0.5 : 1 }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export const dynamic = 'force-dynamic'
