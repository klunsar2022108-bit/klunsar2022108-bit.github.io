import { supabase } from "@/integrations/supabase/client";

export type ChatMessageRecord = {
  id: string;
  thread_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

export async function findOrCreateSupportThread(userId: string, approvalStatus: string) {
  const { data: existing, error: findError } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("created_by", userId)
    .eq("thread_type", "support")
    .eq("status", "open")
    .limit(1)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      created_by: userId,
      subject: "Centre support",
      thread_type: "support",
      approval_status: approvalStatus,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Chat thread could not be created.");
  return data.id;
}

export async function sendChatMessage(threadId: string, senderId: string, message: string) {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ thread_id: threadId, sender_id: senderId, message: message.trim() })
    .select("id, thread_id, sender_id, message, created_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Message could not be sent.");
  await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
  return data as ChatMessageRecord;
}

export async function loadOwnChatMessages(userId: string) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select(
      "id, thread_id, sender_id, message, created_at, chat_threads!inner(created_by, participant_user_id)",
    )
    .or(`created_by.eq.${userId},participant_user_id.eq.${userId}`, {
      referencedTable: "chat_threads",
    })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ChatMessageRecord[];
}

export async function loadSupportThreads() {
  const { data, error } = await supabase
    .from("chat_threads")
    .select(
      "id, created_by, approval_status, created_at, chat_messages(id, thread_id, sender_id, message, created_at)",
    )
    .eq("thread_type", "support")
    .eq("status", "open")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
