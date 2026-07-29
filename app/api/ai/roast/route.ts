import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { attempt_id } = await req.json();
    if (!attempt_id) return NextResponse.json({ error: "missing attempt_id" }, { status: 400 });

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // 1. Fetch the attempt to verify ownership
    const { data: attempt } = await supabase.from("attempts").select("*, test:tests(title, description)").eq("id", attempt_id).single();
    if (!attempt || attempt.candidate_id !== user.id) {
      return NextResponse.json({ error: "attempt not found or unauthorized" }, { status: 403 });
    }
    
    if (attempt.status !== "submitted" && attempt.status !== "terminated") {
      return NextResponse.json({ error: "attempt not finished" }, { status: 400 });
    }

    // 2. Fetch the wrong answers
    const { data: answers } = await supabase.from("answers").select("*, question:questions(prompt, options, type, points)").eq("attempt_id", attempt_id);
    const wrongAnswers = (answers || []).filter(a => a.score === null || a.score < a.question.points);

    if (wrongAnswers.length === 0) {
      return NextResponse.json({ roast: "Wait, you actually got a perfect score? I was programmed to roast you, but I literally can't find a single mistake. Nerd." });
    }

    // 3. Find an API Key using Community Pool Logic
    let apiKeys: string[] = [];
    
    // First, try to get the user's own key
    const { data: profile } = await supabase.from("profiles").select("gemini_key").eq("id", user.id).single();
    if (profile?.gemini_key) {
      apiKeys.push(profile.gemini_key);
    }

    // Second, fetch community keys using the service role to bypass RLS
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminDb = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: communityProfiles } = await adminDb
        .from("profiles")
        .select("gemini_key")
        .eq("gemini_key_shared", true)
        .neq("id", user.id)
        .not("gemini_key", "is", null);
      
      if (communityProfiles) {
        apiKeys.push(...communityProfiles.map(p => p.gemini_key));
      }
    }

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: "No Gemini API keys available. Add yours in the dashboard settings!" }, { status: 400 });
    }

    // 4. Construct Prompt
    const contextStr = wrongAnswers.map((a, i) => {
      let qInfo = `Q: ${a.question.prompt}\n`;
      if (a.question.type !== "long_text" && a.question.options) {
        qInfo += `Options: ${JSON.stringify(a.question.options.map((o: any) => o.text))}\n`;
      }
      qInfo += `Their Answer: ${JSON.stringify(a.response)}\n`;
      return qInfo;
    }).join("\n\n");

    const prompt = `You are an aggressive, ruthless, but ultimately educational AI examiner. 
The student just took a test called "${attempt.test.title}".
Here are the questions they got WRONG:

${contextStr}

Your job:
1. Roast them absolutely mercilessly for getting these wrong. Be sarcastic, mean, but funny. 
2. Point out how ridiculous their selected answers were.
3. Then, suddenly shift your tone and give them actual, solid, concise study advice on the concepts they clearly do not understand.

Return your response in markdown format. Do NOT hold back on the roast.`;

    // 5. Try keys until one succeeds
    let roastResult = "";
    let success = false;
    
    for (const key of apiKeys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        roastResult = result.response.text();
        success = true;
        break; // Stop trying keys if it succeeded
      } catch (err: any) {
        console.error("Gemini API Error with a key:", err.message);
        // Continue to the next key if rate limited or invalid
      }
    }

    if (!success) {
      return NextResponse.json({ error: "All community AI keys are currently rate-limited or invalid. Try again later." }, { status: 500 });
    }

    return NextResponse.json({ roast: roastResult });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
