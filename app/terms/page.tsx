import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/shared/legal-page-layout";
import { ROUTES } from "@/utils/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the terms and conditions that govern your use of the Squircle platform.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="June 6, 2026">
      <section>
        <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
        <p>
          By accessing or using Squircle (&quot;the Service&quot;), you agree to be bound by
          these Terms of Service (&quot;Terms&quot;). If you are using the Service on behalf of
          an organisation, you represent that you have authority to bind that organisation to
          these Terms.
        </p>
        <p className="mt-3">
          If you do not agree to these Terms, do not use the Service. We may update these Terms
          from time to time — continued use after changes take effect constitutes acceptance.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">2. Description of Service</h2>
        <p>
          Squircle is a team workspace platform that provides project management, document
          collaboration, standup management, reporting, integrations, and related productivity
          tools. Features vary by subscription plan.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">3. Accounts and Registration</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            You must provide accurate and complete information when creating an account.
          </li>
          <li>
            You are responsible for maintaining the confidentiality of your account
            credentials and for all activity that occurs under your account.
          </li>
          <li>
            You must promptly notify us at{" "}
            <a href="mailto:security@squircle.live" className="underline">
              security@squircle.live
            </a>{" "}
            of any unauthorised use of your account.
          </li>
          <li>
            You must be at least 16 years old to create an account. Accounts created in
            violation of this will be terminated.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">4. Workspaces and Roles</h2>
        <p>
          The workspace owner has full administrative control and is responsible for managing
          members, setting governance policies, and ensuring that the workspace complies with
          these Terms. Workspace admins and members operate within the permissions granted by
          the owner.
        </p>
        <p className="mt-3">
          You are responsible for all content created within your workspace. Squircle is not
          liable for content created by workspace members.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">5. Acceptable Use</h2>
        <p>You agree not to use Squircle to:</p>
        <ul className="list-disc pl-5 space-y-1 mt-3">
          <li>Violate any applicable law or regulation.</li>
          <li>
            Upload, transmit, or distribute malicious code, viruses, or any content that
            infringes intellectual property rights.
          </li>
          <li>
            Harass, abuse, threaten, or discriminate against any individual or group.
          </li>
          <li>
            Attempt to gain unauthorised access to the platform, other accounts, or backend
            systems.
          </li>
          <li>
            Use automated means (bots, scrapers) to access the Service without our explicit
            written permission.
          </li>
          <li>
            Resell or sublicense access to the Service without prior written consent from
            Squircle.
          </li>
        </ul>
        <p className="mt-3">
          We reserve the right to suspend or terminate any account found to be in violation of
          these rules without prior notice.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">6. Subscriptions and Billing</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Paid plans are billed monthly or annually, in advance. Prices are displayed in USD
            and are subject to change with 30 days&apos; notice.
          </li>
          <li>
            Payments are processed by Stripe. By providing payment information, you authorise
            us to charge the applicable fees to your payment method.
          </li>
          <li>
            Subscriptions automatically renew unless cancelled before the renewal date.
          </li>
          <li>
            <strong>Refunds:</strong> if you cancel within 14 days of initial purchase and have
            not materially used the Service, you may request a full refund by contacting{" "}
            <a href="mailto:billing@squircle.live" className="underline">
              billing@squircle.live
            </a>
            . No refunds are issued for partial billing periods after that window.
          </li>
          <li>
            Downgrading your plan takes effect at the end of the current billing cycle.
            Upgrading is effective immediately, with prorated charges.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">7. Intellectual Property</h2>
        <p>
          <strong>Your content:</strong> you retain all ownership rights to the content you
          create in Squircle. You grant Squircle a limited, non-exclusive licence to host,
          store, and display your content solely to provide the Service.
        </p>
        <p className="mt-3">
          <strong>Our platform:</strong> Squircle and its underlying software, design, and
          trademarks are owned by us. You may not copy, modify, or distribute any part of the
          platform without our written consent.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">8. Privacy</h2>
        <p>
          Your use of the Service is also governed by our{" "}
          <Link href={ROUTES.PRIVACY} className="underline">
            Privacy Policy
          </Link>
          , which is incorporated into these Terms by reference.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">9. Availability and Modifications</h2>
        <p>
          We aim for high availability but do not guarantee uninterrupted access. We may
          modify, suspend, or discontinue features with reasonable notice. In the event of
          a full discontinuation of the Service, we will provide at least 60 days&apos; notice
          and a means to export your data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">10. Disclaimers and Limitation of Liability</h2>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind, express or
          implied. To the maximum extent permitted by law, Squircle is not liable for indirect,
          incidental, special, consequential, or punitive damages arising out of your use of
          the Service.
        </p>
        <p className="mt-3">
          Our total aggregate liability to you for any claim arising from these Terms or the
          Service shall not exceed the amount you paid to us in the 12 months preceding the
          claim.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">11. Termination</h2>
        <p>
          You may delete your account at any time from workspace settings. We may suspend or
          terminate your access for material breach of these Terms, non-payment, or if required
          by law. Upon termination, your right to use the Service ceases immediately.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">12. Governing Law</h2>
        <p>
          These Terms are governed by and construed in accordance with applicable law. Any
          disputes shall be resolved through good-faith negotiation, and if unresolved,
          through binding arbitration before a court of competent jurisdiction.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">13. Contact</h2>
        <p>
          Questions about these Terms? Email{" "}
          <a href="mailto:legal@squircle.live" className="underline">
            legal@squircle.live
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
