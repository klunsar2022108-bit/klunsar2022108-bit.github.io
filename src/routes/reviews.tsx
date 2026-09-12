import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reviews")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Reviews | K-Lunsar" }] }),
  component: ReviewsPage,
});
function ReviewsPage() {
  const [form, setForm] = useState({ type: "course", title: "", body: "", rating: 5 });
  const { data: reviews = [], refetch } = useQuery({
    queryKey: ["reviews"],
    queryFn: async () =>
      (
        await supabase
          .from("reviews")
          .select("id,review_type,title,body,rating,status,created_at")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("reviews")
      .insert({
        author_id: user.id,
        review_type: form.type,
        title: form.title.trim(),
        body: form.body.trim(),
        rating: form.rating,
      });
    if (error) toast.error(error.message);
    else {
      toast.success("Review submitted for moderation.");
      setForm({ type: "course", title: "", body: "", rating: 5 });
      await refetch();
    }
  };
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-14">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Reviews</p>
        <h1 className="mt-2 text-4xl font-bold">Share your experience</h1>
        <p className="mt-3 text-muted-foreground">Reviews are moderated before publication.</p>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-bold">Submit a review</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="h-10 w-full rounded border bg-background px-3 text-sm"
            >
              <option value="course">Course</option>
              <option value="teacher">Teacher</option>
              <option value="programme">Programme</option>
              <option value="product">Product</option>
              <option value="service">Service</option>
            </select>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Review title"
              className="h-10 w-full rounded border bg-background px-3 text-sm"
            />
            <textarea
              required
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Write your review"
              className="w-full rounded border bg-background px-3 py-2 text-sm"
              rows={4}
            />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  type="button"
                  key={rating}
                  onClick={() => setForm({ ...form, rating })}
                  className={form.rating >= rating ? "text-amber-500" : "text-muted-foreground"}
                >
                  <Star className="h-5 w-5 fill-current" />
                </button>
              ))}
            </div>
            <Button type="submit">Submit review</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {reviews
          .filter((review) => review.status === "published")
          .map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between">
                  <h2 className="font-bold">{review.title}</h2>
                  <Badge>{review.rating}/5</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
