// Public build identity only. Never include environment variables, URLs or credentials.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const hash = crypto.createHash('sha256');
function collect(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).sort((a,b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? collect(file) : [file];
  });
}
const files = ['src', 'scripts', 'content/legal'].flatMap(name => collect(path.join(root, name)))
  .concat(['package.json', 'package-lock.json'].map(name => path.join(root, name))).sort();
files.forEach(file => {hash.update(path.relative(root, file));hash.update('\0');hash.update(fs.readFileSync(file));hash.update('\0');});
let revision = process.env.CODEBUILD_RESOLVED_SOURCE_VERSION || process.env.GITHUB_SHA || '';
if (!/^[a-f0-9]{40}$/i.test(revision)) {
  try {revision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, stdio: ['ignore','pipe','ignore']}).toString().trim();}
  catch {revision = 'unknown';}
}
const release = {revision, sourceFingerprint: hash.digest('hex'), apiRegistry: true};
fs.writeFileSync(path.join(root, 'public/release.json'), JSON.stringify(release, null, 2) + '\n');
console.log('Public release identity generated.');
