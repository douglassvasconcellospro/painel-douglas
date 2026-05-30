'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function categorizarNubank(memo: string, tipo: string) {
  const m = memo.toLowerCase()
  if (tipo === 'CREDIT') {
    if (m.includes('crédito em conta') || m.includes('credito em conta')) return { cat: 'Rendimentos', tipo: 'entrada' }
    if (m.includes('resgate rdb')) return { cat: 'Rendimentos', tipo: 'entrada' }
    if (m.includes('asaas')) return { cat: 'Transferência Asaas', tipo: 'entrada' }
    if (m.includes('suplementos') || m.includes('nutricionais') || m.includes('farmac')) return { cat: 'Receita de Clientes', tipo: 'entrada' }
    return { cat: 'PIX Recebido', tipo: 'entrada' }
  } else {
    if (m.includes('aplicação rdb') || m.includes('aplicacao rdb')) return { cat: 'Investimentos', tipo: 'saida' }
    if (m.includes('empréstimo') || m.includes('emprestimo')) return { cat: 'Empréstimo', tipo: 'saida' }
    if (m.includes('pagamento de fatura')) return { cat: 'Fatura do Cartão', tipo: 'saida' }
    if (m.includes('compra no débito') || m.includes('compra no debito')) return { cat: 'Compras', tipo: 'saida' }
    if (m.includes('lalamove') || m.includes('frete')) return { cat: 'Logística', tipo: 'saida' }
    if (m.includes('mercado pago')) return { cat: 'Marketplace', tipo: 'saida' }
    return { cat: 'PIX Enviado', tipo: 'saida' }
  }
}

function categorizarAsaas(tipoTrn: string, desc: string) {
  const t = tipoTrn.toLowerCase()
  const d = desc.toLowerCase()
  if (t.includes('cobrança recebida') || t.includes('cobranca recebida')) {
    if (d.includes('consultoria')) return { cat: 'Consultoria', tipo: 'entrada' }
    return { cat: 'Mensalidade', tipo: 'entrada' }
  }
  if (t.includes('taxa')) return { cat: 'Taxas Asaas', tipo: 'saida' }
  return { cat: 'PIX Enviado', tipo: 'saida' }
}

function parseOFX(texto: string) {
  const transacoes: any[] = []
  const matches = texto.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g)
  for (const m of matches) {
    const bloco = m[1]
    const get = (tag: string) => {
      const r = bloco.match(new RegExp(`<${tag}>([^<]+)`))
      return r ? r[1].trim() : ''
    }
    const trntype = get('TRNTYPE')
    const dtposted = get('DTPOSTED')
    const trnamt = parseFloat(get('TRNAMT'))
    const memo = get('MEMO')
    const ano = dtposted.slice(0, 4), mes = dtposted.slice(4, 6), dia = dtposted.slice(6, 8)
    const data = `${dia}/${mes}/${ano}`
    const mesRef = `${ano}-${mes}`
    const { cat, tipo } = categorizarNubank(memo, trntype)
    transacoes.push({ tipo, descricao: memo.length > 80 ? memo.slice(0, 80) + '…' : memo, categoria: cat, data, mes: mesRef, valor: Math.abs(trnamt), banco: 'Nubank' })
  }
  return transacoes
}

export default function Importar() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [banco, setBanco] = useState('nubank')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function importar() {
    if (!arquivo) return
    setLoading(true)
    setResultado(null)

    try {
      let transacoes: any[] = []

      if (banco === 'nubank' || arquivo.name.toLowerCase().endsWith('.ofx')) {
        const texto = await arquivo.text()
        transacoes = parseOFX(texto)
      } else if (banco === 'asaas' || arquivo.name.toLowerCase().endsWith('.xlsx')) {
        const XLSX = (await import('xlsx')).default
        const buffer = await arquivo.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        const headerIdx = rows.findIndex(r => r[0] === 'Data')
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row[0] || !row[5]) continue
          const valor = parseFloat(row[5])
          if (isNaN(valor)) continue
          const desc = String(row[4] || '')
          if (desc.toLowerCase().includes('saldo')) continue
          const partes = String(row[0]).split('/')
          const mesRef = partes.length === 3 ? `${partes[2]}-${partes[1]}` : '2026-05'
          const { cat, tipo } = categorizarAsaas(String(row[2] || ''), desc)
          transacoes.push({ tipo, descricao: desc.length > 80 ? desc.slice(0, 80) + '…' : desc, categoria: cat, data: String(row[0]), mes: mesRef, valor: Math.abs(valor), banco: 'Asaas' })
        }
      }

      if (transacoes.length > 0) {
        const { error } = await supabase.from('lancamentos').insert(transacoes)
        if (error) throw error
      }

      const entradas = transacoes.filter(t => t.tipo === 'entrada')
      const saidas = transacoes.filter(t => t.tipo === 'saida')
      setResultado({
        total: transacoes.length,
        entradas: entradas.length,
        saidas: saidas.length,
        totEntradas: entradas.reduce((s, t) => s + t.valor, 0),
        totSaidas: saidas.reduce((s, t) => s + t.valor, 0),
        cats: [...new Set(transacoes.map(t => t.categoria))]
      })
    } catch (e: any) {
      alert('Erro: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Importar Extrato</h1>
        <p className="text-sm text-gray-500 mt-1">Importe extratos Nubank (.ofx) ou Asaas (.xlsx) — categorização automática</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Selecione o arquivo</h3>

          <input ref={inputRef} type="file" accept=".ofx,.xlsx,.csv" className="hidden" onChange={e => setArquivo(e.target.files?.[0] || null)} />

          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all mb-4"
          >
            <div className="text-4xl mb-3">📂</div>
            <h4 className="font-semibold text-gray-700">{arquivo ? `📄 ${arquivo.name}` : 'Clique para selecionar'}</h4>
            <p className="text-sm text-gray-400 mt-1">Formatos: .ofx (Nubank), .xlsx (Asaas)</p>
          </div>

          <div className="flex gap-3">
            <select value={banco} onChange={e => setBanco(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="nubank">Nubank (.ofx)</option>
              <option value="asaas">Asaas (.xlsx)</option>
            </select>
            <button
              onClick={importar}
              disabled={!arquivo || loading}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? '⏳ Importando...' : 'Importar'}
            </button>
          </div>

          {resultado && (
            <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="text-green-700 font-semibold mb-3">✅ {resultado.total} lançamentos importados!</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-gray-500">Entradas ({resultado.entradas})</div>
                  <div className="text-green-600 font-bold">{fmt(resultado.totEntradas)}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-gray-500">Saídas ({resultado.saidas})</div>
                  <div className="text-red-600 font-bold">{fmt(resultado.totSaidas)}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Categorias: {resultado.cats.join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Instruções */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Como exportar seu extrato</h3>
          <div className="space-y-5">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 font-semibold text-purple-700 mb-2">
                <span className="text-xl">🟣</span> Nubank (.ofx)
              </div>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Abra o app Nubank</li>
                <li>Toque em <strong>Minha conta</strong></li>
                <li>Vá em <strong>Extrato</strong></li>
                <li>Toque em <strong>Exportar</strong></li>
                <li>Escolha formato <strong>.ofx</strong></li>
              </ol>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 font-semibold text-green-700 mb-2">
                <span className="text-xl">🟢</span> Asaas (.xlsx)
              </div>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Acesse o painel Asaas</li>
                <li>Vá em <strong>Financeiro → Extrato</strong></li>
                <li>Selecione o período desejado</li>
                <li>Clique em <strong>Exportar → Excel</strong></li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
