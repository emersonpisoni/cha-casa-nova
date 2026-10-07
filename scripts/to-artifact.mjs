// Turns dist/index.html into dist/artifact.html: one self-contained page body
// (title, fonts, inlined CSS and JS) in the shape claude.ai publishes.
// claude.ai adds its own <!doctype>/<head>/<body> skeleton around it.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const read = href => readFileSync(join(dist, href.replace(/^\.?\//, '')), 'utf8');

const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const fonts = [...html.matchAll(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g)].map(m => m[0]);
const css = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"[^>]*>/g)].map(m => read(m[1]));
const js = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/g)].map(m => read(m[1]));
if (!js.length) throw new Error('No built script found in dist/index.html');

// Keep "</script" inside the bundle from closing the inline tag early.
const safeJs = js.map(code => code.replace(/<\/script/gi, '<\\/script'));

const out = [
  title,
  ...fonts,
  ...css.map(c => `<style>\n${c}\n</style>`),
  '<div id="root"></div>',
  ...safeJs.map(code => `<script type="module">\n${code}\n</script>`),
].join('\n');

writeFileSync(join(dist, 'artifact.html'), out + '\n');
console.log(`dist/artifact.html (${(out.length / 1024).toFixed(0)} KB)`);
