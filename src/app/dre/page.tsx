'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { gerarMeses, MES_ATUAL } from '@/lib/meses'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const pct = (v: number, total: number) => total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '0%'

const MESES = gerarMeses(6)

export default function DRE() {
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [mes, setMes] = useState(MES_ATUAL)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('lancamentos').select('*').then(({ data }) => {
      setLancamentos(data || [])
      setLoading(false)
    })
  }, [])

  const doMes = lancamentos.filter(l => l.mes === mes)

  // Receitas
  const receitaBruta = doMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
  const taxasAsaas = doMes.filter(l => l.categoria === 'Taxas Asaas').reduce((s, l) => s + Number(l.valor), 0)
  const receitaLiquida = receitaBruta - taxasAsaas

  // Despesas por centro de custo / categoria
  const saidas = doMes.filter(l => l.tipo === 'saida' && l.categoria !== 'Taxas Asaas')
  const custosPessoal = saidas.filter(l => l.centro_custo === 'pessoal' || l.categoria?.toLowerCase().includes('empréstimo')).reduce((s, l) => s + Number(l.valor), 0)
  const custosMarketing = saidas.filter(l => l.centro_custo === 'marketing').reduce((s, l) => s + Number(l.valor), 0)
  const custosOperacional = saidas.filter(l => (l.centro_custo === 'operacional' || !l.centro_custo) &&
    !l.categoria?.toLowerCase().includes('empréstimo') &&
    !l.categoria?.toLowerCase().includes('investimento') &&
    l.categoria !== 'Fatura do Cartão'
  ).reduce((s, l) => s + Number(l.valor), 0)
  const custosImpostos = saidas.filter(l => l.centro_custo === 'impostos').reduce((s, l) => s + Number(l.valor), 0)
  const fatura = doMes.filter(l => l.categoria === 'Fatura do Cartão').reduce((s, l) => s + Number(l.valor), 0)
  const totalDespesas = saidas.reduce((s, l) => s + Number(l.valor), 0)

  // Resultado
  const ebitda = receitaLiquida - totalDespesas
  const margemEbitda = receitaLiquida > 0 ? (ebitda / receitaLiquida) * 100 : 0

  // Resultado financeiro
  const investimentos = doMes.filter(l => l.categoria === 'Investimentos').reduce((s, l) => s + Number(l.valor), 0)
  const resultadoLiquido = ebitda - investimentos

  const Row = ({ label, valor, negrito, cor, pctVal, indent }: any) => (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '12px 20px', fontSize: '14px', fontWeight: negrito ? 700 : 400, color: '#374151', paddingLeft: indent ? '36px' : '20px' }}>
        {indent ? '↳ ' : ''}{label}
      </td>
      <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: '14px', fontWeight: negrito ? 700 : 500, color: cor || (valor >= 0 ? '#374151' : '#dc2626') }}>
        {fmt(Math.abs(valor))}
      </td>
      <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', color: '#9ca3af' }}>
        {pctVal || pct(Math.abs(valor), receitaBruta)}
      </td>
    </tr>
  )

  const Separator = ({ label }: { label: string }) => (
    <tr style={{ background: '#f9fafb' }}>
      <td colSpan={3} style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</td>
    </tr>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>DRE — Demonstração de Resultado</h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>Resumo financeiro completo do período</p>
        </div>
        <select value={mes} onChange={e => setMes(e.target.value)}
          style={{ border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', background: '#fff', fontWeight: 600 }}>
          {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>

          {/* DRE Table */}
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: '20px 24px', color: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: '16px' }}>📊 DRE — {MESES.find(m2 => m2.v === mes)?.l}</div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>Demonstração do Resultado do Exercício</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Descrição</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Valor</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>% Receita</th>
                </tr>
              </thead>
              <tbody>
                <Separator label="Receita" />
                <Row label="(+) Receita Bruta" valor={receitaBruta} negrito cor="#16a34a" pctVal="100%" />
                <Row label="(-) Taxas Asaas" valor={-taxasAsaas} indent cor="#dc2626" />
                <Row label="(=) Receita Líquida" valor={receitaLiquida} negrito cor="#2563eb" />

                <Separator label="Despesas Operacionais" />
                {fatura > 0 && <Row label="(-) Fatura do Cartão" valor={-fatura} indent cor="#dc2626" />}
                {custosOperacional > 0 && <Row label="(-) Custos Operacionais" valor={-custosOperacional} indent cor="#dc2626" />}
                {custosMarketing > 0 && <Row label="(-) Marketing" valor={-custosMarketing} indent cor="#dc2626" />}
                {custosPessoal > 0 && <Row label="(-) Pessoal / Empréstimos" valor={-custosPessoal} indent cor="#dc2626" />}
                {custosImpostos > 0 && <Row label="(-) Impostos" valor={-custosImpostos} indent cor="#dc2626" />}
                <Row label="(=) EBITDA" valor={ebitda} negrito cor={ebitda >= 0 ? '#2563eb' : '#dc2626'} pctVal={`${margemEbitda.toFixed(1)}%`} />

                <Separator label="Resultado Final" />
                {investimentos > 0 && <Row label="(-) Aplicações / Investimentos" valor={-investimentos} indent cor="#7c3aed" />}
                <tr style={{ background: resultadoLiquido >= 0 ? '#f0fdf4' : '#fef2f2' }}>
                  <td style={{ padding: '16px 20px', fontSize: '16px', fontWeight: 800, color: resultadoLiquido >= 0 ? '#15803d' : '#dc2626' }}>
                    {resultadoLiquido >= 0 ? '✅' : '❌'} Resultado Líquido
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: '18px', fontWeight: 800, color: resultadoLiquido >= 0 ? '#15803d' : '#dc2626' }}>
                    {fmt(resultadoLiquido)}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: resultadoLiquido >= 0 ? '#15803d' : '#dc2626' }}>
                    {pct(Math.abs(resultadoLiquido), receitaBruta)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Indicadores laterais */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Receita Bruta', val: receitaBruta, cor: '#16a34a', bg: '#f0fdf4', icon: '💰' },
              { label: 'Receita Líquida', val: receitaLiquida, cor: '#2563eb', bg: '#eff6ff', icon: '📥' },
              { label: 'Total Despesas', val: totalDespesas + taxasAsaas, cor: '#dc2626', bg: '#fef2f2', icon: '📤' },
              { label: 'EBITDA', val: ebitda, cor: ebitda >= 0 ? '#7c3aed' : '#dc2626', bg: '#f5f3ff', icon: '📊' },
              { label: 'Resultado Final', val: resultadoLiquido, cor: resultadoLiquido >= 0 ? '#15803d' : '#dc2626', bg: resultadoLiquido >= 0 ? '#f0fdf4' : '#fef2f2', icon: resultadoLiquido >= 0 ? '✅' : '❌' },
              { label: 'Margem Líquida', val: null, texto: `${margemEbitda.toFixed(1)}%`, cor: margemEbitda >= 30 ? '#15803d' : margemEbitda >= 10 ? '#f59e0b' : '#dc2626', bg: '#f9fafb', icon: '📈' },
            ].map((k, i) => (
              <div key={i} style={{ background: k.bg, borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{k.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{k.label}</span>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 800, color: k.cor }}>{k.val !== null ? fmt(k.val!) : k.texto}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
export const dynamic = 'force-dynamic'
