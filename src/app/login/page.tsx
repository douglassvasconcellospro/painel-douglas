'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'forgot'

export default function Login() {
  const [email, setEmail] = useState('douglasvasconcellosatleta@gmail.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [mode, setMode] = useState<Mode>('login')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha incorretos. Tente novamente.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError('Erro ao enviar email. Verifique o endereço e tente novamente.')
    } else {
      setSuccessMsg('✅ Email enviado! Verifique sua caixa de entrada do Gmail.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '44px 40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Barra decorativa no topo */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #db2777)',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '20px',
            boxShadow: '0 8px 24px rgba(79,70,229,0.4)',
          }}>DV</div>

          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 6px',
          }}>
            {mode === 'login' ? '🔐 Acesso Restrito' : '📧 Recuperar Senha'}
          </h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
            {mode === 'login'
              ? 'Painel Financeiro — Douglas Vasconcellos'
              : 'Enviaremos um link seguro para o seu email'}
          </p>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleForgotPassword}>

          {/* Campo email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '13px 16px',
                border: '1.5px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                background: '#fafafa',
              }}
              onFocus={e => (e.target.style.borderColor = '#4f46e5')}
              onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          {/* Campo senha — só no modo login */}
          {mode === 'login' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
              }}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#fafafa',
                }}
                onFocus={e => (e.target.style.borderColor = '#4f46e5')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>
          )}

          {mode === 'forgot' && <div style={{ height: '8px' }} />}

          {/* Mensagem de erro */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              ❌ {error}
            </div>
          )}

          {/* Mensagem de sucesso */}
          {successMsg && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#15803d',
            }}>
              {successMsg}
            </div>
          )}

          {/* Botão principal */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading
                ? '#c7d2fe'
                : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '16px',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(79,70,229,0.35)',
              transition: 'all 0.2s',
            }}
          >
            {loading
              ? '⏳ Aguarde...'
              : mode === 'login'
              ? '→ Entrar no Painel'
              : '📧 Enviar link de recuperação'}
          </button>

          {/* Link Esqueci/Voltar */}
          <div style={{ textAlign: 'center' }}>
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setSuccessMsg('') }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  padding: '4px',
                }}
              >
                Esqueci minha senha
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg('') }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  padding: '4px',
                }}
              >
                ← Voltar para o login
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
