// Integração Asaas — SOMENTE LEITURA
// Nunca chame POST, PUT, PATCH ou DELETE na API do Asaas por aqui.
// Transferências, cobranças e cartões são feitos direto no painel Asaas.

const BASE = 'https://www.asaas.com/api/v3'
const KEY  = process.env.ASAAS_API_KEY || ''

function headers() {
  if (!KEY) throw new Error('ASAAS_API_KEY não configurada')
  return { 'access_token': KEY, accept: 'application/json' }
}

export async function asaasGet(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'GET',
    headers: headers(),
    next: { revalidate: 0 },
  })
  if (!res.ok) return null
  return res.json()
}

export async function asaasGetAll(path: string, limit = 100) {
  const items: any[] = []
  let offset = 0
  while (true) {
    const sep = path.includes('?') ? '&' : '?'
    const d = await asaasGet(`${path}${sep}limit=${limit}&offset=${offset}`)
    if (!d?.data?.length) break
    items.push(...d.data)
    if (!d.hasMore) break
    offset += limit
  }
  return items
}
