import { addDays, format, parseISO } from 'date-fns'
import { describe, expect, it } from 'vitest'
import {
  bmr,
  checkPlan,
  etaDay,
  goalsFor,
  kcalGoalReached,
  rateForTarget,
  rateWarning,
  tdeeOf,
  weightTrend,
  type NutritionPlan,
} from './calorieCalc'

const day = (n: number) => format(addDays(parseISO('2026-11-01'), n), 'yyyy-MM-dd')
const profile = { sex: 'm' as const, age: 25, height: 180, weight: 80, activity: 2 }

describe('Kalorienrechner', () => {
  it('rechnet Grund- und Gesamtumsatz (Mifflin-St Jeor)', () => {
    expect(bmr(profile)).toBe(1805)
    expect(bmr({ ...profile, sex: 'f' })).toBe(1639)
    expect(Math.round(tdeeOf(profile))).toBe(2798)
  })

  it('rechnet Tempo aus Zielgewicht und Datum', () => {
    expect(rateForTarget(80, 76, '2026-11-01', '2026-12-27')).toBeCloseTo(-0.5)
    expect(rateForTarget(80, 76, '2026-11-01', '2026-11-01')).toBe(0)
  })

  it('warnt bei zu schnellem Tempo', () => {
    expect(rateWarning(-0.5, 80)).toBe('')
    expect(rateWarning(-1, 80)).not.toBe('')
    expect(rateWarning(0.75, 80)).not.toBe('')
  })

  it('setzt kcal und Makros', () => {
    const g = goalsFor(2800, -0.5, 80, 'm', 'lose')
    expect(g.kcal).toBe(2250)
    expect(g.protein).toBe(176)
    expect(g.fat).toBe(72)
    expect(g.carbs).toBe(Math.round((2250 - 176 * 4 - 72 * 9) / 4))
    expect(g.water).toBe(2750)
    expect(goalsFor(1500, -1, 60, 'f', 'lose')).toMatchObject({ kcal: 1200, floored: true })
  })

  it('schätzt das Zieldatum', () => {
    expect(etaDay(80, 76, -0.5, '2026-11-01')).toBe('2026-12-27')
    expect(etaDay(80, 76, 0.5, '2026-11-01')).toBeNull()
  })

  it('wertet das Kalorienziel je nach Ziel-Art', () => {
    expect(kcalGoalReached(2100, 2200, 'lose')).toBe(true)
    expect(kcalGoalReached(2300, 2200, 'lose')).toBe(false)
    expect(kcalGoalReached(1000, 2200, 'lose')).toBe(false)
    expect(kcalGoalReached(2400, 2200, 'keep')).toBe(true)
    expect(kcalGoalReached(2500, 2200, 'keep')).toBe(false)
    expect(kcalGoalReached(2200, 2200, 'gain')).toBe(true)
  })
})

describe('2-Wochen-Prüfung', () => {
  const plan: NutritionPlan = {
    mode: 'lose',
    rate: -0.5,
    ...profile,
    tdee: 2800,
    kcal: 2250,
    calculatedDay: day(0),
    nextCheckDay: day(14),
  }
  const intake = Array.from({ length: 14 }, (_, i) => ({ day: day(i), kcal: 2250 }))
  const noisy = (perWeek: number) =>
    Array.from({ length: 8 }, (_, i) => ({ day: day(i * 2), weight: 80 + (perWeek / 7) * i * 2 + (i % 2 ? 0.4 : -0.4) }))

  it('erkennt den Trend trotz Schwankungen', () => {
    expect(weightTrend(noisy(-0.5))!.perWeek).toBeCloseTo(-0.5, 0)
  })

  it('fragt nicht, wenn es passt oder zu früh ist', () => {
    expect(checkPlan(plan, noisy(-0.4), intake, day(14))).toBeNull()
    expect(checkPlan(plan, noisy(0), intake, day(13))).toBeNull()
  })

  it('fragt, wenn das Gewicht deutlich anders läuft', () => {
    const r = checkPlan(plan, noisy(0), intake, day(14))!
    expect(r).not.toBeNull()
    expect(r.actualRate).toBeCloseTo(0, 0)
    expect(Math.abs(r.newTdee - 2250)).toBeLessThan(250)
    expect(r.goals.kcal).toBeLessThan(plan.kcal)
  })

  it('fragt nicht, wenn das Ziel nicht eingehalten wurde', () => {
    const over = intake.map((d) => ({ ...d, kcal: 2800 }))
    expect(checkPlan(plan, noisy(0), over, day(14))).toBeNull()
    expect(checkPlan(plan, noisy(0), intake.slice(0, 6), day(14))).toBeNull()
  })

  it('braucht genug Wiegungen', () => {
    expect(checkPlan(plan, noisy(0).slice(0, 3), intake, day(14))).toBeNull()
  })
})
