import { supabase, publicImageUrl } from './supabase'

// Subpasta do bucket existente: não interfere na imagem hero do EAFC.
const BUCKET = 'hero'
const FOLDER = 'overwatch'
const FILE = 'cover'

export async function loadOverwatchCover(): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).list(FOLDER, { search: FILE, limit: 100 })
  if (error) throw new Error('Não foi possível carregar a foto de Overwatch.')
  const cover = data?.find((file) => file.name === FILE)
  if (!cover) return null
  return `${publicImageUrl(BUCKET, `${FOLDER}/${FILE}`)}?v=${encodeURIComponent(cover.updated_at ?? cover.id ?? '')}`
}

export async function uploadOverwatchCover(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP.')
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 10 MB.')
  const { error } = await supabase.storage.from(BUCKET).upload(`${FOLDER}/${FILE}`, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '60',
  })
  if (error) throw new Error('Não foi possível enviar a imagem. Confira sua conexão e o acesso de administrador.')
  return `${publicImageUrl(BUCKET, `${FOLDER}/${FILE}`)}?v=${Date.now()}`
}
