import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock3, Mail, MapPin, MessageSquareText, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { siteContentQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | K-Lunsar Computer Training" },
      {
        name: "description",
        content:
          "Get in touch with K-Lunsar Computer Training in Lunsar for enrolment, course information, shift updates and student support.",
      },
      { property: "og:title", content: "Contact | K-Lunsar Computer Training" },
      {
        property: "og:description",
        content:
          "Speak with the centre office to enroll, ask a question or arrange your next class.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data: site } = useQuery(siteContentQuery);
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please complete your name, email address and message before sending.");
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase
        .from("contact_inquiries")
        .insert({
          user_id: user?.id ?? null,
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim() || "General enquiry",
          message: form.message.trim(),
        });
      if (error) throw new Error(error.message);
      setForm({ name: "", email: "", subject: "", message: "" });
      toast.success("Your enquiry has been saved and sent to the centre team.");
    } catch {
      toast.error("Your enquiry could not be saved just now. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const contacts = [
    {
      icon: Phone,
      label: "Phone",
      value: site?.["phone"] ?? "077976570",
      href: `tel:${site?.["phone"] ?? "077976570"}`,
    },
    {
      icon: Mail,
      label: "Email",
      value: site?.["email"] ?? "klunsar@gmail.com",
      href: `mailto:${site?.["email"] ?? "klunsar@gmail.com"}`,
    },
    {
      icon: MapPin,
      label: "Address",
      value: site?.["address"] ?? "# 40 Port Loko Road, Lunsar",
      href: "#",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Contact</p>
      <h1 className="mt-2 text-4xl font-bold">Talk to the office</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Whether you want to register, ask about a shift, or get clarity on a program, the centre
        team is ready to help.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader>
            <h2 className="font-display text-2xl font-bold">Send a message</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Full name</label>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Subject</label>
                <input
                  value={form.subject}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, subject: event.target.value }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Course enquiry"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Message</label>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, message: event.target.value }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Tell us what you need help with"
                />
              </div>
              <Button type="submit" disabled={sending}>
                {sending ? "Sending..." : "Send enquiry"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {contacts.map(({ icon: Icon, label, value, href }) => (
            <Card key={label} className="border-border/70">
              <CardContent className="flex items-start gap-4 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                  {href === "#" ? (
                    <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
                  ) : (
                    <a
                      href={href}
                      className="mt-1 block text-sm font-medium text-foreground hover:text-primary"
                    >
                      {value}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-border/70 bg-secondary/30">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <Clock3 className="h-4 w-4" />
                <span className="font-display text-base font-semibold">Office hours</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Monday - Friday: 8:00 AM - 5:00 PM</p>
              <p>Saturday: 9:00 AM - 1:00 PM</p>
              <p>Open for new enrolments and shift advice.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-14 rounded-2xl border border-border bg-secondary/40 p-8">
        <div className="flex items-center gap-2 text-primary">
          <MessageSquareText className="h-5 w-5" />
          <p className="font-display text-base font-semibold">Quick help</p>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          If you are unsure which path is right for you, we can help you compare the Regular and
          Bonanza options, choose a shift and work out what you need before you register.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/shop">
            <Button>View available enrolment options</Button>
          </Link>
          <a href={`tel:${site?.["phone"] ?? "077976570"}`}>
            <Button variant="outline">Call the office</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
