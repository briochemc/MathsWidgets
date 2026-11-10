export default {
  title: "Maths Widgets",
  root: "src",
  base: process.env.OBS_BASE ?? "/",
  // Drives the sidebar and the prev/next pager. Embed pages are deliberately left out: they
  // exist only to be iframed, and they disable the chrome themselves.
  pages: [
    {name: "Complex playground", path: "/complex-playground/"},
  ],
  head: "",
  footer: `Source code on <a href="https://github.com/briochemc/MathsWidgets" target="_blank" rel="noopener">GitHub</a>.`,
  style: "style.css", // the Air theme with sans-serif body text
  toc: false,
  pager: true,
  sidebar: true,
  search: false,
};
