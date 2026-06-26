export interface ServiceSuggestion {
  name: string;
  duration_minutes: number;
  price_dzd: number;
}

export const serviceSuggestions: Record<string, ServiceSuggestion[]> = {
  beauty_salon: [
    { name: "Coupe et coiffure", duration_minutes: 45, price_dzd: 800 },
    { name: "Coloration", duration_minutes: 90, price_dzd: 2500 },
    { name: "Soin du visage", duration_minutes: 60, price_dzd: 1200 },
    { name: "Maquillage", duration_minutes: 45, price_dzd: 1500 },
  ],
  barbershop: [
    { name: "Coupe homme", duration_minutes: 30, price_dzd: 500 },
    { name: "Barbe", duration_minutes: 20, price_dzd: 300 },
    { name: "Coupe + Barbe", duration_minutes: 45, price_dzd: 700 },
    { name: "Soin cheveux", duration_minutes: 30, price_dzd: 600 },
  ],
  dental: [
    { name: "Consultation", duration_minutes: 30, price_dzd: 2000 },
    { name: "Détartrage", duration_minutes: 45, price_dzd: 3000 },
    { name: "Extraction", duration_minutes: 30, price_dzd: 2500 },
    { name: "Blanchiment", duration_minutes: 60, price_dzd: 8000 },
  ],
  clinic: [
    { name: "Consultation générale", duration_minutes: 20, price_dzd: 2000 },
    { name: "Consultation spécialiste", duration_minutes: 30, price_dzd: 3500 },
    { name: "Suivi", duration_minutes: 15, price_dzd: 1500 },
  ],
  physiotherapy: [
    { name: "Séance de kinésithérapie", duration_minutes: 45, price_dzd: 2000 },
    { name: "Massage thérapeutique", duration_minutes: 60, price_dzd: 2500 },
    { name: "Rééducation", duration_minutes: 45, price_dzd: 2000 },
  ],
  veterinary: [
    { name: "Consultation", duration_minutes: 30, price_dzd: 1500 },
    { name: "Vaccination", duration_minutes: 20, price_dzd: 2000 },
    { name: "Toilettage", duration_minutes: 60, price_dzd: 2500 },
  ],
  other: [
    { name: "Service standard", duration_minutes: 30, price_dzd: 1000 },
    { name: "Service premium", duration_minutes: 60, price_dzd: 2000 },
  ],
};
