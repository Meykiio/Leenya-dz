/**
 * Returns the default set of WhatsApp message templates.
 * Each template has a unique key, name, description, message template with
 * variable placeholders (e.g., {client_name}), and the list of expected variables.
 *
 * @returns Array of default WhatsApp template definitions
 */
export function getDefaultTemplates() {
  return [
    {
      template_key: 'booking_new' as const,
      name: 'Nouvelle réservation',
      description: 'Notification envoyée au business quand un client réserve',
      message_template: `✨ Nouvelle demande de réservation
👤 Client: {client_name}
📞 {client_phone}
📅 {date} à {time}
💆 Service: {service}

En attente de votre confirmation.`,
      variables: ['client_name', 'client_phone', 'date', 'time', 'service'],
    },
    {
      template_key: 'booking_accepted' as const,
      name: 'Réservation acceptée',
      description: 'Notification envoyée au client quand sa réservation est acceptée',
      message_template: `✅ Réservation acceptée
{business_name}
📅 {date} à {time}
💆 Service: {service}
📍 {address}

Merci de votre confiance!`,
      variables: ['business_name', 'date', 'time', 'service', 'address'],
    },
    {
      template_key: 'booking_cancelled' as const,
      name: 'Réservation annulée',
      description: 'Notification envoyée au client quand sa réservation est annulée',
      message_template: `ℹ️ Réservation annulée
{business_name}
📅 {date} à {time}
💆 Service: {service}

N'hésitez pas à réserver à nouveau.`,
      variables: ['business_name', 'date', 'time', 'service'],
    },
    {
      template_key: 'booking_reminder' as const,
      name: 'Rappel de rendez-vous',
      description: 'Rappel envoyé au client avant son rendez-vous',
      message_template: `⏰ Rappel de rendez-vous
{business_name}
📅 {date} à {time}
💆 Service: {service}

À bientôt!
📞 {business_phone}`,
      variables: ['business_name', 'date', 'time', 'service', 'business_phone'],
    },
    {
      template_key: 'queue_called' as const,
      name: "C'est votre tour",
      description: "Notification envoyée au client quand son ticket est appelé",
      message_template: `🔔 C'est votre tour!
Ticket {ticket_label}
{business_name}
💆 Service: {service}

Présentez-vous maintenant.`,
      variables: ['business_name', 'ticket_label', 'service'],
    },
    {
      template_key: 'queue_joined' as const,
      name: "Ticket de file d'attente",
      description: "Confirmation envoyée au client quand il rejoint la file",
      message_template: `🎫 Ticket {ticket_label}
{business_name}
💆 Service: {service}

Temps d'attente estime: {wait_time}
Surveillez l'ecran d'affichage pour votre tour.`,
      variables: ['business_name', 'ticket_label', 'service', 'wait_time'],
    },
    {
      template_key: 'booking_completed' as const,
      name: 'Merci de votre visite',
      description: 'Message de remerciement après le service',
      message_template: `⭐ Merci de votre visite!
{business_name}
💆 Service: {service}

Laissez-nous un avis: {review_link}`,
      variables: ['business_name', 'service', 'review_link'],
    },
  ];
}
