const fs = require('fs');

let content = fs.readFileSync('dog.js', 'utf8');

// Add global vars
if (!content.includes('let ufo = {')) {
  let ufoVars = `let ufo = {
  state: 'hidden',
  stateStartTime: 0,
  x: -1000, y: -1000,
  startX: 0, startY: 0,
  endX: 0, endY: 0,
  ctrlX: 0, ctrlY: 0
};
function evalQuadBezier(p0, p1, p2, t) {
  return Math.pow(1 - t, 2) * p0 + 2 * (1 - t) * t * p1 + Math.pow(t, 2) * p2;
}
`;
  content = content.replace('let bgScrollX = 0;', ufoVars + '\nlet bgScrollX = 0;');
}

const oldUFO = `  // Spaceship has constant position, does not scroll with background
  if (bgSpaceshipImg) {
    let sw = 90;
    let sh = sw * (bgSpaceshipImg.height / bgSpaceshipImg.width);
    image(bgSpaceshipImg, 450, -180, sw, sh);
  }`;

const newUFO = `  // Animated Spaceship logic
  if (bgSpaceshipImg) {
    let now = millis();
    if (ufo.state === 'hidden') {
      if (now - ufo.stateStartTime > 2000) {
        // Prepare to enter
        ufo.endX = random(-width/2 + 100, width/2 - 100);
        ufo.endY = random(-height/2 + 50, -height/2 + height * 0.3); // Top 30%
        
        let fromRight = random(1) > 0.5;
        ufo.startX = fromRight ? width/2 + 200 : -width/2 - 200;
        ufo.startY = random(-height/2, -height/2 + height * 0.3);
        
        // Control point for a curve
        ufo.ctrlX = (ufo.startX + ufo.endX) / 2;
        ufo.ctrlY = Math.min(ufo.startY, ufo.endY) - 300; 
        
        ufo.state = 'entering';
        ufo.stateStartTime = now;
      }
    } else if (ufo.state === 'entering') {
      let t = (now - ufo.stateStartTime) / 2000.0;
      if (t >= 1.0) {
        ufo.state = 'hovering';
        ufo.stateStartTime = now;
        ufo.x = ufo.endX;
        ufo.y = ufo.endY;
      } else {
        ufo.x = evalQuadBezier(ufo.startX, ufo.ctrlX, ufo.endX, t);
        ufo.y = evalQuadBezier(ufo.startY, ufo.ctrlY, ufo.endY, t);
      }
    } else if (ufo.state === 'hovering') {
      if (now - ufo.stateStartTime > 2000) {
        ufo.startX = ufo.x;
        ufo.startY = ufo.y;
        
        let toRight = random(1) > 0.5;
        ufo.endX = toRight ? width/2 + 200 : -width/2 - 200;
        ufo.endY = random(-height/2, -height/2 + height * 0.3);
        
        ufo.ctrlX = (ufo.startX + ufo.endX) / 2;
        ufo.ctrlY = Math.min(ufo.startY, ufo.endY) - 300;
        
        ufo.state = 'leaving';
        ufo.stateStartTime = now;
      } else {
        // Slight bobbing
        ufo.x = ufo.endX;
        ufo.y = ufo.endY + Math.sin(now / 200) * 5;
      }
    } else if (ufo.state === 'leaving') {
      let t = (now - ufo.stateStartTime) / 2000.0;
      if (t >= 1.0) {
        ufo.state = 'hidden';
        ufo.stateStartTime = now;
      } else {
        ufo.x = evalQuadBezier(ufo.startX, ufo.ctrlX, ufo.endX, t);
        ufo.y = evalQuadBezier(ufo.startY, ufo.ctrlY, ufo.endY, t);
      }
    }

    if (ufo.state !== 'hidden') {
      let sw = 60; // Make it a little smaller (was 90)
      let sh = sw * (bgSpaceshipImg.height / bgSpaceshipImg.width);
      image(bgSpaceshipImg, ufo.x, ufo.y, sw, sh);
    }
  }`;

content = content.replace(oldUFO, newUFO);
fs.writeFileSync('dog.js', content);
console.log('ufo logic updated');
