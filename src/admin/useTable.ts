import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * CRUD genérico sobre uma tabela do Supabase, ordenada por `sort_order`.
 * Recarrega a lista após cada mutação para manter a UI consistente.
 * `T` é a forma da linha (ex.: PlayerRow); deve ter um campo `id: string`.
 */
export function useTable<T extends { id: string; sort_order?: number }>(table: string) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from(table).select('*').order('sort_order')
    if (error) setError(error.message)
    else setRows((data as T[]) ?? [])
    setLoading(false)
  }, [table])

  useEffect(() => {
    load()
  }, [load])

  const insert = useCallback(
    async (values: Partial<T>) => {
      const { error } = await supabase.from(table).insert(values as never)
      if (error) throw error
      await load()
    },
    [table, load],
  )

  const update = useCallback(
    async (id: string, values: Partial<T>) => {
      const { error } = await supabase.from(table).update(values as never).eq('id', id)
      if (error) throw error
      await load()
    },
    [table, load],
  )

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      await load()
    },
    [table, load],
  )

  /** Próximo sort_order (fim da lista). */
  const nextSortOrder = useCallback(
    () => rows.reduce((max, r) => Math.max(max, r.sort_order ?? 0), 0) + 1,
    [rows],
  )

  return { rows, loading, error, reload: load, insert, update, remove, nextSortOrder }
}
