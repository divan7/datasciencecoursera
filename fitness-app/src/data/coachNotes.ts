// Explicaciones técnicas del coach por fase y por entrenamiento.
// Basadas en los principios de las fuentes científicas del programa.

export interface CoachNote {
  title: string
  sections: CoachSection[]
}

export interface CoachSection {
  heading: string
  body: string
  source?: string
}

// ─── Notas por fase ──────────────────────────────────────────────────────────

export const phaseCoachNotes: Record<number, CoachNote> = {
  1: {
    title: 'Fase 1 — ¿Por qué estos ejercicios?',
    sections: [
      {
        heading: 'El objetivo real de esta fase',
        body: 'Aunque los ejercicios parecen sencillos, el objetivo no es el agotamiento muscular. Las primeras 4 semanas de reentrenamiento producen principalmente adaptaciones neurológicas: el sistema nervioso aprende a reclutar músculos en el orden correcto, a estabilizar articulaciones y a coordinar cadenas musculares completas. Exigirte demasiado en este punto no acelera el proceso — lo interrumpe.',
        source: 'Fisioterapia a tu alcance / Squat University',
      },
      {
        heading: 'Por qué empezamos con glúteos y core',
        body: 'El glúteo medio y el glúteo mayor son los estabilizadores primarios de la rodilla. Cuando están débiles o inhibidos (algo muy común en personas sedentarias), la rótula se desplaza hacia adentro al caminar, correr o bajar escaleras — causando dolor y desgaste. Los ejercicios Bird Dog, Dead Bug y Clamshell activan exactamente estos músculos en un entorno seguro, sin carga axial sobre la rodilla.',
        source: 'Squat University — Dr. Aaron Horschig',
      },
      {
        heading: 'Qué cambios esperar en estas 4 semanas',
        body: 'Semanas 1-2: Posible ligero dolor muscular (DOMS) en glúteos y core. Semanas 3-4: Los ejercicios empezarán a sentirse más fáciles y controlados — eso indica que las conexiones neuromusculares se están consolidando. Es normal NO ver cambios estéticos significativos aún; están ocurriendo cambios internos que son la base de todo lo que viene.',
      },
      {
        heading: 'La ciencia detrás del Cat-Cow y el Bird Dog',
        body: 'Estos ejercicios provienen directamente del "Big 3" de Stuart McGill (Ph.D. en biomecánica espinal de la Universidad de Waterloo). El Bird Dog activa el multífido y el cuadrado lumbar de forma isométrica — exactamente como la columna necesita trabajar durante la carrera. No es un ejercicio de "calentamiento" — es terapéutico y preventivo.',
        source: 'Stuart McGill, "Back Mechanic" / Squat University',
      },
    ],
  },
  2: {
    title: 'Fase 2 — Construyendo la base de fuerza',
    sections: [
      {
        heading: 'De la activación a la fuerza funcional',
        body: 'En la Fase 1 aprendiste los patrones de movimiento. Ahora les añadimos volumen y dificultad para estimular la síntesis proteica muscular. La sentadilla con peso corporal, las zancadas y el push-up trabajan múltiples articulaciones simultáneamente — esto es más eficiente y funcional que los ejercicios de aislamiento.',
        source: 'Jeremy Ethier — Built With Science',
      },
      {
        heading: 'Por qué la zancada hacia atrás es más segura para rodillas',
        body: 'A diferencia de la zancada hacia adelante, la reversa reduce drásticamente la carga de cizalla sobre la articulación de la rodilla delantera. El pie aterriza en una posición donde la tibia permanece más vertical, distribuyendo la carga hacia el glúteo y el cuádriceps proximal. Es la misma razón por la que los fisioterapeutas la utilizan en rehabilitación de ligamentos.',
        source: 'Fisioterapia a tu alcance / Squat University',
      },
      {
        heading: 'Qué cambios esperar',
        body: 'Semanas 5-6: Podrías notar ligero aumento de peso en la báscula — no es grasa, es glucógeno intramuscular y agua que el músculo retiene para la síntesis proteica. Es una señal positiva. Semanas 7-8: Mejora notable en la estabilidad al bajar escaleras, ponerte de pie del suelo y en actividades cotidianas. La fuerza funcional se manifiesta primero en la vida diaria.',
      },
      {
        heading: 'El principio de sobrecarga progresiva',
        body: 'El músculo crece cuando el estímulo supera levemente lo que ya puede manejar — ni demasiado fácil (sin adaptación) ni demasiado difícil (lesión o sobreentrenamiento). En esta fase, la "sobrecarga" viene del aumento de repeticiones y la introducción de ejercicios más complejos, no del peso externo. Esto es deliberado.',
        source: 'Renaissance Periodization — Dr. Mike Israetel',
      },
    ],
  },
  3: {
    title: 'Fase 3 — Fuerza progresiva: el punto de inflexión',
    sections: [
      {
        heading: 'Por qué pasamos a 4 días y división superior/inferior',
        body: 'La división Push/Pull/Legs (o Upper/Lower) permite entrenar más volumen por grupo muscular mientras se garantiza la recuperación suficiente. Cada grupo descansa ~48h entre sesiones, que es el tiempo óptimo de síntesis proteica post-ejercicio. Hacer más de 3 sesiones totales por semana sin esta estructura llevaría a sobreentrenamiento.',
        source: 'Renaissance Periodization — Dr. Mike Israetel',
      },
      {
        heading: 'El curl nórdico: tu seguro de vida para correr',
        body: 'El curl nórdico es el ejercicio excéntrico de isquiotibiales más efectivo estudiado hasta la fecha. Un metaanálisis de 2015 (Petersen et al.) demostró que su práctica regular reduce las lesiones de isquiotibiales en corredores en un 51%. Cada repetición excéntrica de este ejercicio hoy es una probabilidad de lesión menos cuando corras mañana.',
        source: 'Petersen et al., 2011 — AJSM / Squat University',
      },
      {
        heading: 'La sentadilla búlgara: el ejercicio que más duele y más da',
        body: 'La sentadilla búlgara produce una activación de glúteo mayor y cuádriceps superior a la sentadilla con barra en la mayoría de los estudios electromiográficos. Adicionalmente, el trabajo unilateral corrige desequilibrios entre piernas — algo crítico para quien tiene historial de molestias en una rodilla específica.',
        source: 'Jeremy Ethier — análisis EMG / Powerexplosif',
      },
      {
        heading: 'Qué cambios esperar',
        body: 'Semanas 9-12: Los cambios estéticos empiezan a ser visibles — especialmente en glúteos, muslos y hombros. La postura mejora notablemente. Semanas 13-14: La fuerza de piernas habrá aumentado significativamente. Prueba: ¿Puedes subir escaleras de dos en dos sin dificultad? Eso es adaptación real.',
      },
    ],
  },
  4: {
    title: 'Fase 4 — La transición al gimnasio',
    sections: [
      {
        heading: 'Por qué necesitas carga externa ahora',
        body: 'Tu sistema nervioso y tus músculos han alcanzado el techo de adaptación del peso corporal. Para seguir progresando en fuerza e hipertrofia, necesitas estímulo adicional — eso es la barra, la mancuerna o la máquina. La técnica que aprendiste en casa es exactamente la misma; solo cambia la resistencia.',
        source: 'Powerexplosif — David Marchante',
      },
      {
        heading: 'El RDL y el hip thrust: dúo esencial para corredores',
        body: 'El Romanian Deadlift fortalece la cadena posterior completa (isquiotibiales, glúteos, erector espinal) en el patrón de bisagra de cadera — el mismo patrón que usa la zancada al correr. El Hip Thrust es el ejercicio con mayor activación documentada de glúteo mayor. Juntos crean la "maquinaria propulsora" necesaria para correr con eficiencia y sin daño articular.',
        source: 'Jeremy Ethier / Renaissance Periodization',
      },
      {
        heading: 'Por qué el Face Pull es obligatorio en cada sesión',
        body: 'Cada press (banca, hombros) que haces refuerza la rotación interna del hombro. Sin su contraparte — la rotación externa — el manguito rotador se desequilibra y eventualmente desarrolla síndrome de impingement. El Face Pull en polea alta es la corrección más eficiente de este desequilibrio. Jeff Cavaliere (Athlean-X) lo denomina "el ejercicio de seguro del hombro".',
        source: 'Athlean-X — Jeff Cavaliere, PT, CSCS',
      },
      {
        heading: 'Qué cambios esperar',
        body: 'Semanas 15-18: Ganancias de fuerza rápidas al inicio (novice gains con carga externa). Semanas 19-22: Los cambios de composición corporal se aceleran — músculo más denso, postura notablemente más erguida, mejor capacidad funcional en actividades de la vida diaria. Para este punto, la báscula puede subir pero el espejo dirá otra historia.',
      },
    ],
  },
  5: {
    title: 'Fase 5 — Volviendo a correr de forma inteligente',
    sections: [
      {
        heading: 'Por qué no puedes simplemente "salir a correr" todavía',
        body: 'El tejido conjuntivo (tendones, ligamentos, cartílago) tarda 3-4 veces más en adaptarse que el músculo. Aunque sientas las piernas fuertes, empezar a correr directamente sobre tejido conectivo no preparado es la receta para la tendinopatía rotuliana, el síndrome de la banda iliotibial o la fascitis plantar. El protocolo trote-caminata respeta estos tiempos biológicos.',
        source: 'Fisioterapia a tu alcance / Squat University',
      },
      {
        heading: 'La cadencia: el factor más importante para proteger tus rodillas',
        body: 'Correr con una cadencia de 160-170 pasos por minuto (en lugar de los 130-140 de la mayoría de principiantes) reduce las fuerzas de impacto en la rodilla en un 20-30%. No requiere ser más rápido — solo dar pasos más cortos y frecuentes. Usa el metrónomo de tu reloj inteligente o una playlist ajustada a 165 BPM.',
        source: 'Heiderscheit et al., 2011 — Journal of Orthopaedic & Sports Physical Therapy',
      },
      {
        heading: 'Por qué el fartlek trote-caminata funciona',
        body: 'El protocolo de intervalos trote-caminata (popularizado como Couch to 5K) permite acumular minutos de impacto de forma gradual mientras el tejido conectivo se adapta. En cada semana el volumen de trote aumenta solo un ~10% — el umbral de seguridad establecido por la literatura de medicina deportiva para prevenir lesiones por sobreuso.',
        source: 'Fisioterapia a tu alcance',
      },
      {
        heading: 'Qué cambios esperar',
        body: 'Semanas 1-3: Los primeros trotes serán incómodos — "los pulmones antes que las piernas". Es normal. La capacidad aeróbica se desarrolla rápidamente. Semanas 4-6: Empezarás a encontrar un ritmo donde conversar es posible — esa es la Zona 2, tu zona de construcción aeróbica. Semanas 7-10: Los intervalos se integran y correr 20 minutos continuos se vuelve alcanzable.',
      },
    ],
  },
}

// ─── Notas por tipo de sesión ────────────────────────────────────────────────

export const workoutCoachNotes: Record<string, CoachNote> = {
  p1_a: {
    title: '¿Por qué este entrenamiento?',
    sections: [
      {
        heading: 'Activación y estabilidad de core',
        body: 'Esta sesión activa el sistema de estabilización profunda de la columna (transverso del abdomen, multífido) y el complejo glúteo. Es el circuito base de cualquier programa de rehabilitación de rodilla o columna. Antes de levantar pesos, el cuerpo necesita aprender a estabilizarse en los tres planos del movimiento.',
      },
    ],
  },
  p1_b: {
    title: '¿Por qué este entrenamiento?',
    sections: [
      {
        heading: 'Cadena posterior y empuje inicial',
        body: 'El Superman y el Hip Hinge activan la cadena posterior (erector espinal, glúteos, isquiotibiales) — la cadena más importante para correr y la más débil en personas sedentarias. La introducción del push-up con rodillas apoyadas establece el patrón de empuje que evolucionará en fases posteriores.',
      },
    ],
  },
  p1_c: {
    title: '¿Por qué este entrenamiento?',
    sections: [
      {
        heading: 'Estabilidad de rodilla sin impacto',
        body: 'La Wall Sit y el Step-Up trabajan el cuádriceps y el glúteo en forma isométrica y controlada. Son los ejercicios preferidos por fisioterapeutas para fortalecer la rodilla sin carga de impacto ni rotación — ideal para historial de molestias articulares.',
        source: 'Fisioterapia a tu alcance',
      },
    ],
  },
}

// ─── Insight semanal ─────────────────────────────────────────────────────────

export interface WeeklyInsight {
  week: number
  phase: number
  title: string
  body: string
  actionItems: string[]
}

export function getWeeklyInsight(phase: number, week: number): WeeklyInsight {
  const insights: Partial<Record<number, Record<number, WeeklyInsight>>> = {
    1: {
      1: {
        week: 1,
        phase: 1,
        title: 'Semana 1 — El reinicio neuromuscular',
        body: 'Tu sistema nervioso está reaprendiendo a reclutar músculos que han estado "dormidos". Puede que los ejercicios se sientan torpes o que te canses antes de lo esperado — eso es normal y es exactamente lo que debe pasar. No hay nada que acelerar aquí.',
        actionItems: [
          'Prioriza la FORMA sobre las repeticiones — mejor 6 con técnica perfecta que 15 mal hechas',
          'Hidratación: mínimo 2 litros de agua al día; el músculo que trabaja retiene más agua',
          'Sueño: 7-8 horas; es cuando se produce la hormona de crecimiento que repara el músculo',
        ],
      },
      2: {
        week: 2,
        phase: 1,
        title: 'Semana 2 — El primer DOMS real',
        body: 'Si la semana pasada fue activación, esta semana puede aparecer el DOMS (dolor muscular tardío) entre 24-48 horas después del entrenamiento. Es el resultado de micro-roturas musculares que el cuerpo reparará más gruesas y fuertes. No es daño — es señal de que el proceso funciona.',
        actionItems: [
          'Si el dolor es intenso: camina, nada o haz movilidad suave en los días de descanso',
          'No confundas el dolor DOMS (muscular, difuso) con dolor articular (localizado, punzante)',
          'Come suficiente proteína: ~1.6g por kg de peso corporal al día',
        ],
      },
      3: {
        week: 3,
        phase: 1,
        title: 'Semana 3 — Los patrones empiezan a automatizarse',
        body: 'Si llevas bien las dos semanas anteriores, notarás que los ejercicios empiezan a sentirse más naturales. Tu corteza motora ya grabó los patrones básicos. Esta semana intenta aumentar el tiempo de plancha 5 segundos y hacer el Bird Dog más lento (3 segundos de bajada).',
        actionItems: [
          'Añade 5 segundos al tiempo de plancha respecto a la semana pasada',
          'En el Puente de Glúteos: intenta mantener 3 segundos en la posición alta',
          'Empieza a notar cómo usas el glúteo en las actividades diarias: subir escaleras, levantarte de la silla',
        ],
      },
      4: {
        week: 4,
        phase: 1,
        title: 'Semana 4 — Evaluación antes de avanzar',
        body: 'Esta es la semana de consolidación. Los criterios para avanzar a la Fase 2 son técnicos, no de esfuerzo. La pregunta no es "¿aguanto más?" sino "¿los movimientos son limpios y controlados?"',
        actionItems: [
          'Test: ¿Puedes hacer el plancha 30 segundos sin que las caderas bajen o suban?',
          'Test: ¿El Bird Dog es estable? ¿No rota la pelvis al extender la pierna?',
          'Test: ¿El Puente de Glúteos lo sientes principalmente en el glúteo, no en la espalda baja?',
          'Si fallan: repite una semana más de Fase 1 sin presión',
        ],
      },
    },
    2: {
      1: {
        week: 1,
        phase: 2,
        title: 'Semana 5 — El salto al movimiento compuesto',
        body: 'La sentadilla, la zancada y el push-up trabajan múltiples articulaciones simultáneamente — así que el esfuerzo percibido sube. Es normal que te cueste más esta semana que la anterior. Estás usando más músculo, no retrocediendo.',
        actionItems: [
          'En la sentadilla: rodillas siguiendo los dedos del pie, NUNCA colapsando hacia adentro',
          'Si el push-up estándar es imposible: empieza con manos en una silla (más inclinado = más fácil)',
          'El remo con banda: busca sentirlo en la espalda media, no en los bíceps',
        ],
      },
      2: {
        week: 2,
        phase: 2,
        title: 'Semana 6 — Añadiendo carga progresiva',
        body: 'Esta semana intenta añadir 2-3 repeticiones a cada ejercicio respecto a la semana anterior. La sobrecarga progresiva es el principio más importante del entrenamiento de fuerza: el cuerpo solo mejora cuando el estímulo aumenta gradualmente.',
        actionItems: [
          'Añade 2 reps por serie en sentadilla y push-up',
          'En la Zancada: intenta bajar un poco más la rodilla trasera (más rango)',
          'Presta atención a la calidad del sueño — el cuerpo trabaja más y necesita más recuperación',
        ],
      },
    },
  }

  // Fallback genérico
  const fallback: WeeklyInsight = {
    week,
    phase,
    title: `Semana ${week} — Fase ${phase}`,
    body: 'Mantén el enfoque en la técnica antes que en el número de repeticiones. El progreso en fuerza es lineal a corto plazo: si eres consistente, la mejora es casi matemáticamente predecible.',
    actionItems: [
      'Registra cómo te sientes antes y después de cada sesión',
      'Duerme entre 7-9 horas; es cuando el músculo se reconstruye',
      'Proteína adecuada: huevo, pollo, legumbres, lácteos — distribuida en 3-4 comidas',
    ],
  }

  return insights[phase]?.[week] ?? fallback
}
