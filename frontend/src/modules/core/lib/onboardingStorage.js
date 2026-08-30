// Los botones de acción del OnboardingWizard (ej. "Ver trabajos") navegan a
// otra ruta — eso desmonta WorkerDashboardPage y con él el wizard. Sin
// persistir el paso, al volver a Inicio el wizard reaparecía siempre desde
// el paso 1, perdiendo el progreso ya hecho.
export const ONBOARDING_STEP_KEY = 'weldix_onboarding_step'

export const readStoredOnboardingStep = (totalSteps) => {
  const raw = Number(localStorage.getItem(ONBOARDING_STEP_KEY))
  return Number.isInteger(raw) && raw >= 0 && raw < totalSteps ? raw : 0
}
