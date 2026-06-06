'use client'
import { useState, useEffect } from 'react'

const PASSOS = [
  {
    icone: '📊',
    titulo: 'Dashboard',
    desc: 'Visão geral do seu financeiro. No topo: saldos em tempo real. Abaixo: KPIs do mês selecionado, metas de receita e lucro, alertas automáticos e gráficos dos últimos 6 meses.',
    dica: '💡 Use o seletor de mês no canto superior direito para navegar entre períodos.',
  },
  {
    icone: '🟣',
    titulo: 'Nubank — Finanças Pessoais',
    desc: 'Tudo do seu Nubank separado: gastos do mês, assinaturas identificadas automaticamente (Netflix, Spotify, Smiles, GymPass...), limite do cartão e saldo da conta.',
    dica: '💡 Para ver as assinaturas, importe seu extrato .ofx em "Importar Extrato". Conecte via Open Finance em Configurações para saldo automático.',
  },
  {
    icone: '🟢',
    titulo: 'Asaas — Financeiro Empresarial',
    desc: 'Dados da sua empresa: saldo Asaas, MRR, cobranças pendentes e vencidas, previsão de caixa 30/60/90 dias e top clientes por receita.',
    dica: '💡 Clique em "Sincronizar Asaas" na página Clientes para importar automaticamente todos os seus clientes.',
  },
  {
    icone: '👥',
    titulo: 'Clientes & Leads',
    desc: '3 colunas: Ativos (assinatura ativa no Asaas), Inativos (sem cobrança), Leads Novos (prospectos manuais). Edite qualquer cliente — ao editar, o sync do Asaas não vai sobrescrever seus dados.',
    dica: '💡 Ao editar um cliente manualmente, ele fica protegido do sync automático.',
  },
  {
    icone: '📥',
    titulo: 'Importar Extrato',
    desc: 'Importe extratos Nubank (.ofx) ou sincronize o Asaas por período. O sistema detecta automaticamente duplicatas — reimportar o mesmo arquivo não duplica os dados.',
    dica: '💡 Para limpar dados errados: use "Limpar por mês" para apagar só um período específico antes de reimportar.',
  },
  {
    icone: '⚙️',
    titulo: 'Configurações',
    desc: 'Defina suas metas mensais de Receita e Lucro, configure o saldo Nubank manual, conecte o Nubank via Open Finance (Pluggy) para saldo automático, e altere sua senha.',
    dica: '💡 Configure a Meta de Lucro para acompanhar o que sobra depois das despesas no Dashboard.',
  },
]

const CHAVE = 'tutorial_v1_dispensado'

export default function Tutorial() {
  const [visivel, setVisivel] = useState(false)
  const [passo, setPasso]     = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dispensado = localStorage.getItem(CHAVE)
      if (!dispensado) setVisivel(true)
    }
  }, [])

  function dispensar() {
    localStorage.setItem(CHAVE, '1')
    setVisivel(false)
  }

  if (!visivel) return null

  const atual = PASSOS[passo]
  const ultimo = passo === PASSOS.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '520px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.3)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', padding: '24px 28px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Tutorial — {passo + 1} de {PASSOS.length}
              </div>
              <div style={{ fontSize: '26px', marginBottom: '6px' }}>{atual.icone}</div>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{atual.titulo}</div>
            </div>
            <button onClick={dispensar} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
          </div>
          {/* Barra de progresso */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
            {PASSOS.map((_, i) => (
              <div key={i} onClick={() => setPasso(i)} style={{
                flex: 1, height: '4px', borderRadius: '99px', cursor: 'pointer',
                background: i <= passo ? '#fff' : 'rgba(255,255,255,0.25)',
                transition: 'background .2s'
              }} />
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '24px 28px' }}>
          <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.65, marginBottom: '16px' }}>
            {atual.desc}
          </p>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
            {atual.dica}
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ padding: '0 28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={dispensar}
            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Não mostrar novamente
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {passo > 0 && (
              <button onClick={() => setPasso(p => p - 1)}
                style={{ padding: '9px 18px', borderRadius: '9px', border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                ← Anterior
              </button>
            )}
            {ultimo ? (
              <button onClick={dispensar}
                style={{ padding: '9px 20px', borderRadius: '9px', border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                ✅ Entendi!
              </button>
            ) : (
              <button onClick={() => setPasso(p => p + 1)}
                style={{ padding: '9px 20px', borderRadius: '9px', border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                Próximo →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
