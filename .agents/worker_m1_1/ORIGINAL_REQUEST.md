## 2026-08-07T15:18:52Z
<USER_REQUEST>
You are a teamwork_preview_worker. Your working directory is `/home/sudipta/take-a-test/.agents/worker_m1_1`.

Objective: Implement Milestone 1 (Bilingual Typography - Requirement R4).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task Details:
1. Modify `app/layout.tsx`:
   - Replace `Noto_Sans_Bengali` with `Hind_Siliguri` imported from `next/font/google`.
   - Instantiate `Hind_Siliguri` with `weight: ['300', '400', '500', '600', '700']`, `subsets: ['bengali']`, `variable: '--font-bengali'`.
   - Update `<html className>` to include `${hindSiliguri.variable}` instead of `${notoSansBengali.variable}`.
2. Check `tailwind.config.ts` and ensure `fontFamily` includes `bengali: ['var(--font-bengali)', 'sans-serif']` and `sans: ['var(--font-inter)', 'var(--font-bengali)', 'sans-serif']`.
3. Run the build/lint command (`npm run build` or `npx tsc --noEmit`) via terminal to verify there are zero build or type errors.
4. Record implementation details and command output in `/home/sudipta/take-a-test/.agents/worker_m1_1/handoff.md`.
5. Send a summary message back to parent (`30d4baba-d104-42e9-a776-8cad6a7fe37e`).
</USER_REQUEST>
