'use client'
import { useEffect, useState } from 'react'
import { supabase, Lancamento } from '@/lib/supabase'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [categorias, setCategorias] = useState<{ nome: string; tipo: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroMes, setFiltroMes] = useState('2026-05')
  const [filtroCat, setFiltroCat] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ tipo: 'entrada', descricao: '', categoria: '', data: '', mes: '2026-05', valor: '', banco: 'Manual' })

  const meses = ['2026-05','2026-04','2026-03','2026-02','2026-01']
  const nomeMes: Record<string,string> = {'2026-05':'Maio 2026','2026-04':'Abril 2026','2026-03':'Março 2026','2026-02':'Fevereiro 2026','2026-01':'Janeiro 2026'}

  async function load() {
    setLoading(true)
    const [{ data: lancs }, { data: cats }] = await Promise.all([
      supabase.from('lancamentos').select('*').order('data', { ascending: false }),
      supabase.from('categorias').select('nome,tipo').order('tipo').order('nome'),
    ])
    setLancamentos(lancs || [])
    setCategorias(cats || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtrados = lancamentos.filter(l =>
    (!busca || l.descricao.toLowerCase().includes(busca.toLowerCase())) &&
    (!filtroTipo || l.tipo === filtroTipo) &&
    (!filtroMes || l.mes === filtroMes) &&
    (!filtroCat || l.categoria === filtroCat)
  )

  async function salvar() {
    if (!form.descricao || !form.valor) return
    const catPadrao = form.tipo === 'entrada' ? 'PIX Recebido' : 'PIX Enviado'
    await supabase.from('lancamentos').insert([{
      tipo: form.tipo, descricao: form.descricao,
      categoria: form.categoria || catPadrao,
      data: form.data || new Date().toLocaleDateString('pt-BR'),
      mes: form.mes, valor: parseFloat(form.valor), banco: form.banco
    }])
    setShowModal(false)
    setForm({ tipo: 'entrada', descricao: '', categoria: '', data: '', mes: '2026-05', valor: '', banco: 'Manual' })
    load()
  }

  async function excluir(id: number) {
    if (!confirm('Excluir este lançamento?')) return
    await supabase.from('lancamentos').delete().eq('id', id)
    load()
  }

  // Categorias filtradas pelo tipo selecionado no form (do banco de dados)
  const catsDoTipo = categorias.filter(c => c.tipo === form.tipo).map(c => c.nome)
  const todasCats = [...new Set(categorias.map(c => c.nome))]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lançamentos</h1>
          <p className="text-sm text-gray-500 mt-1">Todos os registros financeiros</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + Novo Lançamento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap mb-5">
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar..." className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-48" />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todos os tipos</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
        </select>
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todos os meses</option>
          {meses.map(m => <option key={m} value={m}>{nomeMes[m]}</option>)}
        </select>
        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todas as categorias</option>
          {todasCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              {['Data','Descrição','Categoria','Banco','Tipo','Valor',''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhum lançamento encontrado</td></tr>
              ) : filtrados.map(l => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{l.data}</td>
                  <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{l.descricao}</td>
                  <td className="px-4 py-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{l.categoria}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{l.banco}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {l.tipo === 'saida' ? '- ' : '+ '}{fmt(Number(l.valor))}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => excluir(l.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold">Novo Lançamento</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                <input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Mensalidade turma A" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Data</label>
                  <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Valor (R$)</label>
                  <input type="number" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0,00" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
                <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">— Selecionar categoria —</option>
                  {catsDoTipo.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mês</label>
                <select value={form.mes} onChange={e => setForm({...form, mes: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {meses.map(m => <option key={m} value={m}>{nomeMes[m]}</option>)}
                </select>
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
export const dynamic = 'force-dynamic'
