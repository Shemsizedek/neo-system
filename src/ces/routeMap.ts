import type { CesRecordKind } from './types'

export type CesReadRoute = {
  kind: CesRecordKind
  urlPattern: string
  dataClass: 'PUBLIC' | 'AUTHORIZED'
}

export const legacyCesReadRoutes: CesReadRoute[] = [
  { kind: 'OFFER', urlPattern: '/offer', dataClass: 'PUBLIC' },
  { kind: 'WANT', urlPattern: '/want', dataClass: 'PUBLIC' },
  { kind: 'BALANCE', urlPattern: '/balance', dataClass: 'AUTHORIZED' },
  { kind: 'ACTIVITY', urlPattern: '/trade', dataClass: 'AUTHORIZED' },
  { kind: 'TRANSACTION', urlPattern: '/statement', dataClass: 'AUTHORIZED' }
]

export function routeForKind(kind: CesRecordKind) {
  return legacyCesReadRoutes.find((route) => route.kind === kind)
}
