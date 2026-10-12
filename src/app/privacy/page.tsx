import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/site/Prose";

export const metadata: Metadata = { title: "Privacy Policy", description: "What SI Rumors collects, why, who processes it and the choices you have.", alternates: { canonical: "/privacy/" } };

export default function PrivacyPage() {
  return (
    <Prose kicker="Legal" title="Privacy Policy" updated="October 12, 2026" intro="We collect as little as we can. We do not sell your information and we do not use advertising trackers.">
      <h2>What we collect</h2>
      <ul className="space-y-2">
        <li><strong>Visits.</strong> When you view a page we record the page address, the website that referred you (its domain only), whether it is the first page of your visit, and whether you are on a phone or a computer. We do not record your IP address, set cookies for this, or link it to you.</li>
        <li><strong>Digest and alerts.</strong> If you sign up, we store your email address, when you confirmed it and your email choices.</li>
        <li><strong>Accounts.</strong> If you create an account, we store your email address, username, the companies, people and topics you follow, your email settings, your notifications and points, and what you post in the forums.</li>
        <li><strong>Contact messages.</strong> If you contact us, we store your name, email address and message so we can reply.</li>
      </ul>

      <h2>How we use it</h2>
      <p>To run the site, send the emails you asked for, show your follows and notifications, run the forums, answer messages, keep the site secure and understand which pages are useful. We do not sell or rent personal information and we do not use it for advertising.</p>

      <h2>Storage on your device</h2>
      <p>If you sign in, your browser keeps your sign-in session in local storage so you stay signed in. We also keep a small flag in session storage, cleared when you close the tab, so a visit is counted once. We do not use advertising or cross-site tracking cookies.</p>

      <h2>Who processes it for us</h2>
      <p>We use a small number of service providers to run SI Rumors: website hosting (GitHub Pages), our database and sign-in service (Supabase), and email delivery (Resend). They process data only to provide these services to us. Pages may display images hosted by the companies we cover and embedded videos from YouTube (using its privacy-enhanced mode), which those services load directly.</p>

      <h2>How long we keep it</h2>
      <p>Visit counts are kept in aggregate form for as long as they are useful. Email subscriptions are kept until you unsubscribe. Account data is kept until you ask us to delete your account. Contact messages are kept as long as needed to handle your request.</p>

      <h2>Your choices and rights</h2>
      <p>You can unsubscribe from any email with one click, change your email settings on the Settings page, and ask us to access, correct or delete your information through the <Link href="/contact/">contact page</Link>. Depending on where you live (for example California or the EU/UK), you may have additional rights; we honor those requests.</p>

      <h2>Children</h2>
      <p>SI Rumors is not directed to children under 13, and we do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>We may update this policy; the date above shows the latest version.</p>

      <h2>Contact</h2>
      <p>Privacy questions or requests: use the <Link href="/contact/">contact page</Link>. See also our <Link href="/terms/">Terms of Use</Link>.</p>
    </Prose>
  );
}
