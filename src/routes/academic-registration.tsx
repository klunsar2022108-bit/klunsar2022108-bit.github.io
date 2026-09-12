import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/academic-registration")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Course Registration | K-Lunsar" }] }),
  component: AcademicRegistrationPage,
});

function AcademicRegistrationPage() {
  const [periodId, setPeriodId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [repeatReason, setRepeatReason] = useState("");
  const [message, setMessage] = useState("");
  const { data: periods = [] } = useQuery({
    queryKey: ["registration-periods"],
    queryFn: async () =>
      (
        await supabase
          .from("academic_periods")
          .select("id,name,registration_open_at,registration_close_at")
          .eq("active", true)
          .order("registration_open_at")
      ).data ?? [],
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["registration-courses"],
    queryFn: async () =>
      (
        await supabase
          .from("courses")
          .select("id,title,summary")
          .eq("active", true)
          .order("sort_order")
      ).data ?? [],
  });
  const register = async (event: FormEvent) => {
    event.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !periodId || !courseId) return;
    const { data: validation, error: validationError } = await supabase.rpc(
      "validate_course_registration",
      { _student_id: user.id, _course_id: courseId, _period_id: periodId },
    );
    if (validationError) {
      toast.error(validationError.message);
      return;
    }
    const result = validation?.[0];
    if (!result?.allowed) {
      setMessage(result?.reason ?? "Registration is not allowed.");
      return;
    }
    if (result.requires_repeat_confirmation && !repeatReason) {
      setMessage(`${result.reason} Select a reason to continue.`);
      return;
    }
    const { data: enrollment, error } = await supabase
      .from("enrollments")
      .insert({
        user_id: user.id,
        academic_period_id: periodId,
        path: "regular",
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !enrollment) {
      toast.error(error?.message ?? "Registration failed.");
      return;
    }
    const { error: courseError } = await supabase
      .from("enrollment_courses")
      .insert({ enrollment_id: enrollment.id, course_id: courseId });
    if (courseError) {
      toast.error(courseError.message);
      return;
    }
    if (repeatReason)
      await supabase
        .from("course_repeat_requests")
        .insert({
          student_id: user.id,
          course_id: courseId,
          academic_period_id: periodId,
          reason: repeatReason,
        });
    toast.success("Registration submitted for Admin approval.");
    setMessage("Registration submitted for Admin approval.");
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        Student registration
      </p>
      <h1 className="mt-2 text-4xl font-bold">Register for a course</h1>
      <p className="mt-3 text-muted-foreground">
        The system checks duplicate enrolments, conflicts, completion history and the active
        academic period.
      </p>
      <Card className="mt-8">
        <CardHeader>
          <h2 className="font-bold">Course registration</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={register} className="space-y-4">
            <select
              required
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              className="h-10 w-full rounded border bg-background px-3 text-sm"
            >
              <option value="">Select academic period</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </select>
            <div className="space-y-2">
              {courses.map((course) => (
                <button
                  type="button"
                  key={course.id}
                  onClick={() => setCourseId(course.id)}
                  className={`block w-full rounded border p-3 text-left ${courseId === course.id ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <p className="font-medium">{course.title}</p>
                  <p className="text-xs text-muted-foreground">{course.summary}</p>
                </button>
              ))}
            </div>
            {message && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
                {message}
              </div>
            )}
            {message.includes("repeat") && (
              <select
                value={repeatReason}
                onChange={(e) => setRepeatReason(e.target.value)}
                className="h-10 w-full rounded border bg-background px-3 text-sm"
              >
                <option value="">Why are you repeating?</option>
                <option value="Repeating the course">Repeating the course</option>
                <option value="Improving grade">Improving grade</option>
                <option value="Retaking after failure">Retaking after failure</option>
                <option value="Other">Other</option>
              </select>
            )}
            <Button type="submit">Submit registration</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
