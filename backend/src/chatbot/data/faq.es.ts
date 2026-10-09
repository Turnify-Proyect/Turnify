export type FAQCategory =
  'general' | 'appointments' | 'payments' | 'professionals' | 'account';

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface FAQCategoryData {
  label: string;
  icon: string;
  entries: FAQEntry[];
}

export const FAQ_DATABASE: Record<FAQCategory, FAQCategoryData> = {
  general: {
    label: 'General',
    icon: '💬',
    entries: [
      {
        id: 'what-is-turnify',
        question: '¿Qué es Turnify?',
        answer:
          'Turnify es una plataforma web para gestionar y reservar turnos en un centro de estética. Los clientes pueden consultar los servicios disponibles, elegir un profesional, seleccionar una fecha y horario, reservar un turno y pagar una seña para confirmarlo.',
        keywords: [
          'qué es',
          'turnify',
          'plataforma',
          'centro de estética',
          'turnos',
          'reservas',
        ],
      },
      {
        id: 'what-can-i-do',
        question: '¿Qué puedo hacer en Turnify?',
        answer:
          'Podés consultar los servicios del centro, elegir un profesional, ver los horarios disponibles, reservar turnos, pagar la seña correspondiente y consultar tus reservas desde tu cuenta.',
        keywords: [
          'qué puedo hacer',
          'funciones',
          'servicios',
          'reservas',
          'turnos',
          'cuenta',
        ],
      },
    ],
  },

  appointments: {
    label: 'Turnos y reservas',
    icon: '📅',
    entries: [
      {
        id: 'how-to-book',
        question: '¿Cómo reservo un turno?',
        answer:
          'Para reservar un turno, elegí un servicio, seleccioná un profesional disponible, indicá la fecha y elegí uno de los horarios disponibles. Luego podrás confirmar la reserva y realizar el pago de la seña.',
        keywords: [
          'reservar',
          'reservar turno',
          'reservo',
          'turno',
          'cita',
          'booking',
          'agendar',
          'agendar turno',
          'pedir turno',
          'sacar turno',
          'solicitar turno',
          'pasos',
        ],
      },
      {
        id: 'cancel-policy',
        question: '¿Puedo cancelar un turno?',
        answer:
          'Sí. Podés cancelar una reserva desde la sección de tus turnos. Si la reserva ya tiene una seña pagada, el importe abonado no es reembolsable. Para evitar cancelar el turno y perder la seña, podés reprogramarlo hasta 2 veces, siempre que cumplas con las condiciones de reprogramación.',
        keywords: [
          'cancelar',
          'cancelación',
          'cancelar turno',
          'dar de baja',
          'anular',
          'seña',
          'reprogramar',
        ],
      },
      {
        id: 'reschedule',
        question: '¿Puedo reprogramar mi turno?',
        answer:
          'Sí. Podés reprogramar un turno pendiente o confirmado siempre que falten al menos 24 horas para su inicio. Cada turno puede reprogramarse como máximo 2 veces.',
        keywords: [
          'reprogramar',
          'cambiar turno',
          'cambiar horario',
          'cambiar fecha',
          'modificar turno',
          'reprogramación',
        ],
      },
      {
        id: 'reschedule-options',
        question: '¿Qué puedo cambiar al reprogramar un turno?',
        answer:
          'Al reprogramar podés seleccionar otra fecha u horario disponible y, cuando corresponda, cambiar el profesional o el servicio. Las opciones disponibles dependen del servicio, del profesional y de sus horarios de atención.',
        keywords: [
          'cambiar profesional',
          'cambiar servicio',
          'cambiar fecha',
          'cambiar horario',
          'reprogramar',
        ],
      },
    ],
  },

  payments: {
    label: 'Pagos',
    icon: '💳',
    entries: [
      {
        id: 'deposit',
        question: '¿Tengo que pagar para reservar?',
        answer:
          'Sí. Para confirmar la reserva se debe abonar una seña equivalente al 30% del valor total de los servicios incluidos en la reserva.',
        keywords: [
          'seña',
          'pagar',
          'pago',
          '30%',
          'reserva',
          'confirmar',
          'anticipo',
        ],
      },
      {
        id: 'payment-methods',
        question: '¿Cómo se realiza el pago de la seña?',
        answer:
          'El pago de la seña se realiza de forma online mediante Stripe. Al momento de pagar, la plataforma te redirige al proceso de pago seguro correspondiente.',
        keywords: [
          'pago',
          'cómo pagar',
          'pagar seña',
          'stripe',
          'tarjeta',
          'medio de pago',
          'método de pago',
        ],
      },
      {
        id: 'payment-confirmation',
        question: '¿Cuándo queda confirmado mi turno?',
        answer:
          'La reserva queda confirmada cuando el pago de la seña se procesa correctamente. Hasta ese momento, el turno puede permanecer pendiente de pago.',
        keywords: [
          'confirmado',
          'confirmar turno',
          'pago confirmado',
          'pendiente',
          'seña',
          'estado',
        ],
      },
      {
        id: 'refund',
        question: '¿La seña es reembolsable?',
        answer:
          'No. La seña abonada no es reembolsable. Si cancelás un turno que ya fue pagado, el importe de la seña no se devuelve.',
        keywords: [
          'reembolso',
          'devolución',
          'devolver',
          'dinero',
          'seña',
          'cancelación',
        ],
      },
      {
        id: 'reschedule-payment',
        question: '¿Qué pasa con la seña si reprogramo o cambio el servicio?',
        answer:
          'La seña ya abonada se mantiene asociada a la reserva. Si al reprogramar elegís un servicio de mayor valor, la seña pagada no se modifica y cualquier diferencia pendiente se abona posteriormente en el centro.',
        keywords: [
          'cambiar servicio',
          'reprogramar',
          'diferencia',
          'precio',
          'seña pagada',
          'pago',
        ],
      },
    ],
  },

  professionals: {
    label: 'Profesionales',
    icon: '👨‍💼',
    entries: [
      {
        id: 'choose-professional',
        question: '¿Cómo elijo un profesional?',
        answer:
          'Después de seleccionar un servicio, Turnify muestra los profesionales activos que realizan ese servicio. Podés elegir uno de ellos y luego consultar sus fechas y horarios disponibles.',
        keywords: [
          'profesional',
          'elegir profesional',
          'seleccionar profesional',
          'quién atiende',
          'especialista',
        ],
      },
      {
        id: 'professional-availability',
        question: '¿Por qué un profesional no tiene horarios disponibles?',
        answer:
          'Los horarios disponibles dependen de la agenda configurada para cada profesional, de los turnos que ya tenga reservados y de los horarios o fechas que hayan sido bloqueados.',
        keywords: [
          'disponibilidad',
          'horarios',
          'sin horarios',
          'profesional',
          'agenda',
          'bloqueado',
          'fecha',
        ],
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
          'Seleccioná "Iniciar sesión" e ingresá el correo electrónico y la contraseña registrados en tu cuenta. También podés iniciar sesión utilizando Google.',
        keywords: [
          'iniciar sesión',
          'inicio sesión',
          'sesión',
          'login',
          'entrar',
          'acceder',
          'cuenta',
        ],
      },
      {
        id: 'google-login',
        question: '¿Puedo ingresar con Google?',
        answer:
          'Sí. Turnify permite iniciar sesión con una cuenta de Google desde la pantalla de acceso.',
        keywords: [
          'google',
          'gmail',
          'iniciar con google',
          'login google',
          'cuenta google',
        ],
      },
      {
        id: 'my-appointments',
        question: '¿Dónde puedo ver mis turnos?',
        answer:
          'Una vez que hayas iniciado sesión, podés consultar tus reservas desde tu panel de usuario, donde se muestra la información y el estado de tus turnos.',
        keywords: [
          'mis turnos',
          'mis reservas',
          'ver turnos',
          'consultar turno',
          'estado',
          'panel',
        ],
      },
    ],
  },
};

export const ALL_FAQ_ENTRIES: FAQEntry[] = Object.values(FAQ_DATABASE).flatMap(
  (cat) => cat.entries,
);
