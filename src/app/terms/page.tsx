import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata = { title: 'Terms of Use — Ethnogrow' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">

      <nav className="border-b border-paper-border">
        <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between">
          <Link href="/" className="font-display font-normal text-ink text-lg tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            Ethnogrow
          </Link>
          <Link href="/login" className="text-sm text-ink-muted hover:text-ink transition-colors">
            Sign in
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-8 py-16 w-full">

        <div className="grid grid-cols-[200px_1fr] gap-12 items-start mb-16">
          <p className="text-xs font-medium tracking-widest uppercase text-ink-faint pt-2">Legal</p>
          <div>
            <h1
              className="font-display font-light text-ink mb-3"
              style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: '1.2' }}
            >
              Terms of Use
            </h1>
            <p className="text-sm text-ink-faint">
              Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="space-y-0">
          {[
            {
              title: '1. Acceptance',
              content: <p>By accessing or using Ethnogrow ("the service"), you agree to be bound by these Terms of Use. If you do not agree, do not use the service. These terms apply to all users, including researchers and study participants.</p>
            },
            {
              title: '2. Description',
              content: <p>Ethnogrow is an AI-powered qualitative research platform that allows researchers to build questionnaires, collect responses from participants, and generate AI-powered analysis reports. The service is provided on a subscription basis with usage-based add-ons.</p>
            },
            {
              title: '3. Account registration',
              content: (
                <ul>
                  <li>You must provide accurate and complete information when creating an account.</li>
                  <li>You are responsible for maintaining the security of your account and password.</li>
                  <li>You must be at least 18 years old to create an account.</li>
                  <li>One person or entity may not maintain more than one free account.</li>
                </ul>
              )
            },
            {
              title: '4. Acceptable use',
              content: (
                <>
                  <p>You agree not to use Ethnogrow to:</p>
                  <ul>
                    <li>Conduct research that is deceptive, harmful, or unethical</li>
                    <li>Collect sensitive personal information from participants without appropriate consent</li>
                    <li>Violate any applicable laws or regulations</li>
                    <li>Infringe on the intellectual property rights of others</li>
                    <li>Distribute malware or engage in any activity that disrupts the service</li>
                    <li>Resell or commercialise access to the service without our written consent</li>
                  </ul>
                </>
              )
            },
            {
              title: '5. Research ethics',
              content: <p>You are solely responsible for ensuring your research complies with applicable ethical standards and regulations, including obtaining informed consent from participants where required. Ethnogrow does not review or approve research designs and is not responsible for the ethical conduct of your studies.</p>
            },
            {
              title: '6. Data ownership',
              content: <p>You retain ownership of all questionnaires, response data, and reports created through your account. By using the service, you grant Ethnogrow a limited licence to process your data for the purpose of providing the service. We do not use your data for any other purpose.</p>
            },
            {
              title: '7. AI-generated content',
              content: <p>AI-generated reports and analysis are provided as research aids only. They are not a substitute for professional research expertise. Ethnogrow makes no warranty as to the accuracy, completeness, or fitness for purpose of AI-generated content. You are responsible for reviewing and verifying all AI output before relying on it.</p>
            },
            {
              title: '8. Payments and refunds',
              content: <p>Subscription fees are billed monthly in advance. Token add-ons are charged at the time of purchase. All fees are non-refundable except where required by law. We reserve the right to change pricing with 30 days notice to existing subscribers.</p>
            },
            {
              title: '9. Service availability',
              content: <p>We aim to provide a reliable service but do not guarantee 100% uptime. We may perform maintenance that temporarily affects availability and will provide reasonable notice where possible. We are not liable for any loss resulting from service downtime.</p>
            },
            {
              title: '10. Termination',
              content: <p>You may close your account at any time from the account menu. We reserve the right to suspend or terminate accounts that violate these terms. Upon termination, your data will be retained for 30 days before permanent deletion, during which time you may request an export.</p>
            },
            {
              title: '11. Limitation of liability',
              content: <p>To the maximum extent permitted by law, Ethnogrow is not liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability for any claim arising from these terms shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
            },
            {
              title: '12. Changes to terms',
              content: <p>We may update these Terms of Use from time to time. We will notify you of significant changes by email. Continued use of the service after changes constitutes acceptance of the updated terms.</p>
            },
            {
              title: '13. Governing law',
              content: <p>These terms are governed by the laws of South Africa. Any disputes shall be subject to the jurisdiction of the South African courts.</p>
            },
            {
              title: '14. Contact',
              content: <p>For questions about these terms, contact us at <a href="mailto:hello@ethnogrow.com" className="text-ink font-medium hover:underline">hello@ethnogrow.com</a>.</p>
            },
          ].map(({ title, content }) => (
            <div key={title} className="grid grid-cols-[200px_1fr] gap-12 items-start border-t border-paper-border py-10">
              <p
                className="font-display font-normal text-ink-muted pt-0.5 sticky top-6"
                style={{ fontSize: '13px' }}
              >
                {title}
              </p>
              <div className="text-sm text-ink-muted leading-relaxed space-y-3 [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:leading-relaxed">
                {content}
              </div>
            </div>
          ))}

          <div className="grid grid-cols-[200px_1fr] gap-12 border-t border-paper-border pt-10">
            <div />
            <p className="text-xs text-ink-faint italic">
              This is a placeholder terms of use document. Ethnogrow recommends having this document reviewed by a qualified legal professional before accepting paying customers.
            </p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  )
}
