import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const BASE = 'https://www.asaas.com/api/v3'
const KEY = process.env.ASAAS_API_KEY || ''

export async function POST() {
  if (!KEY) return NextResponse.json({ error: 'Chave não configurada' }, { status: 500 })

  try {
    // Buscar todos os clientes do Asaas
    const res = await fetch(`${BASE}/customers?limit=100`, {
      headers: { 'access_token': KEY },
      next: { revalidate: 0 },
    })
    const data = await res.json()
    const clientesAsaas = data.data || []

    // Buscar últimos pagamentos de cada cliente para calcular total pago
    const pagRes = await fetch(`${BASE}/payments?status=RECEIVED&limit=200`, {
      headers: { 'access_token': KEY },
      next: { revalidate: 0 },
    })
    const pagData = await pagRes.json()
    const pagamentos = pagData.data || []

    // Mapa de receita por cliente
    const receitaMap: Record<string, number> = {}
    for (const p of pagamentos) {
      receitaMap[p.customer] = (receitaMap[p.customer] || 0) + p.value
    }

    // Criar Supabase client com sessão do usuário
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xveyhffdnlmnhihwbbgh.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXloZmZkbmxtbmhpaHdiYmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTU3NTAsImV4cCI6MjA5NTY5MTc1MH0.EvjxqX685tFbk2-1xwa3K4BgoUIJ_-x5cQbr8a0_Kxc',
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
        },
      }
    )

    // Verificar quais já existem no Supabase (por email ou nome)
    const { data: existentes } = await supabase.from('clientes').select('email, nome')
    const emailsExistentes = new Set((existentes || []).map((c: any) => c.email?.toLowerCase()).filter(Boolean))
    const nomesExistentes = new Set((existentes || []).map((c: any) => c.nome?.toLowerCase()).filter(Boolean))

    // Filtrar novos clientes
    const novos = clientesAsaas.filter((c: any) => {
      const email = c.email?.toLowerCase()
      const nome = c.name?.toLowerCase()
      return !emailsExistentes.has(email) && !nomesExistentes.has(nome)
    })

    if (novos.length === 0) {
      return NextResponse.json({ sincronizados: 0, mensagem: 'Todos os clientes já estão cadastrados.' })
    }

    // Inserir novos clientes
    const paraInserir = novos.map((c: any) => ({
      nome: c.name,
      email: c.email || null,
      telefone: c.mobilePhone || c.phone || null,
      status: 'ativo',
      plano: 'Consultoria',
      valor_mensalidade: receitaMap[c.id] ? null : null, // será preenchido manualmente
      observacoes: `Importado do Asaas — ID: ${c.id}`,
    }))

    const { error } = await supabase.from('clientes').insert(paraInserir)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      sincronizados: novos.length,
      total: clientesAsaas.length,
      jaExistiam: clientesAsaas.length - novos.length,
      clientes: novos.map((c: any) => ({ nome: c.name, email: c.email })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
