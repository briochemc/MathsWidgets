# Maths Widgets

Small, self-contained interactive figures for teaching maths. Each widget is one page, and each page ends with a copy-pastable snippet so you can drop the widget into your own site or LMS, as an iframe or as a script tag that renders it inline.

<div class="grid grid-cols-3 widget-cards">
  <a class="card" href="./complex-playground/">
    <h2>Complex playground</h2>
    <img class="thumb" src="./assets/thumbnails/complex-playground.png" alt="The complex plane with two yellow arrows from the origin for z1 and z2, a blue arrow for their product, and five green arrows for the fifth roots of z1, each labelled with its value">
  </a>
</div>

<style>
  .widget-cards {
    max-width: 620px;
  }
  /* Column layout with the image pushed to the bottom, so a title that wraps onto a
     second line does not shunt its thumbnail out of line with the others. */
  .widget-cards .card {
    display: flex;
    flex-direction: column;
    padding: 0.6rem;
    color: inherit;
    text-decoration: none;
  }
  .widget-cards .card:hover {
    border-color: var(--theme-foreground-focus);
  }
  .widget-cards .card:hover h2 {
    color: var(--theme-foreground-focus);
  }
  .widget-cards h2 {
    margin: 0 0 0.5rem;
    text-wrap: balance;
  }
  /* The thumbnails are captured square (see scripts/take-thumbnails.mjs); cover-cropping
     is only a safety net so a re-captured image of another shape still fills the card. */
  .widget-cards .thumb {
    display: block;
    margin-top: auto;
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    object-position: 50% 0;
    background: #fff;
    border: solid 1px var(--theme-foreground-faintest);
    border-radius: 0.5rem;
    box-sizing: border-box;
  }
</style>
