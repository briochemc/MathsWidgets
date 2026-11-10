---
title: Complex playground (embed)
header: false
footer: false
sidebar: false
toc: false
pager: false
---

<style>
/* Full-bleed: this page is only ever seen inside an iframe, so drop the
   centred-column max-width and page padding that the Air theme applies. */
#observablehq-center {
  margin: 0;
  padding: 0;
  max-width: none;
}
#observablehq-main {
  margin: 0;
  padding: 0;
  max-width: none;
}
body {
  margin: 0;
  overflow-x: auto;
}
</style>

```js
import {createComplexPlaygroundWidget} from "./widget.js";

// The plane starts empty. ?z1=2,1&z2=1,1&z3=0,-1 puts numbers on it, as re,im;
// ?show=z1*z2;z4=z1+z2;roots(z4,3) adds expressions, separated by semicolons;
// ?cartesian=1 and ?polar=1 turn the toggles on.
const params = new URLSearchParams(location.search);
const flag = (name, fallback) => params.has(name) ? params.get(name) !== "0" : fallback;
const variables = {};
for (const name of ["z1", "z2", "z3"]) {
  if (params.has(name)) variables[name] = params.get(name).split(",").map(Number);
}
```

```js
const z = view(createComplexPlaygroundWidget({
  variables,
  expressions: params.has("show") ? params.get("show").split(";") : [],
  cartesian: flag("cartesian", false),
  polar: flag("polar", false),
}));
```
