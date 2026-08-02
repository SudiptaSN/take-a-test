"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Breadcrumbs from '@/components/Breadcrumbs';
import { ConfirmModal } from '@/components/ConfirmModal';
import DateTimePicker from '@/components/DateTimePicker';
import { useToast } from "@/components/Toast";

type QType = "mcq_single" | "mcq_multi" | "long_text";
type Option = { id: string; text: string; image_url?: string | null };
type Question = {
  id?: string; test_id: string; position: number; type: QType;
  section_title?: string | null;
  prompt: string; options: Option[] | null; correct: string[] | null;
  points: number; image_url?: string | null;
};

function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let val = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"' && inQuotes && nextChar === '"') { val += '"'; i++; }
    else if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { row.push(val); val = ""; }
    else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(val); result.push(row); row = []; val = "";
    } else { val += char; }
  }
  if (val || row.length > 0) { row.push(val); result.push(row); }
  return result;
}

export default function EditTest() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const { toast, ToastContainer } = useToast();
  
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [link, setLink] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("tests").select("*").eq("id", id).single();
      setTest(t);
      const { data: qs } = await supabase.from("questions").select("*").eq("test_id", id).order("position");
      const ids = (qs || []).map((q: any) => q.id);
      const { data: keys } = ids.length
        ? await supabase.from("answer_keys").select("question_id, correct").in("question_id", ids)
        : { data: [] as any[] };
      const keyMap = new Map((keys || []).map((k: any) => [k.question_id, k.correct]));
      const withKeys = (qs || []).map((q: any) => ({ ...q, correct: keyMap.get(q.id) || null }));
      setQuestions(withKeys);
      setLink(`${window.location.origin}/test/${id}`);
    })();
  }, [id, supabase]);

  const updateTest = async (patch: any) => {
    setTest({ ...test, ...patch });
    await supabase.from("tests").update(patch).eq("id", id);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 8; i++) { if (i === 4) out += "-"; out += chars[Math.floor(Math.random() * chars.length)]; }
    updateTest({ access_code: out });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.type)) { alert("Only PNG / JPG / GIF / WebP images allowed."); return null; }
    if (file.size > 5 * 1024 * 1024) { alert("Image too large (max 5 MB)."); return null; }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("question-images").upload(path, file, { contentType: file.type });
    if (up.error) { alert(up.error.message); return null; }
    const { data: pub } = supabase.storage.from("question-images").getPublicUrl(path);
    return pub.publicUrl;
  };

  const addQuestion = (type: QType) => {
    const isMcq = type !== "long_text";
    setQuestions((qs) => [...qs, {
      test_id: id, position: qs.length, type, prompt: "", section_title: null,
      options: isMcq ? [{ id: crypto.randomUUID(), text: "" }, { id: crypto.randomUUID(), text: "" }] : null,
      correct: isMcq ? [] : null, points: 1, image_url: null,
    }]);
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) return alert("CSV must have a header row and at least one data row.");
      
      const newQuestions: Question[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue;
        
        const typeStr = (row[0] || "").trim().toLowerCase();
        let qType: QType = "mcq_single";
        if (typeStr.includes("multi")) qType = "mcq_multi";
        else if (typeStr.includes("long")) qType = "long_text";

        const prompt = (row[1] || "").trim();
        const optTexts = [row[2], row[3], row[4], row[5]].map(s => (s || "").trim()).filter(Boolean);
        const correctStr = (row[6] || "").trim();
        const pointsStr = (row[7] || "").trim();
        const points = parseInt(pointsStr) || 1;

        let options: Option[] | null = null;
        let correct: string[] | null = null;

        if (qType !== "long_text") {
          options = optTexts.map(text => ({ id: crypto.randomUUID(), text }));
          const correctIndices = correctStr.split(/[,&\s]+/).map(s => parseInt(s) - 1).filter(n => !isNaN(n) && n >= 0 && n < options!.length);
          correct = correctIndices.map(idx => options![idx].id);
        }

        newQuestions.push({
          test_id: id, position: 0, type: qType, prompt, section_title: null, options, correct, points, image_url: null
        });
      }

      setQuestions(qs => {
        const updated = [...qs, ...newQuestions];
        return updated.map((q, idx) => ({ ...q, position: idx }));
      });
      alert(`Imported ${newQuestions.length} questions successfully! Note: Search for [IMAGE_REQUIRED] if your AI suggested images.`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const saveAll = async () => {
    setSaving(true);
    await supabase.from("questions").delete().eq("test_id", id);
    if (questions.length) {
      const rows = questions.map((q, i) => ({
        test_id: id, position: i, type: q.type, section_title: q.section_title || null, prompt: q.prompt,
        options: q.options, points: q.points,
        image_url: q.image_url ?? null,
      }));
      const { data: inserted } = await supabase.from("questions").insert(rows).select("id");
      // Re-attach answer keys (only for MCQ)
      const keyRows = (inserted || []).map((row: any, idx: number) => ({
        question_id: row.id, correct: questions[idx].correct ?? [],
      })).filter((_, idx) => questions[idx].type !== "long_text");
      if (keyRows.length) await supabase.from("answer_keys").upsert(keyRows);
    }
    toast("Questions saved successfully!", "success");
    setSaving(false);
  };

  const handleInviteAll = async () => {
    if (!confirm("Are you sure you want to generate invites for ALL registered candidates?")) return;
    try {
      const res = await fetch(`/api/admin/tests/${id}/invite-all`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast(data.message, "success");
      } else {
        toast(data.error || "Failed to invite candidates", "error");
      }
    } catch (err) {
      toast("A network error occurred.", "error");
    }
  };

  if (!test) return <main className="p-10">Loading…</main>;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 mb-20">
      <ToastContainer />
      
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: test?.title || 'Test' }]} />
      
      {/* Header & Sticky Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{test.title || "Untitled Test"}</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage test configuration and questions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="text-sm text-red-500 hover:text-red-400 font-medium px-3 py-2 rounded-lg hover:bg-red-500/10 transition" onClick={() => setShowDeleteModal(true)}>
            Delete test
          </button>
          <button className="btn bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]" onClick={saveAll} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteModal}
        title="Delete Test"
        message="This will permanently delete the test, all questions, answers, attempts, snapshots, and images. This action cannot be undone."
        confirmLabel="Delete Forever"
        variant="danger"
        onConfirm={async () => {
          setShowDeleteModal(false);
          const res = await fetch(`/api/admin/tests/${id}`, { method: "DELETE" });
          if (res.ok) {
            window.location.href = "/admin";
          } else {
            const data = await res.json();
            toast(data.error || "Failed to delete test.", "error");
          }
        }}
        onCancel={() => setShowDeleteModal(false)}
      />

      <div className="space-y-8">
        {/* General Settings */}
        <section className="card space-y-4 relative z-50">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <span className="text-orange-500">❖</span> General Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Test Title</label>
              <input className="input" value={test.title} onChange={(e) => updateTest({ title: e.target.value })} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
              <textarea className="input min-h-[100px]" value={test.description || ""} onChange={(e) => updateTest({ description: e.target.value })} placeholder="Provide instructions or context for candidates..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Duration (minutes)</label>
                <input className="input" type="number" min={1} value={test.duration_minutes} onChange={(e) => updateTest({ duration_minutes: parseInt(e.target.value) })} />
              </div>
              <div className="relative z-50">
                <label className="block text-sm font-medium text-zinc-300 mb-1">Available From (Optional)</label>
                <DateTimePicker 
                  value={test.available_from ? new Date(test.available_from).toISOString() : ""} 
                  onChange={(v) => updateTest({ available_from: v ? new Date(v).toISOString() : null })} 
                />
              </div>
              <div className="relative z-40">
                <label className="block text-sm font-medium text-zinc-300 mb-1">Available Until (Optional)</label>
                <DateTimePicker 
                  value={test.available_until ? new Date(test.available_until).toISOString() : ""} 
                  onChange={(v) => updateTest({ available_until: v ? new Date(v).toISOString() : null })} 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Security & Access */}
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <span className="text-orange-500">🔒</span> Security & Access
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition cursor-pointer group">
              <input type="checkbox" className="mt-1" checked={test.is_published} onChange={(e) => updateTest({ is_published: e.target.checked })} />
              <div>
                <div className="font-medium text-zinc-200 group-hover:text-white transition">Published</div>
                <div className="text-xs text-zinc-500 mt-0.5">Test is visible and can be started by candidates.</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition cursor-pointer group">
              <input type="checkbox" className="mt-1" checked={test.invite_only || false} onChange={(e) => updateTest({ invite_only: e.target.checked })} />
              <div>
                <div className="font-medium text-zinc-200 group-hover:text-white transition">Invite-only</div>
                <div className="text-xs text-zinc-500 mt-0.5">Only candidates on the Invites list can see or take this test.</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition cursor-pointer group">
              <input type="checkbox" className="mt-1" checked={test.is_leaderboard_public || false} onChange={(e) => updateTest({ is_leaderboard_public: e.target.checked })} />
              <div>
                <div className="font-medium text-zinc-200 group-hover:text-white transition">Public Leaderboard</div>
                <div className="text-xs text-zinc-500 mt-0.5">Enable "Wall of Flame" for candidates to see each other's scores.</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-red-900/30 bg-red-950/10 hover:border-red-900/50 transition cursor-pointer group">
              <input type="checkbox" className="mt-1 accent-red-500" checked={test.is_hardcore_mode || false} onChange={(e) => updateTest({ is_hardcore_mode: e.target.checked })} />
              <div>
                <div className="font-medium text-red-400 group-hover:text-red-300 transition">Hardcore Mode</div>
                <div className="text-xs text-red-400/70 mt-0.5">Candidates cannot go backward to change their answers.</div>
              </div>
            </label>
            
            <label className="flex items-start gap-3 p-4 rounded-xl border border-amber-900/30 bg-amber-950/10 hover:border-amber-900/50 transition cursor-pointer group col-span-1 md:col-span-2">
              <input type="checkbox" className="mt-1 accent-amber-500" checked={test.require_seb || false} onChange={(e) => updateTest({ require_seb: e.target.checked })} />
              <div>
                <div className="font-medium text-amber-500 group-hover:text-amber-400 transition">Require Safe Exam Browser</div>
                <div className="text-xs text-amber-500/70 mt-0.5">Blocks normal browsers. Enforces lockdown mode (no alt-tab, screen share, or clipboard).</div>
              </div>
            </label>
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-800">
            <div className="text-sm font-medium text-zinc-300">Access code</div>
            <p className="text-xs text-zinc-500 mt-1 mb-3">Optional. Candidates must enter this code to start the test. Share it with invited candidates.</p>
            <div className="flex flex-wrap gap-2 max-w-sm">
              <input className="input font-mono uppercase flex-1 min-w-0" placeholder="(none)" value={test.access_code || ""}
                onChange={(e) => updateTest({ access_code: e.target.value.toUpperCase() || null })} />
              <button className="btn-secondary whitespace-nowrap" onClick={generateCode} type="button">Generate</button>
              {test.access_code && <button className="btn-secondary text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/20 whitespace-nowrap" onClick={() => updateTest({ access_code: null })} type="button">Clear</button>}
            </div>
          </div>
        </section>

        {/* Publishing & Sharing */}
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <span className="text-orange-500">📢</span> Publishing & Sharing
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <a href={`/admin/tests/${id}/invites`} className="btn-secondary">
              Manage individual invites →
            </a>
            <button onClick={handleInviteAll} className="btn-secondary bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/30">
              + Invite all registered candidates
            </button>
          </div>

          {test.is_published && (
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <div className="text-sm bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <div className="text-zinc-400 mb-1">Direct Share Link:</div>
                <code className="text-orange-400 break-all select-all">{link}</code>
                {test.access_code && <div className="text-zinc-500 mt-2">Required Code: <code className="font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">{test.access_code}</code></div>}
              </div>
              
              {test.require_seb && (
                <div className="text-sm bg-amber-950/20 border border-amber-900/50 rounded-lg p-4 text-amber-200">
                  <div className="font-semibold text-amber-500 mb-1">Safe Exam Browser Setup</div>
                  <p className="text-amber-200/70 mb-3">Distribute the SEB configuration file to candidates. Opening it will automatically launch the browser and navigate to this test.</p>
                  <div className="flex flex-wrap gap-4 items-center">
                    <a className="btn-secondary bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs" href={`/api/seb/${id}`}>
                      Download .seb config
                    </a>
                    <a className="text-xs text-amber-500/50 hover:text-amber-400 underline" href="https://safeexambrowser.org/download_en.html" target="_blank" rel="noreferrer">
                      Get SEB client
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Results & Sync */}
        <section className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <span className="text-orange-500">🏆</span> Post-Test Actions
              </h2>
              <p className="text-sm text-zinc-400 mt-1">Make results visible to candidates and push to Discord Hall of Fame.</p>
            </div>
            <button 
              onClick={async () => {
                if (!confirm("Push results to candidates and the Discord Hall of Fame? This cannot be undone.")) return;
                const res = await fetch(`/api/admin/tests/${id}/push-results`, { method: "POST" });
                if (res.ok) {
                  toast("Results pushed successfully!", "success");
                  updateTest({ results_published: true });
                } else {
                  toast("Failed to push results", "error");
                }
              }} 
              className="btn text-sm whitespace-nowrap"
              disabled={test.results_published}
            >
              {test.results_published ? "Results Published ✓" : "Push Results & Hall of Fame"}
            </button>
          </div>
        </section>

        {/* Questions Section */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-100">Questions ({questions.length})</h2>
              <p className="text-sm text-zinc-400">Build your test by adding and reordering questions.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-secondary text-xs py-1.5" onClick={() => addQuestion("mcq_single")}>+ MCQ (Single)</button>
              <button className="btn-secondary text-xs py-1.5" onClick={() => addQuestion("mcq_multi")}>+ MCQ (Multi)</button>
              <button className="btn-secondary text-xs py-1.5" onClick={() => addQuestion("long_text")}>+ Long Text</button>
              <div className="w-px h-5 bg-zinc-700 hidden sm:block mx-1"></div>
              <label className="btn-secondary text-xs py-1.5 cursor-pointer text-orange-400 hover:text-orange-300 hover:border-orange-500/50 border-orange-500/30">
                Upload CSV
                <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
              </label>
            </div>
          </div>

          <details className="text-sm bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-6 cursor-pointer group">
            <summary className="font-medium text-zinc-300">💡 Import questions using AI (NotebookLM, ChatGPT, etc.)</summary>
            <div className="mt-3 text-zinc-400 space-y-3 cursor-text">
              <p>Copy and paste this exact prompt into your AI assistant:</p>
              <div className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg p-3 text-xs font-mono select-all overflow-x-auto whitespace-pre-wrap">
                Based on my sources, please generate 10 questions. Decide whether each should be a single-choice MCQ, multi-choice MCQ, or long answer. Format the output STRICTLY as a table with these columns:
                {"\n\n"}
                Type (use "mcq_single", "mcq_multi", or "long_text"){"\n"}
                Prompt (the question text. If the question needs an image to make sense, include "[IMAGE_REQUIRED]" in the text){"\n"}
                Option 1{"\n"}
                Option 2{"\n"}
                Option 3{"\n"}
                Option 4{"\n"}
                Correct (For single: e.g., "1". For multi: e.g., "1,3". For long text: leave blank){"\n"}
                Points (e.g., 1)
                {"\n\n"}
                Leave options blank for long_text questions.
              </div>
              <p>After it generates the table, paste it into Google Sheets, download as CSV, and upload it here.</p>
            </div>
          </details>

          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={i} className="card p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div className="font-bold text-lg text-zinc-200">
                    <span className="text-orange-500 mr-2">{i + 1}.</span> 
                    <span className="text-sm font-medium text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">{q.type === 'mcq_single' ? 'Single Choice' : q.type === 'mcq_multi' ? 'Multi Choice' : 'Long Text'}</span>
                  </div>
                  <button className="text-zinc-500 hover:text-red-400 text-sm font-medium transition" onClick={() => setQuestions((arr) => arr.filter((_, k) => k !== i))}>
                    Remove
                  </button>
                </div>
                
                <input className="input bg-transparent border-none text-orange-400 placeholder-zinc-700 font-semibold px-0 h-auto focus:ring-0 focus:outline-none" 
                       placeholder="+ Add Section Title (Optional) — Groups this and following questions" 
                       value={q.section_title || ""} 
                       onChange={(e) => {
                         const v = e.target.value; setQuestions((arr) => arr.map((x, k) => k === i ? { ...x, section_title: v } : x));
                       }} />

                <div>
                  <textarea className="input min-h-[80px]" placeholder="Question prompt" value={q.prompt} onChange={(e) => {
                    const v = e.target.value; setQuestions((arr) => arr.map((x, k) => k === i ? { ...x, prompt: v } : x));
                  }} />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <label className="btn-secondary text-xs cursor-pointer py-1.5">
                      <span className="mr-1">🖼️</span> {q.image_url ? "Change image" : "Add image"}
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const url = await uploadImage(f);
                        if (url) setQuestions((arr) => arr.map((x, k) => k === i ? { ...x, image_url: url } : x));
                      }} />
                    </label>
                    {q.image_url && (
                      <div className="flex items-center gap-2">
                        <a className="text-xs text-blue-400 hover:underline" href={q.image_url} target="_blank" rel="noreferrer">View</a>
                        <button className="text-xs text-red-500 hover:underline" onClick={() => setQuestions((arr) => arr.map((x, k) => k === i ? { ...x, image_url: null } : x))}>Remove</button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-zinc-400 whitespace-nowrap">Points:</label>
                    <input className="input h-8 w-20 px-2 py-1" type="number" min={0} value={q.points} onChange={(e) => {
                      const v = parseInt(e.target.value); setQuestions((arr) => arr.map((x, k) => k === i ? { ...x, points: v } : x));
                    }} />
                  </div>
                </div>

                {q.image_url && <img src={q.image_url} alt="" className="max-h-48 rounded border border-zinc-700 mt-2" />}

                {q.type !== "long_text" && q.options && (
                  <div className="space-y-3 pt-2">
                    {q.options.map((opt, j) => (
                      <div key={opt.id} className="flex flex-col sm:flex-row sm:items-start gap-2">
                        <div className="flex-1 flex gap-2 items-center">
                          <input
                            className="w-4 h-4 mt-0.5 accent-orange-500 cursor-pointer"
                            type={q.type === "mcq_single" ? "radio" : "checkbox"}
                            name={`correct-${i}`}
                            checked={q.correct?.includes(opt.id) || false}
                            onChange={(e) => {
                              setQuestions((arr) => arr.map((x, k) => {
                                if (k !== i) return x;
                                let cur = x.correct || [];
                                if (q.type === "mcq_single") cur = e.target.checked ? [opt.id] : [];
                                else cur = e.target.checked ? [...cur, opt.id] : cur.filter((c) => c !== opt.id);
                                return { ...x, correct: cur };
                              }));
                            }}
                          />
                          <input className="input flex-1 py-1.5 text-sm" placeholder={`Option ${j + 1}`} value={opt.text} onChange={(e) => {
                            const v = e.target.value;
                            setQuestions((arr) => arr.map((x, k) => k === i ? { ...x, options: x.options!.map((o) => o.id === opt.id ? { ...o, text: v } : o) } : x));
                          }} />
                        </div>
                        
                        <div className="flex items-center gap-2 pl-6 sm:pl-0">
                          <label className={`btn-secondary text-xs cursor-pointer py-1.5 px-2 ${opt.image_url ? 'text-green-400 border-green-500/30' : ''}`}>
                            {opt.image_url ? "Img ✓" : "Img +"}
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const f = e.target.files?.[0]; if (!f) return;
                              const url = await uploadImage(f);
                              if (url) setQuestions((arr) => arr.map((x, k) => k === i ? { ...x, options: x.options!.map((o) => o.id === opt.id ? { ...o, image_url: url } : o) } : x));
                            }} />
                          </label>
                          <button className="text-zinc-500 hover:text-red-400 p-1" title="Remove Option" onClick={() => setQuestions((arr) => arr.map((x, k) => k === i ? { ...x, options: x.options!.filter((o) => o.id !== opt.id), correct: (x.correct || []).filter((c) => c !== opt.id) } : x))}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                        </div>
                        {opt.image_url && <div className="w-full pl-6 sm:hidden"><img src={opt.image_url} alt="" className="max-h-24 rounded border border-zinc-700" /></div>}
                        {opt.image_url && <img src={opt.image_url} alt="" className="max-h-24 rounded border border-zinc-700 hidden sm:block ml-2" />}
                      </div>
                    ))}
                    <div className="pl-6 pt-1">
                      <button className="btn-secondary text-xs py-1 px-2 border-dashed border-zinc-600 hover:border-zinc-500 text-zinc-400 hover:text-zinc-300" 
                        onClick={() => setQuestions((arr) => arr.map((x, k) => k === i ? { ...x, options: [...(x.options || []), { id: crypto.randomUUID(), text: "" }] } : x))}>
                        + Add Option
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {questions.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
                <p className="text-zinc-500 mb-4">No questions added yet.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button className="btn-secondary" onClick={() => addQuestion("mcq_single")}>+ Add your first question</button>
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
