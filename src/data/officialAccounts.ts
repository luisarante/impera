export const officialAccounts = {
  imperafc: {
    handle: 'imperafc',
    name: 'Impera FC',
    game: 'EAFC',
    initials: 'FC',
    path: '/eafc',
    bio: 'Dentro de campo e nos bastidores. Acompanhe o nosso EAFC.',
  },
  imperaow: {
    handle: 'imperaow',
    name: 'Impera Overwatch',
    game: 'Overwatch',
    initials: 'OW',
    path: '/overwatch',
    bio: 'Um novo jogo. A mesma vontade de vencer. Nosso universo Overwatch.',
  },
} as const

export type OfficialAccount = keyof typeof officialAccounts

// Publicações anteriores à expansão pertencem ao EAFC.
export function resolveOfficialAccount(value: unknown): OfficialAccount {
  return value === 'imperaow' ? 'imperaow' : 'imperafc'
}
