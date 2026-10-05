/* The build must be DETERMINISTIC: the same sources must produce byte-identical
   pages every time.

   Why this gate exists: the three service pages picked their project strip with
   `seed = hash(num) % 29`. Python randomises str hashing per process, so every
   single build rewrote those pages with a different set of projects. The repo
   showed a 126-line diff on three files after a build that changed nothing, so
   there was no way to tell a real edit from noise — and any gate that depended
   on which projects were on a service page would have flapped at random.

   Runs the generator twice and compares every generated file.
   Usage: node det.js        (no server needed) */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TESTS = __dirname;                       // _source/tests
const SOURCE = path.dirname(TESTS);            // _source
const ROOT = path.dirname(SOURCE);             // the published root
const BUILD = path.join(SOURCE, 'build.py');

// Everything build.py writes. images/ is authored, so it is not included.
const TARGETS = ['index.html', 'work.html', '404.html', 'sitemap.xml', 'robots.txt',
                 'work', 'services', 'css', 'js'];

function walk(rel, out) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return out;
  const st = fs.statSync(abs);
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(abs).sort()) walk(path.join(rel, name), out);
  } else {
    out.push(rel);
  }
  return out;
}

function snapshot() {
  const snap = new Map();
  for (const t of TARGETS) for (const rel of walk(t, [])) {
    snap.set(rel, fs.readFileSync(path.join(ROOT, rel)));
  }
  return snap;
}

function build() {
  // A fresh interpreter each time — that is the whole point: PYTHONHASHSEED
  // differs between processes, so a str hash in the generator shows up here.
  execFileSync('python3', [BUILD], { cwd: ROOT, stdio: 'pipe' });
}

build();
const a = snapshot();
build();
const b = snapshot();

const fail = [];
if (a.size === 0) fail.push('FAIL  the snapshot is empty — nothing was generated, so this gate proved nothing');
if (a.size < 30) fail.push('FAIL  only ' + a.size + ' generated files found; expected 31+ pages plus css/js');

for (const [rel, buf] of a) {
  if (!b.has(rel)) { fail.push('FAIL  ' + rel + ' vanished on the second build'); continue; }
  if (!buf.equals(b.get(rel))) fail.push('FAIL  ' + rel + ' differs between two builds of identical sources');
}
for (const rel of b.keys()) if (!a.has(rel)) fail.push('FAIL  ' + rel + ' appeared only on the second build');

if (fail.length) {
  console.log(fail.slice(0, 20).join('\n'));
  console.log('\nA non-deterministic build means every rebuild churns the git diff.');
  console.log('Usual cause: hash() on a str, a dict iteration order, or time/random in build.py.');
  process.exit(1);
}
console.log('deterministic: ' + a.size + ' generated files identical across two builds');
