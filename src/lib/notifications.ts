import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "account"
  | "registration"
  | "payment"
  | "teacher_allocation"
  | "order"
  | "delivery"
  | "product"
  | "service"
  | "general";

export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "general",
) {
  const { error } = await supabase.rpc("create_user_notification", {
    _user_id: userId,
    _title: title,
    _message: message,
    _type: type,
  });
  if (error) throw new Error(error.message);
}

export async function notifyAdmins(
  title: string,
  message: string,
  type: NotificationType = "general",
) {
  const { error } = await supabase.rpc("notify_admins", {
    _title: title,
    _message: message,
    _type: type,
  });
  if (error) throw new Error(error.message);
}
