export type MotivationalContext = {
  streak: number
  totalWorkouts: number
  currentPhase: number
  weekRate: number
  daysSinceStart: number
  completedToday: boolean
  isRestDay: boolean
  justStarted: boolean
  justAdvancedPhase: boolean
  currentWeek: number
}

export interface MotivationalPhrase {
  text: string
  author?: string
  emoji: string
}

// ─── Frases por contexto ────────────────────────────────────────────────────

const phrasesFirstDays: MotivationalPhrase[] = [
  { text: 'El primer paso siempre es el más difícil. Ya lo diste.', emoji: '🌱' },
  { text: 'No se trata de estar listo. Se trata de empezar.', emoji: '🚀' },
  { text: 'Un cuerpo en movimiento tiende a seguir en movimiento.', author: 'Isaac Newton', emoji: '⚡' },
  { text: 'Bienvenido de vuelta. Tu cuerpo recuerda más de lo que crees.', emoji: '🧠' },
]

const phrasesRestDay: MotivationalPhrase[] = [
  { text: 'El descanso no es debilidad — es donde ocurre la recuperación y el crecimiento.', emoji: '😴' },
  { text: 'Los músculos no crecen durante el ejercicio, sino durante el descanso. Aprovéchalo.', emoji: '🔋' },
  { text: 'El día de descanso es parte del programa, no una excepción.', emoji: '🗓️' },
  { text: 'Hoy tu cuerpo consolida el trabajo de ayer. El proceso sigue aunque no estés en movimiento.', emoji: '🌿' },
  { text: 'La sobreentrenamiento es tan real como el sedentarismo. Descansar es entrenar inteligente.', emoji: '🎯' },
]

const phrasesLowStreak: MotivationalPhrase[] = [
  { text: 'No importa cuántas veces hayas frenado. Solo importa cuántas veces reempiezas.', emoji: '🔄' },
  { text: 'Un entrenamiento imperfecto siempre supera al entrenamiento perfecto que no ocurrió.', emoji: '💪' },
  { text: 'La consistencia no es hacer todo perfecto — es no rendirse cuando no fue perfecto.', emoji: '🧱' },
  { text: 'Retomar es una habilidad. Y la estás practicando.', emoji: '🌅' },
]

const phrasesGoodStreak: MotivationalPhrase[] = [
  { text: '{streak} sesiones consecutivas. La disciplina ya no es un esfuerzo — se está volviendo identidad.', emoji: '🔥' },
  { text: 'Con {streak} días de racha, tu sistema nervioso ya espera el estímulo. Eso es hábito.', emoji: '🧬' },
  { text: 'Cada día que apareces refuerza la creencia de que eres alguien que se mueve. Sigue.', emoji: '⭐' },
  { text: '{streak} días. Los resultados son inevitables cuando la consistencia se convierte en tu estándar.', emoji: '📈' },
]

const phrasesHighStreak: MotivationalPhrase[] = [
  { text: '{streak} sesiones. No eres principiante — eres alguien que eligió cambiar y lo está cumpliendo.', emoji: '🏆' },
  { text: 'A estas alturas tu cerebro ya produjo cambios estructurales reales. Eso no se improvisa.', emoji: '🧠' },
  { text: 'Semana tras semana. Sesión tras sesión. Esto ya no es motivación — es carácter.', emoji: '💎' },
]

const phrasesPhaseAdvance: MotivationalPhrase[] = [
  { text: '¡Nueva fase! Cada etapa superada es evidencia de que eres capaz de más de lo que creías.', emoji: '🎯' },
  { text: 'Avanzaste de fase. Tu cuerpo está listo para el siguiente estímulo. El progreso es real.', emoji: '📊' },
  { text: 'El programa avanza porque tú avanzaste primero. Bien hecho.', emoji: '🚀' },
]

const phrasesWeekComplete: MotivationalPhrase[] = [
  { text: 'Semana completa. Tu futuro yo ya te lo está agradeciendo.', emoji: '✅' },
  { text: 'Completar una semana de entrenamiento es más raro de lo que parece. Tú lo hiciste.', emoji: '🎉' },
  { text: 'Una semana más de adaptación acumulada. Los resultados son consecuencia — sigue el proceso.', emoji: '🔬' },
]

const phrasesCompletedToday: MotivationalPhrase[] = [
  { text: 'Entrenamiento registrado. Lo que se mide, mejora.', emoji: '📝' },
  { text: 'Un día más de estímulo. Tu cuerpo está respondiendo, aunque no siempre se vea en el espejo todavía.', emoji: '🔬' },
  { text: 'Lo hiciste. No todos los días lo hacen. Eso te distingue.', emoji: '✨' },
  { text: 'Pasaste de la intención a la acción. Eso es lo único que importa.', emoji: '⚡' },
]

const phrasesPhase1: MotivationalPhrase[] = [
  { text: 'Esta fase parece fácil por diseño — el objetivo es programar tu sistema nervioso, no agotarte.', emoji: '🧩' },
  { text: 'Las primeras semanas son inversión neurológica. El cuerpo aprende movimientos antes de cargarlos.', emoji: '🧠' },
  { text: 'La base que construyes ahora determina cuánto peso cargarás después sin lesionarte.', emoji: '🏗️' },
]

const phrasesPhase2: MotivationalPhrase[] = [
  { text: 'Ya empezaste a construir músculo. No lo verás todavía, pero el proceso bioquímico ya inició.', emoji: '🔬' },
  { text: 'El agujetas (DOMS) que sientes no es daño — es la señal de que el músculo está adaptando.', emoji: '💪' },
  { text: 'La fuerza que ganas ahora protegerá tus rodillas cuando empieces a correr.', emoji: '🛡️' },
]

const phrasesPhase3: MotivationalPhrase[] = [
  { text: 'Cuatro días de entrenamiento. Estás operando como un atleta aficionado serio.', emoji: '🏅' },
  { text: 'En esta fase el volumen sube. La incomodidad es señal de progreso, no de error.', emoji: '📈' },
  { text: 'El curl nórdico que haces hoy reduce a la mitad el riesgo de lesión de isquiotibiales al correr.', author: 'Petersen et al., 2011', emoji: '🔬' },
]

const phrasesPhase4: MotivationalPhrase[] = [
  { text: 'Bienvenido al gimnasio. La carga externa acelera el proceso que los ejercicios corporales iniciaron.', emoji: '🏋️' },
  { text: 'Con barra o mancuernas, la mecánica que aprendiste en casa es exactamente la misma. Solo hay más resistencia.', emoji: '⚖️' },
  { text: 'La fuerza que desarrolles ahora no solo te hará mejor corredor — te protegerá de lesiones en años.', emoji: '🛡️' },
]

const phrasesPhase5: MotivationalPhrase[] = [
  { text: 'Cada intervalo de trote es una inversión en articulaciones más fuertes y tejido conectivo más resiliente.', emoji: '🏃' },
  { text: 'Empieza despacio para que puedas correr para siempre. La paciencia aquí es literal.', emoji: '⏳' },
  { text: 'La cadencia alta (160-170 pasos/min) reduce el impacto en rodillas hasta un 30%. Cuéntala.', author: 'Heiderscheit et al., 2011', emoji: '🔬' },
]

const phrasesGeneral: MotivationalPhrase[] = [
  { text: 'El cuerpo logra lo que la mente cree posible.', emoji: '🧠' },
  { text: 'No tienes que ser bueno para empezar, pero sí tienes que empezar para ser bueno.', author: 'Zig Ziglar', emoji: '🌟' },
  { text: 'No compitas con nadie. Solo sé mejor que quien eras ayer.', emoji: '📅' },
  { text: 'La motivación te lleva a empezar. El hábito te mantiene.', emoji: '⚙️' },
  { text: 'Un 1% mejor cada día es un 37x mejor al año.', author: 'James Clear, Atomic Habits', emoji: '📐' },
  { text: 'No existe una versión de ti que lo logró sin aparecer cuando no tenía ganas.', emoji: '💡' },
  { text: 'El proceso es el resultado. Cada sesión ya es el objetivo, no solo el camino.', emoji: '🎯' },
  { text: 'Los resultados que buscas son la suma de decisiones ordinarias tomadas consistentemente.', emoji: '🧱' },
]

// ─── Selector de frase ───────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function selectMotivationalPhrase(ctx: MotivationalContext): MotivationalPhrase {
  const candidates: MotivationalPhrase[] = []

  if (ctx.justStarted && ctx.totalWorkouts <= 3) {
    candidates.push(...phrasesFirstDays)
  }

  if (ctx.justAdvancedPhase) {
    candidates.push(...phrasesPhaseAdvance)
    return pickRandom(candidates)
  }

  if (ctx.isRestDay) {
    candidates.push(...phrasesRestDay)
    return pickRandom(candidates)
  }

  if (ctx.completedToday) {
    candidates.push(...phrasesCompletedToday)
    if (ctx.weekRate >= 1) candidates.push(...phrasesWeekComplete)
  }

  if (ctx.streak >= 20) candidates.push(...phrasesHighStreak)
  else if (ctx.streak >= 7) candidates.push(...phrasesGoodStreak)
  else if (ctx.streak <= 1 && ctx.totalWorkouts > 3) candidates.push(...phrasesLowStreak)

  const phaseMap: Record<number, MotivationalPhrase[]> = {
    1: phrasesPhase1,
    2: phrasesPhase2,
    3: phrasesPhase3,
    4: phrasesPhase4,
    5: phrasesPhase5,
  }
  if (phaseMap[ctx.currentPhase]) candidates.push(...phaseMap[ctx.currentPhase])

  if (candidates.length === 0) candidates.push(...phrasesGeneral)

  const phrase = pickRandom(candidates)
  return {
    ...phrase,
    text: phrase.text
      .replace('{streak}', String(ctx.streak))
      .replace('{totalWorkouts}', String(ctx.totalWorkouts))
      .replace('{phase}', String(ctx.currentPhase)),
  }
}
