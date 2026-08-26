const fs = require('fs');
const path = require('path');

const dir = 'logo/svg';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/fill:\s*#231f20;/g, 'fill: #F9DAF5; stroke: black; stroke-width: 0.5px; vector-effect: non-scaling-stroke;');
  fs.writeFileSync(p, content);
  console.log('Updated ' + f);
});
