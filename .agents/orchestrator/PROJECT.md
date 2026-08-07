# Project: AssOnFire UI/UX Consistency and Premium Aesthetics Upgrade

## Architecture
- Framework: Next.js 15 (App Router) + Tailwind CSS + TypeScript + React Markdown / KaTeX + Google Fonts
- Global Styling: `app/globals.css`, `app/layout.tsx`
- Components: `components/MarkdownRenderer.tsx`, `components/ExamRoom.tsx`
- Pages: `app/admin/tests/[id]/page.tsx`, `app/test/[id]/page.tsx`, `app/login/page.tsx`, `app/signup/page.tsx`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Bilingual Typography Support (R4) | `app/layout.tsx` (Hind Siliguri / Bengali font loading via `next/font/google` & CSS variables) | none | IN_PROGRESS |
| 2 | Micro-Animations & Glassmorphism (R2) | `app/globals.css` (`active:scale-95` on `.btn`, `backdrop-blur-xl` on `.card`, pulse animations for badges) | M1 | PLANNED |
| 3 | Obsidian Markdown & MCQ Options Rendering (R1) | `components/MarkdownRenderer.tsx`, `app/globals.css` (prose overrides), `app/admin/tests/[id]/page.tsx`, `app/test/[id]/page.tsx` | M2 | PLANNED |
| 4 | Form Polish & UI Consistency (R3) | `app/login/page.tsx`, `app/signup/page.tsx` (`htmlFor` strictly matching `id`, `focus:ring-orange-500/50` glow, standardized error styling) | M3 | PLANNED |

## Interface & Quality Contracts
- All custom typography overrides must target `.prose pre`, `.prose blockquote`, `.prose table` for Obsidian styling.
- MCQ options in admin test editor and candidate test view must render via `<MarkdownRenderer />`.
- Button micro-animations require `active:scale-95` in `.btn`.
- Card glassmorphism requires `backdrop-blur-xl` in `.card`.
- All form inputs in `/login` and `/signup` must have `id` attributes that strictly equal the `htmlFor` attribute of their corresponding `<label>`.
- Bengali font must be imported via `next/font/google` in `layout.tsx` and injected into CSS variables.
