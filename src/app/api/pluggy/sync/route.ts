import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAccounts, getTransactions } from '@/lib/pluggy'

// Keywords de assinaturas — mesmo conjunto do importar/page.tsx
const KEYWORDS_ASSINATURA = [
  'netflix','disney','hbo max','hbo','paramount','globoplay','telecine',
  'mubi','crunchyroll','apple tv','prime video','amazon prime',
  'spotify','deezer','amazon music','youtube premium','youtube music','tidal',
  'apple.com','apple/itunes','apple store','icloud','google one',
  'microsoft','adobe','dropbox','notion','canva','figma','loom',
  'chatgpt','openai','github','cursor','copilot',
  'gympass','wellhub','totalpass','smart fit','academia',
  'smiles','livelo','latam pass','tudoazul','tudo azul','multiplus',
  'nordvpn','expressvpn','1password','lastpass',
  'zoom','slack','trello','grammarly',
  'hotmart','kiwify','udemy','coursera','alura','rocketseat',
  'audible','kindle unlimited','duolingo','calm','headspace',
  'nubank ultravioleta','ultravioleta',
]

function categorizarPluggy(desc: string, tipo: string): { cat: string; tipo: string } {
  const m = desc.toLowerCase()
  if (tipo === 'CREDIT') {
    if (m.includes('asaas'))          return { cat: 'Transferência Asaas', tipo: 'entrada' }
    if (m.includes('resgate') || m.includes('rendimento')) return { cat: 'Rendimentos', tipo: 'entrada' }
    if (m.includes('estorno') || m.includes('reembolso'))  return { cat: 'Estorno', tipo: 'entrada' }
    if (m.includes('salario') || m.includes('salário'))    return { cat: 'Salário', tipo: 'entrada' }
    return { cat: 'PIX Recebido', tipo: 'entrada' }
  }
  if (KEYWORDS_ASSINATURA.some(k => m.includes(k)))  return { cat: 'Assinaturas', tipo: 'saida' }
  if (m.includes('farmac') || m.includes('drogaria')) return { cat: 'Saúde', tipo: 'saida' }
  if (m.includes('ifood') || m.includes('rappi') || m.includes('restaurante') || m.includes('lanchonete'))
    return { cat: 'Alimentação', tipo: 'saida' }
  if (m.includes('uber') || m.includes('99app') || m.includes('combustivel') || m.includes('combustível'))
    return { cat: 'Transporte', tipo: 'saida' }
  if (m.includes('mercado') || m.includes('supermercado') || m.includes('carrefour') || m.includes('atacad'))
    return { cat: 'Supermercado', tipo: 'saida' }
  if (m.includes('pagamento de fatura') || m.includes('pgto fatura'))
    return { cat: 'Fatura do Cartão', tipo: 'saida' }
  if (m.includes('aplicação') || m.includes('aplicacao') || m.includes('investimento'))
    return { cat: 'Investimentos', tipo: 'saida' }
  if (m.includes('lalamove') || m.includes('loggi') || m.includes('correios'))
    return { cat: 'Logística', tipo: 'saida' }
  return { cat: 'PIX Enviado', tipo: 'saida' }
}

function fmtData(isoDate: string) {
  // Pluggy retorna YYYY-MM-DD ou ISO completo
  const d = isoDate.slice(0, 10)
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { itemId, dateFrom, dateTo } = body as { itemId?: string; dateFrom?: string; dateTo?: string }

    // Busca itemId de configuracoes se não enviado
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xveyhffdnlmnhihwbbgh.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXloZmZkbmxtbmhpaHdiYmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTU3NTAsImV4cCI6MjA5NTY5MTc1MH0.EvjxqX685tFbk2-1xwa3K4BgoUIJ_-x5cQbr8a0_Kxc',
      { cookies: { getAll() { return cookieStore.getAll() }, setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } } }
    )

    let resolvedItemId = itemId
    if (!resolvedItemId) {
      const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'pluggy_nubank_item_id').single()
      resolvedItemId = data?.valor
    }
    if (!resolvedItemId) return NextResponse.json({ error: 'Nubank não conectado. Conecte em Configurações.' }, { status: 400 })

    // Busca contas do item
    const accountsData = await getAccounts(resolvedItemId)
    const contas = accountsData.results || accountsData.data || []
    if (!contas.length) return NextResponse.json({ error: 'Nenhuma conta encontrada neste item Pluggy.' }, { status: 400 })

    // Busca transações de todas as contas em paralelo
    const todasTxs: any[] = []
    await Promise.all(contas.map(async (conta: any) => {
      const txs = await getTransactions(conta.id, dateFrom, dateTo)
      todasTxs.push(...txs.map((t: any) => ({ ...t, contaNome: conta.name })))
    }))

    if (!todasTxs.length) {
      return NextResponse.json({ importados: 0, duplicatas: 0, mensagem: 'Nenhuma transação no período.' })
    }

    // Mapeia para formato lancamentos
    const candidatos = todasTxs.map((t: any) => {
      const tipoPluggy = t.type === 'CREDIT' ? 'CREDIT' : 'DEBIT'
      const desc = t.description || t.name || 'Transação Nubank'
      const { cat, tipo } = categorizarPluggy(desc, tipoPluggy)
      const dataStr = fmtData(t.date)
      const mesRef  = t.date.slice(0, 7)
      return {
        tipo,
        descricao: desc.slice(0, 120),
        categoria: cat,
        data: dataStr,
        mes: mesRef,
        valor: Math.abs(t.amount || 0),
        banco: 'Nubank',
        _pluggy_id: t.id, // somente para dedup interno, não vai para o banco
      }
    }).filter(l => l.valor > 0)

    // Deduplicação: busca registros Nubank já existentes nos meses do lote
    const mesesNoBatch = [...new Set(candidatos.map(l => l.mes))]
    const { data: existentes } = await supabase
      .from('lancamentos')
      .select('data, valor, descricao')
      .eq('banco', 'Nubank')
      .in('mes', mesesNoBatch)

    const chaveExistente = new Set(
      (existentes || []).map((e: any) =>
        `${e.data}|${Number(e.valor).toFixed(2)}|${(e.descricao || '').slice(0, 30).toLowerCase()}`
      )
    )

    const novos = candidatos.filter(l =>
      !chaveExistente.has(`${l.data}|${Number(l.valor).toFixed(2)}|${(l.descricao || '').slice(0, 30).toLowerCase()}`)
    )
    const duplicatas = candidatos.length - novos.length

    if (novos.length > 0) {
      const paraInserir = novos.map(({ _pluggy_id, ...l }) => l)
      const { error } = await supabase.from('lancamentos').insert(paraInserir)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const entradas = novos.filter(l => l.tipo === 'entrada')
    const saidas   = novos.filter(l => l.tipo === 'saida')

    return NextResponse.json({
      importados: novos.length,
      duplicatas,
      entradas: entradas.length,
      saidas: saidas.length,
      totalEntradas: entradas.reduce((s, l) => s + l.valor, 0),
      totalSaidas:   saidas.reduce((s, l) => s + l.valor, 0),
      contas: contas.length,
      periodo: dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : 'todo o histórico disponível',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
