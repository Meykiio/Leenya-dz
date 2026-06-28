/** Default WhatsApp message templates for booking, queue, and notification flows. */
export { getDefaultTemplates } from "./templates";
/** WhatsApp URL builders for booking confirmations, reminders, queue tickets, and more. */
export {
  cleanPhone,
  buildBookingConfirmationUrl,
  buildReminderUrl,
  buildQueueTicketUrl,
  buildBookingTrackingUrl,
  buildBookingNotificationForBusinessUrl,
  buildBookingAcceptedUrl,
  buildQueueCalledUrl,
  buildBookingCancelledUrl,
} from "./urls";
