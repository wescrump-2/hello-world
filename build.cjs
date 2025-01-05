const fs = require('fs');
const path = require('path');

const packageJson = require('./package.json');
const manifestPath = path.join(__dirname, 'public', 'manifest.json');

let manifest = {};
if (fs.existsSync(manifestPath)) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}
const start = new Date('1/1/2025')
const ver = Math.trunc((Date.now()-start)/10000)
manifest.version = `${packageJson.version}.${ver}`;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('Manifest updated with new build number:', manifest.version);