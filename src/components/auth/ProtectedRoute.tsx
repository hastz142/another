import { useEffect, useState, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

type Props = {
  children: ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const location = useLocation()
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return
      setSession(next)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (session === undefined) {
    return (
      <div className="p-8 text-sm text-[var(--aw-text-muted)]">
        Carregando sessão…
      </div>
    )
  }

  if (!session?.user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  return children
}

