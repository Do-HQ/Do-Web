import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/shared/legal-page-layout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how Squircle collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="June 6, 2026">
      <section>
        <h2 className="text-lg font-semibold mb-3">1. Introduction</h2>
        <p>
          Squircle (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Squircle
          platform — a workspace and project management tool for teams. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information when you use
          our services at{" "}
          <a href="https://squircle.live" className="underline">
            squircle.live
          </a>{" "}
          and related subdomains.
        </p>
        <p className="mt-3">
          By creating an account or continuing to use Squircle, you acknowledge that you have
          read and understood this policy. If you do not agree, please discontinue use of the
          platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">2. Information We Collect</h2>

        <h3 className="font-medium mb-2">2.1 Information You Provide</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account information:</strong> your name, email address, profile photo, and
            any other details you add to your profile.
          </li>
          <li>
            <strong>Workspace content:</strong> projects, tasks, documents, comments, files,
            and any data you or your team members create inside Squircle.
          </li>
          <li>
            <strong>Billing information:</strong> payment method details processed securely
            through our payment provider (Stripe). We do not store full card numbers.
          </li>
          <li>
            <strong>Communications:</strong> messages you send to our support team or through
            in-app feedback tools.
          </li>
        </ul>

        <h3 className="font-medium mb-2 mt-4">2.2 Information Collected Automatically</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Usage data:</strong> pages visited, features used, actions taken, and
            timestamps.
          </li>
          <li>
            <strong>Device &amp; browser data:</strong> IP address, browser type, operating
            system, and referring URLs.
          </li>
          <li>
            <strong>Cookies and similar technologies:</strong> session tokens,
            authentication cookies, and preference cookies. See Section 6 for details.
          </li>
        </ul>

        <h3 className="font-medium mb-2 mt-4">2.3 Information from Third Parties</h3>
        <p>
          If you sign in using Google or GitHub OAuth, we receive your name, email address,
          and profile picture from that provider. We do not receive or store your OAuth
          provider passwords.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">3. How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide, operate, and maintain the Squircle platform.</li>
          <li>Authenticate your identity and keep your account secure.</li>
          <li>Process payments and manage your subscription.</li>
          <li>Send transactional emails (e.g., OTP codes, login alerts, invoices).</li>
          <li>Respond to your support requests and improve our help resources.</li>
          <li>
            Analyse aggregated, anonymised usage patterns to improve features and
            performance — we do not sell individual usage profiles.
          </li>
          <li>
            Comply with legal obligations and enforce our Terms of Service.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">4. How We Share Your Information</h2>
        <p>We do not sell your personal data. We share information only in these circumstances:</p>
        <ul className="list-disc pl-5 space-y-1 mt-3">
          <li>
            <strong>With your workspace members:</strong> your name, profile photo, and
            activity within a shared workspace are visible to other members of that workspace.
          </li>
          <li>
            <strong>Service providers:</strong> trusted vendors who process data on our behalf
            (e.g., Stripe for payments, Cloudinary for file hosting, MongoDB Atlas for
            database hosting, Resend for transactional email). Each is bound by data processing
            agreements.
          </li>
          <li>
            <strong>Legal requirements:</strong> if required by law, court order, or
            governmental authority, or to protect the rights, property, or safety of Squircle,
            our users, or the public.
          </li>
          <li>
            <strong>Business transfers:</strong> in the event of a merger, acquisition, or
            sale of assets, your data may transfer to the successor entity, subject to the same
            privacy protections.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">5. Data Retention</h2>
        <p>
          We retain your account data for as long as your account is active or as needed to
          provide you services. If you delete your account, we will delete or anonymise your
          personal data within 30 days, except where we are required to retain it for legal,
          tax, or fraud-prevention purposes.
        </p>
        <p className="mt-3">
          Workspace content (projects, tasks, documents) is retained until the workspace owner
          deletes it or the workspace is closed.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">6. Cookies</h2>
        <p>We use the following types of cookies:</p>
        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>
            <strong>Strictly necessary cookies:</strong> authentication tokens
            (<code>access_token</code>, <code>refresh_token</code>) and a CSRF protection
            token (<code>csrf_token</code>) required for the platform to function securely.
            These cannot be disabled.
          </li>
          <li>
            <strong>Preference cookies:</strong> theme preference (light/dark mode) stored in
            your browser&apos;s local storage.
          </li>
        </ul>
        <p className="mt-3">
          We do not use tracking, advertising, or analytics cookies that profile you across
          other websites.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">7. Security</h2>
        <p>
          We take security seriously. Measures include TLS encryption in transit, encrypted
          secrets storage (AES-256-GCM), CSRF protection on all state-changing requests,
          rate limiting, and access controls scoped to workspace roles. However, no system is
          completely impenetrable — please use a strong, unique password or OAuth sign-in and
          report any suspected breach to{" "}
          <a href="mailto:security@squircle.live" className="underline">
            security@squircle.live
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">8. Your Rights</h2>
        <p>Depending on your location, you may have rights including:</p>
        <ul className="list-disc pl-5 space-y-1 mt-3">
          <li>Access to the personal data we hold about you.</li>
          <li>Correction of inaccurate or incomplete data.</li>
          <li>Deletion of your account and associated personal data.</li>
          <li>Data portability — receiving your data in a machine-readable format.</li>
          <li>Objection to or restriction of certain processing activities.</li>
        </ul>
        <p className="mt-3">
          To exercise any of these rights, email us at{" "}
          <a href="mailto:privacy@squircle.live" className="underline">
            privacy@squircle.live
          </a>
          . We will respond within 30 days.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">9. Children</h2>
        <p>
          Squircle is not directed at children under the age of 16. We do not knowingly
          collect personal data from children. If you believe a child has provided us with
          personal data, please contact us and we will delete it promptly.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be
          communicated via an in-app notice or email at least 14 days before they take effect.
          Continued use of Squircle after the effective date constitutes acceptance of the
          updated policy.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">11. Contact</h2>
        <p>
          Questions or concerns about this policy? Reach us at{" "}
          <a href="mailto:privacy@squircle.live" className="underline">
            privacy@squircle.live
          </a>{" "}
          or write to: Squircle, c/o Privacy Team.
        </p>
      </section>
    </LegalPageLayout>
  );
}
