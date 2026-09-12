-- Role-scoped reporting views for business, academic, and operational analytics.
create or replace view public.sales_period_analytics with (security_invoker = true) as
select date_trunc('day', created_at)::date as period, 'daily'::text as period_type, sales_channel, count(*)::integer as sale_count, coalesce(sum(total), 0)::numeric(12,2) as revenue
from public.orders where payment_status = 'approved' group by 1,2,3
union all
select date_trunc('week', created_at)::date, 'weekly', sales_channel, count(*)::integer, coalesce(sum(total), 0)::numeric(12,2)
from public.orders where payment_status = 'approved' group by 1,2,3
union all
select date_trunc('month', created_at)::date, 'monthly', sales_channel, count(*)::integer, coalesce(sum(total), 0)::numeric(12,2)
from public.orders where payment_status = 'approved' group by 1,2,3;

create or replace view public.product_sales_analytics with (security_invoker = true) as
select oi.name, oi.item_type, sum(oi.quantity)::integer as units_sold, coalesce(sum(oi.quantity * oi.unit_price), 0)::numeric(12,2) as revenue
from public.order_items oi join public.orders o on o.id = oi.order_id
where o.payment_status = 'approved'
group by oi.name, oi.item_type;

create or replace view public.expense_category_analytics with (security_invoker = true) as
select category, date_trunc('month', expense_date)::date as period, count(*)::integer as expense_count, coalesce(sum(amount), 0)::numeric(12,2) as expenditure
from public.expenses where approval_status = 'approved' group by category, date_trunc('month', expense_date)::date;

create or replace view public.outstanding_balance_analytics with (security_invoker = true) as
select user_id, count(*)::integer as order_count, coalesce(sum(balance_due), 0)::numeric(12,2) as balance_due
from public.orders where balance_due > 0 and status not in ('cancelled','rejected') group by user_id;

create or replace view public.academic_programme_analytics with (security_invoker = true) as
select e.path as programme, count(distinct e.user_id)::integer as students, count(*) filter (where e.status = 'approved')::integer as approved_registrations,
  count(ec.id) filter (where ec.status in ('passed','completed'))::integer as completed_courses,
  coalesce(avg(ec.progress), 0)::numeric(5,2) as average_progress
from public.enrollments e left join public.enrollment_courses ec on ec.enrollment_id = e.id
group by e.path;

create or replace view public.delivery_analytics with (security_invoker = true) as
select coalesce(delivery_status, status) as status, count(*)::integer as orders
from public.orders where delivery_visible = true group by coalesce(delivery_status, status);

grant select on public.sales_period_analytics, public.product_sales_analytics, public.expense_category_analytics, public.outstanding_balance_analytics, public.academic_programme_analytics, public.delivery_analytics to authenticated;
