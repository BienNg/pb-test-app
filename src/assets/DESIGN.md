# Design System Document

## 1. Overview & Creative North Star: "The Living Sanctuary"

This design system moves away from the sterile, high-contrast rigidity of traditional fitness apps. Instead, it adopts the **"Living Sanctuary"**—a Creative North Star rooted in soft minimalism, organic breathability, and high-end editorial layouts. 

We break the "template" look by favoring intentional asymmetry over rigid grids. Content is treated like a curated gallery; we use expansive white space (the "breath"), overlapping surface layers, and a sophisticated typography scale to create a sense of calm authority. This is not a utility tool; it is a premium digital environment that encourages wellness through visual serenity.

---

### 2. Colors & Tonal Depth

Our palette is anchored by Sage Green (`primary: #3f6758`), but its power lies in the transition between its tinted containers and neutral surfaces.

*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Structural boundaries must be defined solely through background color shifts. For example, a `surface-container-low` (#eff5f0) section should sit directly on a `surface` (#f6faf6) background to create a "soft-edge" division.
*   **Surface Hierarchy & Nesting:** Treat the UI as stacked sheets of fine, semi-translucent paper. Use the `surface-container` tiers to denote importance. An inner card (`surface-container-highest`: #dae5de) placed inside a broader section (`surface-container-low`) creates a natural, "sun-bleached" depth without the need for heavy shadows.
*   **The "Glass & Gradient" Rule:** For primary CTAs or Hero sections, avoid flat fills. Use a subtle linear gradient from `primary` (#3f6758) to `primary_dim` (#335b4d) at a 135-degree angle. For floating navigation or modals, apply Glassmorphism: use `surface` at 80% opacity with a `24px` backdrop blur to allow the organic green tones to bleed through.

---

### 3. Typography: Editorial Authority

We use **Lexend** exclusively. Its hyper-legibility and geometric clarity provide a modern, "human-centric" feel.

*   **Display (lg/md/sm):** Used for "Hero Moments" (e.g., daily step counts or motivational headlines). Use `display-lg` (3.5rem) with `-0.02em` letter spacing to create a compact, high-fashion editorial impact.
*   **Headline & Title:** These are your navigational anchors. `headline-lg` (2rem) should be used for section starts, paired with generous top-padding (`spacing-12`) to ensure the layout "breathes."
*   **The "Contextual Label":** Use `label-md` (0.75rem) in `on-surface-variant` (#57615c) for metadata. This provides a soft secondary layer of information that doesn't compete with the primary data.
*   **Hierarchy Note:** Always pair a large `display` stat with a `label-md` uppercase descriptor to create a clear "Data vs. Context" relationship.

---

### 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are too "digital" for this system. We achieve lift through light and pigment.

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-lowest` (#ffffff) card sitting on a `surface-container` (#e8f0ea) background provides all the separation required for a premium look.
*   **Ambient Shadows:** If a floating element (like a FAB or a floating Header) requires a shadow, it must be an "Ambient Shadow." Use a blur of `40px`, a `10px` Y-offset, and 6% opacity of `on_surface` (#2b3530). This mimics natural, soft-box photography lighting.
*   **The Ghost Border Fallback:** If accessibility requires a stroke (e.g., in high-glare environments), use the `outline-variant` (#aab4ae) at **15% opacity**. This creates a "Ghost Border" that defines the edge without breaking the organic flow.

---

### 5. Components

#### Buttons
*   **Primary:** A pill-shaped (`rounded-full`) container using the `primary` (#3f6758) fill. Text is `on_primary` (#e5fff2). No shadow; use a subtle `primary_container` glow on hover.
*   **Tertiary:** Text-only using `primary` color, sitting on a transparent background. Use for low-emphasis actions like "View History."

#### Chips
*   **Selection Chips:** Use `secondary_container` (#cee9dc) for unselected and `primary` (#3f6758) for selected. Corners should be `rounded-md` (1.5rem) to maintain the soft aesthetic.

#### Input Fields
*   **Text Inputs:** Forgo the four-sided box. Use a `surface_container_high` (#e1eae4) background with a `rounded-sm` (0.5rem) top radius and a thicker 2px bottom "active" line in `primary` when focused.

#### Cards & Lists
*   **The "No-Divider" Rule:** Forbid the use of horizontal rules. Separate list items using `spacing-4` (1.4rem) of vertical white space or by alternating background tones between `surface` and `surface_container_low`.
*   **The Progress Ring:** For fitness tracking, use a `primary` stroke on a `primary_container` track. Ensure the stroke ends are `rounded` to match the system’s soft geometry.

---

### 6. Do’s and Don’ts

**Do:**
*   **Do** use asymmetrical margins. For example, a 1.4rem (`spacing-4`) left margin paired with a 2.75rem (`spacing-8`) right margin for text blocks creates an editorial, "un-templated" feel.
*   **Do** lean into `rounded-xl` (3rem) for large image containers to mimic the organic curves of the human body.
*   **Do** use `surface_tint` (#3f6758) at very low opacities (2-4%) as an overlay for lifestyle photography to harmonize images with the UI.

**Don’t:**
*   **Don't** use pure black (#000000). Always use `on_surface` (#2b3530) for text to maintain the soft-green tonal harmony.
*   **Don't** use sharp 90-degree corners. Even the smallest components should have at least a `rounded-sm` (0.5rem) radius.
*   **Don't** crowd the screen. If a screen feels "busy," increase the spacing between sections to the next tier in the scale (e.g., move from `spacing-10` to `spacing-16`).