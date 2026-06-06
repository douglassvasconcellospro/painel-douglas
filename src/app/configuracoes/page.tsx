'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

import { PluggyConnect } from 'pluggy-connect-sdk'

type Config = Record<string, string>

const CAMPOS = [
  { key: 'nome_admin',  label: 'Nome completo',              type: 'text',   placeholder: 'Seu nome' },
  { key: 'email_admin', label: 'Email',                       type: 'email',  placeholder: 'seu@email.com' },
  { key: 'telefone',    label: 'Telefone / WhatsApp',         type: 'text',   placeholder: '(00) 00000-0000' },
  { key: 'empresa',     label: 'Nome da empresa',             type: 'text',   placeholder: 'Ex: DV Finanças' },
  { key: 'meta_mensal', label: '📈 Meta de Receita mensal (R$)', type: 'number', placeholder: '50000' },
  { key: 'meta_lucro',  label: '💰 Meta de Lucro mensal (R$)',   type: 'number', placeholder: '20000' },
]

const CAMPOS_SALDO = [
  { key: 'saldo_nubank',         label: '🟣 Saldo Nubank (Conta)',     type: 'number', placeholder: '0.00' },
  { key: 'limite_cartao_nubank', label: '💳 Limite Cartão Nubank',     type: 'number', placeholder: '0.00' },
]

export default function Configuracoes() {
  const [config, setConfig] = useState<Config>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando]       = useState(false)
  const [sucesso, setSucesso]         = useState(false)
  const [adminUser, setAdminUser]     = useState<{ email?: string } | null>(null)
  const [pluggyStatus, setPluggyStatus] = useState<'idle'|'loading'|'ok'|'error'>('idle')
  const [pluggyMsg, setPluggyMsg]     = useState('')
  // Trocar senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [trocandoSenha, setTrocandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [sucessoSenha, setSucessoSenha] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: rows }, { data: { user } }] = await Promise.all([
      supabase.from('configuracoes').select('chave,valor'),
      supabase.auth.getUser(),
    ])
    const map: Config = {}
    for (const r of (rows || [])) map[r.chave] = r.valor || ''
    setConfig(map)
    setAdminUser(user ? { email: user.email } : null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault()
    setErroSenha('')
    setSucessoSenha(false)

    if (!senhaAtual) { setErroSenha('Digite sua senha atual.'); return }
    if (novaSenha.length < 6) { setErroSenha('A nova senha deve ter pelo menos 6 caracteres.'); return }
    if (novaSenha !== confirmarSenha) { setErroSenha('A nova senha e a confirmação não coincidem.'); return }
    if (senhaAtual === novaSenha) { setErroSenha('A nova senha deve ser diferente da atual.'); return }

    setTrocandoSenha(true)

    // Verificar senha atual fazendo login com ela
    const { error: erroLogin } = await supabase.auth.signInWithPassword({
      email: adminUser?.email || '',
      password: senhaAtual,
    })

    if (erroLogin) {
      setErroSenha('❌ Senha atual incorreta. Tente novamente.')
      setTrocandoSenha(false)
      return
    }

    // Senha atual correta — atualizar para a nova
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) {
      setErroSenha('Erro ao atualizar senha. Tente novamente.')
    } else {
      setSucessoSenha(true)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
      setTimeout(() => setSucessoSenha(false), 4000)
    }
    setTrocandoSenha(false)
  }

  async function conectarPluggy() {
    setPluggyStatus('loading'); setPluggyMsg('')
    try {
      const { PluggyConnect } = await import('pluggy-connect-sdk')
      const res = await fetch('/api/pluggy/token')
      const { token, error } = await res.json()
      if (error) throw new Error(error)

      new PluggyConnect({
        connectToken: token,
        onSuccess: async ({ item }: any) => {
          await supabase.from('configuracoes').upsert(
            [{ chave: 'pluggy_nubank_item_id', valor: item.id, updated_at: new Date().toISOString() }],
            { onConflict: 'chave' }
          )
          setConfig(c => ({ ...c, pluggy_nubank_item_id: item.id }))
          setPluggyStatus('ok')
          setPluggyMsg('✅ Nubank conectado com sucesso!')
        },
        onError: (err: any) => {
          setPluggyStatus('error')
          setPluggyMsg(`❌ Erro: ${err?.message || 'Tente novamente'}`)
        },
        onClose: () => { if (pluggyStatus === 'loading') setPluggyStatus('idle') },
      }).init()
    } catch (err: any) {
      setPluggyStatus('error')
      setPluggyMsg(`❌ ${err.message}`)
    }
  }

  async function desconectarPluggy() {
    await supabase.from('configuracoes').delete().eq('chave', 'pluggy_nubank_item_id')
    setConfig(c => { const n = { ...c }; delete n.pluggy_nubank_item_id; return n })
    setPluggyStatus('idle'); setPluggyMsg('')
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setSucesso(false)

    const upserts = Object.entries(config).map(([chave, valor]) => ({
      chave,
      valor,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('configuracoes').upsert(upserts, { onConflict: 'chave' })
    if (!error) { setSucesso(true); setTimeout(() => setSucesso(false), 3000) }
    setSalvando(false)
  }

  const metaMensal = parseFloat(config.meta_mensal || '0')

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Configurações</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Dados do painel e preferências do admin</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

          {/* Formulário */}
          <form onSubmit={salvar} style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginTop: 0, marginBottom: '20px' }}>📋 Dados do Perfil</h3>
            {CAMPOS.map(({ key, label, type, placeholder }) => (
              <div key={key} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>{label}</label>
                <input type={type} value={config[key] || ''} onChange={e => setConfig({ ...config, [key]: e.target.value })} placeholder={placeholder}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                  onFocus={e => (e.target.style.borderColor = '#4f46e5')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
              </div>
            ))}

            {/* Saldos e Limites Nubank */}
            <div style={{ height: '1px', background: '#f3f4f6', margin: '20px 0' }} />
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginTop: 0, marginBottom: '16px' }}>💳 Saldos & Limites (Nubank)</h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '-10px', marginBottom: '14px' }}>Atualize manualmente quando verificar no app Nubank</p>
            {CAMPOS_SALDO.map(({ key, label, type, placeholder }) => (
              <div key={key} style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>{label}</label>
                <input type={type} value={config[key] || ''} onChange={e => setConfig({ ...config, [key]: e.target.value })} placeholder={placeholder}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                  onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
              </div>
            ))}
            {sucesso && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#15803d' }}>
                ✅ Configurações salvas com sucesso!
              </div>
            )}
            <button type="submit" disabled={salvando}
              style={{ width: '100%', padding: '12px', background: salvando ? '#c7d2fe' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer' }}>
              {salvando ? '⏳ Salvando...' : '💾 Salvar Configurações'}
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Info da conta */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginTop: 0, marginBottom: '16px' }}>🔐 Conta Admin</h3>
              {[
                { label: 'Email', value: adminUser?.email || '—' },
                { label: 'Perfil', value: '🛡 Administrador' },
                { label: 'Acesso', value: '✅ Total' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Trocar senha */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginTop: 0, marginBottom: '16px' }}>🔑 Alterar Senha</h3>
              <form onSubmit={trocarSenha}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>Senha atual</label>
                  <input
                    type="password"
                    value={senhaAtual}
                    onChange={e => setSenhaAtual(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                    onFocus={e => (e.target.style.borderColor = '#4f46e5')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>
                <div style={{ height: '1px', background: '#f3f4f6', margin: '14px 0' }} />
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>Nova senha</label>
                  <input
                    type="password"
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                    onFocus={e => (e.target.style.borderColor = '#4f46e5')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>Confirmar nova senha</label>
                  <input
                    type="password"
                    value={confirmarSenha}
                    onChange={e => setConfirmarSenha(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
                    onFocus={e => (e.target.style.borderColor = '#4f46e5')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>
                {erroSenha && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#dc2626' }}>
                    ❌ {erroSenha}
                  </div>
                )}
                {sucessoSenha && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#15803d' }}>
                    ✅ Senha alterada com sucesso!
                  </div>
                )}
                <button
                  type="submit"
                  disabled={trocandoSenha || !senhaAtual || !novaSenha || !confirmarSenha}
                  style={{ width: '100%', padding: '11px', background: (trocandoSenha || !senhaAtual || !novaSenha || !confirmarSenha) ? '#c7d2fe' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: (trocandoSenha || !senhaAtual || !novaSenha || !confirmarSenha) ? 'not-allowed' : 'pointer' }}
                >
                  {trocandoSenha ? '⏳ Salvando...' : '🔐 Salvar nova senha'}
                </button>
              </form>
            </div>

            {/* Meta mensal */}
            {metaMensal > 0 && (
              <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginTop: 0, marginBottom: '8px' }}>🎯 Meta Mensal Configurada</h3>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#4f46e5' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaMensal)}
                </div>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0' }}>Receita alvo por mês</p>
              </div>
            )}

            {/* Nubank via Pluggy */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginTop: 0, marginBottom: '6px' }}>🟣 Nubank — Open Finance</h3>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: 0, marginBottom: '16px', lineHeight: 1.5 }}>
                Conexão oficial via Open Finance BR (Pluggy).<br/>
                <strong style={{ color: '#7c3aed' }}>Somente leitura</strong> — nunca faz transferências, compras ou solicita cartão.
              </p>

              {config.pluggy_nubank_item_id ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '12px', border: '1px solid #bbf7d0' }}>
                    <span style={{ fontSize: '18px' }}>✅</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>Nubank conectado</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>ID: {config.pluggy_nubank_item_id.slice(0, 16)}...</div>
                    </div>
                  </div>
                  <button onClick={desconectarPluggy}
                    style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                    🔌 Desconectar
                  </button>
                </div>
              ) : (
                <button onClick={conectarPluggy} disabled={pluggyStatus === 'loading'}
                  style={{ width: '100%', padding: '11px', background: pluggyStatus === 'loading' ? '#ede9fe' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: pluggyStatus === 'loading' ? 'not-allowed' : 'pointer' }}>
                  {pluggyStatus === 'loading' ? '⏳ Abrindo conexão...' : '🔗 Conectar Nubank'}
                </button>
              )}

              {pluggyMsg && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: pluggyStatus === 'ok' ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', fontSize: '13px', color: pluggyStatus === 'ok' ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                  {pluggyMsg}
                </div>
              )}
            </div>

            {/* Integrações */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginTop: 0, marginBottom: '16px' }}>🔗 Integrações Ativas</h3>
              {[
                { nome: 'Supabase (PostgreSQL)', desc: 'Todos os dados salvos' },
                { nome: 'Vercel', desc: 'Deploy automático' },
                { nome: 'Nubank', desc: 'Import via .ofx' },
                { nome: 'Asaas', desc: 'Import via .xlsx' },
              ].map(i => (
                <div key={i.nome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{i.nome}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{i.desc}</div>
                  </div>
                  <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>Ativo</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export const dynamic = 'force-dynamic'
