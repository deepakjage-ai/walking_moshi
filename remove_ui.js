const fs = require('fs');

// 1. Clean up index.html
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<div style="display: flex; align-items: center; gap: 10px;">\s*<input type="checkbox" id="toggle-skeleton"[\s\S]*?<\/div>/g, '');
html = html.replace(/<div style="display: flex; align-items: center; gap: 10px;">\s*<input type="checkbox" id="toggle-rotate-images"[\s\S]*?<\/div>/g, '');
html = html.replace(/<div style="display: flex; align-items: center; gap: 10px;">\s*<input type="checkbox" id="toggle-show-images"[\s\S]*?<\/div>/g, '');
// Remove multiple blank lines
html = html.replace(/\n\s*\n\s*\n/g, '\n\n');
fs.writeFileSync('index.html', html);

// 2. Clean up dog.js
let js = fs.readFileSync('dog.js', 'utf8');
js = js.replace(/speedSlider = createSlider\(-4, 4, 1, 0\.1\);\s*speedSlider\.position\(20, 20\);/g, '');
js = js.replace(/\/\/ Custom happiness slider \(controls tail wagging\)\s*happinessSlider = createSlider\(0, 10, 3, 1\);\s*happinessSlider\.position\(20, 50\);/g, '');

js = js.replace(/text\(\`Speed: \$\{speedSlider\.value\(\)\.toFixed\(1\)\}x\`, 180, 30\);/g, '');
js = js.replace(/text\(\`Happiness \(Tail Wag\): \$\{happinessSlider\.value\(\)\}\`, 180, 60\);/g, '');

// The fallback logic handles null inputs automatically, so we don't need to rewrite the drawing logic.
// e.g. let showSkeleton = true; let toggleSkeleton = document.getElementById('toggle-skeleton'); if (toggleSkeleton) showSkeleton = toggleSkeleton.checked; -> defaults to true.

fs.writeFileSync('dog.js', js);
console.log('UI elements removed successfully');
