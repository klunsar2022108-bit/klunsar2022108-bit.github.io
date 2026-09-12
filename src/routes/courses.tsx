import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ClipboardCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { coursesQuery, shiftsQuery } from "@/lib/queries";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses & Shifts | K-Lunsar Computer Training" },
      {
        name: "description",
        content:
          "Windows, Word, Excel, PowerPoint, Access and Internet Browsing, taught across Morning, Afternoon, Evening and Late shifts in Lunsar.",
      },
      { property: "og:title", content: "Courses & Shifts | K-Lunsar Computer Training" },
      {
        property: "og:description",
        content: "Six examined programs and four daily shifts to fit school or work.",
      },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const { data: courses = [] } = useQuery(coursesQuery);
  const { data: shifts = [] } = useQuery(shiftsQuery);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        Courses & Shifts
      </p>
      <h1 className="mt-2 text-4xl font-bold">Six programs. Four shifts. One certificate.</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Programs are taught in order, starting with Windows Essentials. Each one ends with an exam
        you must pass before moving on, which is what makes the K-Lunsar certificate worth carrying
        to an employer.
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {courses.map((course: CourseRow, index: number) => (
          <Card key={course.id} className="border-border/70">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-primary">Program {index + 1}</p>
                  <h2 className="font-display text-xl font-bold">{course.title}</h2>
                </div>
                <Badge variant="secondary">{course.level}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{course.summary}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{course.details}</p>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  {course.duration_weeks} weeks
                </span>
                <span className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  Program exam, {60}% pass mark
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-16 text-3xl font-bold">Shifts</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Choose one shift at registration. You can request a change at the office if your school or
        work hours change.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {shifts.map((shift: ShiftRow) => {
          const left = Math.max(shift.seats - shift.seats_taken, 0);
          return (
            <Card key={shift.id} className="border-border/70">
              <CardHeader>
                <h3 className="font-display text-base font-semibold">{shift.name}</h3>
                <p className="flex items-center gap-1.5 font-display text-xl font-bold text-primary">
                  <Clock className="h-4 w-4" />
                  {shift.start_time} - {shift.end_time}
                </p>
                <p className="text-xs text-muted-foreground">{shift.days}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{shift.notes}</p>
                <Badge variant={left > 3 ? "secondary" : "destructive"}>
                  {left > 0 ? `${left} of ${shift.seats} seats left` : "Waiting list"}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-14 rounded-2xl border border-border bg-secondary/40 p-8">
        <h2 className="font-display text-2xl font-bold">Exams, graduation and certificates</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Each program exam is marked out of 100 with a 60% pass mark. A learner who does not pass
          gets extra practice and a resit before moving on. When all six programs are passed, you
          join the next graduation ceremony and receive a numbered K-Lunsar certificate listing the
          programs you completed. Your results and certificate status are always visible in your
          student area.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/shop">
            <Button>Enrol now</Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline">Ask a question</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

type CourseRow = {
  id: string;
  title: string;
  summary: string;
  details: string;
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
