"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

export default function DeleteTestButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { toast, ToastContainer } = useToast();

  return (
    <>
      <ToastContainer />
      <button
        className="text-sm text-red-400 hover:underline"
        onClick={async () => {
          if (!confirm(`Delete "${title}"?\n\nAll questions, attempts, answers, invites and proctor events for this test will also be deleted. This cannot be undone.`)) return;
          const supabase = createClient();
          const { error } = await supabase.from("tests").delete().eq("id", id);
          if (error) {
            toast(error.message, "error");
            return;
          }
          router.refresh();
        }}
      >Delete</button>
    </>
  );
}
