// Integração Pluggy (Open Finance) — SOMENTE LEITURA
// Nunca faz transferências, pagamentos ou alterações na conta.
// Acesso restrito a: saldo, extrato e dados cadastrais.

const BASE          = 'https://api.pluggy.ai'
const CLIENT_ID     = process.env.PLUGGY_CLIENT_ID     || ''
const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || ''

async function getApiKey(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET não configurados')
  const res = await fetch(`${BASE}/auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!data.apiKey) throw new Error(`Pluggy auth falhou: ${JSON.stringify(data)}`)
  return data.apiKey
}

// Token para o widget de conexão (frontend)
export async function connectToken(): Promise<string> {
  const key = await getApiKey()
  const res = await fetch(`${BASE}/connect_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key },
    body: JSON.stringify({}),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!data.accessToken) throw new Error(`Connect token falhou: ${JSON.stringify(data)}`)
  return data.accessToken
}

// Busca contas de um item (somente leitura)
export async function getAccounts(itemId: string) {
  const key = await getApiKey()
  const res = await fetch(`${BASE}/accounts?itemId=${itemId}`, {
    headers: { 'x-api-key': key },
    cache: 'no-store',
  })
  return res.json()
}

// Busca status/info do item
export async function getItem(itemId: string) {
  const key = await getApiKey()
  const res = await fetch(`${BASE}/items/${itemId}`, {
    headers: { 'x-api-key': key },
    cache: 'no-store',
  })
  return res.json()
}
