import { NextResponse } from 'next/server'

const BASE = 'https://www.asaas.com/api/v3'
const KEY = process.env.ASAAS_API_KEY || ''
const h = { 'access_token': KEY, 'accept': 'application/json' }

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: h, next: { revalidate: 0 } })
  if (!res.ok) return null
  return res.json()
}

// Busca todos os registros paginando
async function getAll(path: string, limit = 100) {
  const items: any[] = []
  let offset = 0
  while (true) {
    const sep = path.includes('?') ? '&' : '?'
    const d = await get(`${path}${sep}limit=${limit}&offset=${offset}`)
    if (!d?.data?.length) break
    items.push(...d.data)
    if (!d.hasMore) break
    offset += limit
  }
  return items
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

    // Busca tudo em paralelo — incluindo TODOS os clientes
    const [
      balanceData,
      clientesRaw,
      pendentesRaw,
      vencidasRaw,
      subscricoesRaw,
      recebidosMesRaw,
      previsao30Raw,
      previsao60Raw,
      previsao90Raw,
      recebidosTopRaw,
    ] = await Promise.all([
      get('/finance/balance'),
      getAll('/customers'),               // todos os 22 clientes
      getAll('/payments?status=PENDING'),
      getAll('/payments?status=OVERDUE'),
      getAll('/subscriptions?status=ACTIVE'),
      getAll(`/payments?status=RECEIVED&paymentDate=${iniciomes}&paymentDateLe=${fmt(hoje)}`),
      getAll(`/payments?status=PENDING&dueDateGe=${fmt(hoje)}&dueDateLe=${fmt(em30)}`),
      getAll(`/payments?status=PENDING&dueDateGe=${fmt(hoje)}&dueDateLe=${fmt(em60)}`),
      getAll(`/payments?status=PENDING&dueDateGe=${fmt(hoje)}&dueDateLe=${fmt(em90)}`),
      getAll('/payments?status=RECEIVED'),
    ])

    // Mapa de ID → nome do cliente
    const clienteMap: Record<string, { nome: string; email: string; telefone: string }> = {}
    for (const c of clientesRaw) {
      clienteMap[c.id] = {
        nome: c.name || 'Desconhecido',
        email: c.email || '',
        telefone: c.mobilePhone || c.phone || '',
      }
    }

    const nomeCliente = (customerId: string, descricao?: string) =>
      clienteMap[customerId]?.nome || descricao?.split(' ').slice(0, 3).join(' ') || customerId

    // Saldo
    const saldo = balanceData?.balance ?? 0

    // Clientes formatados
    const clientes = clientesRaw.map((c: any) => ({
      id: c.id,
      nome: c.name,
      email: c.email || '',
      telefone: c.mobilePhone || c.phone || '',
    }))

    // Pendentes com nome real
    const pendentes = pendentesRaw.map((p: any) => ({
      id: p.id,
      cliente: nomeCliente(p.customer, p.description),
      valor: p.value,
      vencimento: p.dueDate,
      descricao: p.description,
    }))
    const totalPendente = pendentes.reduce((s: number, p: any) => s + p.valor, 0)

    // Vencidas com nome real
    const vencidas = vencidasRaw.map((p: any) => ({
      id: p.id,
      cliente: nomeCliente(p.customer, p.description),
      valor: p.value,
      vencimento: p.dueDate,
      diasAtraso: Math.floor((hoje.getTime() - new Date(p.dueDate).getTime()) / 86400000),
    }))
    const totalVencido = vencidas.reduce((s: number, p: any) => s + p.valor, 0)

    // Assinaturas com nome real
    const subscricoes = subscricoesRaw.map((s: any) => ({
      id: s.id,
      descricao: s.description || nomeCliente(s.customer),
      cliente: nomeCliente(s.customer),
      valor: s.value,
    }))
    const mrr = subscricoes.reduce((s: number, a: any) => s + a.valor, 0)

    // Recebido este mês
    const recebidosMes = recebidosMesRaw.reduce((s: number, p: any) => s + p.value, 0)

    // Previsão
    const previsao = {
      dias30: previsao30Raw.reduce((s: number, p: any) => s + p.value, 0),
      dias60: previsao60Raw.reduce((s: number, p: any) => s + p.value, 0),
      dias90: previsao90Raw.reduce((s: number, p: any) => s + p.value, 0),
      qtd30: previsao30Raw.length,
    }

    // Top clientes com nomes reais
    const topMap: Record<string, { nome: string; total: number; qtd: number }> = {}
    for (const p of recebidosTopRaw) {
      const nome = nomeCliente(p.customer, p.description)
      if (!topMap[nome]) topMap[nome] = { nome, total: 0, qtd: 0 }
      topMap[nome].total += p.value
      topMap[nome].qtd += 1
    }
    const topClientes = Object.values(topMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    return NextResponse.json({
      saldo,
      clientes,
      pendentes,
      totalPendente,
      qtdPendentes: pendentes.length,
      vencidas,
      totalVencido,
      qtdVencidas: vencidas.length,
      subscricoes,
      mrr,
      qtdSubscricoes: subscricoes.length,
      recebidosMes,
      previsao,
      topClientes,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
