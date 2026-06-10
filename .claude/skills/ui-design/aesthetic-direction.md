# Aesthetic Direction Guide

This is the aesthetic expertise the `ui-design` skill draws on when creating mockups. Read it BEFORE writing any HTML. Without an intentional aesthetic direction, mockups default to generic AI-generated slop: Inter on white with a purple gradient somewhere.

## The Core Rule

**Choose a clear conceptual direction and execute it with precision.** Bold maximalism and refined minimalism both work — the key is *intentionality*, not *intensity*. Every design decision should trace back to the chosen direction.

---

## Step 1: Design Thinking (answer these first)

Before touching HTML, answer:

- **Purpose** — What problem does this interface solve? Who uses it?
- **Tone** — What feeling should this evoke? Pick an extreme, not a middle ground.
- **Constraints** — Technical requirements (framework, performance, accessibility, device).
- **Differentiation** — What makes this UNFORGETTABLE? What's the one thing someone will remember?

Write these down (mentally or in the mockup's header comment) before coding.

---

## Step 2: Choose an Aesthetic Direction

Pick one from the list below — or invent your own when a listed option doesn't fit the context. This list is a starting point, not a menu to converge on.

| Direction | Feel | Typical traits |
|---|---|---|
| **Brutally minimal** | Stripped, uncompromising, calm | Monospace or bold sans, massive whitespace, restrained palette (black/white + one accent), sharp alignment |
| **Maximalist chaos** | Overloaded, kinetic, joyful | Mixed typography, layered imagery, saturated colors, intentional "mess", multiple grids coexisting |
| **Retro-futuristic** | Nostalgic + forward-looking | CRT scanlines, neon gradients, pixelated type or geometric sans, chromatic aberration, grid overlays |
| **Organic / natural** | Calm, earthy, human | Warm off-white backgrounds, soft curves, serif type, muted earth tones, hand-drawn or textured elements |
| **Luxury / refined** | Expensive, considered, sparse | Slow motion, thin typefaces, generous margins, deep blacks + metallics, precision spacing |
| **Playful / toy-like** | Fun, tactile, inviting | Rounded everything, saturated primaries, chunky type, bouncy illustrations, exaggerated scales |
| **Editorial / magazine** | Considered, readable, layered | Strong serif headlines + clean sans body, column grids, pull quotes, asymmetric balance |
| **Brutalist / raw** | Unpolished, honest, structural | Exposed grid lines, default browser blues/underlines embraced, mono type, no decoration |
| **Art deco / geometric** | Ornamental, patterned, symmetric | Strong symmetry, metallic accents, geometric repetition, display serif, limited high-contrast palette |
| **Soft / pastel** | Gentle, approachable, calm | Low-saturation pastels, rounded soft shadows, airy spacing, humanist typefaces |
| **Industrial / utilitarian** | Functional, dense, technical | Monospace, grid overlays, technical annotations, neutral palette with one "warning" accent, data-forward |

**Commit clearly.** Announce the direction before writing any HTML:

> "Going with **editorial/magazine** for this mockup — serif display for section headers, single-column reading flow, generous left margin for pull quotes."

---

## Step 3: Execution Guidelines

### Typography

- **Distinctive choices only.** Avoid Inter, Roboto, Arial, system-ui without a specific reason, and Space Grotesk (overused across AI-generated work).
- **Pair purposefully.** A distinctive display font for headlines + a refined body font for reading. Don't use one font for everything unless minimalism demands it.
- **Size with intent.** Heading scale should feel deliberate (e.g., modular scale like 1.25x / 1.333x), not random. Body text ≥ 16px.
- **Think character.** The font should feel chosen *for this design*, not "the default sans-serif."

Examples of distinctive choices by direction:
- Editorial → *Fraunces*, *Playfair Display*, *EB Garamond* (display) + *Inter* or *Source Sans* (body — yes, even Inter is fine if paired intentionally and the display font carries personality)
- Brutalist → *JetBrains Mono*, *IBM Plex Mono*, browser defaults
- Playful → *Fredoka*, *DM Serif Display*, *Caprasimo*
- Luxury → *Cormorant*, *Didot*, *Tenor Sans*

### Color & Theme

- **Commit to a cohesive palette.** Use CSS variables (`--color-bg`, `--color-fg`, `--color-accent`, `--color-accent-strong`) so every use is consistent.
- **Dominant + sharp accent.** Dominant colors with one or two sharp accents outperform timid, evenly-distributed palettes. "Everything a little colorful" reads as generic.
- **Light vs dark intentionally.** Don't default to white background + dark text — that's the AI baseline. Choose the theme that serves the direction.
- **Meaning through color.** Use color to distinguish states, hierarchy, or emotion — not just decoration.

### Motion

- **CSS-only for HTML mockups.** No JS animation libraries for mockups (adds complexity, distracts from the design).
- **Orchestrate, don't scatter.** One well-orchestrated page load with staggered reveals (using `animation-delay` on sequential elements) creates more delight than 20 tiny micro-interactions.
- **High-impact moments only.** Hero entrance, section transitions, meaningful state changes. Not "everything fades in on hover."
- **Match the direction.** Luxury = slow, deliberate easing. Playful = elastic spring. Brutalist = no motion or harsh instant cuts.

### Spatial Composition

- **Unexpected layouts beat grid-safe ones.** Asymmetry, overlap, diagonal flow, grid-breaking elements — if they serve the direction.
- **Whitespace is a design choice.** Generous negative space (editorial, luxury) OR controlled density (industrial, maximalist). Timid middle-ground spacing reads as accidental.
- **Alignment is sacred.** Whatever grid you choose, hold it strictly. Loose alignment kills everything else.

### Backgrounds & Visual Details

Don't default to solid white or gray. Atmosphere and depth come from backgrounds:

- **Gradient meshes** — soft, non-linear color blending
- **Noise textures** — subtle grain adds material feel
- **Geometric patterns** — dots, lines, shapes at low opacity
- **Layered transparencies** — multiple translucent shapes overlapping
- **Dramatic shadows** — not the generic `box-shadow: 0 4px 6px rgba(0,0,0,0.1)`; use colored shadows, hard shadows, or sculpted multi-shadow effects
- **Decorative borders** — custom SVG borders, dashed asymmetric frames
- **Custom cursors** — for maximalist or playful directions
- **Grain overlays** — pseudo-element with `background-image: url('data:...noise.svg')` for organic feel

Match the choice to the direction. Luxury uses subtle noise and deep color washes; brutalist uses none.

---

## Anti-Patterns (The "AI Slop" List)

NEVER default to any of these without a specific, explainable reason:

### Typography anti-patterns
- Inter, Roboto, Arial, or system-ui as the primary font without intent
- Space Grotesk (overused — fine if contextually right, but don't converge here by default)
- Single font for the entire design when display + body pairing would serve better
- 14px or smaller body text
- Fonts with no personality relationship to the subject matter

### Color anti-patterns
- Purple gradients on white backgrounds (the quintessential AI default)
- Blue-on-white SaaS palette without differentiation
- Timid palettes where every color is desaturated and nothing dominates
- Dark mode that's just inverted light mode (no rebalancing of weights)
- Random Tailwind gray-600/gray-700 on gray-100 combinations

### Layout anti-patterns
- Identical card grids (3 or 4 cards in a row, each with icon + title + short text)
- Hero + features + testimonial + CTA structure applied to contexts that don't call for it
- "Everything centered" when asymmetry would add intent
- Middle-ground spacing — neither generous nor tight, just accidental
- Card-in-card-in-card nesting (AI over-containerization)

### Decoration anti-patterns
- Border-radius on every element by default
- Bouncy/elastic spring animations on everything
- Side-tab thick `border-left` as decoration on cards
- Dark glowing box-shadows for atmosphere
- Dashed borders as "interesting texture"

### Overall anti-patterns
- Cookie-cutter design with no context-specific character
- Designs that could be swapped between two unrelated apps without noticing
- "Playful" that's actually just rounded corners and saturated primaries
- "Minimalist" that's actually just white space without any other commitment

---

## Variation Principle

**Never converge on the same aesthetic across mockups.** If a previous mockup went editorial, the next one should not also go editorial unless the context demands it. Vary:

- Light vs dark themes
- Serif vs sans vs mono
- Dense vs airy spacing
- Saturated vs muted palettes
- Symmetric vs asymmetric layouts

Each project and each feature deserves a direction choice that fits *it* — not a repeat of what felt safe last time.

---

## Matching Implementation Complexity to Vision

- **Maximalist directions** need elaborate code: multiple layered backgrounds, custom cursors, orchestrated animation sequences, complex gradients.
- **Minimalist / refined directions** need restraint: one color, two fonts, precise spacing, subtle motion. Elegance comes from execution, not addition.
- **Don't under-execute a maximalist vision** (it becomes messy) or **over-decorate a minimalist vision** (it becomes generic). Match the commitment.

---

## Before You Write HTML

Quick checklist — complete before coding:

- [ ] Purpose, Tone, Constraints, Differentiation answered
- [ ] Aesthetic direction chosen and named (e.g., "editorial/magazine", "industrial/utilitarian")
- [ ] Different from the last mockup I made — not a repeat
- [ ] Typography plan: display font + body font, both distinctive
- [ ] Color plan: dominant + accents as CSS variables
- [ ] Motion plan: what's the one high-impact moment?
- [ ] Background/atmosphere plan: noise, gradient mesh, pattern, or intentional flat?

If any of these are unclear, the mockup will drift toward generic. Resolve them first.

---

## Final Reminder

Claude is capable of extraordinary creative work. Don't hold back. Show what can truly be created when thinking outside the box and committing fully to a distinctive vision. A mockup that looks like "every AI-generated SaaS page" is a failure state — even if technically correct.
