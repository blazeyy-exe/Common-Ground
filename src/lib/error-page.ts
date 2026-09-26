/**
 * Last-resort HTML for failures that happen before React can mount: a 500 from
 * the SSR entry, or an h3 error that swallowed the throw. It mirrors the
 * palette in src/styles.css so a crash still looks like Common Ground.
 */
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="theme-color" content="#000000" />
    <title>Common Ground — this view didn't load</title>
    <style>
      :root {
        --surface-base: #000;
        --surface-raised: #131a30;
        --text-primary: #e8ecf6;
        --text-secondary: #97a1bd;
        --accent: #5aa9ff;
        --border: rgb(255 255 255 / 16%);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: var(--surface-base);
        color: var(--text-primary);
        font: 15px/1.6 "DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      .card { width: 100%; max-width: 30rem; }
      .eyebrow {
        margin: 0;
        color: var(--accent);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.28em;
      }
      h1 {
        margin: 18px 0 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 30px;
        font-weight: 400;
        line-height: 1.2;
      }
      p { margin: 18px 0 0; color: var(--text-secondary); }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
      a, button {
        display: inline-flex;
        align-items: center;
        height: 36px;
        padding: 0 16px;
        border: 1px solid transparent;
        border-radius: 6px;
        font: inherit;
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        cursor: pointer;
      }
      .primary { background: var(--accent); color: var(--surface-base); }
      .secondary {
        background: var(--surface-raised);
        border-color: var(--border);
        color: var(--text-primary);
      }
      a:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
    </style>
  </head>
  <body>
    <div class="card">
      <p class="eyebrow">SERVER ERROR</p>
      <h1>This view didn't load</h1>
      <p>The explorer couldn't be rendered on the server. Reloading usually clears it.</p>
      <div class="actions">
        <button class="primary" type="button" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Back to the atlas</a>
      </div>
    </div>
  </body>
</html>`;
}
