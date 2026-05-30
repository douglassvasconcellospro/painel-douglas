'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

type Cliente = {
  id: number
  nome: string
  email?: string
  telefone?: string
  status: string
  plano?: string
  valor_mensalidade?: number
  data_inicio?: string
  observacoes?: string
}

const statusColor: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700',
  inativo: 'bg-gray-100 text-gray-600',
  lead: 'bg-blue-100 text-blue-700',
  prospect: 'bg-yellow-100 text-yellow-700',
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', status: 'ativo', plano: '', valor_mensalidade: '', data_inicio: '', observacoes: '' })

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtrados = clientes.filter(c =>
    (!busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || c.email?.toLowerCase().includes(busca.toLowerCase())) &&
    (!filtroStatus || c.status === filtroStatus)
  )

  async function salvar() {
    if (!form.nome) return
    await supabase.from('clientes').insert([{
      nome: form.nome, email: form.email, telefone: form.telefone,
      status: form.status, plano: form.plano,
      valor_mensalidade: form.valor_mensalidade ? parseFloat(form.valor_mensalidade) : null,
      data_inicio: form.data_inicio, observacoes: form.observacoes
    }])
    setShowModal(false)
    setForm({ nome: '', email: '', telefone: '', status: 'ativo', plano: '', valor_mensalidade: '', data_inicio: '', observacoes: '' })
    load()
  }

  async function excluir(id: number) {
    if (!confirm('Excluir este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    load()
  }

  const totAtivos = clientes.filter(c => c.status === 'ativo').length
  const totLeads = clientes.filter(c => c.status === 'lead' || c.status === 'prospect').length
  const mrr = clientes.filter(c => c.status === 'ativo').reduce((s, c) => s + (c.valor_mensalidade || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes & Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão completa de clientes</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + Novo Cliente
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-500">Clientes Ativos</div>
          <div className="text-2xl font-bold text-green-700">{totAtivos}</div>
        </div>
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-500">Leads/Prospects</div>
          <div className="text-2xl font-bold text-blue-700">{totLeads}</div>
        </div>
        <div className="bg-indigo-50 border-l-4 border-indigo-500 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-500">MRR (Receita Mensal)</div>
          <div className="text-2xl font-bold text-indigo-700">{fmt(mrr)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar cliente..." className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white flex-1" />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            {['Nome','Email','Telefone','Plano','Mensalidade','Status',''].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Carregando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                {clientes.length === 0 ? 'Nenhum cliente cadastrado ainda. Clique em "+ Novo Cliente"!' : 'Nenhum cliente encontrado'}
              </td></tr>
            ) : filtrados.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{c.nome}</td>
                <td className="px-4 py-3 text-gray-500">{c.email || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.telefone || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.plano || '—'}</td>
                <td className="px-4 py-3 font-medium text-gray-700">{c.valor_mensalidade ? fmt(c.valor_mensalidade) : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[c.status] || 'bg-gray-100 text-gray-600'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => excluir(c.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold">Novo Cliente</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome *</label>
                <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Nome completo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
                  <input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Plano</label>
                  <input value={form.plano} onChange={e => setForm({...form, plano: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Presencial, Online..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Mensalidade (R$)</label>
                  <input type="number" value={form.valor_mensalidade} onChange={e => setForm({...form, valor_mensalidade: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Data de início</label>
                  <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">Cancelar</button>
              <button onClick={salvar} className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
