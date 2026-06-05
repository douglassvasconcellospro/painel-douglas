'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

type Cliente = {
  id: number; nome: string; email?: string; telefone?: string
  status: string; origem?: string; plano?: string; valor_mensalidade?: number
  data_inicio?: string; data_renovacao?: string; modalidade?: string
  nivel?: string; objetivo?: string; indicado_por?: string
  historico_pagamento?: string; forma_pagamento?: string; cpf?: string
  frequencia_semana?: number; observacoes?: string
}

const nivelBadge: Record<string, { label: string; bg: string; cor: string }> = {
  iniciante:    { label: 'Iniciante',    bg: '#dcfce7', cor: '#15803d' },
  intermediario:{ label: 'Intermediário',bg: '#fef9c3', cor: '#92400e' },
  avancado:     { label: 'Avançado',     bg: '#fef2f2', cor: '#dc2626' },
}

const modalidadeIcon: Record<string, string> = {
  online: '🌐', presencial: '🏋️', hibrido: '🔀',
}

const historicoCor: Record<string, string> = {
  bom: '#16a34a', atrasa: '#f59e0b', problematico: '#dc2626',
}

const historicoLabel: Record<string, string> = {
  bom: '✅ Bom pagador', atrasa: '⚠️ Atrasa', problematico: '❌ Problemático',
}

const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 600 as const, color: '#6b7280', marginBottom: '4px' }

function CardCliente({ c, onEditar, onExcluir }: {
  c: Cliente
  onEditar: (c: Cliente) => void
  onExcluir: (id: number) => void
}) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f3f4f6' }}>
      {/* Nome e badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {c.modalidade && <span style={{ fontSize: '11px' }}>{modalidadeIcon[c.modalidade] || '?'} {c.modalidade}</span>}
            {c.nivel && nivelBadge[c.nivel] && (
              <span style={{ background: nivelBadge[c.nivel].bg, color: nivelBadge[c.nivel].cor, fontSize: '10px', fontWeight: 600, padding: '1px 7px', borderRadius: '99px' }}>
                {nivelBadge[c.nivel].label}
              </span>
            )}
          </div>
        </div>
        {c.valor_mensalidade ? (
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a' }}>{fmt(c.valor_mensalidade)}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>/ mês</div>
          </div>
        ) : null}
      </div>

      {/* Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
        {c.email    && <div style={{ fontSize: '12px', color: '#6b7280' }}>📧 {c.email}</div>}
        {c.telefone && <div style={{ fontSize: '12px', color: '#6b7280' }}>📱 {c.telefone}</div>}
        {c.objetivo && <div style={{ fontSize: '12px', color: '#6b7280' }}>🎯 {c.objetivo}</div>}
        {c.indicado_por && <div style={{ fontSize: '12px', color: '#6b7280' }}>👤 Indicado por: {c.indicado_por}</div>}
        {c.frequencia_semana && <div style={{ fontSize: '12px', color: '#6b7280' }}>📅 {c.frequencia_semana}x por semana</div>}
        {c.data_inicio && <div style={{ fontSize: '12px', color: '#6b7280' }}>🗓 Desde {c.data_inicio}</div>}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '8px', gap: '6px' }}>
        {c.historico_pagamento && (
          <span style={{ fontSize: '11px', fontWeight: 600, color: historicoCor[c.historico_pagamento] || '#6b7280' }}>
            {historicoLabel[c.historico_pagamento] || c.historico_pagamento}
          </span>
        )}
        {c.origem === 'asaas' && (
          <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '99px', fontWeight: 600 }}>Asaas</span>
        )}
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          <button onClick={() => onEditar(c)}
            style={{ background: '#eff6ff', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
            ✏️ Editar
          </button>
          <button onClick={() => onExcluir(c.id)}
            style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: '12px', padding: '4px' }}>
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}

const formVazio = {
  nome: '', email: '', telefone: '', cpf: '',
  status: 'lead', origem: 'manual', plano: '', valor_mensalidade: '',
  data_inicio: '', data_renovacao: '',
  modalidade: 'online', nivel: 'iniciante',
  frequencia_semana: '1', objetivo: '',
  indicado_por: '', historico_pagamento: 'bom',
  forma_pagamento: 'pix', observacoes: '',
}

export default function Clientes() {
  const [clientes, setClientes]     = useState<Cliente[]>([])
  const [loading, setLoading]       = useState(true)
  const [busca, setBusca]           = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMsg, setSyncMsg]       = useState('')
  const [form, setForm]             = useState(formVazio)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function abrirNovo() {
    setEditandoId(null)
    setForm(formVazio)
    setShowModal(true)
  }

  function abrirEditar(c: Cliente) {
    setEditandoId(c.id)
    setForm({
      nome:               c.nome || '',
      email:              c.email || '',
      telefone:           c.telefone || '',
      cpf:                c.cpf || '',
      status:             c.status || 'lead',
      origem:             c.origem || 'manual',
      plano:              c.plano || '',
      valor_mensalidade:  c.valor_mensalidade?.toString() || '',
      data_inicio:        c.data_inicio || '',
      data_renovacao:     c.data_renovacao || '',
      modalidade:         c.modalidade || 'online',
      nivel:              c.nivel || 'iniciante',
      frequencia_semana:  c.frequencia_semana?.toString() || '1',
      objetivo:           c.objetivo || '',
      indicado_por:       c.indicado_por || '',
      historico_pagamento:c.historico_pagamento || 'bom',
      forma_pagamento:    c.forma_pagamento || 'pix',
      observacoes:        c.observacoes || '',
    })
    setShowModal(true)
  }

  function fecharModal() {
    setShowModal(false)
    setEditandoId(null)
    setForm(formVazio)
  }

  async function syncAsaas() {
    setSyncLoading(true); setSyncMsg('')
    const res = await fetch('/api/asaas/clientes', { method: 'POST' })
    const data = await res.json()
    if (data.error) {
      setSyncMsg(`❌ ${data.error}`)
    } else {
      setSyncMsg(data.sincronizados === 0
        ? `✅ ${data.mensagem || 'Todos já estão no sistema'}`
        : `✅ ${data.sincronizados} importados: ${data.ativos} ativos, ${data.leadsAntigos} inativos. ${data.atualizados} atualizados.`
      )
      load()
    }
    setSyncLoading(false)
    setTimeout(() => setSyncMsg(''), 6000)
  }

  async function salvar() {
    if (!form.nome) return
    const dados = {
      nome:               form.nome,
      email:              form.email || null,
      telefone:           form.telefone || null,
      cpf:                form.cpf || null,
      status:             form.status,
      plano:              form.plano || null,
      valor_mensalidade:  form.valor_mensalidade ? parseFloat(form.valor_mensalidade) : null,
      data_inicio:        form.data_inicio || null,
      data_renovacao:     form.data_renovacao || null,
      modalidade:         form.modalidade,
      nivel:              form.nivel,
      frequencia_semana:  parseInt(form.frequencia_semana) || 1,
      objetivo:           form.objetivo || null,
      indicado_por:       form.indicado_por || null,
      historico_pagamento:form.historico_pagamento,
      forma_pagamento:    form.forma_pagamento,
      observacoes:        form.observacoes || null,
    }

    if (editandoId !== null) {
      await supabase.from('clientes').update(dados).eq('id', editandoId)
    } else {
      await supabase.from('clientes').insert([{ ...dados, origem: 'manual' }])
    }

    fecharModal()
    load()
  }

  async function excluir(id: number) {
    if (!confirm('Excluir este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    load()
  }

  const filtrar = (lista: Cliente[]) => lista.filter(c =>
    !busca ||
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.email?.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone?.includes(busca)
  )

  const ativos    = filtrar(clientes.filter(c => c.status === 'ativo'))
  const inativos  = filtrar(clientes.filter(c => c.status === 'inativo'))
  const leadsNovos= filtrar(clientes.filter(c => c.status !== 'ativo' && c.status !== 'inativo'))

  const mrr = ativos.reduce((s, c) => s + (c.valor_mensalidade || 0), 0)
  const mrrPerdido = inativos.reduce((s, c) => s + (c.valor_mensalidade || 0), 0)

  const colHeader = (emoji: string, titulo: string, desc: string, count: number, bg: string, border: string, cor: string, corBadge: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', padding: '10px 14px', background: bg, borderRadius: '10px', border: `1px solid ${border}` }}>
      <span style={{ fontSize: '16px' }}>{emoji}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: cor }}>{titulo}</div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>{desc}</div>
      </div>
      <span style={{ marginLeft: 'auto', background: corBadge, color: '#fff', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>{count}</span>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>Clientes & Leads</h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '3px' }}>Gestão dos seus clientes em 3 grupos</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={syncAsaas} disabled={syncLoading}
            style={{ background: syncLoading ? '#d1fae5' : '#16a34a', color: '#fff', padding: '9px 16px', borderRadius: '9px', border: 'none', cursor: syncLoading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600 }}>
            {syncLoading ? '⏳ Sincronizando...' : '🟢 Sincronizar Asaas'}
          </button>
          <button onClick={abrirNovo}
            style={{ background: '#4f46e5', color: '#fff', padding: '9px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            + Lead Novo
          </button>
        </div>
      </div>

      {syncMsg && (
        <div style={{ background: syncMsg.startsWith('❌') ? '#fef2f2' : '#f0fdf4', border: `1px solid ${syncMsg.startsWith('❌') ? '#fecaca' : '#bbf7d0'}`, borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: syncMsg.startsWith('❌') ? '#dc2626' : '#15803d', fontWeight: 600 }}>
          {syncMsg}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: '#f0fdf4', borderLeft: '4px solid #16a34a', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Clientes Ativos</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a' }}>{ativos.length}</div>
        </div>
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Clientes Inativos</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626' }}>{inativos.length}</div>
          {mrrPerdido > 0 && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>- {fmt(mrrPerdido)}/mês</div>}
        </div>
        <div style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Leads Novos</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563eb' }}>{leadsNovos.length}</div>
        </div>
        <div style={{ background: '#f5f3ff', borderLeft: '4px solid #7c3aed', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>MRR</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#7c3aed' }}>{fmt(mrr)}</div>
        </div>
      </div>

      {/* Busca */}
      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar por nome, email ou telefone..."
        style={{ width: '100%', padding: '10px 16px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', outline: 'none', marginBottom: '24px', boxSizing: 'border-box', background: '#fff' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', alignItems: 'start' }}>

          {/* 🟢 Clientes Ativos */}
          <div>
            {colHeader('🟢', 'Clientes Ativos', 'Assinatura ativa no Asaas', ativos.length, '#f0fdf4', '#bbf7d0', '#15803d', '#16a34a')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ativos.length === 0
                ? <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '13px', background: '#fff', borderRadius: '10px' }}>Nenhum cliente ativo</div>
                : ativos.map(c => <CardCliente key={c.id} c={c} onEditar={abrirEditar} onExcluir={excluir} />)}
            </div>
          </div>

          {/* 🔴 Clientes Inativos */}
          <div>
            {colHeader('🔴', 'Clientes Inativos', 'Sem cobrança ativa nem assinatura recorrente', inativos.length, '#fef2f2', '#fecaca', '#b91c1c', '#dc2626')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inativos.length === 0
                ? <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '13px', background: '#fff', borderRadius: '10px' }}>Nenhum cliente inativo. Sincronize o Asaas para atualizar.</div>
                : inativos.map(c => <CardCliente key={c.id} c={c} onEditar={abrirEditar} onExcluir={excluir} />)}
            </div>
          </div>

          {/* 🔵 Leads Novos */}
          <div>
            {colHeader('🔵', 'Leads Novos', 'Prospectos — ainda não são clientes', leadsNovos.length, '#eff6ff', '#bfdbfe', '#1d4ed8', '#2563eb')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {leadsNovos.length === 0
                ? <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '13px', background: '#fff', borderRadius: '10px' }}>Clique em "+ Lead Novo" para adicionar</div>
                : leadsNovos.map(c => <CardCliente key={c.id} c={c} onEditar={abrirEditar} onExcluir={excluir} />)}
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo / Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
          onClick={e => e.target === e.currentTarget && fecharModal()}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '680px', padding: '28px', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '18px', margin: 0 }}>
                {editandoId !== null ? '✏️ Editar Cliente' : '🔵 Novo Lead'}
              </h3>
              <button onClick={fecharModal} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Bloco 1 — Identificação */}
              <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '12px' }}>👤 Identificação</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>Nome completo *</label>
                    <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} style={inputStyle} placeholder="Nome completo" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Telefone / WhatsApp</label>
                    <input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} style={inputStyle} placeholder="(11) 99999-0000" />
                  </div>
                  <div>
                    <label style={labelStyle}>Indicado por</label>
                    <input value={form.indicado_por} onChange={e => setForm({...form, indicado_por: e.target.value})} style={inputStyle} placeholder="Quem indicou?" />
                  </div>
                  <div>
                    <label style={labelStyle}>CPF</label>
                    <input value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} style={inputStyle} placeholder="000.000.000-00" />
                  </div>
                </div>
              </div>

              {/* Bloco 2 — Status */}
              <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '12px' }}>💼 Serviço & Status</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ ...inputStyle, background: '#fff' }}>
                      <option value="lead">🔵 Lead</option>
                      <option value="ativo">🟢 Ativo</option>
                      <option value="inativo">🟡 Inativo</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Modalidade</label>
                    <select value={form.modalidade} onChange={e => setForm({...form, modalidade: e.target.value})} style={{ ...inputStyle, background: '#fff' }}>
                      <option value="online">🌐 Online</option>
                      <option value="presencial">🏋️ Presencial</option>
                      <option value="hibrido">🔀 Híbrido</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Plano / Serviço</label>
                    <input value={form.plano} onChange={e => setForm({...form, plano: e.target.value})} style={inputStyle} placeholder="Ex: Consultoria Online" />
                  </div>
                  <div>
                    <label style={labelStyle}>Mensalidade (R$)</label>
                    <input type="number" value={form.valor_mensalidade} onChange={e => setForm({...form, valor_mensalidade: e.target.value})} style={inputStyle} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={labelStyle}>Forma de pagamento</label>
                    <select value={form.forma_pagamento} onChange={e => setForm({...form, forma_pagamento: e.target.value})} style={{ ...inputStyle, background: '#fff' }}>
                      <option value="pix">PIX</option>
                      <option value="boleto">Boleto</option>
                      <option value="cartao">Cartão</option>
                      <option value="dinheiro">Dinheiro</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Histórico de pagamento</label>
                    <select value={form.historico_pagamento} onChange={e => setForm({...form, historico_pagamento: e.target.value})} style={{ ...inputStyle, background: '#fff' }}>
                      <option value="bom">✅ Bom pagador</option>
                      <option value="atrasa">⚠️ Atrasa</option>
                      <option value="problematico">❌ Problemático</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Início do contrato</label>
                    <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Renovação</label>
                    <input type="date" value={form.data_renovacao} onChange={e => setForm({...form, data_renovacao: e.target.value})} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nível</label>
                    <select value={form.nivel} onChange={e => setForm({...form, nivel: e.target.value})} style={{ ...inputStyle, background: '#fff' }}>
                      <option value="iniciante">🟢 Iniciante</option>
                      <option value="intermediario">🟡 Intermediário</option>
                      <option value="avancado">🔴 Avançado</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Frequência semanal</label>
                    <select value={form.frequencia_semana} onChange={e => setForm({...form, frequencia_semana: e.target.value})} style={{ ...inputStyle, background: '#fff' }}>
                      {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}x por semana</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>Objetivo</label>
                    <input value={form.objetivo} onChange={e => setForm({...form, objetivo: e.target.value})} style={inputStyle} placeholder="Ex: Emagrecimento, Hipertrofia, Condicionamento..." />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label style={labelStyle}>Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={fecharModal} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
              <button onClick={salvar} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                {editandoId !== null ? '💾 Salvar Alterações' : '💾 Salvar Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export const dynamic = 'force-dynamic'
