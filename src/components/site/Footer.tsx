import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
  MessageCircle,
  Music2,
} from "lucide-react";
import { siteContentQuery } from "@/lib/queries";

export function Footer() {
  const { data: site } = useQuery(siteContentQuery);
  const socials = [
    { key: "facebook", label: "Facebook", Icon: Facebook },
    { key: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
    { key: "youtube", label: "YouTube", Icon: Youtube },
    { key: "twitter", label: "X", Icon: Twitter },
    { key: "instagram", label: "Instagram", Icon: Instagram },
    { key: "tiktok", label: "TikTok", Icon: Music2 },
  ];

  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-lg font-bold">
            {site?.["centre_name"] ?? "K-Lunsar Computer Training"}
          </p>
          <p className="mt-1 text-sm font-semibold text-primary">
            {site?.["motto"] ?? "Build Your Skills"}
          </p>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            {site?.["about"] ??
              "A community computer training centre teaching practical skills that lead to work."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {socials.map(({ key, label, Icon }) => (
              <a
                key={key}
                href={site?.[key] ?? "#"}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="font-display text-sm font-semibold">Explore</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/courses" className="hover:text-foreground">
                Courses & Shifts
              </Link>
            </li>
            <li>
              <Link to="/shop" className="hover:text-foreground">
                Shop & Fees
              </Link>
            </li>
            <li>
              <Link to="/gallery" className="hover:text-foreground">
                Gallery & Testimonials
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-foreground">
                About the centre
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/auth" className="hover:text-foreground">
                Sign in / Register
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-display text-sm font-semibold">Visit us</p>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{site?.["address"] ?? "# 40 Port Loko Road, Lunsar"}</span>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <a href={`tel:${site?.["phone"] ?? ""}`} className="hover:text-foreground">
                {site?.["phone"] ?? "077976570"}
              </a>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <a href={`mailto:${site?.["email"] ?? ""}`} className="hover:text-foreground">
                {site?.["email"] ?? "klunsar@gmail.com"}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 py-5 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} {site?.["centre_name"] ?? "K-Lunsar Computer Training"}.
        All rights reserved.
      </div>
    </footer>
  );
}
