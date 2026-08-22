/** Tempo relativo em pt-BR (estilo YouTube: "há 2 dias"). */
export function timeAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'agora'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `há ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs} h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `há ${days} ${days > 1 ? 'dias' : 'dia'}`
  const months = Math.floor(days / 30)
  if (months < 12) return `há ${months} ${months > 1 ? 'meses' : 'mês'}`
  const years = Math.floor(months / 12)
  return `há ${years} ${years > 1 ? 'anos' : 'ano'}`
}
