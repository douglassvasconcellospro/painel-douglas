'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const meses = [
  { v: '2026-05', l: 'Maio 2026' }, { v: '2026-04', l: 'Abril 2026' },
  { v: '2026-03', l: 'Março 2026' }, { v: '2026-02', l: 'Fevereiro 2026' },
  { v: '2026-01', l: 'Janeiro 2026' },
]

export default function Fechamentos() {
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('lancamentos').select('*')
      setLancamentos(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const resumoPorMes = meses.map(m => {
    const doMes = lancamentos.filter(l => l.mes === m.v)
    const entradas = doMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
    const saidas = doMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
    const resultado = entradas - saidas
    const margem = entradas > 0 ? ((resultado / entradas) * 100).toFixed(1) : '0.0'
    return { ...m, entradas, saidas, resultado, margem, qtd: doMes.length }
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fechamentos</h1>
        <p className="text-sm text-gray-500 mt-1">Resumo mensal de caixa</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              {['Mês','Lançamentos','Entradas','Saídas','Resultado','Margem'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {resumoPorMes.map(m => (
                <tr key={m.v} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-4 font-semibold text-gray-800">{m.l}</td>
                  <td className="px-5 py-4 text-gray-500">{m.qtd}</td>
                  <td className="px-5 py-4 font-semibold text-green-600">{fmt(m.entradas)}</td>
                  <td className="px-5 py-4 font-semibold text-red-600">{fmt(m.saidas)}</td>
                  <td className={`px-5 py-4 font-bold ${m.resultado >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(m.resultado)}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${parseFloat(m.margem) >= 20 ? 'bg-green-100 text-green-700' : parseFloat(m.margem) >= 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {m.margem}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
export const dynamic = 'force-dynamic'
