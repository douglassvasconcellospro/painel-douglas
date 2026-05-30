import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

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
