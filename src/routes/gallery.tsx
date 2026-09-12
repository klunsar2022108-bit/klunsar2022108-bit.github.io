import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ImageIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { galleryQuery, testimonialsQuery } from "@/lib/queries";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery & Testimonials | K-Lunsar Computer Training" },
      {
        name: "description",
        content:
          "See student moments, certificate events and testimonials from K-Lunsar Computer Training graduates in Lunsar.",
      },
      { property: "og:title", content: "Gallery & Testimonials | K-Lunsar Computer Training" },
      {
        property: "og:description",
        content: "Celebrations, learning moments and success stories from our graduates.",
      },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { data: gallery = [] } = useQuery(galleryQuery);
  const { data: testimonials = [] } = useQuery(testimonialsQuery);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        Gallery & testimonials
      </p>
      <h1 className="mt-2 text-4xl font-bold">Moments from the centre and the people we help</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Student growth is at the heart of the centre. These photos and stories reflect the effort,
        discipline and pride that build a solid digital future.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {(gallery as GalleryPost[]).map((item) => (
          <Card key={item.id} className="overflow-hidden border-border/70">
            <div className="h-56 bg-gradient-to-br from-primary/25 via-secondary to-primary/10 p-4">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-border bg-background/40">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm">{item.title}</p>
                  </div>
                </div>
              )}
            </div>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">{item.title}</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {item.caption ?? item.summary ?? "A memorable learning moment from the centre."}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16">
        <h2 className="text-3xl font-bold">Graduate stories</h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {(testimonials as TestimonialRow[]).map((item) => (
            <Card key={item.id} className="border-border/70">
              <CardContent className="pt-6">
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(item.rating, 5) }).map((_, index) => (
                    <Star
                      key={`${item.id}-${index}`}
                      className="h-4 w-4 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">“{item.quote}”</p>
                <div className="mt-5 border-t border-border pt-4">
                  <p className="font-display font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.program}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-14 rounded-2xl border border-border bg-primary px-6 py-10 text-primary-foreground">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/80">
              Next step
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold">
              Start your own learning journey
            </h2>
          </div>
          <Link to="/shop">
            <Button variant="secondary" className="gap-2">
              Enrol now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

type GalleryPost = {
  id: string;
  title: string;
  caption?: string | null;
  summary?: string | null;
  image_url?: string | null;
};

type TestimonialRow = {
  id: string;
  name: string;
  program: string;
  quote: string;
  rating: number;
};
