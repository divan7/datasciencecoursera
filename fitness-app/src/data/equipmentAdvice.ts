export type LocationMode = 'home' | 'gym'
export type AdviceSeverity = 'info' | 'tip' | 'warning' | 'critical'

export interface PhaseEquipmentAdvice {
  required: LocationMode | 'both'
  title: string
  message: string
  mismatchWarning?: string
  mismatchSeverity?: AdviceSeverity
  gymUpgrade?: string
}

export const phaseEquipmentAdvice: Record<number, PhaseEquipmentAdvice> = {
  1: {
    required: 'home',
    title: '100 % en casa',
    message:
      'Esta fase solo requiere espacio en el suelo. Ningún equipamiento adicional. El objetivo es neurológico, no de carga — el peso de tu cuerpo es suficiente y es lo correcto en este punto.',
  },
  2: {
    required: 'home',
    title: '100 % en casa',
    message:
      'Sigues en casa con peso corporal. Opcional: una banda elástica de resistencia media para los remos mejora la sesión de jalón. Si tienes acceso al gym, puedes hacerlo ahí, pero no hay diferencia significativa en resultados a esta etapa.',
    gymUpgrade:
      'En el gym: sustituye el remo con banda por remo en polea baja (mismo patrón, mejor carga progresiva).',
  },
  3: {
    required: 'home',
    title: 'Casa · Gimnasio opcional pero recomendado',
    message:
      'Esta fase es ejecutable en casa, pero el gym desbloquea dos ventajas importantes: (1) el curl nórdico con sujección de pies fija — más seguro y controlable que la versión libre; (2) la polea para remos de espalda, que permite progresar la carga de forma continua. Si tienes acceso, úsalo al menos para estas dos sesiones.',
    gymUpgrade:
      'Con gym: add remo en polea baja + curl nórdico con anclaje de pies. El resto puede seguir en casa.',
  },
  4: {
    required: 'gym',
    title: 'Gimnasio obligatorio',
    message:
      'La Fase 4 fue diseñada 100 % para gimnasio: prensa de piernas, polea alta, polea baja, mancuernas y barra. Sin este equipamiento no es posible ejecutar la progresión de carga que requiere esta fase.',
    mismatchWarning:
      'Estás en modo Casa pero esta fase requiere gimnasio. No intentes sustituir los ejercicios — el principio de sobrecarga progresiva con peso corporal ya tocó su techo en la Fase 3. Si aún no tienes acceso al gym, extiende la Fase 3 (semanas adicionales de volumen) hasta conseguirlo. Es mejor llegar bien que llegar antes.',
    mismatchSeverity: 'critical',
  },
  5: {
    required: 'both',
    title: 'Gimnasio + exterior',
    message:
      'Las sesiones de fuerza (3×/semana) requieren el gimnasio de la Fase 4. Las sesiones de trote-caminata son al aire libre o en cinta. No sacrifiques la sesión de fuerza por la de carrera — la fuerza protege tus rodillas al correr.',
    mismatchWarning:
      'Sin acceso al gym, sustituye las sesiones de fuerza por los ejercicios de la Fase 3 en casa. El progreso de fuerza será más lento, pero las sesiones de carrera pueden continuar sin problema.',
    mismatchSeverity: 'warning',
  },
}

export function getEquipmentMismatch(
  phaseId: number,
  activeLocation: LocationMode
): { hasConflict: boolean; severity: AdviceSeverity; message: string } | null {
  const advice = phaseEquipmentAdvice[phaseId]
  if (!advice?.mismatchWarning) return null
  if (advice.required === 'both') {
    if (activeLocation === 'home') {
      return { hasConflict: true, severity: advice.mismatchSeverity!, message: advice.mismatchWarning }
    }
    return null
  }
  if (advice.required !== activeLocation) {
    return { hasConflict: true, severity: advice.mismatchSeverity!, message: advice.mismatchWarning }
  }
  return null
}
