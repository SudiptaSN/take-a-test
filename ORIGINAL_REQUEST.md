# Original User Request

## 2026-08-07T15:16:52Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Implement a UI/UX consistency and premium aesthetics upgrade for the AssOnFire examination platform, including Obsidian-style markdown rendering (now also applied to MCQ options), glassmorphism effects, micro-animations, form polish, and bilingual (English/Bengali) typography support.

Working directory: /home/sudipta/take-a-test
Integrity mode: development

## Requirements

### R1. Obsidian-Style Markdown & LaTeX
Enhance `MarkdownRenderer.tsx` and global typography to match an Obsidian-like premium feel. Code blocks need dark backgrounds with borders, blockquotes need tinted backgrounds with left borders, and tables need crisp borders with hover states. Apply this Markdown rendering to MCQ options as well as question prompts.

### R2. Micro-Animations & Glassmorphism
Upgrade `.card`, `.btn`, and other interactive elements in `globals.css`. Add `active:scale-95` to buttons, deeper `backdrop-blur-xl` to cards, and subtle pulse animations to live status badges (e.g., "In Progress").

### R3. Form Polish & UI Consistency
Update `/login` and `/signup` pages to use properly linked `<label>` tags (using `id` and `htmlFor`) and ensure all inputs share the premium `focus:ring-orange-500/50` glow. Standardize error message styling.

### R4. Bilingual Typography
Integrate a premium Bengali font (e.g., Hind Siliguri) via `next/font/google` in `layout.tsx` to seamlessly support mixed English/Bengali content.

## Acceptance Criteria

### Aesthetic & Functional Checks
- [ ] Programmatic check: `globals.css` must contain custom Tailwind typography overrides (`.prose pre`, `.prose blockquote`, `.prose table`) implementing the Obsidian style.
- [ ] Programmatic check: MCQ option mapping in `/app/admin/tests/[id]/page.tsx` and `/app/test/[id]/page.tsx` must utilize the `<MarkdownRenderer />` component instead of raw text.
- [ ] Programmatic check: `.btn` must contain `active:scale-95` and `.card` must contain `backdrop-blur-xl`.
- [ ] Programmatic check: All `<label>` elements in `/login/page.tsx` and `/signup/page.tsx` must have an `htmlFor` attribute that strictly matches the `id` of their corresponding `<input>`.
- [ ] Programmatic check: `next/font/google` must be used to load a Bengali font in `layout.tsx` and injected into the CSS variables.
