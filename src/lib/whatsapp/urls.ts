export function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `213${digits.slice(1)}`;
  if (digits.startsWith("213")) return digits;
  return `213${digits}`;
}

function buildWaUrl(phone: string | null, text: string): string {
  const encoded = encodeURIComponent(text);
  if (phone) {
    return `https://wa.me/${cleanPhone(phone)}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

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

export function buildQueueTicketUrl(
  phone: string | null,
  businessName: string,
  ticketLabel: string,
  serviceName: string
): string {
  const lines = [
    `🎫 Ticket ${ticketLabel} - ${businessName}`,
    `💆 Service: ${serviceName}`,
    `Vous serez notifié(e) quand c'est votre tour.`,
  ];
  return buildWaUrl(phone, lines.join("\n"));
}

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
