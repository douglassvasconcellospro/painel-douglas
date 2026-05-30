'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Erro ao atualizar senha. O link pode ter expirado. Solicite um novo.')
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2500)
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
        background: '#fff',
        borderRadius: '24px',
        padding: '44px 40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #db2777)',
        }} />

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Senha atualizada!
            </h2>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>
              Redirecionando para o painel...
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
                Criar Nova Senha
              </h1>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
                Defina uma nova senha segura para o painel
              </p>
            </div>

            <form onSubmit={handleReset}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}>Nova senha</label>
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

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}>Confirmar senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
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

              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#dc2626',
                }}>
                  ❌ {error}
                </div>
              )}

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
                  boxShadow: loading ? 'none' : '0 4px 12px rgba(79,70,229,0.35)',
                }}
              >
                {loading ? '⏳ Salvando...' : '🔐 Salvar nova senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
