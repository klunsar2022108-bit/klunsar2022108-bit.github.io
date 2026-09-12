import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fallbackSiteContent: Record<string, string> = {
  centre_name: "K-Lunsar Computer Training",
  motto: "Build Your Skills",
  about: "A community computer training centre teaching practical skills that lead to work.",
  address: "# 40 Port Loko Road, Lunsar",
  phone: "077976570",
  email: "klunsar@gmail.com",
  facebook: "#",
  whatsapp: "#",
  youtube: "#",
  twitter: "#",
  instagram: "#",
  tiktok: "#",
};

const fallbackCourses = [
  {
    id: "course-windows",
    title: "Windows Essentials",
    summary: "Learn the desktop, files, folders and everyday digital confidence.",
    details:
      "Students learn how to operate a Windows computer confidently, organise files, use basic applications and navigate common tasks safely and efficiently.",
    level: "Beginner",
    duration_weeks: 4,
    active: true,
    sort_order: 1,
  },
  {
    id: "course-word",
    title: "Word Processing",
    summary: "Create clean documents, reports, and professional letters.",
    details:
      "This program teaches formatting, page layout, tables, editing tools, and document preparation for school, office and daily communication use.",
    level: "Foundation",
    duration_weeks: 4,
    active: true,
    sort_order: 2,
  },
  {
    id: "course-excel",
    title: "Excel for Work",
    summary: "Work with spreadsheets, formulas, charts and practical office tasks.",
    details:
      "Learners build practical workplace skills with formulas, data entry, tables, charts, sorting, filtering and simple business calculations.",
    level: "Intermediate",
    duration_weeks: 5,
    active: true,
    sort_order: 3,
  },
  {
    id: "course-powerpoint",
    title: "PowerPoint Presentation",
    summary: "Design engaging presentations and visual communication.",
    details:
      "Students learn how to create clear presentations, use layout tools, animations, transitions and confident speaking support for school or work settings.",
    level: "Intermediate",
    duration_weeks: 4,
    active: true,
    sort_order: 4,
  },
  {
    id: "course-access",
    title: "Access Database",
    summary: "Build simple database systems for tracking information and records.",
    details:
      "This course covers table design, forms, queries, reports and practical record management for small businesses, offices and personal use.",
    level: "Intermediate",
    duration_weeks: 5,
    active: true,
    sort_order: 5,
  },
  {
    id: "course-internet",
    title: "Internet & Communication",
    summary: "Use the internet safely, search effectively and communicate online.",
    details:
      "Students learn internet browsing, online communication, email best practices, search methods, digital safety and basic productivity tools online.",
    level: "Foundation",
    duration_weeks: 3,
    active: true,
    sort_order: 6,
  },
] as const;

const fallbackShifts = [
  {
    id: "shift-morning",
    name: "Morning",
    start_time: "08:00",
    end_time: "10:00",
    days: "Mon - Fri",
    notes: "Best for school students and early risers.",
    seats: 20,
    seats_taken: 9,
    sort_order: 1,
  },
  {
    id: "shift-afternoon",
    name: "Afternoon",
    start_time: "12:30",
    end_time: "14:30",
    days: "Mon - Fri",
    notes: "Popular with work learners and busy adults.",
    seats: 18,
    seats_taken: 7,
    sort_order: 2,
  },
  {
    id: "shift-evening",
    name: "Evening",
    start_time: "17:30",
    end_time: "19:30",
    days: "Mon - Fri",
    notes: "Good for learners who study after work or school.",
    seats: 16,
    seats_taken: 6,
    sort_order: 3,
  },
  {
    id: "shift-late",
    name: "Late",
    start_time: "19:00",
    end_time: "21:00",
    days: "Mon - Thu",
    notes: "Flexible option for concentrated evening study.",
    seats: 14,
    seats_taken: 5,
    sort_order: 4,
  },
] as const;

const fallbackTutors = [
  {
    id: "tutor-1",
    name: "Musa S. Kamara",
    title: "Computer Literacy Tutor",
    bio: "Helps beginners build confidence with digital tools and everyday office tasks.",
    qualifications: "BSc in Computer Science, certificate in adult learning",
  },
  {
    id: "tutor-2",
    name: "Fatmata J. Conteh",
    title: "Office Skills Instructor",
    bio: "Specialises in Word, Excel and document formatting for school and employment use.",
    qualifications: "Diploma in Business Administration, ICT instructor",
  },
  {
    id: "tutor-3",
    name: "Abdulai K. Bangura",
    title: "Database & Presentation Tutor",
    bio: "Teaches practical databases, spreadsheets, and presentation skills with clear examples.",
    qualifications: "HND in Information Technology, presentation design mentor",
  },
  {
    id: "tutor-4",
    name: "Hawa B. Sesay",
    title: "Digital Skills Coach",
    bio: "Supports students with internet safety, email communication and job-ready digital habits.",
    qualifications: "Certificate in ICT support and digital literacy training",
  },
] as const;

const fallbackProducts = [
  {
    id: "path-regular",
    name: "Regular Path",
    description: "School-term learning, slower pace and structured weekly practice.",
    details:
      "Ideal for students who want time to master each program through a steady, well-supported schedule.",
    price: 250000,
    category: "path",
    sector: "student",
    path: "regular",
    badge: "Popular",
    active: true,
    sort_order: 1,
  },
  {
    id: "path-bonanza",
    name: "Bonanza Path",
    description: "Holiday intensive covering all programs over a shorter schedule.",
    details:
      "A faster course path covering all six programs with a 50% fee discount for the holiday intensive.",
    price: 125000,
    category: "path",
    sector: "student",
    path: "bonanza",
    badge: "50% off",
    active: true,
    sort_order: 2,
  },
  {
    id: "course-word-single",
    name: "Word Processing",
    description: "Single course purchase for document and office skill work.",
    details:
      "One focused program for learners who want to improve document creation, formatting and professionalism.",
    price: 65000,
    category: "course",
    sector: "student",
    path: null,
    badge: "Course",
    active: true,
    sort_order: 3,
  },
  {
    id: "course-excel-single",
    name: "Excel for Work",
    description: "Practical spreadsheet skills for business and office tasks.",
    details:
      "Learn formula use, data tables, charts and the calculations used in everyday office work.",
    price: 78000,
    category: "course",
    sector: "student",
    path: null,
    badge: "Course",
    active: true,
    sort_order: 4,
  },
  {
    id: "service-registration",
    name: "Registration & Orientation",
    description: "Start your course with centre onboarding and placement guidance.",
    details:
      "Includes orientation, enrolment confirmation and support with choosing the right shift and program path.",
    price: 20000,
    category: "service",
    sector: "student",
    path: null,
    badge: "Service",
    active: true,
    sort_order: 5,
  },
  {
    id: "service-private-tutor",
    name: "Private Tutoring",
    description: "One-on-one help for learners who need extra support.",
    details:
      "Extra sessions for students who need a clearer explanation, revision time, or focused exam practice.",
    price: 45000,
    category: "service",
    sector: "student",
    path: null,
    badge: "Support",
    active: true,
    sort_order: 6,
  },
  {
    id: "item-handbook",
    name: "Student Handbook",
    description: "A practical guide to study routines, lessons and revision tips.",
    details:
      "Useful handbook covering center routines, lesson flow and revision support between classes.",
    price: 15000,
    category: "item",
    sector: "student",
    path: null,
    badge: "Manual",
    active: true,
    sort_order: 7,
  },
  {
    id: "service-business-branding",
    name: "Business Branding Setup",
    description: "A practical business package for owners who want a stronger digital presence.",
    details:
      "Includes a simple digital brand setup plan, common office tool guidance and a setup checklist for small business communication.",
    price: 85000,
    category: "service",
    sector: "business",
    path: null,
    badge: "Business",
    active: true,
    sort_order: 8,
  },
  {
    id: "item-office-kit",
    name: "Office Essentials Kit",
    description: "A ready-to-use kit for business operators and service teams.",
    details:
      "Useful for recordkeeping, office productivity, file management and efficient day-to-day business operations.",
    price: 35000,
    category: "item",
    sector: "business",
    path: null,
    badge: "Office",
    active: true,
    sort_order: 9,
  },
] as const;

const fallbackTestimonials = [
  {
    id: "testimonial-1",
    name: "Abigail Kanu",
    program: "Word Processing",
    quote:
      "I used to be scared of the computer, but after six weeks I was confident creating documents and reports.",
    rating: 5,
  },
  {
    id: "testimonial-2",
    name: "Moses Jalloh",
    program: "Excel for Work",
    quote:
      "The tutors broke everything down clearly. I can now handle spreadsheets, formulas and simple business data tasks.",
    rating: 5,
  },
  {
    id: "testimonial-3",
    name: "Hawa Koroma",
    program: "PowerPoint",
    quote:
      "I learned how to make professional presentations for school and I was proud to share my work with classmates.",
    rating: 5,
  },
] as const;

const fallbackGallery = [
  {
    id: "gallery-1",
    title: "Classroom practice",
    caption: "Students working through Word and Excel tasks with tutor guidance.",
    summary: "Students working through Word and Excel tasks with tutor guidance.",
    image_url: "",
  },
  {
    id: "gallery-2",
    title: "Exam day",
    caption: "A serious and focused exam session where learners show their progress.",
    summary: "A serious and focused exam session where learners show their progress.",
    image_url: "",
  },
  {
    id: "gallery-3",
    title: "Graduation moment",
    caption: "Students celebrate after completing their program cycle and receiving certificates.",
    summary: "Students celebrate after completing their program cycle and receiving certificates.",
    image_url: "",
  },
] as const;

const fallbackFaqs = [
  {
    id: "faq-1",
    question: "Do I need experience before I join?",
    answer:
      "No. Most learners begin at a beginner level, and the centre supports them step by step from basic computer use to completed programs.",
  },
  {
    id: "faq-2",
    question: "What happens if I fail an exam?",
    answer:
      "You receive extra support and a resit opportunity before moving on so you can improve and continue with confidence.",
  },
  {
    id: "faq-3",
    question: "Can I change my shift later?",
    answer:
      "Yes. Shift changes are possible when the office has available space and your timetable allows it.",
  },
  {
    id: "faq-4",
    question: "Do students get certificates?",
    answer:
      "Yes. Students who complete all six programs and pass the required exams are awarded a K-Lunsar certificate and graduate with the centre.",
  },
] as const;

async function unwrap<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

async function withFallback<T>(
  request: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  fallback: T,
): Promise<T> {
  try {
    const result = await unwrap<T>(request);
    return (Array.isArray(result) ? (result.length > 0 ? result : fallback) : result) as T;
  } catch {
    return fallback;
  }
}

export const coursesQuery = queryOptions({
  queryKey: ["courses"],
  queryFn: () =>
    withFallback(
      supabase.from("courses").select("*").eq("active", true).order("sort_order"),
      fallbackCourses,
    ),
});

export const allCoursesQuery = queryOptions({
  queryKey: ["courses", "all"],
  queryFn: () =>
    withFallback(supabase.from("courses").select("*").order("sort_order"), fallbackCourses),
});

export const shiftsQuery = queryOptions({
  queryKey: ["shifts"],
  queryFn: () =>
    withFallback(supabase.from("shifts").select("*").order("sort_order"), fallbackShifts),
});

export const tutorsQuery = queryOptions({
  queryKey: ["tutors"],
  queryFn: () =>
    withFallback(supabase.from("tutors").select("*").order("sort_order"), fallbackTutors),
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: () =>
    withFallback(supabase.from("products").select("*").order("sort_order"), fallbackProducts),
});

export const testimonialsQuery = queryOptions({
  queryKey: ["testimonials"],
  queryFn: () =>
    withFallback(
      supabase.from("testimonials").select("*").order("created_at"),
      fallbackTestimonials,
    ),
});

export const galleryQuery = queryOptions({
  queryKey: ["gallery"],
  queryFn: () =>
    withFallback(supabase.from("gallery_posts").select("*").order("sort_order"), fallbackGallery),
});

export const faqsQuery = queryOptions({
  queryKey: ["faqs"],
  queryFn: () => withFallback(supabase.from("faqs").select("*").order("sort_order"), fallbackFaqs),
});

export const siteContentQuery = queryOptions({
  queryKey: ["site_content"],
  queryFn: async () => {
    try {
      const rows = await unwrap<{ key: string; value: string }[]>(
        supabase.from("site_content").select("*"),
      );
      const map: Record<string, string> = { ...fallbackSiteContent };
      for (const row of rows) map[row.key] = row.value;
      return map;
    } catch {
      return { ...fallbackSiteContent };
    }
  },
});

export const examsQuery = queryOptions({
  queryKey: ["exams"],
  queryFn: () =>
    withFallback(supabase.from("exams").select("*, courses(title)").order("created_at"), [
      {
        id: "exam-1",
        course_id: "course-windows",
        status: "Passed",
        score: 88,
        courses: { title: "Windows Essentials" },
      },
    ]),
});

export const userOrdersQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["orders", userId ?? "anonymous"],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, total, subtotal, discount_total, amount_paid, balance_due, status, payment_status, rejection_reason, delivery_address, delivery_status, delivery_visible, expected_delivery_at, created_at, notes, order_items(name, quantity, unit_price, discount_amount, attributes), order_delivery_events(status, note, created_at)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
