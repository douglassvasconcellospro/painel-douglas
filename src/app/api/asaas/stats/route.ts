import { NextResponse } from 'next/server'

const BASE = 'https://www.asaas.com/api/v3'
const KEY = process.env.ASAAS_API_KEY || ''

const headers = { 'access_token': KEY, 'accept': 'application/json' }

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers, next: { revalidate: 0 } })
  if (!res.ok) return null
  return res.json()
}

export async function GET() {
  if (!KEY) return NextResponse.json({ error: 'Chave não configurada' }, { status: 500 })

  try {
    const hoje = new Date()
    const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30)
    const em60 = new Date(hoje); em60.setDate(em60.getDate() + 60)
    const em90 = new Date(hoje); em90.setDate(em90.getDate() + 90)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const iniciomes = fmt(hoje).slice(0, 8) + '01'

    // Tudo em paralelo
    const [
      balanceData,
      pendentesData,
      vencidasData,
      subscricoesData,
      recebidosMesData,
      previsao30Data,
      previsao60Data,
      previsao90Data,
      recebidosTopData,
    ] = await Promise.all([
      get('/finance/balance'),
      get(`/payments?status=PENDING&limit=50&offset=0`),
      get(`/payments?status=OVERDUE&limit=50`),
      get(`/subscriptions?status=ACTIVE&limit=100`),
      get(`/payments?status=RECEIVED&paymentDate=${iniciomes}&paymentDateLe=${fmt(hoje)}&limit=100`),
      get(`/payments?status=PENDING&dueDateGe=${fmt(hoje)}&dueDateLe=${fmt(em30)}&limit=100`),
      get(`/payments?status=PENDING&dueDateGe=${fmt(hoje)}&dueDateLe=${fmt(em60)}&limit=100`),
      get(`/payments?status=PENDING&dueDateGe=${fmt(hoje)}&dueDateLe=${fmt(em90)}&limit=100`),
      get(`/payments?status=RECEIVED&limit=200`),
    ])

    // Saldo
    const saldo = balanceData?.balance ?? 0

    // Pendentes
    const pendentes = (pendentesData?.data || []).map((p: any) => ({
      id: p.id,
      cliente: p.customerName || p.customer,
      valor: p.value,
      vencimento: p.dueDate,
      descricao: p.description,
    }))
    const totalPendente = pendentes.reduce((s: number, p: any) => s + p.valor, 0)

    // Vencidas
    const vencidas = (vencidasData?.data || []).map((p: any) => ({
      id: p.id,
      cliente: p.customerName || p.customer,
      valor: p.value,
      vencimento: p.dueDate,
      diasAtraso: Math.floor((hoje.getTime() - new Date(p.dueDate).getTime()) / 86400000),
    }))
    const totalVencido = vencidas.reduce((s: number, p: any) => s + p.valor, 0)

    // Assinaturas / MRR
    const subscricoes = (subscricoesData?.data || []).map((s: any) => ({
      descricao: s.description || 'Sem nome',
      valor: s.value,
      cliente: s.customerName || s.customer,
    }))
    const mrr = subscricoes.reduce((s: number, a: any) => s + a.valor, 0)

    // Recebido este mês
    const recebidosMes = (recebidosMesData?.data || []).reduce((s: number, p: any) => s + p.value, 0)

    // Previsão de caixa
    const previsao = {
      dias30: (previsao30Data?.data || []).reduce((s: number, p: any) => s + p.value, 0),
      dias60: (previsao60Data?.data || []).reduce((s: number, p: any) => s + p.value, 0),
      dias90: (previsao90Data?.data || []).reduce((s: number, p: any) => s + p.value, 0),
      qtd30: previsao30Data?.totalCount || 0,
    }

    // Top clientes (por valor total recebido)
    const clienteMap: Record<string, { nome: string; total: number; qtd: number }> = {}
    for (const p of (recebidosTopData?.data || [])) {
      const key = p.customerName || p.customer || 'Desconhecido'
      if (!clienteMap[key]) clienteMap[key] = { nome: key, total: 0, qtd: 0 }
      clienteMap[key].total += p.value
      clienteMap[key].qtd += 1
    }
    const topClientes = Object.values(clienteMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    return NextResponse.json({
      saldo,
      pendentes,
      totalPendente,
      qtdPendentes: pendentesData?.totalCount || 0,
      vencidas,
      totalVencido,
      qtdVencidas: vencidasData?.totalCount || 0,
      subscricoes,
      mrr,
      qtdSubscricoes: subscricoesData?.totalCount || 0,
      recebidosMes,
      previsao,
      topClientes,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
