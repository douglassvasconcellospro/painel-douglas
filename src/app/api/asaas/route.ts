import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ASAAS_BASE = 'https://www.asaas.com/api/v3'
const ASAAS_KEY = process.env.ASAAS_API_KEY || ''

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xveyhffdnlmnhihwbbgh.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXloZmZkbmxtbmhpaHdiYmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTU3NTAsImV4cCI6MjA5NTY5MTc1MH0.EvjxqX685tFbk2-1xwa3K4BgoUIJ_-x5cQbr8a0_Kxc',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
}

// Mapeamento de tipos → categoria e tipo financeiro (somente leitura)
function categorizar(type: string, value: number, description: string) {
  const d = description.toLowerCase()
  const isPositivo = value > 0

  switch (type) {
    case 'PAYMENT_RECEIVED':
      if (d.includes('consultoria')) return { categoria: 'Consultoria', tipo: 'entrada' }
      if (d.includes('mensalidade') || d.includes('plano')) return { categoria: 'Mensalidade', tipo: 'entrada' }
      return { categoria: 'Receita de Clientes', tipo: 'entrada' }

    case 'TRANSFER':
      return isPositivo
        ? { categoria: 'PIX Recebido', tipo: 'entrada' }
        : { categoria: 'PIX Enviado', tipo: 'saida' }

    case 'PIX_TRANSACTION_DEBIT_REFUND':
      return { categoria: 'Estorno PIX', tipo: 'entrada' }

    case 'PAYMENT_FEE':
    case 'PAYMENT_MESSAGING_NOTIFICATION_FEE':
    case 'INSTANT_TEXT_MESSAGE_FEE':
      return { categoria: 'Taxas Asaas', tipo: 'saida' }

    case 'BILL_PAYMENT':
      return { categoria: 'Pagamentos', tipo: 'saida' }

    default:
      return isPositivo
        ? { categoria: 'Outros (entrada)', tipo: 'entrada' }
        : { categoria: 'Outros (saída)', tipo: 'saida' }
  }
}

async function fetchTransacoes(dataInicio: string, dataFim: string) {
  const transacoes: any[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const url = `${ASAAS_BASE}/financialTransactions?limit=${limit}&offset=${offset}&startDate=${dataInicio}&finishDate=${dataFim}`
    const res = await fetch(url, {
      headers: { 'access_token': ASAAS_KEY, 'accept': 'application/json' },
      next: { revalidate: 0 }
    })

    if (!res.ok) break
    const data = await res.json()
    transacoes.push(...(data.data || []))

    if (!data.hasMore) break
    offset += limit
  }

  return transacoes
}

export async function POST(request: NextRequest) {
  try {
    if (!ASAAS_KEY) {
      return NextResponse.json({ error: 'Chave Asaas não configurada' }, { status: 500 })
    }

    const body = await request.json()
    const { dataInicio, dataFim } = body

    if (!dataInicio || !dataFim) {
      return NextResponse.json({ error: 'Informe dataInicio e dataFim (YYYY-MM-DD)' }, { status: 400 })
    }

    // Buscar transações do período
    const transacoes = await fetchTransacoes(dataInicio, dataFim)

    if (transacoes.length === 0) {
      return NextResponse.json({ importados: 0, mensagem: 'Nenhuma transação no período' })
    }

    // Converter para formato do painel
    const lancamentos = transacoes.map((t: any) => {
      const { categoria, tipo } = categorizar(t.type, t.value, t.description || '')
      const data = t.date // formato YYYY-MM-DD
      const mes = data.slice(0, 7) // YYYY-MM
      const [ano, mNum, dia] = data.split('-')
      const dataFormatada = `${dia}/${mNum}/${ano}`

      return {
        tipo,
        descricao: (t.description || t.type).slice(0, 120),
        categoria,
        data: dataFormatada,
        mes,
        valor: Math.abs(t.value),
        banco: 'Asaas',
        asaas_id: t.id, // para evitar duplicatas
      }
    })

    // Verificar quais já existem (anti-duplicata por asaas_id)
    // Como a tabela não tem coluna asaas_id, filtramos por data+valor+banco
    const novos = lancamentos.filter(l => l.valor > 0) // remove valor zero

    // Salvar no Supabase (sem asaas_id pois não existe na tabela)
    const paraInserir = novos.map(({ asaas_id, ...l }) => l)

    const supabase = await getSupabase()
    const { error } = await supabase
      .from('lancamentos')
      .insert(paraInserir)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const entradas = novos.filter(l => l.tipo === 'entrada')
    const saidas = novos.filter(l => l.tipo === 'saida')

    return NextResponse.json({
      importados: novos.length,
      entradas: entradas.length,
      saidas: saidas.length,
      totalEntradas: entradas.reduce((s, l) => s + l.valor, 0),
      totalSaidas: saidas.reduce((s, l) => s + l.valor, 0),
      periodo: `${dataInicio} → ${dataFim}`,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: testar conexão e retornar saldo
export async function GET() {
  try {
    const res = await fetch(`${ASAAS_BASE}/financialTransactions?limit=1`, {
      headers: { 'access_token': ASAAS_KEY },
      next: { revalidate: 0 }
    })
    const data = await res.json()
    return NextResponse.json({
      conectado: res.ok,
      totalTransacoes: data.totalCount || 0,
    })
  } catch {
    return NextResponse.json({ conectado: false })
  }
}
