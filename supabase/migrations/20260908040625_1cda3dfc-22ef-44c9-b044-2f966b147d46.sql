
create type public.app_role as enum ('admin','student');

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin')) with check (true);
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, username, phone)
  values (new.id,
          nullif(new.raw_user_meta_data->>'full_name',''),
          nullif(new.raw_user_meta_data->>'username',''),
          nullif(new.raw_user_meta_data->>'phone',''))
  on conflict (id) do nothing;
  if lower(new.email) = 'klunsar@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id,'admin') on conflict do nothing;
  end if;
  insert into public.user_roles (user_id, role) values (new.id,'student') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- public content tables
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null default '',
  details text not null default '',
  duration_weeks int not null default 4,
  level text not null default 'Beginner',
  icon text not null default 'monitor',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time text not null,
  end_time text not null,
  days text not null default 'Mon - Fri',
  path text not null default 'both',
  seats int not null default 20,
  seats_taken int not null default 0,
  notes text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tutors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null default 'Tutor',
  bio text not null default '',
  qualifications text not null default '',
  photo_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  details text not null default '',
  price numeric(12,2) not null default 0,
  category text not null default 'course',
  path text,
  image_url text,
  badge text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  program text not null default '',
  quote text not null,
  rating int not null default 5,
  photo_url text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.gallery_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null default '',
  image_url text not null default '',
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  exam_date date,
  pass_mark int not null default 60,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['courses','shifts','tutors','products','testimonials','gallery_posts','faqs','site_content','exams'] loop
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read %1$s" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format('create policy "admins manage %1$s" on public.%1$I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;

-- student records
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null default 'regular',
  shift_id uuid references public.shifts(id) on delete set null,
  status text not null default 'pending',
  start_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.enrollment_courses (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  progress int not null default 0,
  status text not null default 'not_started',
  created_at timestamptz not null default now(),
  unique (enrollment_id, course_id)
);

create table public.exam_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  score int,
  status text not null default 'scheduled',
  taken_on date,
  remarks text not null default '',
  created_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Certificate of Completion',
  certificate_no text not null,
  graduation_date date,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total numeric(12,2) not null default 0,
  status text not null default 'pending',
  customer_name text not null default '',
  customer_phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  unit_price numeric(12,2) not null default 0,
  quantity int not null default 1
);

do $$
declare t text;
begin
  foreach t in array array['enrollments','exam_results','certificates','orders'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows read %1$s" on public.%1$I for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),''admin''))', t);
    execute format('create policy "own rows insert %1$s" on public.%1$I for insert to authenticated with check (auth.uid() = user_id or public.has_role(auth.uid(),''admin''))', t);
    execute format('create policy "admins update %1$s" on public.%1$I for update to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
    execute format('create policy "admins delete %1$s" on public.%1$I for delete to authenticated using (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;

grant select, insert, update, delete on public.enrollment_courses to authenticated;
grant all on public.enrollment_courses to service_role;
alter table public.enrollment_courses enable row level security;
create policy "read own enrollment courses" on public.enrollment_courses for select to authenticated
  using (exists (select 1 from public.enrollments e where e.id = enrollment_id and (e.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "admins manage enrollment courses" on public.enrollment_courses for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

grant select, insert, update, delete on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "read own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "insert own order items" on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "admins manage order items" on public.order_items for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger courses_updated before update on public.courses for each row execute function public.set_updated_at();
create trigger enrollments_updated before update on public.enrollments for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- seed content
insert into public.courses (title, slug, summary, details, duration_weeks, level, icon, sort_order) values
('Windows Essentials','windows','Master the computer itself: files, folders, settings and safe shutdown.','Learn to start and shut down correctly, use the desktop and taskbar, create and organise files and folders, copy to flash drives, install and remove programs, keep the machine free of viruses and personalise Windows settings.',3,'Beginner','monitor',1),
('Microsoft Word','word','Type, format and print professional letters, reports and CVs.','Typing and editing, fonts and paragraph formatting, page layout and margins, tables, bullets and numbering, headers and footers, mail merge, spell check and printing. Every learner types a full application letter and CV before the exam.',4,'Beginner','file-text',2),
('Microsoft Excel','excel','Build spreadsheets, use formulas and turn figures into charts.','Worksheets and cells, formatting, SUM/AVERAGE/IF and other formulas, sorting and filtering, simple payroll and stock sheets, charts and printing a clean report.',5,'Intermediate','table',3),
('Microsoft PowerPoint','powerpoint','Design and deliver presentations that hold an audience.','Slide masters, text and image layout, transitions and animations, speaker notes, slideshow delivery and exporting to PDF. Learners present a five-slide project to the class.',3,'Beginner','presentation',4),
('Microsoft Access','access','Store and query real records with a proper database.','Tables and field types, relationships, forms for data entry, queries and filters, and printed reports. Learners build a small student-records database.',5,'Intermediate','database',5),
('Internet Browsing & Email','internet','Search, communicate and stay safe online.','Browsers and search skills, creating and using email, attachments, online applications and forms, downloading safely, cloud storage, online safety and avoiding scams.',3,'Beginner','globe',6);

insert into public.shifts (name, start_time, end_time, days, path, seats, seats_taken, notes, sort_order) values
('Morning Shift','08:00','10:30','Mon - Fri','both',24,17,'Most popular with students on holiday and self-employed learners.',1),
('Afternoon Shift','11:00','13:30','Mon - Fri','both',24,12,'Ideal for pupils attending morning school.',2),
('Evening Shift','15:00','17:30','Mon - Fri','both',24,20,'Preferred by workers and teachers after closing hours.',3),
('Late Shift','18:00','20:00','Mon - Thu','both',18,7,'Quiet, small-group sessions with extra tutor attention.',4);

insert into public.tutors (name, title, bio, qualifications, sort_order) values
('Mohamed S. Kamara','Lead Tutor - Office Applications','Twelve years teaching Word, Excel and Access to learners of every level, from first-time users to office staff.','BSc Computer Science; Microsoft Office Specialist',1),
('Isatu Conteh','Tutor - Windows & Internet','Patient with absolute beginners and known for making the first week feel easy.','Diploma in Information Technology; ICDL certified',2),
('Alhaji B. Sesay','Tutor - Excel & Data','Trains shop owners and NGO staff to keep clean records and readable reports.','HND Computer Studies; 8 years training experience',3),
('Fatmata Bangura','Tutor - Presentation & Exams Officer','Runs the program exams and prepares learners for graduation projects.','BEd ICT; Certified assessor',4);

insert into public.products (name, description, details, price, category, path, badge, sort_order) values
('Regular Path - Full Program','All six programs at a steady pace during school terms.','Runs alongside school terms with one shift per day, weekly practice sheets, program exams after each course, and graduation with a certificate. Best for learners who want time to absorb each topic.',1500.00,'path','regular','Most thorough',1),
('Bonanza Path - Holiday Intensive','All six programs in the holidays at 50% of the regular fee.','A fast, hands-on holiday intensive covering the same six programs and the same exams, at half the regular fee. Places are limited and fill quickly each holiday.',750.00,'path','bonanza','50% off',2),
('Single Course - Microsoft Excel','Take Excel on its own, any shift.','Five weeks of Excel only, including the program exam and a course certificate.',400.00,'course',null,null,3),
('Single Course - Microsoft Word','Take Word on its own, any shift.','Four weeks of Word only, including the program exam and a course certificate.',350.00,'course',null,null,4),
('Registration & Student ID','One-time registration, file and student ID card.','Covers your student file, ID card and centre registration for the year.',100.00,'service',null,null,5),
('Program Exam Resit','Sit a program exam again after extra practice.','For learners who need one more attempt at a program exam before moving on.',75.00,'service',null,null,6),
('Certificate Reprint','Replacement or extra copy of your certificate.','A sealed reprint of your certificate, ready for job applications.',80.00,'service',null,null,7),
('Training Handbook & Flash Drive','Printed handbook plus a 16GB flash drive.','The K-Lunsar practice handbook covering all six programs, bundled with a 16GB flash drive for your class work.',200.00,'item',null,null,8),
('Private One-on-One Hour','A dedicated hour with a tutor.','Book focused time with a tutor on any topic you want to strengthen before an exam.',150.00,'service',null,null,9);

insert into public.testimonials (name, program, quote, rating) values
('Aminata Turay','Bonanza 2025 graduate','I came in not knowing how to hold a mouse. By the end of the holiday I was typing my own CV in Word and got a shop job with it.',5),
('Ibrahim Kargbo','Regular path graduate','Excel changed my small business. I now track stock and sales on my own sheet instead of a notebook.',5),
('Sento Mansaray','Regular path, Evening shift','The evening shift let me keep my job. The tutors waited for me to understand before moving on.',5),
('Joseph Koroma','Bonanza graduate','The program exams pushed me. You cannot move on until you really know it, and that is why the certificate means something.',4);

insert into public.gallery_posts (title, caption, sort_order) values
('Graduation Day 2025','Thirty-two learners received certificates after completing all six programs.',1),
('Bonanza Holiday Class','A full morning shift during the August holiday intensive.',2),
('Excel Practical Session','Learners building their first payroll sheet.',3),
('Certificate Presentation','Top of the class receiving her certificate from the centre director.',4),
('Evening Shift Lab','Working adults finishing the day with Internet Browsing.',5),
('First Day Orientation','New students meeting their tutors and choosing shifts.',6);

insert into public.faqs (question, answer, sort_order) values
('What is the difference between Regular and Bonanza?','Regular runs during school terms at a slower, steadier pace and costs the full fee. Bonanza is a holiday intensive that covers all six programs in a shorter period at 50% of the regular fee.',1),
('Do I need to know anything about computers before joining?','No. Most of our learners start from zero. Windows Essentials is designed for people who have never used a computer.',2),
('What are the shifts?','Morning (08:00-10:30), Afternoon (11:00-13:30), Evening (15:00-17:30) and Late (18:00-20:00). You choose the shift that fits your school or work.',3),
('Are there exams?','Yes. Every program ends with an exam. You must pass it before moving on to the next program, which is how we keep the certificate credible.',4),
('What happens after I finish all programs?','You take part in graduation and receive your K-Lunsar certificate listing the programs you completed.',5),
('Can I pay in instalments?','Yes. Speak to the office at registration and we will agree a schedule that fits your shift and path.',6);

insert into public.site_content (key, value) values
('centre_name','K-Lunsar Computer Training'),
('motto','Build Your Skills'),
('email','klunsar@gmail.com'),
('phone','077976570'),
('address','# 40 Port Loko Road, Lunsar, Sierra Leone'),
('hours','Monday - Friday, 08:00 - 20:00'),
('about','K-Lunsar Computer Training is a community training centre in Lunsar teaching practical computer skills that lead to work. We run two student paths, four daily shifts and six examined programs, taught by qualified tutors who stay with a learner until the skill is real.'),
('facebook','https://facebook.com/'),
('whatsapp','https://wa.me/'),
('youtube','https://youtube.com/'),
('twitter','https://x.com/'),
('instagram','https://instagram.com/'),
('tiktok','https://tiktok.com/');

insert into public.exams (course_id, title, exam_date, pass_mark)
select id, title || ' Program Exam', null, 60 from public.courses;
