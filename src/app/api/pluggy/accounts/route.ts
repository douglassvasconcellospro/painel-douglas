import { NextRequest, NextResponse } from 'next/server'
import { getAccounts, getItem } from '@/lib/pluggy'

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId obrigatório' }, { status: 400 })

  try {
    const [accounts, item] = await Promise.all([
      getAccounts(itemId),
      getItem(itemId),
    ])

    const lista = (accounts.results || accounts.data || []) as any[]

    const saldoTotal = lista
      .filter((a: any) => a.type === 'BANK' || a.type === 'CHECKING')
      .reduce((s: number, a: any) => s + (a.balance ?? 0), 0)

    return NextResponse.json({
      status: item.status,
      conector: item.connector?.name || 'Nubank',
      contas: lista.map((a: any) => ({
        id:     a.id,
        nome:   a.name,
        tipo:   a.type,
        saldo:  a.balance,
        moeda:  a.currencyCode,
      })),
      saldoTotal,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
