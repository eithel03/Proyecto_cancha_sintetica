/**
 * SaaSintética - Sistema de Notificaciones
 * Genera links de WhatsApp y gestiona avisos a dueños y clientes.
 */

type NotificationType = 'reservation_new' | 'reservation_confirmed' | 'challenge_accepted' | 'challenge_confirmed'

type NotificationPayload = {
  to: string
  title: string
  message: string
  type: NotificationType
  phone?: string
  metadata?: Record<string, string>
}

export type NotificationResult = {
  success: boolean
  whatsappLink?: string
  message: string
}

function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 8) return `506${digits}`
  if (digits.length >= 10) return digits
  return `506${digits}`
}

function buildWhatsAppLink(phone: string, message: string): string {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${phone}?text=${encoded}`
}

export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const { to, title, message, phone } = payload

  console.log(`[NOTIFICACION - ${payload.type.toUpperCase()}] Para: ${to} | ${title}`)

  if (phone) {
    const whatsappLink = buildWhatsAppLink(phone, message)
    return { success: true, whatsappLink, message }
  }

  return { success: true, message }
}

export async function notifyAdminNewReservation(
  businessName: string,
  customerName: string,
  date: string,
  time: string,
  adminPhone?: string
): Promise<NotificationResult> {
  const msg = `Hola! ${customerName} ha solicitado una reserva en ${businessName} para el dia ${date} a las ${time}. Ingresa al panel para gestionarla.`

  return await sendNotification({
    to: 'ADMIN_OWNER',
    title: 'Nueva Reserva Recibida',
    message: msg,
    type: 'reservation_new',
    phone: adminPhone,
    metadata: { businessName, customerName, date, time }
  })
}

export async function notifyUserReservationConfirmed(
  customerName: string,
  businessName: string,
  date: string,
  time: string,
  customerPhone?: string
): Promise<NotificationResult> {
  const msg = `Hola ${customerName}! Tu reserva en ${businessName} para el ${date} a las ${time} ha sido confirmada.`

  return await sendNotification({
    to: customerName,
    title: 'Reserva Confirmada',
    message: msg,
    type: 'reservation_confirmed',
    phone: customerPhone,
    metadata: { businessName, customerName, date, time }
  })
}

export async function notifyUserChallengeConfirmed(
  customerName: string,
  opponentName: string,
  date: string,
  time: string,
  customerPhone?: string
): Promise<NotificationResult> {
  const msg = `Hola ${customerName}! Tu reto contra ${opponentName} para el ${date} a las ${time} ha sido confirmado. Preparate!`

  return await sendNotification({
    to: customerName,
    title: 'Reto Confirmado',
    message: msg,
    type: 'challenge_confirmed',
    phone: customerPhone,
    metadata: { customerName, opponentName, date, time }
  })
}

export { buildWhatsAppLink, normalizePhoneForWhatsApp }
