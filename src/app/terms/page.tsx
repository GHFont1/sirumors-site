import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/site/Prose";

export const metadata: Metadata = { title: "Terms of Use", description: "The terms for using SI Rumors, its alerts, accounts and forums.", alternates: { canonical: "/terms/" } };

export default function TermsPage() {
  return (
    <Prose kicker="Legal" title="Terms of Use" updated="October 12, 2026">
      <p>These terms apply to sirumors.com, its emails and its forums (together, &quot;SI Rumors&quot;, &quot;we&quot;, &quot;us&quot;). By using SI Rumors you agree to them. If you do not agree, please do not use the site.</p>

      <h2>1. What SI Rumors is</h2>
      <p>SI Rumors publishes news, rumors, release history, usage-reset tracking, model rankings and prediction-market odds about artificial intelligence. Content is for general information only.</p>

      <h2>2. Rumors, estimates and odds are not facts or advice</h2>
      <p>Rumors are unconfirmed by definition. Confidence scores, release-date estimates, rankings and odds are our good-faith summaries of public information and may be wrong, incomplete or out of date. Nothing on SI Rumors is financial, investment, legal or betting advice. Do not rely on it for decisions with real consequences without checking the original company announcement yourself.</p>

      <h2>3. Accounts</h2>
      <p>You may need an account to post in the forums, follow topics or manage alerts. Keep your sign-in secure and give accurate information. You are responsible for activity on your account. You must be at least 13 years old to create an account.</p>

      <h2>4. Your posts</h2>
      <p>You keep ownership of what you post. By posting, you give SI Rumors a worldwide, non-exclusive, royalty-free license to host, display, reproduce and distribute it on and in connection with SI Rumors. You are responsible for what you post and confirm you have the right to share it.</p>

      <h2>5. Community rules</h2>
      <p>Do not post anything unlawful, harassing, hateful, sexually explicit, defamatory or misleading; do not share private or confidential information about others, including leaked personal data; do not spam, advertise or impersonate anyone; and do not try to break, scrape at scale or overload the site. We may remove content, limit features or suspend accounts that break these rules, at our discretion.</p>

      <h2>6. Our content</h2>
      <p>The text, design, rankings and compilations on SI Rumors belong to SI Rumors. You may share links and short quotes with credit. Do not republish our articles in full or copy the site in bulk without permission. Company names, product names and logos belong to their owners and are used only to identify them; their use does not imply any affiliation or endorsement.</p>

      <h2>7. Emails</h2>
      <p>If you sign up for the digest or alerts, we email you as you chose. Every email includes an unsubscribe link, and you can change your choices at any time.</p>

      <h2>8. Availability and changes</h2>
      <p>We may change, pause or stop any part of SI Rumors at any time. We may update these terms; the date above shows the latest version, and continued use means you accept the update.</p>

      <h2>9. Disclaimer</h2>
      <p>SI Rumors is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, express or implied, including accuracy, fitness for a particular purpose and non-infringement.</p>

      <h2>10. Limitation of liability</h2>
      <p>To the fullest extent the law allows, SI Rumors is not liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, data or goodwill, arising from your use of the site. Our total liability for any claim is limited to one hundred US dollars (US$100).</p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of the State of New York, USA, without regard to conflict-of-law rules. Disputes will be handled in the state or federal courts located in New York.</p>

      <h2>12. Contact</h2>
      <p>Questions about these terms? Reach us through the <Link href="/contact/">contact page</Link>. See also our <Link href="/privacy/">Privacy Policy</Link>.</p>
    </Prose>
  );
}
