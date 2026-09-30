// Define únicamente los datos de cada turno necesarios
// para construir el correo de confirmación.
//comentado por Lautaro-dev

export type ConfirmedAppointmentNotification = {
  serviceName: string;
  professionalName: string;
  startAt: Date;
  durationMinutes: number;
};
