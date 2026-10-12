import type { Metadata } from "next";
import { Prose } from "@/components/site/Prose";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = { title: "Contact SI Rumors", description: "Send SI Rumors a correction, a news tip, a partnership idea or a privacy request.", alternates: { canonical: "/contact/" } };

export default function ContactPage() {
  return (
    <Prose kicker="Contact" title="Contact us" intro="Corrections, news tips, partnerships and privacy requests. We read everything and reply by email.">
      <ContactForm />
      <p>Got a tip? Include anything that helps us check it: links, dates, screenshots described in words. We never publish who sent a tip.</p>
    </Prose>
  );
}
