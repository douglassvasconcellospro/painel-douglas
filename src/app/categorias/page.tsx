'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function Categorias() {
  const [lancamentos, setLancamentos] = useState<any[]>([])

  useEffect(() => {
    supabase.from('lancamentos').select('*').then(({ data }) => setLancamentos(data || []))
  }, [])

  const catEntrada: Record<string, number> = {}
  const catSaida: Record<string, number> = {}
  lancamentos.filter(l => l.mes === '2026-05').forEach(l => {
    if (l.tipo === 'entrada') catEntrada[l.categoria] = (catEntrada[l.categoria] || 0) + Number(l.valor)
    else catSaida[l.categoria] = (catSaida[l.categoria] || 0) + Number(l.valor)
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
        <p className="text-sm text-gray-500 mt-1">Resumo por categoria — Maio 2026</p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">✅ Categorias de Entrada</h3>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-50">
              <th className="text-left px-5 py-2 text-xs text-gray-400 uppercase">Categoria</th>
              <th className="text-right px-5 py-2 text-xs text-gray-400 uppercase">Total</th>
            </tr></thead>
            <tbody>
              {Object.entries(catEntrada).sort((a,b)=>b[1]-a[1]).map(([cat, val]) => (
                <tr key={cat} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-700">{cat}</td>
                  <td className="px-5 py-3 text-right font-semibold text-green-600">{fmt(val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">❌ Categorias de Saída</h3>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-50">
              <th className="text-left px-5 py-2 text-xs text-gray-400 uppercase">Categoria</th>
              <th className="text-right px-5 py-2 text-xs text-gray-400 uppercase">Total</th>
            </tr></thead>
            <tbody>
              {Object.entries(catSaida).sort((a,b)=>b[1]-a[1]).map(([cat, val]) => (
                <tr key={cat} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-700">{cat}</td>
                  <td className="px-5 py-3 text-right font-semibold text-red-600">{fmt(val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
