// Gerador dinâmico de meses — nunca desatualiza
const NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function gerarMeses(qtd = 6): { v: string; l: string }[] {
  const hoje = new Date()
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const l = `${NOMES[d.getMonth()]} ${d.getFullYear()}`
    return { v, l }
  })
}

export const MES_ATUAL = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})()

export const MESES_LABEL: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  gerarMeses(12).forEach(m => { map[m.v] = m.l })
  return map
})()
