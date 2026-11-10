# Maths Widgets

Small, self-contained interactive figures for teaching maths, built with [Observable Framework](https://observablehq.com/framework/) and published at **https://briochemc.github.io/MathsWidgets/**.

Each widget is one page and ends with a copy-pastable snippet for dropping the widget into your own site or LMS, either as an `<iframe>` or as a `<script type="module">` tag that renders it inline (the module is served from jsDelivr straight out of this repository). The widgets use no external data, just maths.

Widgets so far: the complex playground, where up to three draggable complex numbers and any expressions typed in them (roots included) are drawn as arrows on a plane you can pan and zoom.

## Running the site locally

You need [Node.js](https://nodejs.org/) (version 18 or later).

```sh
npm install
npm run dev
```

Then open http://localhost:3000. The preview reloads as you edit files under `src/`.

`npm run build` writes the static site to `dist/`. Pushing to `main` deploys it to GitHub Pages through `.github/workflows/deploy.yml`.

## Layout

- `src/<widget>/index.md`: the widget's page, with the embed snippet.
- `src/<widget>/embed.md`: the same widget with no site chrome, for iframes.
- `src/<widget>/widget.js`: the figure itself, a `create…Widget()` factory that returns a DOM node with a `.value` and fires `input` events, so it works with Framework's `view()` and on its own.
- `src/assets/thumbnails/`: the homepage cards' images, re-captured with `npm run thumbnails` after a build by `scripts/take-thumbnails.mjs` (which needs `npm install --no-save playwright-core` and Google Chrome).
- `src/style.css`: the Air theme with sans-serif body text.
- `observablehq.config.js`: the sidebar, one entry per widget.
