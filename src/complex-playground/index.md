# Complex playground

Ctrl-click (or ⌘-click) on the plane to add a number there, up to three: ${tex`z_1`}, ${tex`z_2`}, ${tex`z_3`}. Drag their tips; every arrow computed from them follows. Ctrl-click on a tip to remove that number, and with it every expression that uses it. Type an expression in the field under the figure to draw it: `z1^3`, `roots(z1, 5)` (all five fifth roots), `(z1 + z2)/2`, `1/z1`, `conj(z2)`, `exp(i z1)`. A tip snaps onto the grid or the unit circle when it is close. Drag the background to pan, scroll to zoom, and press ⛶ for the whole window. The toggles show each arrow in Cartesian and polar form.

```js
import {createComplexPlaygroundWidget} from "./widget.js";
```

```js
const z = view(createComplexPlaygroundWidget());
```

Expressions use `+`, `-`, `*`, `/`, `^` and parentheses, with juxtaposition for multiplication (`2i`, `z1 z2`); the constants `i`, `e` and `pi`; and the functions `conj`, `abs`, `arg`, `re`, `im`, `exp`, `log`, `sqrt` and `roots`. Powers, `sqrt` and `log` are single-valued, giving the principal value; `roots(z, n)` gives all ${tex`n`} of the ${tex`n`}-th roots of ${tex`z`}.

## Embed this widget

```js
import {embedSnippets, cdnUrl} from "../components/embed-snippet.js";
```

```js
display(embedSnippets({
  embedPath: "complex-playground/embed",
  height: 760,
  title: "Complex playground",
  note: "The figure is square and as wide as the frame allows, up to 640&nbsp;px, with the " +
    "toggles above it and the expression field below. Allow about 430&nbsp;px for a 320&nbsp;px " +
    "phone-width frame.",
  script: `<div id="complex-playground"></div>

<script type="module">
  import {createComplexPlaygroundWidget}
    from "${cdnUrl("complex-playground/widget.js")}";

  // The plane starts empty. Options: {variables: {z1: [2, 1], z2: [1, 1]}} puts numbers
  // on it as [re, im]; {expressions: ["z1 z2"]} adds expressions;
  // {cartesian: true, polar: true} turns the toggles on; {width: 480} caps the figure's side.
  document.getElementById("complex-playground")
    .appendChild(createComplexPlaygroundWidget());
<\/script>`
}));
```
