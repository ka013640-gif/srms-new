const fs = require('fs');
const f = fs.readFileSync('client/src/pages/Documents.jsx', 'utf8');
const lines = f.split('\n');

for (let i = 140; i < 276; i++) {
  let depth = 0;
  for (const c of lines[i]) {
    if (c === '(' || c === '{') depth++;
    else if (c === ')' || c === '}') depth--;
  }
  console.log((i+1).toString().padStart(3), depth.toString().padStart(3), lines[i].trimStart().slice(0,80));
}
