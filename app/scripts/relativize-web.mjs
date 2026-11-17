// Make the web export work from any sub-path (e.g. a hosted prototype link):
// rewrite absolute /_expo and /assets URLs in the HTML and JS bundle to relative ones.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
let n = 0;
for (const file of walk(dist).filter((f) => /\.(html|js)$/.test(f))) {
  const src = readFileSync(file, 'utf8');
  const out = src
    .replace(/(["'(])\/(_expo|assets)\//g, '$1./$2/')
    .replace(/href="\/favicon\.ico"/g, 'href="./favicon.ico"');
  if (out !== src) {
    writeFileSync(file, out);
    n++;
  }
}
// Pin relative URLs to the folder the page was opened from, so assets still load after the
// router changes the path (e.g. redirecting an unknown hosting path to the fridge).
const html = join(dist, 'index.html');
const page = readFileSync(html, 'utf8');
if (!page.includes('id="fk-base"')) {
  const tag = `<script id="fk-base">document.write('<base href="' + location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '') + '">')</script>`;
  writeFileSync(html, page.replace('<head>', `<head>\n    ${tag}`));
}
console.log(`relativized ${n} files in ${dist}`);
