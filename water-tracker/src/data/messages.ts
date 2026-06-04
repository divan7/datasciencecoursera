export interface WaterMessage {
  text: string;
  category: 'benefit' | 'consequence' | 'habit' | 'science' | 'motivation' | 'quote';
  emoji: string;
}

export const WATER_MESSAGES: WaterMessage[] = [
  // Science — how water works in the body
  {
    text: "Tu cuerpo es 60% agua. Cada proceso metabólico que ocurre en él necesita agua para funcionar — sin ella, el motor se apaga.",
    category: "science", emoji: "🔬",
  },
  {
    text: "El agua contiene oxígeno. Cuando tomas un vaso, literalmente estás oxigenando tus células y encendiendo tu metabolismo.",
    category: "science", emoji: "⚛️",
  },
  {
    text: "Tomar 2 vasos de agua al despertar puede aumentar tu tasa metabólica hasta un 30% durante la primera hora del día.",
    category: "science", emoji: "☀️",
  },
  {
    text: "El agua a temperatura ambiente o tibia se absorbe más rápido que la fría, llegando con mayor eficiencia a tus células.",
    category: "science", emoji: "🌡️",
  },
  {
    text: "El agua fría hace que tu cuerpo queme calorías extra para calentarla a temperatura corporal. Pequeño gasto, gran hábito.",
    category: "science", emoji: "🧊",
  },
  {
    text: "Tu cerebro es 73% agua. Cuando no estás hidratado, tu capacidad de concentración, memoria y toma de decisiones se reduce visiblemente.",
    category: "science", emoji: "🧠",
  },
  {
    text: "Tus riñones necesitan agua para filtrar toxinas. Sin suficiente agua, esas toxinas se redistribuyen en el cuerpo.",
    category: "science", emoji: "🫀",
  },

  // Benefits — what happens when you drink enough
  {
    text: "El agua activa tu metabolismo. Sin suficiente hidratación, tu cuerpo simplemente no puede quemar grasa de manera eficiente.",
    category: "benefit", emoji: "⚡",
  },
  {
    text: "Tomar un vaso de agua antes de comer puede reducir tu consumo calórico hasta un 13%, ayudándote a mantener tu peso.",
    category: "benefit", emoji: "🍽️",
  },
  {
    text: "Tu piel es el órgano más grande del cuerpo. La hidratación la mantiene elástica, luminosa y con menos arrugas, desde adentro.",
    category: "benefit", emoji: "✨",
  },
  {
    text: "El agua es el mejor laxante natural que existe. La mayoría del estreñimiento crónico se resuelve simplemente con buena hidratación.",
    category: "benefit", emoji: "🌿",
  },
  {
    text: "Los músculos son 75% agua. Estar bien hidratado mejora tu rendimiento físico, tu fuerza y reduce el tiempo de recuperación.",
    category: "benefit", emoji: "💪",
  },
  {
    text: "El agua lubrica tus articulaciones. Muchos dolores articulares crónicos mejoran notablemente al aumentar la hidratación diaria.",
    category: "benefit", emoji: "🦴",
  },
  {
    text: "La buena hidratación regula tu temperatura corporal, mejora tu circulación y ayuda a mantener la presión arterial en rango saludable.",
    category: "benefit", emoji: "❤️",
  },
  {
    text: "El agua mejora la absorción de nutrientes en el intestino. Comer bien con poca agua es como echarle gasolina premium a un carro con el motor echado a perder.",
    category: "benefit", emoji: "🌱",
  },

  // Consequences — what happens without enough water
  {
    text: "Una deshidratación del 2% ya reduce tu rendimiento físico y mental. La mayoría de las personas viven en ese estado sin saberlo.",
    category: "consequence", emoji: "😮",
  },
  {
    text: "Cuando se te antoja comer entre comidas, muchas veces tu cuerpo en realidad está pidiendo agua. Toma un vaso antes de buscar algo que comer.",
    category: "consequence", emoji: "🤔",
  },
  {
    text: "El cansancio crónico sin causa aparente casi siempre es deshidratación. Antes de echarle la culpa al estrés o al trabajo, toma agua.",
    category: "consequence", emoji: "😴",
  },
  {
    text: "Los dolores de cabeza frecuentes son una señal clásica de que tu cerebro no está recibiendo suficiente agua.",
    category: "consequence", emoji: "🤕",
  },
  {
    text: "La deshidratación puede ralentizar tu metabolismo hasta un 30%. Si no bajas de peso a pesar de esforzarte, revisa tu hidratación.",
    category: "consequence", emoji: "⚠️",
  },
  {
    text: "El reflujo ácido y la gastritis frecuentemente mejoran con buena hidratación. El agua ayuda a diluir y neutralizar los ácidos estomacales.",
    category: "consequence", emoji: "🔥",
  },
  {
    text: "No esperes sentir sed para tomar agua. Para cuando tu cerebro registra la sed, ya llevas entre 1 y 2% de deshidratación.",
    category: "consequence", emoji: "⏰",
  },

  // Habit formation — body changes as you build the habit
  {
    text: "La ciencia lo confirma: a partir del tercer día de tomar tu agua correctamente, el cuerpo activa su mecanismo natural de sed. Ya no lo olvidarás.",
    category: "habit", emoji: "🌱",
  },
  {
    text: "A la primera semana de hidratación constante notarás más energía, menos fatiga al despertar y mejor digestión.",
    category: "habit", emoji: "🌿",
  },
  {
    text: "Después de 2 semanas de buena hidratación, tu piel empieza a verse más clara e hidratada. Los cambios ya son visibles.",
    category: "habit", emoji: "💫",
  },
  {
    text: "A los 21 días la psicología del comportamiento confirma que el hábito empieza a arraigarse. Tu cerebro ya lo busca solo.",
    category: "habit", emoji: "🏆",
  },
  {
    text: "Con 30 días seguidos, muchas personas eliminan dolores de cabeza crónicos, mejoran su digestión y duermen mejor.",
    category: "habit", emoji: "📅",
  },
  {
    text: "A los 66 días, la neurociencia confirma que el hábito está profundamente programado en tu cerebro. Ya eres una persona hidratada.",
    category: "habit", emoji: "🎯",
  },
  {
    text: "Con hidratación constante, tu cuerpo aprende a reconocer la sed real y deja de confundirla con hambre. Tu apetito se normaliza.",
    category: "habit", emoji: "🧬",
  },

  // Motivation
  {
    text: "El agua es gratis, está en tu llave y es el suplemento de salud más poderoso que existe. Sin pretextos.",
    category: "motivation", emoji: "🌟",
  },
  {
    text: "No necesitas suplementos caros para activar tu metabolismo. Empieza por darle al cuerpo el agua que necesita y merece.",
    category: "motivation", emoji: "💎",
  },
  {
    text: "Cada vaso de agua que tomas hoy es una inversión directa en tu salud, energía y claridad mental de mañana.",
    category: "motivation", emoji: "🎯",
  },
  {
    text: "Los grandes cambios comienzan con pequeños hábitos consistentes. Un vaso de agua a la vez está transformando tu vida.",
    category: "motivation", emoji: "🦋",
  },
  {
    text: "Tu salud no es un destino al que llegas un día — es el camino que recorres cada día. Cada vaso es un paso en la dirección correcta.",
    category: "motivation", emoji: "🛤️",
  },

  // Morning specific
  {
    text: "El primer vaso de agua al despertar reactiva tu metabolismo después de 7-8 horas sin hidratación. Es la palanca más poderosa del día.",
    category: "science", emoji: "🌅",
  },
  {
    text: "Iniciar el día con agua antes que cualquier otra cosa le da a tu cuerpo la señal más clara: hoy es un día de salud y vitalidad.",
    category: "motivation", emoji: "🌄",
  },

  // Quotes
  {
    text: "El metabolismo funciona como un motor — necesita combustible, y ese combustible principal es el agua. Sin ella, todo lo demás falla.",
    category: "quote", emoji: "🔑",
  },
  {
    text: "El agua no es opcional para la salud, es fundamental. Todo lo demás es secundario si no estás bien hidratado.",
    category: "quote", emoji: "💧",
  },
];

/** Returns a consistent daily message based on the day of year */
export function getDailyMessage(): WaterMessage {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return WATER_MESSAGES[dayOfYear % WATER_MESSAGES.length];
}
