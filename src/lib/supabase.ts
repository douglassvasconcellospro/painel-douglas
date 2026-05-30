import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xveyhffdnlmnhihwbbgh.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXloZmZkbmxtbmhpaHdiYmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTU3NTAsImV4cCI6MjA5NTY5MTc1MH0.EvjxqX685tFbk2-1xwa3K4BgoUIJ_-x5cQbr8a0_Kxc'

// createBrowserClient armazena sessão em cookies (compatível com middleware/proxy SSR)
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)

export type Lancamento = {
  id: number
  tipo: 'entrada' | 'saida'
  descricao: string
  categoria: string
  data: string
  mes: string
  valor: number
  banco: string
  created_at?: string
}

export type Cliente = {
  id: number
  nome: string
  email?: string
  telefone?: string
  status: 'ativo' | 'inativo' | 'lead' | 'prospect'
  plano?: string
  valor_mensalidade?: number
  data_inicio?: string
  observacoes?: string
  created_at?: string
}

export type Categoria = {
  id: number
  nome: string
  tipo: 'entrada' | 'saida'
  cor: string
  created_at?: string
}

export type Fechamento = {
  id: number
  mes: string
  mes_label: string
  status: 'aberto' | 'fechado'
  entradas: number
  saidas: number
  resultado: number
  margem: number
  qtd_lancamentos: number
  observacoes?: string
  fechado_em?: string
  created_at?: string
}

export type Configuracao = {
  id: number
  chave: string
  valor: string | null
}
