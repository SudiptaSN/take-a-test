# Plan: AssOnFire UI/UX Consistency & Premium Aesthetics Upgrade

## Overview
Decompose the upgrade into 4 verifiable milestones, dispatches specialist subagents for each milestone using the Project Pattern iteration loop, and perform forensic integrity auditing.

## Milestone Breakdown

### Milestone 1: Bilingual Typography Support (R4)
- **Target**: `app/layout.tsx`
- **Objective**: Import Bengali font (e.g. `Hind_Siliguri`) from `next/font/google` in `layout.tsx`, configure font subset and CSS variable (e.g. `--font-bengali` or `--font-hind-siliguri`), and inject into html/body element class names.
- **Verification**: `next/font/google` import present, Bengali font initialized, CSS variable configured and applied to `<html>` element. `npm run build` succeeds.

### Milestone 2: Micro-Animations & Glassmorphism (R2)
- **Target**: `app/globals.css`
- **Objective**:
  1. Add `active:scale-95` to `.btn` class for responsive click micro-animations.
  2. Upgrade `.card` with deeper glassmorphism using `backdrop-blur-xl`.
  3. Add CSS keyframe/animation utility for subtle pulse animations on live status badges (e.g. "In Progress" / live monitoring badges).
- **Verification**: Programmatic check for `active:scale-95` in `.btn` and `backdrop-blur-xl` in `.card`. Build succeeds.

### Milestone 3: Obsidian-Style Markdown & LaTeX rendering in MCQ Options (R1)
- **Target**: `components/MarkdownRenderer.tsx`, `app/globals.css`, `app/admin/tests/[id]/page.tsx`, `app/test/[id]/page.tsx`
- **Objective**:
  1. Enhance `MarkdownRenderer.tsx` and custom Tailwind typography overrides in `app/globals.css`:
     - `.prose pre`: dark background, subtle border, rounded styling.
     - `.prose blockquote`: tinted background, left border highlight, padded.
     - `.prose table`: crisp borders, header background, row hover states.
  2. Apply `<MarkdownRenderer />` to MCQ options in both admin test editor (`/app/admin/tests/[id]/page.tsx`) and candidate exam view (`/app/test/[id]/page.tsx` / `ExamRoom.tsx`).
- **Verification**: `.prose pre`, `.prose blockquote`, `.prose table` present in `globals.css`. MCQ option mapping in admin & test pages utilizes `<MarkdownRenderer />`. `npm run build` passes.

### Milestone 4: Form Polish & UI Consistency (R3)
- **Target**: `app/login/page.tsx`, `app/signup/page.tsx`
- **Objective**:
  1. Update all `<label>` elements in `/login` and `/signup` to have `htmlFor` attributes that strictly match the `id` of their corresponding `<input>`.
  2. Ensure inputs use consistent `focus:ring-orange-500/50` glow effects (or `.input` styling).
  3. Standardize error message styling across both auth forms.
- **Verification**: Programmatic check for `htmlFor` matching `id` on all form inputs. Build passes.

## Execution Strategy
- For each milestone:
  1. Dispatch Explorer subagent (`teamwork_preview_explorer`) to inspect current code state and formulate exact implementation proposal.
  2. Dispatch Worker subagent (`teamwork_preview_worker`) with Explorer proposal to implement changes and run `npm run build` / `npm run lint`. Include mandatory anti-cheating integrity prompt.
  3. Dispatch Reviewer subagent (`teamwork_preview_reviewer`) to verify code quality, correctness, and adherence to acceptance criteria.
  4. Dispatch Challenger subagent (`teamwork_preview_challenger`) to stress-test functionality.
  5. Dispatch Forensic Auditor subagent (`teamwork_preview_auditor`) to verify zero integrity violations.
- Update `progress.md` and `PROJECT.md` after each milestone.
- Report completion to Sentinel upon final audit verification.
