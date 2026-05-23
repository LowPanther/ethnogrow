import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata = { title: 'Privacy Policy — Ethnogrow' }

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-sm text-ink-faint">
              Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="space-y-0">
          {[
            {
              title: '1. Introduction',
              content: (
                <p>Ethnogrow ("we", "us", or "our") operates ethnogrow.com. This Privacy Policy explains how we collect, use, and protect information when you use our service. By using Ethnogrow, you agree to the collection and use of information in accordance with this policy.</p>
              )
            },
            {
              title: '2. Information we collect',
              content: (
                <>
                  <p>We collect the following types of information:</p>
                  <ul>
                    <li><strong>Account information:</strong> When you create an account, we collect your name, email address, and password.</li>
                    <li><strong>Research data:</strong> Questionnaires you create, responses collected from participants, and AI-generated reports.</li>
                    <li><strong>Usage data:</strong> Information about how you use the service, including pages visited and features used.</li>
                    <li><strong>Participant responses:</strong> Responses submitted by your study participants. These are anonymous by default and linked only to a session identifier.</li>
                  </ul>
                </>
              )
            },
            {
              title: '3. How we use your information',
              content: (
                <ul>
                  <li>To provide and maintain the Ethnogrow service</li>
                  <li>To generate AI-powered reports and analysis on your research data</li>
                  <li>To send you account-related emails (confirmation, password reset, usage notifications)</li>
                  <li>To improve and develop the service</li>
                  <li>To enforce our Terms of Use</li>
                </ul>
              )
            },
            {
              title: '4. AI and data processing',
              content: (
                <p>Ethnogrow uses the Anthropic Claude API to generate research reports and analysis. Your response data is sent to Anthropic's API for processing. Anthropic's privacy policy applies to this processing. Your data is never used to train AI models.</p>
              )
            },
            {
              title: '5. Data storage and security',
              content: (
                <p>Your data is stored using Supabase, which runs on AWS infrastructure. All data is encrypted at rest and in transit using industry-standard encryption. We implement appropriate technical and organisational measures to protect your data against unauthorised access, alteration, disclosure, or destruction.</p>
              )
            },
            {
              title: '6. Data retention',
              content: (
                <p>We retain your account data for as long as your account is active. You can delete individual projects and their associated responses at any time from your dashboard. You can close your account entirely from the account menu, which permanently deletes all your data.</p>
              )
            },
            {
              title: '7. Sharing of information',
              content: (
                <>
                  <p>We do not sell, trade, or rent your personal information to third parties. We may share data with:</p>
                  <ul>
                    <li><strong>Service providers:</strong> Supabase (database), Anthropic (AI processing), Vercel (hosting). These providers process data only as necessary to provide their services.</li>
                    <li><strong>Legal requirements:</strong> If required by law or to protect our rights.</li>
                  </ul>
                </>
              )
            },
            {
              title: '8. Cookies',
              content: (
                <p>Ethnogrow uses essential cookies to maintain your login session. We do not use tracking cookies or third-party advertising cookies.</p>
              )
            },
            {
              title: '9. Your rights',
              content: (
                <>
                  <p>You have the right to:</p>
                  <ul>
                    <li>Access the personal data we hold about you</li>
                    <li>Request correction of inaccurate data</li>
                    <li>Request deletion of your data</li>
                    <li>Export your data</li>
                  </ul>
                  <p>To exercise these rights, contact us at <a href="mailto:hello@ethnogrow.com" className="text-ink font-medium hover:underline">hello@ethnogrow.com</a>.</p>
                </>
              )
            },
            {
              title: '10. Children\'s privacy',
              content: (
                <p>Ethnogrow is not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16.</p>
              )
            },
            {
              title: '11. Changes to this policy',
              content: (
                <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email. Continued use of the service after changes constitutes acceptance of the updated policy.</p>
              )
            },
            {
              title: '12. Contact',
              content: (
                <p>If you have questions about this Privacy Policy, contact us at <a href="mailto:hello@ethnogrow.com" className="text-ink font-medium hover:underline">hello@ethnogrow.com</a>.</p>
              )
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
              This is a placeholder privacy policy. Ethnogrow recommends having this document reviewed by a qualified legal professional before accepting paying customers.
            </p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  )
}
