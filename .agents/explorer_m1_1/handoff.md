# Handoff Report — Milestone 1 (Bilingual Typography - Requirement R4)

## 1. Observation

Direct observations from examining the codebase:

1. **`app/layout.tsx` (Lines 1–20)**:
   - Line 3: `import { Inter, Noto_Sans_Bengali } from 'next/font/google';`
   - Line 6: `const notoSansBengali = Noto_Sans_Bengali({ subsets: ['bengali'], variable: '--font-bengali' });`
   - Line 15: `<html lang="en" className={`dark ${inter.variable} ${notoSansBengali.variable}`}>`
   - *Observation*: The layout currently loads `Noto_Sans_Bengali` instead of `Hind_Siliguri`. Weights are not explicitly set for `Noto_Sans_Bengali`.

2. **`tailwind.config.ts` (Lines 1–14)**:
   - Lines 6–8:
     ```ts
     fontFamily: {
       sans: ['var(--font-inter)', 'var(--font-bengali)', 'sans-serif'],
     }
     ```
   - *Observation*: The `--font-bengali` variable is already defined in the `fontFamily.sans` stack fallback order.

3. **`app/globals.css` (Lines 1–32)**:
   - Contains standard Tailwind directives (`@tailwind base;`, etc.) and root element styles (`html, body { height: 100%; }`).
   - *Observation*: No explicit manual font declarations exist in `globals.css`. Next.js font variable injection on `<html>` handles variable scoping globally across all child elements.

4. **`package.json`**:
   - `next`: `^15.5.19`
   - Next.js 15 native font support supports `Hind_Siliguri` from `next/font/google`.

---

## 2. Logic Chain

1. **Requirement R4 Specification**:
   Requirement R4 mandates using `next/font/google` to load `Hind_Siliguri` with `weight: ['300', '400', '500', '600', '700']`, `subsets: ['bengali']`, and `variable: '--font-bengali'` in `app/layout.tsx`.
2. **Current Misalignment**:
   Observation #1 shows `app/layout.tsx` currently imports `Noto_Sans_Bengali` instead of `Hind_Siliguri`.
3. **Weight Requirement Rationale**:
   `Hind_Siliguri` in Google Fonts is a static font (not variable), so specifying `weight: ['300', '400', '500', '600', '700']` is mandatory for `next/font/google` to properly download and inject font faces for light, normal, medium, semi-bold, and bold text renderings.
4. **CSS Variable & HTML Injection**:
   Instantiating `Hind_Siliguri` as `const hindSiliguri = Hind_Siliguri({ weight: ['300', '400', '500', '600', '700'], subsets: ['bengali'], variable: '--font-bengali' });` and attaching `${hindSiliguri.variable}` to `<html>`'s `className` injects the `--font-bengali` CSS variable into `:root` / `html`.
5. **Tailwind & CSS Cascade**:
   Observation #2 confirms `tailwind.config.ts` references `var(--font-bengali)` inside `fontFamily.sans`. Thus, any element with `font-sans` (which `<body>` has on Line 16 of `layout.tsx`) will fall back to `Hind_Siliguri` for any Bengali unicode characters.
6. **Proposed Edits**:
   - In `app/layout.tsx`: Replace `Noto_Sans_Bengali` import and instantiation with `Hind_Siliguri`. Update `<html className>` to inject `${hindSiliguri.variable}`.
   - In `tailwind.config.ts` (Optional): Add `bengali: ['var(--font-bengali)', 'sans-serif']` under `fontFamily` if explicit `font-bengali` utility class is required alongside `font-sans`.

---

## 3. Caveats

- `Hind_Siliguri` requires downloading 5 weights (`300`, `400`, `500`, `600`, `700`). In production, Next.js self-hosts these fonts at build time, so there is zero external request overhead at runtime.
- No caveats regarding CSS or Tailwind compatibility — `var(--font-bengali)` variable name remains unchanged, preserving existing configuration.

---

## 4. Conclusion

To fulfill Milestone 1 (Requirement R4), `app/layout.tsx` must be updated to import and instantiate `Hind_Siliguri` from `next/font/google`.

### Exact Proposed Code Changes

#### File 1: `app/layout.tsx`
```tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter, Hind_Siliguri } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const hindSiliguri = Hind_Siliguri({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['bengali'],
  variable: '--font-bengali',
});

export const metadata: Metadata = {
  title: { template: '%s | AssOnFire 🔥', default: 'AssOnFire 🔥 | Hardcore Proctored Tests' },
  description: 'The definitive proctored examination platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${hindSiliguri.variable}`}>
      <body className="font-sans bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
```

#### File 2 (Optional Alignment): `tailwind.config.ts`
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { 
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-bengali)', 'sans-serif'],
        bengali: ['var(--font-bengali)', 'sans-serif'],
      }
    } 
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;
```

---

## 5. Verification Method

To independently verify the implementation after edits:

1. **TypeScript & Build Verification**:
   Run `npm run build` or `npx tsc --noEmit` from the project root directory.
   - *Pass Condition*: Zero TypeScript errors regarding `Hind_Siliguri` import or options.

2. **DOM & CSS Variable Verification**:
   Start dev server (`npm run dev`) and inspect `<html>` in Developer Tools:
   - Check `<html class="dark __variable_... __variable_...">`.
   - Verify computed styles on `<html>` include `--font-bengali` set to `Hind Siliguri, sans-serif`.

3. **Typography Render Check**:
   Render a sample Bengali phrase (e.g., `পুঁইমাচা`, `বিড়াল`, `ঈশ্বরচন্দ্র বিদ্যাসাগর`) in any component and inspect computed font-family in browser tools.
   - *Pass Condition*: Font rendered for Bengali glyphs resolves to `Hind Siliguri`.
