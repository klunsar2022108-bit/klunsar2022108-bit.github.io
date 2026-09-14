import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function ProfileEditor() {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(String(user?.user_metadata?.full_name ?? ""));
    setPhone(String(user?.user_metadata?.phone ?? ""));
    setAddress(String(user?.user_metadata?.address ?? ""));
    setParentPhone(String(user?.user_metadata?.parent_phone ?? ""));
    setAvatarUrl(String(user?.user_metadata?.avatar_url ?? ""));
  }, [
    user?.id,
    user?.user_metadata?.full_name,
    user?.user_metadata?.phone,
    user?.user_metadata?.address,
    user?.user_metadata?.parent_phone,
    user?.user_metadata?.avatar_url,
  ]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file for your profile photo.");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("Profile photos must be smaller than 1 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        parent_phone: role === "student" ? parentPhone.trim() : null,
      })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        parent_phone: role === "student" ? parentPhone.trim() : "",
        avatar_url: avatarUrl,
      },
    });
    setLoading(false);

    if (metadataError) {
      toast.error(metadataError.message);
      return;
    }

    toast.success("Profile updated successfully.");
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open profile"
        title="Open profile"
        onClick={() => setOpen(true)}
        className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#0b3977] text-sm font-bold text-white ring-2 ring-transparent transition hover:ring-[#0b3977]/30"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Your profile" className="h-full w-full object-cover" />
        ) : (
          String(user?.user_metadata?.full_name ?? user?.email ?? "A")
            .charAt(0)
            .toUpperCase()
        )}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
          <Camera className="h-4 w-4" />
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Profile settings</p>
              <p className="mt-1 text-xs text-slate-500">
                Manage the details you are allowed to edit.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close profile editor"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#0b3977] text-xl font-bold text-white"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                String(fullName || user?.email || "A")
                  .charAt(0)
                  .toUpperCase()
              )}
              <Camera className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-white p-0.5 text-[#0b3977]" />
            </button>
            <div>
              <p className="text-xs font-semibold text-slate-700">Profile photo</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 text-xs font-medium text-[#0b3977] hover:underline"
              >
                Choose an image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-slate-600">
              Email address
              <input
                value={user?.email ?? ""}
                readOnly
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none ring-[#0b3977]/20 focus:ring-2"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Phone number
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none ring-[#0b3977]/20 focus:ring-2"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Address
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[#0b3977]/20 focus:ring-2"
              />
            </label>
            {role === "student" && (
              <label className="block text-xs font-medium text-slate-600">
                Parent or guardian phone
                <input
                  value={parentPhone}
                  onChange={(event) => setParentPhone(event.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none ring-[#0b3977]/20 focus:ring-2"
                />
              </label>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              <Check className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Save profile"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
