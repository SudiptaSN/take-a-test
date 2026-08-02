import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Fetch all candidate emails
    const { data: candidates, error: candidateError } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "candidate");

    if (candidateError) throw candidateError;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No candidates found." });
    }

    // 2. Fetch existing invites for this test to avoid conflicts
    const { data: existingInvites, error: existingError } = await supabase
      .from("invites")
      .select("email")
      .eq("test_id", id);
      
    if (existingError) throw existingError;
    
    const existingEmails = new Set(existingInvites?.map(i => i.email.toLowerCase()) || []);

    // 3. Filter candidates who are not already invited
    const newCandidates = candidates.filter(c => !existingEmails.has(c.email.toLowerCase()));

    if (newCandidates.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "All candidates are already invited." });
    }

    // 4. Generate invite rows
    const inviteRows = newCandidates.map(c => ({
      test_id: id,
      email: c.email,
      code: crypto.randomUUID().split("-")[0].toUpperCase(), // Short 8-char code
    }));

    // 5. Insert invites
    const { error: insertError } = await supabase
      .from("invites")
      .insert(inviteRows);

    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true, 
      count: inviteRows.length,
      message: `Successfully invited ${inviteRows.length} candidates.` 
    });

  } catch (err: any) {
    console.error("Invite all error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
