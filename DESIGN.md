---
name: Juggernaut Training
description: Precision wave-periodization tool for competitive powerlifters
colors:
  chalk-blue: "#2563eb"
  chalk-blue-dim: "#60a5fa"
  focus-signal: "#3b82f6"
  blue-hover: "#1d4ed8"
  active-surface: "#dbeafe"
  surface-page: "#f9fafb"
  surface-card: "#ffffff"
  surface-dark-page: "#111827"
  surface-dark-card: "#1f2937"
  text-primary: "#111827"
  text-secondary: "#4b5563"
  text-tertiary: "#6b7280"
  border-default: "#e5e7eb"
  border-dark: "#374151"
  success: "#16a34a"
  success-deep: "#15803d"
  success-surface: "#f0fdf4"
  warmup-signal: "#b45309"
  warmup-surface: "#fef3c7"
  error: "#dc2626"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.chalk-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.chalk-blue}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  workout-item:
    backgroundColor: "{colors.surface-page}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "16px"
  workout-item-done:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success-deep}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Juggernaut Training

## 1. Overview

**Creative North Star: "The Competition Platform"**

This is a tool that earns its place the way a good squat rack does: by being exactly what it needs to be and nothing more. The aesthetic draws from IPF competition day — numbered attempt cards, white-light judging, the silent weight of the platform itself. Every screen answers one question: what do I need to do right now? Information is dense because athletes are capable, not because density is a style choice.

The system runs light by default. The physical scene it's built for: an athlete between sets under fluorescent gym lights, chalk on their hands, phone held at arm's length. Light surfaces read cleanly in overhead lighting; dark backgrounds wash out in that environment. Dark mode exists for evening sessions and progress review at home, but the platform starts from daylight.

Chalk Blue (#2563eb) is the system's only accent color. It appears clinical, not decorative — reserved for actionable elements and state changes only. Neutral grays carry the rest of the surface. The constraint is the point: when blue appears, it means something.

**Key Characteristics:**
- Light-first, information-dense layout (max-w-md mobile shell)
- Single accent color, clinical in application
- Tactile feedback on every interactive element (ripple, scale, lift)
- Reduced motion respected systemwide, no exceptions
- WCAG 2.1 AA throughout; 44px minimum touch targets

## 2. Colors: The Chalk Palette

One accent, earning every pixel it occupies. The neutral palette is cool-gray (Tailwind's gray family has a blue undertone that quietly reinforces the primary accent without competing with it).

### Primary
- **Chalk Blue** (`#2563eb`, oklch(51% 0.24 264)): The interface's single voice. Used on primary CTA buttons, active nav states, focus rings, and data highlights. Forbidden from decorative use. Its rarity is its authority.
- **Chalk Blue Dim** (`#60a5fa`, oklch(68% 0.18 264)): Dark-mode expression of the primary. Same restraint, adjusted for dark surfaces.
- **Focus Signal** (`#3b82f6`, oklch(59% 0.22 264)): Focus ring color across all interactive elements. 2px solid, 2px offset. Never used on non-focus surfaces.

### Secondary
- **Success Ink** (`#16a34a`, oklch(54% 0.17 152)): Completed workout states — icon tint and primary text. Earned, not celebrated.
- **Success Surface** (`#f0fdf4`, oklch(99% 0.025 152)): Background tint for completed workout rows. Reads "done" without shouting.
- **Warmup Signal** (`#b45309`, oklch(55% 0.16 60)): Warmup-feel feedback ("Tough" state indicator). Amber is the system's only warm hue; it means "pay attention, not alarm."

### Tertiary
- **Error** (`#dc2626`, oklch(53% 0.22 27)): Validation failures. Never used for warnings or caution — only hard errors.

### Neutral
- **Page Surface** (`#f9fafb`, oklch(98% 0.004 264)): App background. Slightly cooler than pure white; pairs with the blue accent without clashing.
- **Card Surface** (`#ffffff`): Raised content surfaces: cards, modals, nav bar. Pure white lifts against the page background without any shadow game.
- **Text Primary** (`#111827`, oklch(18% 0.01 264)): Headings and primary data values. Near-black with the gray-family's cool undertone.
- **Text Secondary** (`#4b5563`, oklch(47% 0.012 264)): Sublabels, descriptions. Meets 4.5:1 on white (WCAG AA).
- **Text Tertiary** (`#6b7280`, oklch(57% 0.008 264)): Meta text, timestamps, unit labels. Meets 4.5:1 on white.
- **Border Default** (`#e5e7eb`, oklch(91% 0.005 264)): Dividers, nav top border, card separators. Never colored.
- **Dark Page** (`#111827`, oklch(18% 0.01 264)): Dark-mode page background.
- **Dark Card** (`#1f2937`, oklch(25% 0.015 264)): Dark-mode card surface.

### Named Rules
**The One Voice Rule.** Chalk Blue (#2563eb) appears on no more than 10% of any given screen. Primary buttons, active nav item, focus rings. Not section headings. Not decorative dividers. Not gradient heroes. One voice; its silence is what makes it heard.

**The No-Warm-Neutrals Rule.** Tailwind's gray family carries a cool blue undertone (hue ~264 in OKLCH). This is not an accident — it reinforces the primary accent without competing with it. Substituting warm grays (zinc, stone, slate) breaks the system's tonal coherence.

## 3. Typography

**Display/Body Font:** System UI stack: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

No custom typeface is loaded. This is a principled choice for a tool used mid-session: zero font-loading latency, instant render, platform-native legibility. The system font on iOS renders San Francisco; on Android, Roboto. Both are purpose-built for readability at arm's length under variable conditions.

**Character:** Functional, unadorned, and fast. The type hierarchy works through weight contrast and size alone — no italic, no uppercase, no letter-spacing games. Numbers are the content; the typeface steps out of the way.

### Hierarchy
- **Display** (700, 36px, line-height 1.1): Page-level greeting and primary screen title. One per screen. Not reused for sub-section headers.
- **Headline** (700, 24px, line-height 1.2): Primary data values in cards (projected 1RM, wave weight). The number an athlete looks at first.
- **Title** (700, 20px, line-height 1.3): Card headings, section labels ("Workouts", "Warm-up Progression"). Distinguishes sections without competing with headline data.
- **Body** (400, 16px, line-height 1.5): Instructions, descriptions, contextual copy. Max line length 65ch — enforced by the max-w-md container; no additional constraint needed.
- **Label** (500, 12px, line-height 1.4): Unit labels, meta text, nav tab labels, sublabels beneath data values. Weight 500 keeps it legible at small size without going bold.

### Named Rules
**The Weight-Only Rule.** Hierarchy is established through font-weight contrast (400/700) and size steps (12/16/20/24/36px), never through italic, uppercase, letter-spacing, or color alone. Color changes in text signal state (success, active), not hierarchy.

**The Number-First Rule.** On data screens, the number is the primary element. Its font size and weight must exceed every surrounding label. Labels serve the number; the number doesn't serve the label.

## 4. Elevation

This system is flat by default. Surfaces are not stacked into a shadow hierarchy — they are differentiated tonally (white card on gray-50 page background). Shadows are reserved for two purposes only: resting cards that need to separate from the page when the tonal contrast isn't sufficient, and interactive lift states.

### Shadow Vocabulary
- **Card Rest** (`box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05)`): Applied to all white card surfaces on the gray-50 page background. Minimal — just enough to separate. Tailwind's `shadow-sm`.
- **Hover Lift** (`box-shadow: 0 10px 20px rgba(0,0,0,0.10)`): Applied on hover for interactive card surfaces. Accompanies a `translateY(-2px)` transform. Tailwind's approximate `shadow-md`.
- **Glow Pulse** (`box-shadow: 0 0 0 10px rgba(59,130,246,0)` pulsing from `0 0 0 0 rgba(59,130,246,0.7)`): Focus-state ring for elements that need elevated visibility. Rare; only for critical CTA prompts.

Dark mode collapses the tonal contrast between page and card surfaces. In dark mode, cards (`#1f2937`) rest on a page (`#111827`) with only 7 OKLCH lightness points of separation — the `shadow-sm` provides no additional separation. Dark-mode cards rely on the card's higher lightness alone, not shadows.

### Named Rules
**The Flat-By-Default Rule.** Surfaces rest flat. Shadow appears only in response to state: hover reveals depth, rest conceals it. A shadow at rest is decoration; a shadow on hover is information.

## 5. Components

### Buttons
Responsive and tactile. Every press is acknowledged with a scale-down (0.95) and, where implemented, a ripple. The interface confirms the athlete's input without delay.

- **Shape:** Gently curved edges (12px radius). Not pill-shaped (too playful), not sharp (too harsh).
- **Primary:** Chalk Blue fill (#2563eb), white text, 12px vertical / 16px horizontal padding. Full-width on mobile by default. Hover: background deepens to #1d4ed8, translateY(-2px) + shadow-md. Active: scale(0.95).
- **Ghost/Text Button:** No background, Chalk Blue text, same radius. Used for secondary actions like "Move to Next Week" — present but not competing with the primary action.
- **Disabled:** 50% opacity, `cursor: not-allowed`. No color change — the opacity alone communicates the state.
- **CTA Gradient Exception:** The 1RM test button uses a `from-blue-600 to-indigo-600` gradient. This is the only permitted gradient on any surface, and only for this specific high-importance CTA. It is not a pattern to extend.

### Cards / Containers
- **Corner Style:** Rounded-2xl (16px radius). Generous curves read as sturdy and deliberate, not soft.
- **Background:** White (#ffffff) on light mode. #1f2937 on dark mode.
- **Shadow Strategy:** shadow-sm at rest (see Elevation). Never nested — card within a card is always wrong.
- **Border:** None by default. Border-top only on the nav bar (border-default, 1px).
- **Internal Padding:** 24px (p-6). Consistent across all cards. List items within cards use 16px vertical / 16px horizontal (p-4).
- **Spacing:** 16px gap between cards (space-y-4).

### Workout List Items
The system's signature interactive element. Represents the primary decision point for every session.

- **Incomplete:** Gray-50 background (#f9fafb), primary text, ChevronRight icon at 16px gray.
- **Completed:** Success-surface background (#f0fdf4), success-deep text (#15803d), Check icon at 20px green-600.
- **Shape:** 12px radius (rounded-xl). Slightly less than card radius — visually nested within card without conflict.
- **States:** hover shifts background one step darker (gray-100 / green-100). Active press scales to 0.95. Ripple on tap (white rgba(255,255,255,0.6)).
- **Data Hierarchy:** Lift name in body weight (600), subtitle (top set weight or projected 1RM) in label weight (400) and secondary color.

### Inputs / Fields
- **Style:** White background, gray-200 border (1px), 12px radius. Minimum height 44px (WCAG touch target).
- **Focus:** 2px solid focus-signal (#3b82f6) ring, 2px offset. Border doesn't shift; the outline does.
- **Error:** Border changes to error (#dc2626). Inline error icon (SVG inlined via background-image), 40px right padding to not overlap icon.
- **Success:** Border changes to success (#16a34a). Inline success icon same treatment.
- **Disabled:** 60% opacity, `cursor: not-allowed`.

### Navigation
Fixed bottom bar. White background (#ffffff) on light, dark-card (#1f2937) on dark. 1px border-top in border-default. Height: 64px (h-16). Max-width: 448px centered.

- **Tab items:** Flex column, icon (24px) + label (12px, weight 500). Minimum 44px height.
- **Default state:** Gray-600 (#4b5563) icon and label.
- **Active state:** Chalk Blue (#2563eb) icon and label. 8px-radius pill background in active-surface (#dbeafe) behind icon.
- **Focus:** 2px inset focus-signal ring.
- No labels hide below a breakpoint — this is a 4-tab mobile-only nav.

### Strength Score Carousel
The system's distinctive data component. Displays Wilks/DOTS/Wilks2/IPFGL scores with percentage change from baseline.

- Score displays as a large headline number. Score name as a label above. Change percentage as a secondary badge.
- Positive change: success-surface background, success text. Negative or neutral: gray-50 background, secondary text.
- Carousel swipes between scoring systems. No visual affordance beyond the content itself.

## 6. Do's and Don'ts

### Do:
- **Do** use Chalk Blue (#2563eb) exclusively for actionable elements: primary buttons, active nav states, focus rings, and interactive highlights. Remove it from everything decorative.
- **Do** apply 44px minimum height to every tappable element, including nav items, workout rows, and any icon-only button.
- **Do** use `shadow-sm` at rest and reveal `shadow-md` with `translateY(-2px)` on hover — never invert this (shadows that shrink on hover feel wrong on mobile).
- **Do** display data values at a larger font size and weight than their labels. The number leads; the label follows.
- **Do** use the full Tailwind gray family (gray-50 through gray-900) for all neutral surfaces, borders, and text. Maintain its cool blue undertone.
- **Do** wrap all motion in `prefers-reduced-motion` checks — the system respects this at the CSS level; any JS-driven animations must respect it too.
- **Do** show completion state with a full background-color shift (success-surface) plus a check icon plus success-colored text — three independent signals, none relying on color alone.

### Don't:
- **Don't** use neon colors, aggressive display fonts, flames, lightning bolts, or any visual language borrowed from bro-culture supplement brands. The system rejects that aesthetic entirely.
- **Don't** use bright pastels, rounded cartoon icons, motivational filler copy ("Great job! Keep it up!"), or calorie-tracking visual patterns from consumer wellness apps like MyFitnessPal or Nike Training.
- **Don't** build hero metric cards: big number, small label, gradient accent, supporting stats in a grid. This is the SaaS dashboard cliché this system explicitly rejects.
- **Don't** add streaks, badges, confetti, or engagement-loop patterns. Powerlifters don't need a 7-day streak notification.
- **Don't** nest cards. A card within a card is always wrong — use list items within a card instead.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards, list items, or callouts. Use a full background tint instead.
- **Don't** apply Chalk Blue to section headings, dividers, or decorative elements. Every non-functional blue pixel dilutes its authority.
- **Don't** use gradient text (`background-clip: text`). Weight and size establish emphasis; color is for state.
- **Don't** add the gradient (`from-blue-600 to-indigo-600`) to any button or surface except the dedicated 1RM Test CTA. It is a singular exception, not a pattern.
- **Don't** load a custom typeface. System fonts are the intentional choice: zero latency, platform-native legibility, mid-session reliability.
