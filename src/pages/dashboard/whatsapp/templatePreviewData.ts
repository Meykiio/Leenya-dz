export const templatePreviews: Record<string, Record<string, string>> = {
  booking_new: {
    client_name: 'Sifeddine',
    client_phone: '0550123456',
    date: '29 mars 2026',
    time: '14:30',
    service: 'Detartrage',
  },
  booking_accepted: {
    business_name: 'Dental Clinik',
    date: '29 mars 2026',
    time: '14:30',
    service: 'Detartrage',
    address: 'Batna Centre',
  },
  booking_cancelled: {
    business_name: 'Dental Clinik',
    date: '29 mars 2026',
    time: '14:30',
    service: 'Detartrage',
  },
  booking_reminder: {
    business_name: 'Dental Clinik',
    date: '29 mars 2026',
    time: '14:30',
    service: 'Detartrage',
    business_phone: '0550987654',
  },
  queue_called: {
    business_name: 'Dental Clinik',
    ticket_label: 'A-007',
    service: 'Consultation',
  },
  queue_joined: {
    business_name: 'Dental Clinik',
    ticket_label: 'A-008',
    service: 'Consultation',
    wait_time: '~15 minutes',
  },
  booking_completed: {
    business_name: 'Dental Clinik',
    service: 'Detartrage',
    review_link: 'https://leenya.app/r/abc123',
  },
};
