const fs = require('fs');
const f = fs.readFileSync('client/src/pages/Documents.jsx', 'utf8');
const lines = f.split('\n');

for (let i = 354; i < 400; i++) {
  const raw = JSON.stringify(lines[i]);
  console.log((i + 1).toString().padStart(3), raw.slice(0, 140));
}
