// Edite somente esta linha para mudar a data e a hora do countdown.
// Use o formato AAAA-MM-DDTHH:mm:ss-03:00 (horário de Brasília).
// Exemplo: '2026-10-18T20:30:00-03:00' = 18/10/2026 às 20h30.
export const OVERWATCH_LAUNCH = '2026-10-11T00:00:00-03:00'
export const OVERWATCH_LAUNCH_MS = Date.parse(OVERWATCH_LAUNCH)

export function getCountdown(now: number, target = OVERWATCH_LAUNCH_MS) {
  const total = Math.max(0, Math.ceil((target - now) / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    complete: total === 0,
  }
}
