import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const BASE = 'https://www.asaas.com/api/v3'
const KEY = process.env.ASAAS_API_KEY || ''

export async function POST() {
  if (!KEY) return NextResponse.json({ error: 'Chave não configurada' }, { status: 500 })

  try {
    // Busca em paralelo: clientes, assinaturas ativas, cobranças pendentes e cobranças vencidas
    const [clientesRes, subscricoesRes, pendenteRes, vencidaRes] = await Promise.all([
      fetch(`${BASE}/customers?limit=100`,                            { headers: { 'access_token': KEY }, next: { revalidate: 0 } }),
      fetch(`${BASE}/subscriptions?status=ACTIVE&limit=100`,          { headers: { 'access_token': KEY }, next: { revalidate: 0 } }),
      fetch(`${BASE}/payments?status=PENDING&limit=100`,              { headers: { 'access_token': KEY }, next: { revalidate: 0 } }),
      fetch(`${BASE}/payments?status=OVERDUE&limit=100`,              { headers: { 'access_token': KEY }, next: { revalidate: 0 } }),
    ])

    const clientesAsaas        = (await clientesRes.json()).data || []
    const subscricoesAtivas    = (await subscricoesRes.json()).data || []
    const pagamentosPendentes  = (await pendenteRes.json()).data  || []
    const pagamentosVencidos   = (await vencidaRes.json()).data   || []

    // Ativo = assinatura recorrente ACTIVE
    //       OU cobrança/link PENDING (aguardando pagamento)
    //       OU cobrança OVERDUE (vencida mas ainda em aberto — ainda deve)
    // Inativo = só tem histórico pago/encerrado, sem nada corrente
    const idsComSubscricao  = new Set(subscricoesAtivas.map((s: any) => s.customer))
    const idsComPendente    = new Set(pagamentosPendentes.map((p: any) => p.customer))
    const idsComVencida     = new Set(pagamentosVencidos.map((p: any) => p.customer))
    const idsAtivos         = new Set([...idsComSubscricao, ...idsComPendente, ...idsComVencida])

    // Supabase com sessão do usuário autenticado
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

    // Verificar quais já existem (por email ou nome)
    const { data: existentes } = await supabase.from('clientes').select('id, email, nome, origem, status')
    const emailsExistentes = new Set((existentes || []).map((c: any) => c.email?.toLowerCase()).filter(Boolean))
    const nomesExistentes = new Set((existentes || []).map((c: any) => c.nome?.toLowerCase()).filter(Boolean))

    // Separar novos dos já existentes
    const novos = clientesAsaas.filter((c: any) => {
      const email = c.email?.toLowerCase()
      const nome = c.name?.toLowerCase()
      return !emailsExistentes.has(email) && !nomesExistentes.has(nome)
    })

    // Classificação:
    // - ACTIVE subscription OU PENDING/OVERDUE payment → 'ativo'
    // - Só histórico pago, sem nada corrente                → 'inativo'
    // - origem sempre 'asaas'
    const paraInserir = novos.map((c: any) => {
      const temAssinaturaAtiva = idsAtivos.has(c.id)
      return {
        nome: c.name,
        email: c.email || null,
        telefone: c.mobilePhone || c.phone || null,
        status: temAssinaturaAtiva ? 'ativo' : 'inativo',
        origem: 'asaas',
        plano: temAssinaturaAtiva ? 'Consultoria' : null,
        observacoes: `Importado do Asaas — ID: ${c.id}`,
      }
    })

    // Também atualizar status dos já existentes que vieram do Asaas
    const jaExistentesAsaas = clientesAsaas.filter((c: any) => {
      const email = c.email?.toLowerCase()
      const nome = c.name?.toLowerCase()
      return emailsExistentes.has(email) || nomesExistentes.has(nome)
    })

    for (const c of jaExistentesAsaas) {
      const temAssinaturaAtiva = idsAtivos.has(c.id)
      const novoStatus = temAssinaturaAtiva ? 'ativo' : 'inativo'
      const emailLower = c.email?.toLowerCase()
      const nomeLower = c.name?.toLowerCase()
      const existente = (existentes || []).find((e: any) =>
        e.email?.toLowerCase() === emailLower || e.nome?.toLowerCase() === nomeLower
      )
      if (existente && (existente.status !== novoStatus || existente.origem !== 'asaas')) {
        await supabase.from('clientes').update({ status: novoStatus, origem: 'asaas' }).eq('id', existente.id)
      }
    }

    if (paraInserir.length > 0) {
      const { error } = await supabase.from('clientes').insert(paraInserir)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ativos = paraInserir.filter((c: any) => c.status === 'ativo').length
    const leadsAntigos = paraInserir.filter((c: any) => c.status === 'inativo').length

    return NextResponse.json({
      sincronizados: paraInserir.length,
      ativos,
      leadsAntigos,
      atualizados: jaExistentesAsaas.length,
      total: clientesAsaas.length,
      mensagem: paraInserir.length === 0 ? 'Todos os clientes já estão no sistema.' : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
