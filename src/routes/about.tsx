import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { siteContentQuery } from "@/lib/queries";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Centre | K-Lunsar Computer Training" },
      {
        name: "description",
        content:
          "Learn about K-Lunsar Computer Training in Lunsar, our teaching model, qualified tutors and practical approach to job-ready digital skills.",
      },
      { property: "og:title", content: "About the Centre | K-Lunsar Computer Training" },
      {
        property: "og:description",
        content:
          "A practical, local computer training centre helping students pass exams and graduate with confidence.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: site } = useQuery(siteContentQuery);

  const pillars = [
    {
      icon: BookOpen,
      title: "Practical learning",
      body: "Students do real tasks on the computer: formatting documents, working with spreadsheets, building slides and creating databases they actually use.",
    },
    {
      icon: Users,
      title: "Small-group support",
      body: "Tutors work closely with students, repeat difficult steps, and make sure every learner gets help before moving on.",
    },
    {
      icon: Trophy,
      title: "Exam-first progress",
      body: "Every course ends with a practical exam. Passing the exam is the path to the next level and the final certificate.",
    },
    {
      icon: GraduationCap,
      title: "Career confidence",
      body: "We teach the foundations employers expect, including professional documents, digital communication, office tools and reliable study habits.",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        About the centre
      </p>
      <h1 className="mt-2 text-4xl font-bold">
        A local training centre built around skill, discipline and results
      </h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        {site?.["about"] ??
          "K-Lunsar Computer Training is a local education centre in Lunsar committed to helping students, job seekers and families build digital confidence through clear teaching and real practice."}
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader>
            <Badge variant="secondary">Our mission</Badge>
            <h2 className="mt-3 font-display text-2xl font-bold">
              We prepare learners to use technology with confidence
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Every student starts from a different point. Some are complete beginners. Others have
              used a computer before, but they need structure, pace and accountability. We combine
              patient coaching with a clear program model so no one is left behind.
            </p>
            <p>
              Students are taught in ordered programs, attend one of the four daily shifts and move
              forward only after passing the exam for each program. That keeps learning disciplined,
              measurable and useful for future work.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="h-5 w-5" />
              <span className="font-display text-base font-semibold">Centre profile</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{site?.["address"] ?? "# 40 Port Loko Road, Lunsar"}</span>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{site?.["motto"] ?? "Build Your Skills"}</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Six examined programs, practical assignments, certificates and graduation.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {pillars.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="h-full border-border/70">
            <CardHeader>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-display text-base font-semibold">{title}</h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-border bg-secondary/40 p-8">
        <h2 className="font-display text-2xl font-bold">What makes our approach work</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-primary">01</p>
            <h3 className="mt-2 font-display text-lg font-semibold">Clear progression</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Students follow a structured path from basic computer use to office productivity and
              digital communication.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">02</p>
            <h3 className="mt-2 font-display text-lg font-semibold">Supportive teaching</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tutors explain, demonstrate and revisit topics until the learner is comfortable with
              the task.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">03</p>
            <h3 className="mt-2 font-display text-lg font-semibold">Real outcomes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Graduates leave with a certificate, stronger computer confidence and a better chance
              at employment or further learning.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-14 flex flex-wrap gap-3">
        <Link to="/courses">
          <Button>Explore programs</Button>
        </Link>
        <Link to="/contact">
          <Button variant="outline">Book a visit</Button>
        </Link>
      </div>
    </div>
  );
}
