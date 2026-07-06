import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, publicImageUrl } from '../lib/supabase'

/** Perfil público do torcedor (1:1 com auth.users, tabela `profiles`). */
export interface Profile {
  displayName: string
  playerId: string | null
  isAdmin: boolean
  avatarUrl: string | null // foto do jogador vinculado; null = avatar padrão
}

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  /** Cadastra e-mail+senha; retorna se a conta precisa de confirmação por e-mail. */
  signUp: (
    email: string,
    password: string,
    displayName: string,
    playerId: string | null,
  ) => Promise<{ needsConfirmation: boolean }>
  /** Atualiza nome de exibição e jogador vinculado do usuário logado. */
  updateProfile: (displayName: string, playerId: string | null) => Promise<void>
  signOut: () => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

/** Carrega o perfil do usuário (nome, jogador vinculado, admin) e resolve o avatar. */
async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, player_id, is_admin, players(photo_path)')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  // Relação to-one: em runtime vem um objeto (ou null), mas o supabase-js infere
  // como array sem os tipos gerados — normaliza via unknown.
  const player = data.players as unknown as { photo_path: string | null } | null
  return {
    displayName: data.display_name as string,
    playerId: (data.player_id as string | null) ?? null,
    isAdmin: (data.is_admin as boolean) ?? false,
    avatarUrl: publicImageUrl('players', player?.photo_path ?? null),
  }
}

/**
 * Provê o estado de sessão do Supabase Auth para todo o app (torcedores e admin).
 * Além da sessão, expõe o `profile` (nome, avatar do jogador, is_admin).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function sync(s: Session | null) {
      if (!alive) return
      setLoading(true)
      setSession(s)
      const p = s ? await loadProfile(s.user.id) : null
      if (!alive) return
      setProfile(p)
      setLoading(false)
    }

    void supabase.auth.getSession().then(({ data }) => sync(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      void sync(s)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(
    email: string,
    password: string,
    displayName: string,
    playerId: string | null,
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, player_id: playerId ?? '' } },
    })
    if (error) throw error
    return { needsConfirmation: !data.session }
  }

  async function updateProfile(displayName: string, playerId: string | null) {
    if (!session) throw new Error('Faça login para editar o perfil.')
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, player_id: playerId })
      .eq('id', session.user.id)
    if (error) throw error
    setProfile(await loadProfile(session.user.id))
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthCtx.Provider
      value={{ session, profile, loading, signIn, signUp, updateProfile, signOut }}
    >
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
