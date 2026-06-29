/**
 * Normalize a phone number to international format (Algeria +213).
 * Strips non-digit characters; prepends 213 if number starts with 0.
 *
 * @param phone - Raw phone number (e.g., "0551 23 45 67")
 * @returns Cleaned number starting with "213" (e.g., "213551234567")
 */
export function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `213${digits.slice(1)}`;
  if (digits.startsWith("213")) return digits;
  return `213${digits}`;
}

/** Build a WhatsApp deep link (wa.me) with an optional phone and encoded message text. */
function buildWaUrl(phone: string | null, text: string): string {
  const encoded = encodeURIComponent(text);
  if (phone) {
    return `https://wa.me/${cleanPhone(phone)}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

/**
 * Build a WhatsApp URL with a booking confirmation message for the client.
 * Includes business name, date, time, service, address, and booking reference.
 */
export function buildBookingConfirmationUrl(
  phone: string,
  businessName: string,
  date: string,
  time: string,
  serviceName: string,
  address: string | null,
  bookingId: string
): string {
  const ref = bookingId.slice(0, 8).toUpperCase();
  const lines = [
    `✅ Réservation confirmée chez ${businessName}`,
    `📅 ${date} à ${time}`,
    `💆 Service: ${serviceName}`,
    address ? `📍 ${address}` : null,
    `Votre référence: #${ref}`,
  ].filter(Boolean);
  return buildWaUrl(phone, lines.join("\n"));
}

/**
 * Build a WhatsApp URL with a reminder message for an upcoming appointment.
 * Includes business name, time, service, address, and business phone for cancellations.
 */
export function buildReminderUrl(
  phone: string,
  businessName: string,
  time: string,
  serviceName: string,
  address: string | null,
  businessPhone: string | null
): string {
  const lines = [
    `⏰ Rappel: Votre rendez-vous chez ${businessName} est demain à ${time}.`,
    `💆 Service: ${serviceName}`,
    address ? `📍 ${address}` : null,
    businessPhone ? `En cas d'empêchement, appelez-nous: ${businessPhone}` : null,
  ].filter(Boolean);
  return buildWaUrl(phone, lines.join("\n"));
}

/**
 * Build a WhatsApp URL with a queue ticket confirmation for the client.
 * Includes ticket label, business name, service, and estimated wait time.
 */
export function buildQueueTicketUrl(
  phone: string | null,
  businessName: string,
  ticketLabel: string,
  serviceName: string,
  waitTime?: number
): string {
  const lines = [
    `🎫 Ticket ${ticketLabel} - ${businessName}`,
    `💆 Service: ${serviceName}`,
    waitTime != null ? `⏱ Attente estimée: ~${waitTime} min` : null,
    `Surveillez l'ecran d'affichage pour votre tour.`,
  ].filter(Boolean);
  return buildWaUrl(phone, lines.join("\n"));
}

/**
 * Build a WhatsApp URL with a booking confirmation that includes a tracking/cancellation link.
 */
export function buildBookingTrackingUrl(
  phone: string | null,
  businessName: string,
  date: string,
  time: string,
  serviceName: string,
  trackingUrl: string
): string {
  const lines = [
    `✨ Réservation confirmée chez ${businessName}`,
    `📅 ${date} à ${time}`,
    `💆 Service: ${serviceName}`,
    ``,
    `🔗 Suivre ou annuler:`,
    trackingUrl,
  ];
  return buildWaUrl(phone, lines.join("\n"));
}

/**
 * Build a WhatsApp URL notifying the business of a new booking request.
 * Includes client name, phone, date, time, and service.
 */
export function buildBookingNotificationForBusinessUrl(
  businessPhone: string,
  clientName: string,
  clientPhone: string,
  date: string,
  time: string,
  serviceName: string
): string {
  const lines = [
    `✨ Nouvelle demande de réservation`,
    `👤 Client: ${clientName}`,
    `📞 ${clientPhone}`,
    `📅 ${date} à ${time}`,
    `💆 Service: ${serviceName}`,
    ``,
    `En attente de votre confirmation.`,
  ];
  return buildWaUrl(businessPhone, lines.join("\n"));
}

/**
 * Build a WhatsApp URL informing the client that their booking was accepted.
 * Includes business name, date, time, service, and address.
 */
export function buildBookingAcceptedUrl(
  clientPhone: string,
  businessName: string,
  date: string,
  time: string,
  serviceName: string,
  address: string | null
): string {
  const lines = [
    `✅ Réservation acceptée!`,
    `🏪 ${businessName}`,
    `📅 ${date} à ${time}`,
    `💆 Service: ${serviceName}`,
    address ? `📍 ${address}` : null,
    ``,
    `Merci de votre confiance!`,
  ].filter(Boolean);
  return buildWaUrl(clientPhone, lines.join("\n"));
}

/**
 * Build a WhatsApp URL notifying the client that their booking was cancelled.
 * Includes business name, date, time, and service.
 */
export function buildBookingCancelledUrl(
  clientPhone: string,
  businessName: string,
  date: string,
  time: string,
  serviceName: string
): string {
  const lines = [
    `ℹ️ Réservation annulée`,
    `🏪 ${businessName}`,
    `📅 ${date} à ${time}`,
    `💆 Service: ${serviceName}`,
    ``,
    `N'hésitez pas à réserver à nouveau.`,
  ];
  return buildWaUrl(clientPhone, lines.join("\n"));
}

/**
 * Navigate to a WhatsApp URL in the current tab.
 * Uses window.location.href instead of window.open to ensure mobile
 * browsers properly hand off wa.me URLs to the WhatsApp app.
 */
export function openWhatsApp(url: string) {
  window.location.href = url;
}

/**
 * Build a WhatsApp URL notifying the client that their queue ticket is being called.
 * Includes ticket label, business name, and service.
 */
export function buildQueueCalledUrl(
  clientPhone: string,
  businessName: string,
  ticketLabel: string,
  serviceName: string
): string {
  const lines = [
    `🔔 C'est votre tour!`,
    `🎫 Ticket ${ticketLabel}`,
    `🏪 ${businessName}`,
    `💆 Service: ${serviceName}`,
    ``,
    `Présentez-vous maintenant.`,
  ];
  return buildWaUrl(clientPhone, lines.join("\n"));
}
