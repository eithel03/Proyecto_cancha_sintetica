/**
 * SaaSintética - Sistema de Notificaciones
 * Este módulo centraliza el envío de avisos a dueños y clientes.
 */

type NotificationPayload = {
  to: string; // Puede ser un ID de usuario, email o teléfono
  title: string;
  message: string;
  type: 'reservation_new' | 'reservation_confirmed' | 'challenge_accepted' | 'challenge_confirmed';
  metadata?: any;
}

export async function sendNotification(payload: NotificationPayload) {
  const { to, title, message, type, metadata } = payload;

  // LOG EN CONSOLA (Para desarrollo y depuración)
  console.log(`\n🔔 [NOTIFICACIÓN - ${type.toUpperCase()}]`);
  console.log(`Para: ${to}`);
  console.log(`Título: ${title}`);
  console.log(`Mensaje: ${message}`);
  if (metadata) console.log(`Metadata:`, metadata);
  console.log('------------------------------------\n');

  /**
   * INTEGRACIONES FUTURAS (Comentar/Descomentar según proveedor)
   */

  // 1. WhatsApp (vía link o API)
  // if (metadata?.phone) { ... }

  // 2. Email (vía Resend/SendGrid)
  // await resend.emails.send({ ... });

  return { success: true };
}

/**
 * Helpers específicos para flujos de negocio
 */

export async function notifyAdminNewReservation(businessName: string, customerName: string, date: string, time: string) {
  return await sendNotification({
    to: 'ADMIN_OWNER',
    title: '⚽ ¡Nueva Reserva Recibida!',
    message: `${customerName} ha solicitado una reserva en ${businessName} para el día ${date} a las ${time}.`,
    type: 'reservation_new',
    metadata: { businessName, customerName, date, time }
  });
}

export async function notifyUserReservationConfirmed(customerName: string, businessName: string, date: string, time: string, phone?: string) {
  return await sendNotification({
    to: customerName,
    title: '✅ Reserva Confirmada',
    message: `¡Hola ${customerName}! Tu reserva en ${businessName} para el ${date} a las ${time} ha sido confirmada por el administrador.`,
    type: 'reservation_confirmed',
    metadata: { businessName, customerName, date, time, phone }
  });
}

export async function notifyUserChallengeConfirmed(customerName: string, opponentName: string, date: string, time: string) {
  return await sendNotification({
    to: customerName,
    title: '⚔️ ¡Reto Confirmado!',
    message: `El administrador ha confirmado tu reto contra ${opponentName} para el ${date} a las ${time}. ¡Prepárate!`,
    type: 'challenge_confirmed',
    metadata: { customerName, opponentName, date, time }
  });
}
