'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export const KEYWORDS_ASSINATURA = [
  // Streaming vídeo
  'netflix','disney','hbo max','hbo','paramount','globoplay','telecine',
  'mubi','crunchyroll','apple tv','prime video','amazon prime',
  // Streaming música
  'spotify','deezer','amazon music','youtube premium','youtube music','tidal',
  // Apple / Google
  'apple.com','apple/itunes','apple store','icloud','google one',
  // Microsoft / Adobe / Cloud
  'microsoft','adobe','dropbox','notion','canva','figma','loom',
  // IA / Dev
  'chatgpt','openai','github','cursor','copilot','claude',
  // Fitness / Bem-estar
  'gympass','wellhub','totalpass','smart fit','academia',
  // Viagem / Pontos
  'smiles','livelo','latam pass','tudoazul','tudo azul','multiplus',
  // VPN / Segurança
  'nordvpn','expressvpn','1password','lastpass','bitdefender',
  // Produtividade
  'zoom','slack','trello','linear','grammarly','evernote',
  // Cursos / Educação
  'hotmart','kiwify','udemy','coursera','alura','rocketseat',
  // Outros recorrentes
  'audible','kindle unlimited','duolingo','calm','headspace',
  'nubank ultravioleta','ultravioleta',
]

function categorizarNubank(memo: string, tipo: string) {
  const m = memo.toLowerCase()
  if (tipo === 'CREDIT') {
    if (m.includes('crédito em conta') || m.includes('credito em conta')) return { cat: 'Rendimentos', tipo: 'entrada' }
    if (m.includes('resgate rdb')) return { cat: 'Rendimentos', tipo: 'entrada' }
    if (m.includes('asaas')) return { cat: 'Transferência Asaas', tipo: 'entrada' }
    if (m.includes('suplementos') || m.includes('nutricionais') || m.includes('farmac')) return { cat: 'Receita de Clientes', tipo: 'entrada' }
    if (m.includes('estorno') || m.includes('reembolso') || m.includes('devolucao') || m.includes('devolução')) return { cat: 'Estorno', tipo: 'entrada' }
    return { cat: 'PIX Recebido', tipo: 'entrada' }
  } else {
    if (m.includes('aplicação rdb') || m.includes('aplicacao rdb')) return { cat: 'Investimentos', tipo: 'saida' }
    if (m.includes('empréstimo') || m.includes('emprestimo')) return { cat: 'Empréstimo', tipo: 'saida' }
    if (m.includes('pagamento de fatura') || m.includes('pgto fatura')) return { cat: 'Fatura do Cartão', tipo: 'saida' }
    if (KEYWORDS_ASSINATURA.some(k => m.includes(k))) return { cat: 'Assinaturas', tipo: 'saida' }
    if (m.includes('farmac') || m.includes('drogaria') || m.includes('ultrafarma')) return { cat: 'Saúde', tipo: 'saida' }
    if (m.includes('ifood') || m.includes('rappi') || m.includes('uber eats') || m.includes('restaurante') || m.includes('lanchonete') || m.includes('padaria')) return { cat: 'Alimentação', tipo: 'saida' }
    if (m.includes('uber') || m.includes('99app') || m.includes('taxi') || m.includes('combustivel') || m.includes('combustível')) return { cat: 'Transporte', tipo: 'saida' }
    if (m.includes('mercado') || m.includes('supermercado') || m.includes('carrefour') || m.includes('extra') || m.includes('pão de açucar') || m.includes('atacadao') || m.includes('atacadão')) return { cat: 'Supermercado', tipo: 'saida' }
    if (m.includes('lalamove') || m.includes('frete') || m.includes('loggi') || m.includes('correios')) return { cat: 'Logística', tipo: 'saida' }
    if (m.includes('mercado pago') || m.includes('shopee') || m.includes('amazon')) return { cat: 'Marketplace', tipo: 'saida' }
    if (m.includes('compra no débito') || m.includes('compra no debito')) return { cat: 'Compras', tipo: 'saida' }
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

import { gerarMeses, MESES_LABEL as _ML } from '@/lib/meses'
const MESES_LABEL: Record<string, string> = { ..._ML, ...gerarMeses(18).reduce((acc, m) => ({ ...acc, [m.v]: m.l }), {} as Record<string,string>) }

export default function Importar() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [banco, setBanco] = useState('nubank')
  const [limpando, setLimpando] = useState(false)
  const [limpouMsg, setLimpouMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Resumo de dados importados
  const [resumo, setResumo] = useState<{ mes: string; banco: string; qtd: number }[]>([])
  const [resumoLoading, setResumoLoading] = useState(true)

  // Limpar por mês
  const [limparBanco, setLimparBanco] = useState('nubank')
  const [limparMes, setLimparMes] = useState('')

  // Sync Asaas
  const hoje = new Date().toISOString().slice(0, 10)
  const primeiroDiaMes = new Date().toISOString().slice(0, 8) + '01'
  const [asaasInicio, setAsaasInicio] = useState(primeiroDiaMes)
  const [asaasFim, setAsaasFim] = useState(hoje)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  async function carregarResumo() {
    setResumoLoading(true)
    const { data } = await supabase
      .from('lancamentos')
      .select('mes, banco')
      .order('mes', { ascending: false })
    if (data) {
      const map: Record<string, number> = {}
      data.forEach(l => {
        const key = `${l.mes}|${l.banco}`
        map[key] = (map[key] || 0) + 1
      })
      setResumo(Object.entries(map).map(([key, qtd]) => {
        const [mes, banco] = key.split('|')
        return { mes, banco, qtd }
      }).sort((a, b) => b.mes.localeCompare(a.mes) || a.banco.localeCompare(b.banco)))
    }
    setResumoLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregarResumo() }, [])

  async function limparPorMes() {
    if (!limparMes) { alert('Selecione o mês antes de limpar.'); return }
    const bancoNome = limparBanco === 'nubank' ? 'Nubank' : 'Asaas'
    const mesLabel = MESES_LABEL[limparMes] || limparMes
    if (!confirm(`Apagar lançamentos do ${bancoNome} de ${mesLabel}? Isso não pode ser desfeito.`)) return
    setLimpando(true); setLimpouMsg('')
    try {
      const { error } = await supabase.from('lancamentos').delete().eq('banco', bancoNome).eq('mes', limparMes)
      if (error) throw error
      setLimpouMsg(`✅ ${bancoNome} — ${mesLabel} apagado! Agora reimporte o extrato desse mês.`)
      carregarResumo()
    } catch (e: any) {
      setLimpouMsg(`❌ Erro: ${e.message}`)
    }
    setLimpando(false)
  }

  async function limparLancamentos(filtro: 'tudo' | 'nubank' | 'asaas') {
    const msgs: Record<string, string> = {
      tudo:   'APAGAR TODOS os lançamentos de todos os meses? Isso não pode ser desfeito.',
      nubank: 'Apagar TODOS os lançamentos do Nubank (todos os meses)?',
      asaas:  'Apagar TODOS os lançamentos do Asaas (todos os meses)?',
    }
    if (!confirm(msgs[filtro])) return
    setLimpando(true); setLimpouMsg('')
    try {
      let query = supabase.from('lancamentos').delete().neq('id', 0)
      if (filtro === 'nubank') query = supabase.from('lancamentos').delete().eq('banco', 'Nubank')
      if (filtro === 'asaas')  query = supabase.from('lancamentos').delete().eq('banco', 'Asaas')
      const { error } = await query
      if (error) throw error
      setLimpouMsg(`✅ ${filtro === 'tudo' ? 'Tudo' : filtro === 'nubank' ? 'Nubank' : 'Asaas'} apagado! Reimporte os extratos.`)
      carregarResumo()
    } catch (e: any) {
      setLimpouMsg(`❌ Erro: ${e.message}`)
    }
    setLimpando(false)
  }

  async function sincronizarAsaas() {
    setSyncLoading(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataInicio: asaasInicio, dataFim: asaasFim }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSyncResult(data)
    } catch (e: any) {
      setSyncResult({ error: e.message })
    }
    setSyncLoading(false)
  }

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

      // ── DEDUPLICAÇÃO: evita importar o mesmo extrato duas vezes ──
      let novos = transacoes
      let duplicatas = 0

      if (transacoes.length > 0) {
        const mesesNoArquivo = [...new Set(transacoes.map(t => t.mes))]
        const bancoNome = banco === 'nubank' ? 'Nubank' : 'Asaas'

        const { data: existentes } = await supabase
          .from('lancamentos')
          .select('data, valor, descricao')
          .eq('banco', bancoNome)
          .in('mes', mesesNoArquivo)

        const chaveExistente = new Set(
          (existentes || []).map(e =>
            `${e.data}|${Number(e.valor).toFixed(2)}|${(e.descricao || '').slice(0, 30).toLowerCase()}`
          )
        )

        novos = transacoes.filter(t =>
          !chaveExistente.has(`${t.data}|${Number(t.valor).toFixed(2)}|${(t.descricao || '').slice(0, 30).toLowerCase()}`)
        )
        duplicatas = transacoes.length - novos.length
      }

      if (novos.length > 0) {
        const { error } = await supabase.from('lancamentos').insert(novos)
        if (error) throw error
      }

      const entradas = novos.filter(t => t.tipo === 'entrada')
      const saidas = novos.filter(t => t.tipo === 'saida')
      setResultado({
        total: novos.length,
        duplicatas,
        entradas: entradas.length,
        saidas: saidas.length,
        totEntradas: entradas.reduce((s, t) => s + t.valor, 0),
        totSaidas: saidas.reduce((s, t) => s + t.valor, 0),
        cats: [...new Set(novos.map(t => t.categoria))]
      })
      carregarResumo()
    } catch (e: any) {
      alert('Erro: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Importar Extrato</h1>
        <p className="text-sm text-gray-500 mt-1">Sincronize o Asaas automaticamente ou importe arquivos Nubank (.ofx)</p>
      </div>

      {/* Card de Sincronização Automática Asaas */}
      <div style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: '16px', padding: '24px', marginBottom: '24px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '24px' }}>🟢</span>
              <h3 style={{ fontWeight: 700, fontSize: '18px', margin: 0 }}>Sincronização Automática — Asaas</h3>
              <span style={{ background: 'rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600 }}>✅ CONECTADO</span>
            </div>
            <p style={{ fontSize: '13px', opacity: 0.85, margin: 0 }}>Busca todos os lançamentos direto da API Asaas • somente leitura • sem transferências</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '3px' }}>De</div>
              <input type="date" value={asaasInicio} onChange={e => setAsaasInicio(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '8px', border: 'none', fontSize: '13px', background: 'rgba(255,255,255,0.2)', color: '#fff', outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '3px' }}>Até</div>
              <input type="date" value={asaasFim} onChange={e => setAsaasFim(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '8px', border: 'none', fontSize: '13px', background: 'rgba(255,255,255,0.2)', color: '#fff', outline: 'none' }} />
            </div>
            <div style={{ marginTop: '16px' }}>
              <button onClick={sincronizarAsaas} disabled={syncLoading}
                style={{ padding: '10px 22px', background: '#fff', color: '#15803d', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: syncLoading ? 'not-allowed' : 'pointer', opacity: syncLoading ? 0.7 : 1 }}>
                {syncLoading ? '⏳ Buscando...' : '🔄 Sincronizar'}
              </button>
            </div>
          </div>
        </div>

        {/* Resultado da sincronização */}
        {syncResult && !syncResult.error && (
          <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '14px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: '11px', opacity: 0.8 }}>Importados</div><div style={{ fontSize: '22px', fontWeight: 800 }}>{syncResult.importados}</div></div>
            <div><div style={{ fontSize: '11px', opacity: 0.8 }}>Entradas ({syncResult.entradas})</div><div style={{ fontSize: '16px', fontWeight: 700 }}>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(syncResult.totalEntradas)}</div></div>
            <div><div style={{ fontSize: '11px', opacity: 0.8 }}>Saídas ({syncResult.saidas})</div><div style={{ fontSize: '16px', fontWeight: 700 }}>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(syncResult.totalSaidas)}</div></div>
            <div><div style={{ fontSize: '11px', opacity: 0.8 }}>Período</div><div style={{ fontSize: '13px', fontWeight: 600 }}>{syncResult.periodo}</div></div>
          </div>
        )}
        {syncResult?.error && (
          <div style={{ marginTop: '12px', background: 'rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
            ❌ {syncResult.error}
          </div>
        )}
      </div>

      {/* Painel de dados importados por mês */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px 24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontSize: '18px' }}>📅</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>Dados importados por mês</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>O que já está salvo — reimportar o mesmo mês não duplica (deduplicação automática)</div>
          </div>
        </div>
        {resumoLoading ? (
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>Carregando...</div>
        ) : resumo.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>Nenhum dado importado ainda.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {resumo.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: r.banco === 'Nubank' ? '#faf5ff' : '#f0fdf4', border: `1px solid ${r.banco === 'Nubank' ? '#e9d5ff' : '#bbf7d0'}`, borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>
                <span>{r.banco === 'Nubank' ? '🟣' : '🟢'}</span>
                <span style={{ color: '#374151' }}>{MESES_LABEL[r.mes] || r.mes}</span>
                <span style={{ color: '#9ca3af', fontWeight: 400 }}>{r.qtd} registros</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card zona de perigo — limpar por mês */}
      <div style={{ background: '#fff', border: '1.5px solid #fecaca', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <span style={{ fontSize: '20px' }}>🗑️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#dc2626' }}>Limpar Lançamentos</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Use para corrigir duplicatas. Prefira "Por Mês" para ser mais preciso. Ação irreversível.</div>
          </div>
        </div>

        {/* Limpar por mês — recomendado */}
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '10px' }}>⭐ Recomendado — Limpar por mês</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={limparBanco} onChange={e => setLimparBanco(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', background: '#fff' }}>
              <option value="nubank">🟣 Nubank</option>
              <option value="asaas">🟢 Asaas</option>
            </select>
            <select value={limparMes} onChange={e => setLimparMes(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', background: '#fff' }}>
              <option value="">Selecione o mês...</option>
              {Object.entries(MESES_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button onClick={limparPorMes} disabled={limpando || !limparMes}
              style={{ padding: '8px 18px', background: (!limparMes || limpando) ? '#fde68a' : '#d97706', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: (!limparMes || limpando) ? 'not-allowed' : 'pointer' }}>
              {limpando ? '⏳ Limpando...' : '🗑️ Limpar este mês'}
            </button>
          </div>
        </div>

        {/* Limpar tudo — nuclear */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => limparLancamentos('nubank')} disabled={limpando}
            style={{ padding: '8px 16px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: limpando ? 'not-allowed' : 'pointer' }}>
            🟣 Apagar todo Nubank
          </button>
          <button onClick={() => limparLancamentos('asaas')} disabled={limpando}
            style={{ padding: '8px 16px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: limpando ? 'not-allowed' : 'pointer' }}>
            🟢 Apagar todo Asaas
          </button>
          <button onClick={() => limparLancamentos('tudo')} disabled={limpando}
            style={{ padding: '8px 16px', background: '#dc2626', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: limpando ? 'not-allowed' : 'pointer' }}>
            ⚠️ Apagar Tudo
          </button>
        </div>

        {limpouMsg && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: limpouMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: limpouMsg.startsWith('✅') ? '#15803d' : '#dc2626' }}>
            {limpouMsg}
          </div>
        )}
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
              <div className="text-green-700 font-semibold mb-1">
                ✅ {resultado.total} lançamentos novos importados!
              </div>
              {resultado.duplicatas > 0 && (
                <div className="text-amber-600 text-sm font-medium mb-3">
                  ⚠️ {resultado.duplicatas} duplicata{resultado.duplicatas > 1 ? 's' : ''} ignorada{resultado.duplicatas > 1 ? 's' : ''} — já existiam no banco
                </div>
              )}
              {resultado.total === 0 && resultado.duplicatas > 0 && (
                <div className="text-amber-700 text-sm font-medium mb-3">
                  Este extrato já foi importado antes. Nada foi adicionado.
                </div>
              )}
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
              {resultado.cats.length > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  Categorias: {resultado.cats.join(', ')}
                </div>
              )}
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
