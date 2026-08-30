import { describe, it, expect, beforeEach } from 'vitest'
import { ONBOARDING_STEP_KEY, readStoredOnboardingStep } from './onboardingStorage'

// Bug real: los botones de acción del wizard ("Ver trabajos") navegan a otra
// ruta, desmontando el wizard. Sin persistir el paso, al volver a Inicio
// siempre reaparecía desde el paso 1 — se perdía el progreso.

describe('readStoredOnboardingStep', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('devuelve 0 cuando no hay nada guardado', () => {
    expect(readStoredOnboardingStep(5)).toBe(0)
  })

  it('devuelve el paso guardado si es válido', () => {
    localStorage.setItem(ONBOARDING_STEP_KEY, '2')
    expect(readStoredOnboardingStep(5)).toBe(2)
  })

  it('ignora un valor fuera de rango y devuelve 0', () => {
    localStorage.setItem(ONBOARDING_STEP_KEY, '99')
    expect(readStoredOnboardingStep(5)).toBe(0)
  })

  it('ignora un valor no numérico y devuelve 0', () => {
    localStorage.setItem(ONBOARDING_STEP_KEY, 'no-es-un-numero')
    expect(readStoredOnboardingStep(5)).toBe(0)
  })
})
