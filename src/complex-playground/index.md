# Complex playground

Ctrl-click (or ⌘-click) on the plane to add a number there, up to three: ${tex`z_1`}, ${tex`z_2`}, ${tex`z_3`}. Drag their tips; every arrow computed from them follows. Ctrl-click on a tip to remove that number, and with it every expression that uses it. Type an expression in the field under the figure to draw it: `z1^3`, `roots(z1, 5)` (all five fifth roots), `(z1 + z2)/2`, `1/z1`, `conj(z2)`, `exp(i z1)`. Give an expression a name to use it in others: `z4 = z1 + z2`, then `z5 = roots(z4, 3)`. A tip snaps onto the grid or the unit circle when it is close. Drag the background to pan, scroll to zoom, and press ⛶ for the whole window. The toggles show each arrow in Cartesian and polar form.

```js
import {createComplexPlaygroundWidget} from "./widget.js";
```

```js
const z = view(createComplexPlaygroundWidget());
```

Expressions use `+`, `-`, `*`, `/`, `^` and parentheses, with juxtaposition for multiplication (`2i`, `z1 z2`); the constants `i`, `e` and `pi`; and the functions `conj`, `abs`, `arg`, `re`, `im`, `exp`, `log`, `sqrt` and `roots`. Powers, `sqrt` and `log` are single-valued; `roots(z, n)` gives all ${tex`n`} of the ${tex`n`}-th roots of ${tex`z`}. A name defined with `=` stands for all of its values, and an operation combines every value of one operand with every value of the other: with `z4 = roots(z1, 3)`, `z4^2` has three values, `roots(z4, 3)` nine, and `z4 - z4` is not only 0 but every difference of two of the roots. An expression has at most 64 values. Removing a definition removes the expressions that use it, and defining a name again replaces it.

Each number's angle ${tex`\theta`} is tracked as it moves: dragged round the origin it keeps counting past ${tex`\pi`} rather than jumping to ${tex`-\pi`}, and the polar spiral winds with it. The angle carries through the arithmetic where there is a rule for it: a product adds its factors' angles, a quotient subtracts them, and a power multiplies, so `z1^2` turns twice as fast as ${tex`z_1`} and `sqrt(z1)` half as fast, coming back negated after one turn of ${tex`z_1`}. A number as placed has its principal angle, so these agree with the principal values until a number is taken round the origin. Where there is no rule, as for a sum, the principal angle is shown.

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
