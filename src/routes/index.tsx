import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Quote,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductCard } from "@/components/site/ProductCard";
import {
  coursesQuery,
  faqsQuery,
  productsQuery,
  shiftsQuery,
  siteContentQuery,
  testimonialsQuery,
  tutorsQuery,
} from "@/lib/queries";
import { formatPrice } from "@/lib/format";
import heroImage from "@/assets/hero.jpg";
import graduationImage from "@/assets/graduation.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "K-Lunsar Computer Training, Lunsar | Build Your Skills" },
      {
        name: "description",
        content:
          "Learn Windows, Word, Excel, PowerPoint, Access and Internet Browsing in Lunsar. Regular and Bonanza paths, four daily shifts, examined programs and certificates.",
      },
      { property: "og:title", content: "K-Lunsar Computer Training | Build Your Skills" },
      {
        property: "og:description",
        content:
          "Two student paths, four shifts, six examined programs and a certificate that employers trust.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: site } = useQuery(siteContentQuery);
  const { data: courses = [] } = useQuery(coursesQuery);
  const { data: shifts = [] } = useQuery(shiftsQuery);
  const { data: tutors = [] } = useQuery(tutorsQuery);
  const { data: products = [] } = useQuery(productsQuery);
  const { data: testimonials = [] } = useQuery(testimonialsQuery);
  const { data: faqs = [] } = useQuery(faqsQuery);

  const paths = (products as ShopRow[]).filter((p) => p.category === "path" && p.active);
  const services = (products as ShopRow[]).filter((p) => p.category !== "path" && p.active);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-secondary/40">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <Badge variant="secondary" className="mb-4 border border-primary/20 text-primary">
              {site?.["motto"] ?? "Build Your Skills"}
            </Badge>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              {site?.hero_title ??
                "Computer training in Lunsar that ends with a skill, an exam and a certificate"}
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              {site?.hero_description ??
                "Six examined programs, four daily shifts and qualified tutors who stay with you until the skill is real. Choose the Regular path during school terms, or the Bonanza holiday intensive at half the fee."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop">
                <Button size="lg">Enrol now</Button>
              </Link>
              <Link to="/courses">
                <Button size="lg" variant="outline">
                  See courses & shifts
                </Button>
              </Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                { label: "Examined programs", value: "6" },
                { label: "Daily shifts", value: "4" },
                { label: "Bonanza discount", value: "50%" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="font-display text-2xl font-bold text-primary">{stat.value}</dt>
                  <dd className="text-xs text-muted-foreground">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <img
              src={site?.hero_image_data || heroImage}
              alt="Students learning at computers with a tutor at K-Lunsar Computer Training"
              width={1600}
              height={1008}
              className="w-full rounded-2xl border border-border object-cover shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Services */}
      <Section
        id="services"
        eyebrow="What we do"
        title="Everything a first-time computer user needs"
        description="From your very first click to a certificate you can put on a job application."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              Icon: Users,
              title: "Class training in shifts",
              body: "Small groups on real machines, four shifts a day so class fits around school or work.",
            },
            {
              Icon: ClipboardCheck,
              title: "Program exams",
              body: "Every program ends with an exam. You must pass before moving to the next one.",
            },
            {
              Icon: Award,
              title: "Certificates & graduation",
              body: "Finish all six programs, graduate with your class and receive your certificate.",
            },
            {
              Icon: BadgeCheck,
              title: "Job-ready practice",
              body: "CVs, application letters, payroll sheets, presentations and email, all built by you.",
            },
          ].map(({ Icon, title, body }) => (
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
      </Section>

      {/* Paths & pricing */}
      <Section
        id="paths"
        eyebrow="Course paths & pricing"
        title="Two ways to train with us"
        description="Same six programs, same exams, same certificate. Only the pace and the fee change."
        muted
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-primary/30">
            <CardHeader>
              <Badge variant="secondary">Regular path</Badge>
              <h3 className="mt-3 font-display text-2xl font-bold">Steady, term-time training</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Runs during school terms at a slower pace, with extra practice time between topics.
                Best if you are still in school or working and want the material to settle.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {[
                  "One shift per day, Monday to Friday",
                  "Weekly practice sheets and tutor review",
                  "All six programs with exams after each",
                  "Full fee, instalments available",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <Badge>Bonanza path - 50% fee</Badge>
              <h3 className="mt-3 font-display text-2xl font-bold">Holiday intensive</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                A fast holiday program covering all six courses at half the regular fee. Places are
                limited and fill quickly each holiday.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {[
                  "Runs through the school holidays",
                  "All six programs, same exams and certificate",
                  "50% of the regular fee",
                  "Limited seats per shift",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {paths.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Section>

      {/* Programs */}
      <Section
        id="programs"
        eyebrow="Programs"
        title="Six programs, taught in order"
        description="Each program is examined. Pass the exam and you move on to the next."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: CourseRow) => (
            <Card key={course.id} className="h-full border-border/70">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-semibold">{course.title}</h3>
                  <Badge variant="secondary">{course.level}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{course.summary}</p>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="h-4 w-4 text-primary" />
                {course.duration_weeks} weeks
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <Link to="/courses">
            <Button variant="outline">Full course details</Button>
          </Link>
        </div>
      </Section>

      {/* Shifts */}
      <Section
        id="shifts"
        eyebrow="Upcoming shifts"
        title="Pick the shift that fits your day"
        description="Seats are allocated at registration. Popular shifts close early each term."
        muted
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shifts.map((shift: ShiftRow) => {
            const left = Math.max(shift.seats - shift.seats_taken, 0);
            return (
              <Card key={shift.id} className="h-full border-border/70">
                <CardHeader>
                  <h3 className="font-display text-base font-semibold">{shift.name}</h3>
                  <p className="font-display text-2xl font-bold text-primary">
                    {shift.start_time} - {shift.end_time}
                  </p>
                  <p className="text-xs text-muted-foreground">{shift.days}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>{shift.notes}</p>
                  <Badge variant={left > 3 ? "secondary" : "destructive"}>
                    {left > 0 ? `${left} seats left` : "Waiting list"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* Tutors */}
      <Section
        id="tutors"
        eyebrow="Qualified tutors"
        title="Taught by people who train for a living"
        description="Every tutor is qualified, examined and used to teaching absolute beginners."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tutors.map((tutor: TutorRow) => (
            <Card key={tutor.id} className="h-full border-border/70">
              <CardHeader>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-display text-base font-bold text-primary">
                  {tutor.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <h3 className="mt-3 font-display text-base font-semibold">{tutor.name}</h3>
                <p className="text-xs font-medium text-primary">{tutor.title}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{tutor.bio}</p>
                <p className="text-xs">{tutor.qualifications}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how" eyebrow="How it works" title="From registration to graduation" muted>
        <ol className="grid gap-5 md:grid-cols-5">
          {[
            {
              step: "1",
              title: "Choose your path",
              body: "Regular for term time, Bonanza for the holidays.",
            },
            {
              step: "2",
              title: "Register & pick a shift",
              body: "Morning, Afternoon, Evening or Late.",
            },
            {
              step: "3",
              title: "Learn program by program",
              body: "Windows first, then Word, Excel and the rest.",
            },
            {
              step: "4",
              title: "Pass each exam",
              body: "You only move on once the exam is passed.",
            },
            { step: "5", title: "Graduate", body: "Graduation ceremony and your certificate." },
          ].map((item) => (
            <li key={item.step} className="rounded-xl border border-border bg-card p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                {item.step}
              </span>
              <h3 className="mt-3 font-display text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Services & items shop preview */}
      <Section
        id="shop"
        eyebrow="Services & items"
        title="Add what you need to your cart"
        description="Single courses, registration, exam resits, handbooks and private tutoring."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="mt-8">
          <Link to="/shop">
            <Button>Visit the shop</Button>
          </Link>
        </div>
      </Section>

      {/* Graduates */}
      <Section id="graduates" eyebrow="Graduates" title="What our students say" muted>
        <div className="grid gap-8 lg:grid-cols-2">
          <img
            src={graduationImage}
            alt="K-Lunsar graduates celebrating with their certificates"
            loading="lazy"
            width={1200}
            height={800}
            className="h-full w-full rounded-2xl border border-border object-cover"
          />
          <div className="grid gap-4">
            {testimonials.slice(0, 3).map((item: TestimonialRow) => (
              <Card key={item.id} className="border-border/70">
                <CardContent className="pt-6">
                  <Quote className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm leading-relaxed">{item.quote}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.program}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <Link to="/gallery">
            <Button variant="outline">See the gallery</Button>
          </Link>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" eyebrow="FAQ" title="Questions we hear every term">
        <Accordion type="single" collapsible className="mx-auto max-w-3xl">
          {faqs.map((faq: FaqRow) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground">
          <GraduationCap className="mx-auto h-10 w-10" />
          <h2 className="mt-4 font-display text-3xl font-bold">Ready to build your skills?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm opacity-90">
            Registration is open for both paths. Add your path to the cart, create your student
            account and we will confirm your shift.
          </p>
          <p className="mt-4 text-sm opacity-90">
            Regular from {formatPrice(paths.find((p) => p.path === "regular")?.price ?? 1500)} -
            Bonanza from {formatPrice(paths.find((p) => p.path === "bonanza")?.price ?? 750)}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/shop">
              <Button size="lg" variant="secondary">
                Enrol / shop
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                Talk to the office
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

type CourseRow = {
  id: string;
  title: string;
  summary: string;
  level: string;
  duration_weeks: number;
};
type ShiftRow = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days: string;
  notes: string;
  seats: number;
  seats_taken: number;
};
type TutorRow = { id: string; name: string; title: string; bio: string; qualifications: string };
type TestimonialRow = { id: string; name: string; program: string; quote: string; rating: number };
type FaqRow = { id: string; question: string; answer: string };
type ShopRow = {
  id: string;
  name: string;
  description: string;
  details: string;
  price: number | string;
  category: string;
  path: string | null;
  badge: string | null;
  active: boolean;
};

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  muted,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section id={id} className={muted ? "border-y border-border bg-secondary/40" : ""}>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-bold">{title}</h2>
        {description && <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
