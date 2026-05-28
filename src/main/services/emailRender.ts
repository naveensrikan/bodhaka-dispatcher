import katex from 'katex';
import 'katex/contrib/mhchem';

/**
 * Convert markdown (with LaTeX math and \ce{} chemistry) into a styled,
 * email-safe HTML document. Used for the Send Email node so recipients
 * see bold/italic/lists/tables and rendered formulas instead of raw ** and $.
 *
 * `marked` v14 is ESM-only, so we load it via dynamic import (works from our
 * CommonJS-compiled main process).
 */
export async function renderEmailHtml(markdown: string, title = 'From Bodhaka Forge'): Promise<string> {
  const { marked } = await import('marked');

  // Render math to HTML before markdown processing.
  let processed = markdown.replace(/\$\$([^$]+?)\$\$/g, (_m, expr) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false, output: 'html' });
    } catch { return _m; }
  });
  processed = processed.replace(/\$([^$\n]+?)\$/g, (_m, expr) => {
    if (/^\s*\d+\s*$/.test(expr)) return _m; // skip plain numbers like $5
    try {
      return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false, output: 'html' });
    } catch { return _m; }
  });

  const bodyHtml = marked.parse(processed, { async: false }) as string;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1d2e; line-height: 1.6; max-width: 680px; margin: 0 auto; padding: 24px; }
  h1, h2, h3 { color: #1e2a8a; margin-top: 1.2em; margin-bottom: 0.4em; }
  h1 { font-size: 1.5em; } h2 { font-size: 1.25em; } h3 { font-size: 1.1em; }
  strong { font-weight: 700; color: #15205e; }
  em { font-style: italic; }
  ul, ol { padding-left: 1.4em; margin: 0.6em 0; }
  li { margin: 0.2em 0; }
  code { background: #eef0f6; padding: 2px 5px; border-radius: 4px; font-family: "Cascadia Code", Consolas, monospace; font-size: 0.9em; }
  pre { background: #eef0f6; padding: 12px; border-radius: 6px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #1e2a8a; padding-left: 12px; color: #5a5e75; margin: 0.8em 0; }
  table { border-collapse: collapse; margin: 0.8em 0; }
  th, td { border: 1px solid #cdd0dc; padding: 6px 10px; text-align: left; }
  th { background: #eef0f6; font-weight: 600; }
  a { color: #1e2a8a; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e3e5ec; font-size: 12px; color: #8a8fa6; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
