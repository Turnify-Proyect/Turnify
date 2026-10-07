// Categorías válidas que se comparten entre el FAQ, el servicio y el controlador.
// Comentarios de orientación agregados por dev-Mazz.
export type FAQCategory =
  'general' | 'appointments' | 'payments' | 'professionals' | 'account';

// Una respuesta individual del FAQ y los términos usados para encontrarla.
export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

// Datos visibles de una categoría y las preguntas que contiene.
export interface FAQCategoryData {
  label: string;
  icon: string;
  entries: FAQEntry[];
}

// Fuente principal de contenido: agrega o edita aquí categorías y respuestas.
export const FAQ_DATABASE: Record<FAQCategory, FAQCategoryData> = {
  general: {
    label: 'General',
    icon: '💬',
    entries: [
      {
        id: 'what-is-turnify',
        question: '¿Qué es Turnify?',
        answer:
          'Turnify es una plataforma para reservar citas con profesionales de belleza y bienestar (estilistas, masajistas, manicuristas, etc.). Buscas, eliges horario y pagas todo desde la app.',
        keywords: ['qué es', 'turnify', 'plataforma', 'app'],
      },
      {
        id: 'countries',
        question: '¿En qué países está disponible?',
        answer:
          'Actualmente operamos en Argentina, Chile, Uruguay y México. Próximamente más países.',
        keywords: ['país', 'disponible', 'ubicación', 'argentina', 'chile'],
      },
    ],
  },
  appointments: {
    label: 'Citas y reservas',
    icon: '📅',
    entries: [
      {
        id: 'how-to-book',
        question: '¿Cómo reservo una cita?',
        answer:
          '1. Inicia sesión → 2. Elige "Reservar" → 3. Filtra por servicio/profesional/fecha → 4. Elige horario → 5. Confirma y paga. Recibirás confirmación por email y notificación.',
        keywords: [
          'reservar',
          'reservar turno',
          'reservo',
          'cita',
          'turno',
          'booking',
          'agendar',
          'agendo',
          'agendar turno',
          'agendo turno',
          'como agendo',
          'asignar',
          'asignar turno',
          'asignar un turno',
          'pedir',
          'pedir turno',
          'sacar',
          'sacar turno',
          'solicitar',
          'solicitar turno',
          'pasos',
        ],
      },
      {
        id: 'cancel-policy',
        question: '¿Cuál es la política de cancelación?',
        answer:
          'Puedes cancelar gratis hasta 2 horas antes. Menos de 2h: se cobra el 50%. No-show (no avisar): cargo completo. Cancelas desde "Mis citas" en la app.',
        keywords: [
          'cancelar',
          'política',
          'cancelación',
          'no-show',
          'penalidad',
        ],
      },
      {
        id: 'reschedule',
        question: '¿Puedo reprogramar mi cita?',
        answer:
          'Sí, hasta 2h antes desde "Mis citas" → "Reprogramar". Eliges nuevo horario disponible. Máximo 2 reprogramaciones por cita.',
        keywords: ['reprogramar', 'cambiar', 'horario', 'modificar'],
      },
    ],
  },
  payments: {
    label: 'Pagos',
    icon: '💳',
    entries: [
      {
        id: 'payment-methods',
        question: '¿Qué medios de pago aceptan?',
        answer:
          'MercadoPago: tarjetas de crédito/débito, dinero en cuenta, transferencia, efectivo (PagoFácil, Rapipago). Todo procesado seguro por MercadoPago.',
        keywords: [
          'pago',
          'funcionan los pagos',
          'como funcionan los pagos',
          'metodos de pago',
          'tarjeta',
          'mercadopago',
          'efectivo',
          'transferencia',
        ],
      },
      {
        id: 'refund',
        question: '¿Cómo pido reembolso?',
        answer:
          'Si cancelas a tiempo, el reembolso es automático a tu medio de pago original (2-10 días hábiles según tu banco). Si hay un problema, contacta soporte desde la app.',
        keywords: ['reembolso', 'devolución', 'dinero', 'reembolso automático'],
      },
    ],
  },
  professionals: {
    label: 'Profesionales',
    icon: '👨‍💼',
    entries: [
      {
        id: 'become-pro',
        question: '¿Quiero ser profesional en Turnify, cómo me uno?',
        answer:
          'Ve a "Ser profesional" en el menú → Completa tu perfil (especialidad, experiencia, horarios, precios) → Nuestro equipo valida en 24-48h → ¡Empiezas a recibir citas!',
        keywords: [
          'profesional',
          'unirme',
          'registrarme',
          'trabajar',
          'ser pro',
        ],
      },
      {
        id: 'pro-verified',
        question: '¿Cómo sé que un profesional es confiable?',
        answer:
          'Todos pasan verificación de identidad, certificación de especialidad y revisión de antecedentes. Ves su rating, reseñas reales y foto verificada antes de reservar.',
        keywords: ['confiable', 'verificado', 'seguridad', 'rating', 'reseñas'],
      },
    ],
  },
  account: {
    label: 'Mi cuenta',
    icon: '👤',
    entries: [
      {
        id: 'sign-in',
        question: '¿Cómo inicio sesión?',
        answer:
          'En la pantalla de inicio de Turnify, selecciona "Iniciar sesión" e ingresa el correo electrónico y la contraseña registrados en tu cuenta.',
        keywords: [
          'iniciar sesión',
          'inicio sesión',
          'sesión',
          'login',
          'entrar a mi cuenta',
          'acceder a mi cuenta',
        ],
      },
      {
        id: 'reset-password',
        question: 'Olvidé mi contraseña',
        answer:
          'En login toca "¿Olvidaste tu contraseña?" → Ingresa tu email → Te llega link para resetear (expira en 1h). Revisa spam si no llega.',
        keywords: ['contraseña', 'password', 'olvidé', 'reset', 'recuperar'],
      },
      {
        id: 'delete-account',
        question: '¿Cómo elimino mi cuenta?',
        answer:
          'Perfil → Configuración → "Eliminar cuenta". Requiere confirmar por email. Se borran tus datos en 30 días (excepto lo que la ley exige conservar).',
        keywords: ['eliminar', 'borrar', 'cuenta', 'baja', 'dar de baja'],
      },
    ],
  },
};

// Lista plana utilizada por el servicio para buscar en todas las categorías.
export const ALL_FAQ_ENTRIES: FAQEntry[] = Object.values(FAQ_DATABASE).flatMap(
  (cat) => cat.entries,
);
