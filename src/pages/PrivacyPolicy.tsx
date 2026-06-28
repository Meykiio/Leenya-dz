import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: June 2026</p>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Who We Are</h2>
            <p>
              Leenya is operated by Sifeddine Mebarki. We provide a booking and queue management platform for Algerian service businesses. This policy explains how we collect, use, and protect your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Data We Collect</h2>
            <p className="mb-3">We collect the following types of data:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Account data:</strong> name, email address, phone number, and password (securely hashed)</li>
              <li><strong>Business data:</strong> business name, address, category, description, services offered, opening hours, staff information, logo and cover images</li>
              <li><strong>Client data:</strong> name, phone number, appointment history, queue tickets, and service preferences</li>
              <li><strong>Usage data:</strong> page views, interactions, and analytics to improve the Service</li>
              <li><strong>Communications:</strong> WhatsApp message logs and feedback submissions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>To provide and maintain the booking and queue management service</li>
              <li>To send appointment reminders and notifications via WhatsApp</li>
              <li>To improve and personalize the user experience</li>
              <li>To communicate with you about updates, support, and service changes</li>
              <li>To detect, prevent, and address technical issues or abuse</li>
              <li>To comply with legal obligations under Algerian law (Law 18-07)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Legal Basis (Algerian Law 18-07)</h2>
            <p>
              In accordance with Algerian Law 18-07 on the Protection of Personal Data, we process your data based on:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li><strong>Consent:</strong> You agree to data processing when creating an account or using our services</li>
              <li><strong>Contractual necessity:</strong> Data processing is required to provide the booking service you requested</li>
              <li><strong>Legitimate interest:</strong> We process data to improve our service, prevent fraud, and ensure security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Data Sharing</h2>
            <p className="mb-3">We do not sell your personal data. We may share data only in these limited circumstances:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Service providers:</strong> Supabase (database hosting) and Vercel (application hosting) — both bound by data processing agreements</li>
              <li><strong>Legal requirements:</strong> If required by Algerian law or a valid legal request from a competent authority</li>
              <li><strong>Business transfers:</strong> In case of a merger, acquisition, or sale of assets, with notice to users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide the Service. After account deletion, we delete or anonymize your data within 90 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Your Rights</h2>
            <p className="mb-3">Under Algerian Law 18-07, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Objection:</strong> Object to the processing of your data for legitimate reasons</li>
              <li><strong>Portability:</strong> Receive your data in a structured, commonly used format</li>
              <li><strong>Withdraw consent:</strong> Withdraw your consent at any time, without affecting the lawfulness of prior processing</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at <a href="mailto:sifeddine.meb96@gmail.com" className="text-[var(--accent)] hover:underline">sifeddine.meb96@gmail.com</a>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your data, including encryption at rest and in transit, access controls, and regular security audits. However, no method of electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Third-Party Services</h2>
            <p>
              Leenya uses the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li><strong>Supabase</strong> (database and authentication) — <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Privacy Policy</a></li>
              <li><strong>Vercel</strong> (application hosting) — <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Privacy Policy</a></li>
              <li><strong>WhatsApp</strong> (messaging) — messages are sent via <code className="text-foreground">wa.me</code> links; no automated message processing by Meta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Cookies</h2>
            <p>
              Leenya uses essential cookies for authentication (session management) and local storage for language preferences. We do not use tracking cookies or third-party analytics cookies. You can clear this data at any time through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify registered users of material changes via email or through the platform. Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">12. Contact</h2>
            <p>
              For any questions, concerns, or to exercise your data rights, contact:
            </p>
            <p className="mt-2">
              Sifeddine Mebarki<br />
              Email: <a href="mailto:sifeddine.meb96@gmail.com" className="text-[var(--accent)] hover:underline">sifeddine.meb96@gmail.com</a><br />
              WhatsApp: <a href="https://wa.me/213542883297" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">+213 542 88 32 97</a><br />
              Algeria
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
