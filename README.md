# WordPress code samples

Two features from the block theme I use for client sites at my studio, [Acorn Creative](https://acorncreative.io). They're excerpts from a larger production theme, so they won't run on their own: file paths point to the theme's folder structure, and a few shared helpers live elsewhere.

Caleb Copeland · [calebacopeland.com](https://calebacopeland.com)

## 1. Button block icons — [`button-block-icons/`](button-block-icons)

Adds a size toggle and optional icons to the core Button block, without forking the block.

- **`button.js`** wraps the block's editor UI with a higher-order component and adds Size and Icon controls to the inspector. Choices are stored as CSS classes on the block (`is-style-small`, `has-icon-{slug}`, `icon-position-before|after`, `icon-flipped`), so the saved markup stays valid core markup. Each setter clears related classes before adding new ones, so classes can't stack or conflict.
- **`button-icons.php`** finds the SVGs the child theme supplies, passes the list to the editor, and injects the chosen SVG into the button's HTML on the front end through a `render_block` filter. If the child theme has no icons, nothing registers and the control never appears.
- The editor preview uses CSS `mask-image` injected into the canvas document. The editor canvas may be an iframe, so the code searches every reachable document and checks for an existing style ID so it only injects once.

## 2. Scroll-reveal animations — [`scroll-reveal/`](scroll-reveal)

Fade and slide-in animations that editors apply from the block toolbar, built so content is never stuck hidden.

- **`animations.php`** prints a tiny inline script in `<head>` that adds `html.js-anim` before first paint. It skips that when the visitor prefers reduced motion. Elements are only hidden under that class, so no JavaScript, reduced motion or print all mean fully visible content.
- **`animations.js`** uses `IntersectionObserver` to reveal elements as they scroll into view, and reveals anything already on screen immediately so a hero never waits on a scroll event. It falls back to showing everything in browsers without `IntersectionObserver`, and has a failsafe for elements parked at the very bottom of the page that would never cross the trigger line.
- **`animations.css`** holds the hidden and revealed states and the keyframes, with motion values as CSS custom properties a child theme can retune. Staggered children are sequenced in CSS alone.
- If the script fails to load, the head snippet removes `js-anim` after page load (or 4 seconds), so everything shows.

The editor-side toolbar control is part of the theme but not included here.

## Notes

Plain JavaScript (no build step) using WordPress's `wp.*` globals in the editor. I build with AI coding tools daily and review everything before it ships.

License: GPL-2.0-or-later, matching the theme.
