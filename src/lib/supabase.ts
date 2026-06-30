import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Falha cedo e com mensagem clara em vez de erros obscuros de rede depois.
  throw new Error(
    'Supabase nao configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local',
  )
}

export const supabase = createClient(url, anonKey)

/**
 * Resolve a URL publica de um objeto do Storage.
 * @param bucket nome do bucket (ex.: 'players', 'gallery', 'kits', 'hero')
 * @param path   caminho do objeto dentro do bucket (ex.: 'p1.jpeg'); pode ser null
 */
export function publicImageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

/** Gera um nome de objeto unico preservando a extensao do arquivo. */
function uniqueObjectName(file: File): string {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const rand = Math.random().toString(36).slice(2, 8)
  return `${Date.now()}-${rand}.${ext}`
}

/**
 * Sobe uma imagem para um bucket e devolve o caminho (object key) gravado.
 * Requer usuario autenticado (politica de Storage).
 */
export async function uploadImage(bucket: string, file: File): Promise<string> {
  const path = uniqueObjectName(file)
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return path
}

/** Remove uma imagem do bucket (silenciosamente ignora se nao existir). */
export async function removeImage(bucket: string, path: string | null | undefined): Promise<void> {
  if (!path) return
  await supabase.storage.from(bucket).remove([path])
}
