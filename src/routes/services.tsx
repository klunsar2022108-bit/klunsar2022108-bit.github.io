import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { FormEvent } from "react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Request Services | K-Lunsar Computer Training" },
      {
        name: "description",
        content:
          "Request additional services like tutoring, exam resits, or consulting at K-Lunsar Computer Training.",
      },
    ],
  }),
  component: ServicesPage,
});

const AVAILABLE_SERVICES = [
  {
    id: "tutoring",
    name: "Private Tutoring",
    description: "One-on-one sessions for focused learning and exam preparation",
    price: 45000,
    duration: "Per session (1 hour)",
    icon: "👨‍🏫",
  },
  {
    id: "exam-resit",
    name: "Exam Resit",
    description: "Retake an exam with additional preparation and review sessions",
    price: 25000,
    duration: "Full resit process",
    icon: "📝",
  },
  {
    id: "certification-course",
    name: "Certification Course",
    description: "Extended program with industry-recognized certification",
    price: 180000,
    duration: "8 weeks",
    icon: "🏆",
  },
  {
    id: "consulting",
    name: "Career Consulting",
    description: "Professional guidance on career paths and employment readiness",
    price: 35000,
    duration: "Per consultation",
    icon: "💼",
  },
  {
    id: "custom-training",
    name: "Custom Corporate Training",
    description: "Tailored training programs for organizations and groups",
    price: "Quote on request",
    duration: "Flexible",
    icon: "🏢",
  },
];

function ServicesPage() {
  const { user } = useAuth();
  const [requestedServices, setRequestedServices] = useState<
    Array<{
      id: string;
      serviceId: string;
      serviceName: string;
      requestedAt: string;
      status: "pending" | "approved" | "rejected";
      message: string;
      adminResponse?: string;
    }>
  >(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem("klunsar-service-requests");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRequestService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedService || !requestMessage.trim() || !user?.email) return;

    setSubmitting(true);
    const service = AVAILABLE_SERVICES.find((s) => s.id === selectedService);
    if (!service) return;

    const newRequest = {
      id: `srv-${Date.now()}`,
      serviceId: selectedService,
      serviceName: service.name,
      requestedAt: new Date().toISOString(),
      status: "pending" as const,
      message: requestMessage.trim(),
    };

    const { error } = await supabase
      .from("service_requests")
      .insert({
        user_id: user.id,
        service_id: service.id,
        service_name: service.name,
        message: requestMessage.trim(),
      });
    if (error) return;
    const updated = [...requestedServices, newRequest];
    setRequestedServices(updated);

    setRequestMessage("");
    setSelectedService(null);
    setSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Services</p>
      <h1 className="mt-2 text-4xl font-bold">Request Additional Services</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Need extra support? Request tutoring, exam resits, certifications, or custom training. Our
        team will review your request and get back to you within 24 hours.
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Available Services */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Available Services</h2>
          {AVAILABLE_SERVICES.map((service) => (
            <Card
              key={service.id}
              className={`border-border/70 cursor-pointer transition-colors ${
                selectedService === service.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedService(service.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{service.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{service.duration}</p>
                        <p className="font-semibold text-primary">
                          {typeof service.price === "string"
                            ? service.price
                            : `Le ${service.price.toLocaleString()}`}
                        </p>
                      </div>
                      {selectedService === service.id && <Badge className="ml-2">Selected</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Request Form */}
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Request a Service</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestService} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Selected Service</label>
                  <p className="mt-2 rounded-lg border border-border bg-background p-3">
                    {selectedService
                      ? AVAILABLE_SERVICES.find((s) => s.id === selectedService)?.name
                      : "Please select a service above"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Your Message</label>
                  <Textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Tell us about your needs, preferred dates, or any special requirements..."
                    rows={5}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Be specific about your goals and any constraints you have.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedService || !requestMessage.trim() || submitting}
                >
                  {submitting ? "Submitting..." : "Submit Service Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Request History */}
          <Card className="border-border/70 bg-primary/5">
            <CardHeader>
              <h2 className="font-display text-lg font-bold">Your Requests</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {requestedServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No service requests yet. Submit one above to get started!
                </p>
              ) : (
                requestedServices.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium">{request.serviceName}</p>
                        <p className="text-sm text-muted-foreground mt-1">{request.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          request.status === "approved"
                            ? "default"
                            : request.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                    {request.adminResponse && (
                      <div className="mt-3 rounded-lg border-l-2 border-primary bg-primary/5 p-3">
                        <p className="text-xs font-semibold text-primary">Admin Response:</p>
                        <p className="text-sm text-foreground mt-1">{request.adminResponse}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
