export type CesSchedule = {
  exchangeId: string
  intervalMinutes: number
  enabled: boolean
}

export const defaultCesSchedules: CesSchedule[] = [
  { exchangeId: 'NMNI', intervalMinutes: 15, enabled: true },
  { exchangeId: 'NCES', intervalMinutes: 60, enabled: true },
  { exchangeId: 'TSCU', intervalMinutes: 60, enabled: true },
  { exchangeId: 'MOME', intervalMinutes: 60, enabled: true },
  { exchangeId: 'XCPC', intervalMinutes: 60, enabled: true },
  { exchangeId: 'BOND', intervalMinutes: 60, enabled: true },
  { exchangeId: 'HEMP', intervalMinutes: 60, enabled: true }
]

export function dueSchedules(schedules: CesSchedule[], lastRunByExchange: Record<string, string | undefined>, now = new Date()) {
  return schedules.filter((schedule) => {
    if (!schedule.enabled) return false
    const last = lastRunByExchange[schedule.exchangeId]
    if (!last) return true
    const elapsed = now.getTime() - new Date(last).getTime()
    return elapsed >= schedule.intervalMinutes * 60_000
  })
}
