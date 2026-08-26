const fs = require('fs');
let code = fs.readFileSync('dog.js', 'utf8');

// Update UFO timings
code = code.replace(/now - ufo.stateStartTime > 2000/g, (match, offset, string) => {
  // Let's manually replace the 3 instances
  return match; 
});
// The first one is hidden (5000)
code = code.replace(/if \(ufo.state === 'hidden'\) \{\n\s*if \(now - ufo\.stateStartTime > 2000\)/, `if (ufo.state === 'hidden') {\n      if (now - ufo.stateStartTime > 5000)`);
// Second is hovering (1000)
code = code.replace(/if \(ufo.state === 'hovering'\) \{\n\s*if \(now - ufo\.stateStartTime > 2000\)/, `if (ufo.state === 'hovering') {\n      if (now - ufo.stateStartTime > 1000)`);

// Entering and leaving timing
code = code.replace(/let t = \(now - ufo.stateStartTime\) \/ 2000.0;/g, `let t = (now - ufo.stateStartTime) / 500.0;`);

// Background wiggling
const oldWrapped = `  function drawWrapped(img, baseX, y, w, h) {
    if (!img) return;
    let screenX = ((baseX - bgScrollX) % loopWidth + loopWidth) % loopWidth;
    if (screenX > loopWidth / 2) screenX -= loopWidth;
    image(img, screenX, y, w, h);
  }`;
const newWrapped = `  function drawWrapped(img, baseX, y, w, h) {
    if (!img) return;
    let screenX = ((baseX - bgScrollX) % loopWidth + loopWidth) % loopWidth;
    if (screenX > loopWidth / 2) screenX -= loopWidth;
    
    let jX = 0, jY = 0;
    if (ufo.state === 'hovering') {
      jX = random(-5, 5);
      jY = random(-5, 5);
    }
    image(img, screenX + jX, y + jY, w, h);
  }`;
code = code.replace(oldWrapped, newWrapped);

// Letter wiggling
const oldLetterMid = `          let midX = (xA + xB) / 2;
          let midY = (yA + yB) / 2;`;
const newLetterMid = `          let midX = (xA + xB) / 2;
          let midY = (yA + yB) / 2;
          if (ufo.state === 'hovering') {
            midX += random(-5, 5);
            midY += random(-5, 5);
          }`;
code = code.replace(oldLetterMid, newLetterMid);

fs.writeFileSync('dog.js', code);
console.log('done wiggle logic');
