export interface FacialExercise {
  id: string
  nameEs: string
  description: string
  holdSeconds: number
  reps: string
  benefit: string
  instructions: string[]
  tips: string[]
}

export const facialExercises: FacialExercise[] = [
  {
    id: 'chin_tuck',
    nameEs: 'Retracción de mentón',
    description: 'Fortalece los flexores profundos del cuello y corrige la postura de cabeza adelante — la postura más relacionada con la papada.',
    holdSeconds: 5,
    reps: '10 repeticiones',
    benefit: 'Tonifica cuello y reduce papada',
    instructions: [
      'Siéntate derecho o párate con espalda recta.',
      'Sin bajar la barbilla, empuja la cabeza hacia atrás como si hicieras doble mentón.',
      'Mantén 5 segundos sintiendo tensión en la parte posterior del cuello.',
      'Regresa lentamente y repite.',
    ],
    tips: [
      'Imagina que tienes un hilo en la coronilla que te jala hacia arriba.',
      'No bajes la barbilla — la cabeza se mueve hacia atrás en horizontal.',
    ],
  },
  {
    id: 'tongue_roof',
    nameEs: 'Lengua al paladar',
    description: 'Activa el músculo milohioideo, ubicado directamente bajo la barbilla. Es el ejercicio más efectivo para la zona de la papada.',
    holdSeconds: 10,
    reps: '10 repeticiones',
    benefit: 'Activa músculos profundos bajo la barbilla',
    instructions: [
      'Con la boca cerrada, presiona la lengua con fuerza contra el paladar.',
      'Simultáneamente, inclina la cabeza hacia atrás mirando al techo.',
      'Mantén 10 segundos — siente la tensión DIRECTAMENTE bajo la barbilla.',
      'Descansa 5 segundos y repite.',
    ],
    tips: [
      'Cuanto más fuerte presiones la lengua, mayor activación muscular.',
      'Si no sientes tensión bajo la barbilla, presiona más fuerte la lengua.',
    ],
  },
  {
    id: 'chin_lift',
    nameEs: 'Elevación de mentón',
    description: 'Estira y tonifica los músculos del cuello anterior y la zona bajo la barbilla.',
    holdSeconds: 5,
    reps: '10 repeticiones',
    benefit: 'Estira y firma la piel bajo el mentón',
    instructions: [
      'Inclina la cabeza hacia atrás mirando al techo.',
      'Aprieta los labios y empújalos hacia adelante como si fueras a besar el techo.',
      'Mantén 5 segundos sintiendo la tensión bajo la barbilla.',
      'Baja la cabeza lentamente y repite.',
    ],
    tips: [
      'Exagera el movimiento de labios para mayor tensión muscular.',
      'Puedes sentir un leve estiramiento — es normal.',
    ],
  },
  {
    id: 'platysma',
    nameEs: 'Ejercicio del platisma',
    description: 'Trabaja directamente el platisma, el músculo que va del cuello a la barbilla y es clave para definir esa zona.',
    holdSeconds: 5,
    reps: '10 repeticiones',
    benefit: 'Define el cuello y la línea de la mandíbula',
    instructions: [
      'Inclina la cabeza ligeramente hacia atrás.',
      'Estira los labios hacia abajo y hacia afuera, como sonrisa invertida, exponiendo los dientes inferiores.',
      'Siente la tensión desde el cuello hasta la barbilla.',
      'Mantén 5 segundos y relaja.',
    ],
    tips: [
      'Mira en espejo para asegurarte de exponer bien los dientes inferiores.',
      'La tensión debe sentirse en toda la parte frontal del cuello.',
    ],
  },
  {
    id: 'fish_face',
    nameEs: 'Cara de pez',
    description: 'Tonifica mejillas y la línea del mentón con un movimiento simple y efectivo.',
    holdSeconds: 5,
    reps: '10 repeticiones',
    benefit: 'Tonifica mejillas y línea de la mandíbula',
    instructions: [
      'Chupa las mejillas hacia adentro y aprieta los labios.',
      'Mantén esa "cara de pez" 5 segundos.',
      'Para mayor tensión, intenta sonreír ligeramente mientras mantienes la posición.',
      'Suelta y repite.',
    ],
    tips: [
      'Entre más fuerte jales las mejillas, mayor trabajo muscular.',
    ],
  },
  {
    id: 'jaw_release',
    nameEs: 'Liberación de mandíbula',
    description: 'Ejercita los músculos de la mandíbula y define su línea, lo que enmarca y adelgaza visualmente el rostro.',
    holdSeconds: 0,
    reps: '10 repeticiones',
    benefit: 'Define la línea de la mandíbula',
    instructions: [
      'Mueve la mandíbula lentamente como masticando chicle con la boca cerrada, 5 veces.',
      'Luego abre la boca lo más que puedas y di "aaah" lentamente.',
      'Cierra con lentitud y repite.',
      'Mantén todos los movimientos lentos y controlados.',
    ],
    tips: [
      'Siente el trabajo en los músculos a los lados de la mandíbula.',
      'La lentitud es clave — rápido no activa igual.',
    ],
  },
  {
    id: 'neck_stretch',
    nameEs: 'Estiramiento lateral de cuello',
    description: 'Estira y alarga los músculos cervicales. Un cuello largo y definido hace que la papada sea menos visible.',
    holdSeconds: 15,
    reps: '3 repeticiones cada lado',
    benefit: 'Alarga y define el cuello',
    instructions: [
      'Inclina la cabeza hacia el hombro derecho sin levantar el hombro.',
      'Puedes presionar suavemente con la mano para mayor estiramiento.',
      'Mantén 15 segundos, siente el estiramiento en el lado izquierdo del cuello.',
      'Regresa al centro y repite del otro lado.',
    ],
    tips: [
      'Mantén el hombro del lado que estiras hacia abajo para mayor estiramiento.',
      'Respira profundo durante el estiramiento.',
    ],
  },
  {
    id: 'vowel_sounds',
    nameEs: 'Vocales exageradas',
    description: 'Ejercita todos los músculos faciales con movimientos exagerados. Ideal para finalizar la rutina.',
    holdSeconds: 3,
    reps: '10 series completas',
    benefit: 'Trabaja todos los músculos faciales',
    instructions: [
      'Exagera al máximo cada vocal: A — E — I — O — U.',
      'Mantén cada vocal 2-3 segundos antes de pasar a la siguiente.',
      'Enfócate en sentir el estiramiento en mejillas, labios y barbilla.',
      'Puedes hacerlo mirándote al espejo para verificar el movimiento.',
    ],
    tips: [
      'Mientras más exagerado, mejor resultado.',
      'Puedes hacerlo en privado — ¡no importa cómo te veas!',
    ],
  },
]
