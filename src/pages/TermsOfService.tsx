import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: June 2026</p>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Leenya ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. Leenya is operated by Sifeddine Mebarki and is provided for businesses and individuals in Algeria.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>
              Leenya provides an online appointment booking and queue management platform for service-based businesses (salons, barbershops, clinics, etc.). Users can create business profiles, manage bookings, and clients can book appointments or join queues through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p className="mb-3">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate information when creating an account.
            </p>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent, abusive, or illegal activity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Data Privacy</h2>
            <p>
              We take your privacy seriously. All personal data collected through Leenya is handled in accordance with our Privacy Policy and applicable Algerian law, including Law 18-07 on the Protection of Personal Data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. User Obligations</h2>
            <p className="mb-3">As a user of Leenya, you agree not to:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to access another user's account or data</li>
              <li>Interfere with the proper functioning of the Service</li>
              <li>Upload or transmit malicious code</li>
              <li>Use the Service to store or process illegal content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Limitation of Liability</h2>
            <p>
              Leenya is provided "as is" without warranties of any kind. We are not liable for damages arising from the use or inability to use the Service, including but not limited to lost appointments, business interruptions, or data loss. In no event shall our liability exceed the amount paid by you for the Service in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted service. We reserve the right to perform maintenance, updates, or suspend the Service temporarily without prior notice when necessary.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Modifications</h2>
            <p>
              We may modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms. We will notify registered users of material changes via email or through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Governing Law</h2>
            <p>
              These terms are governed by the laws of the People's Democratic Republic of Algeria. Any disputes shall be settled by the competent courts of Algeria.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Contact</h2>
            <p>
              For any questions regarding these terms, contact us at <a href="mailto:sifeddine.meb96@gmail.com" className="text-[var(--accent)] hover:underline">sifeddine.meb96@gmail.com</a> or on WhatsApp at <a href="https://wa.me/213542883297" className="text-[var(--accent)] hover:underline">+213 542 88 32 97</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
