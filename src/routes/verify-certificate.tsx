import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verify-certificate")({
  head: () => ({ meta: [{ title: "Verify Certificate | K-Lunsar Computer Training" }] }),
  component: VerifyCertificatePage,
});

function VerifyCertificatePage() {
  const [number, setNumber] = useState("");
  const [result, setResult] = useState<{
    certificate_no: string;
    title: string;
    graduation_date: string | null;
    status: string;
    student_name: string | null;
  } | null>(null);
  const [searched, setSearched] = useState(false);
  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    const { data } = await supabase.rpc("verify_certificate", { _certificate_no: number.trim() });
    setResult(data?.[0] ?? null);
    setSearched(true);
  };
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <div className="text-center">
        <BadgeCheck className="mx-auto h-12 w-12 text-primary" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Certificate verification
        </p>
        <h1 className="mt-2 text-4xl font-bold">Verify a K-Lunsar certificate</h1>
        <p className="mt-3 text-muted-foreground">
          Enter the certificate number to verify an issued certificate.
        </p>
      </div>
      <Card className="mt-8">
        <CardHeader>
          <h2 className="font-bold">Certificate number</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={verify} className="flex gap-2">
            <input
              required
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder="KL-XXXXXXXXXX"
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            />
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              Verify
            </Button>
          </form>
          {searched && (
            <div className="mt-6 rounded-lg border p-4">
              {result ? (
                <>
                  <p className="font-semibold text-green-700">Certificate verified</p>
                  <p className="mt-2 text-sm">Holder: {result.student_name ?? "Student"}</p>
                  <p className="text-sm">Certificate: {result.title}</p>
                  <p className="text-sm">Issued: {result.graduation_date ?? "Not recorded"}</p>
                  <p className="mt-2 text-xs uppercase text-muted-foreground">{result.status}</p>
                </>
              ) : (
                <p className="text-sm text-red-700">No issued certificate matched that number.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
