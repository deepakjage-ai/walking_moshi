const fs = require('fs');
let code = fs.readFileSync('dog.js', 'utf8');

const oldUFOLogicRegex = /\/\/ Animated Spaceship logic[\s\S]*?(?=\s*\/\/ Draw bones as lines)/;

const newUFOLogic = `// Animated Spaceship logic
  if (bgSpaceshipImg) {
    let now = millis();
    if (ufo.state === 'hidden') {
      if (now - ufo.stateStartTime > 5000) {
        // Prepare to enter
        ufo.endX = random(-width/2 + 100, width/2 - 100);
        ufo.endY = random(-height/2 + 50, -height/2 + height * 0.3); // Top 30%
        
        let fromRight = random(1) > 0.5;
        ufo.startX = fromRight ? width/2 + 200 : -width/2 - 200;
        ufo.startY = random(-height/2, -height/2 + height * 0.3);
        
        // Control point for a curve
        ufo.ctrlX = (ufo.startX + ufo.endX) / 2;
        ufo.ctrlY = Math.min(ufo.startY, ufo.endY) - 400; 
        
        ufo.state = 'entering';
        ufo.stateStartTime = now;
      }
    } else if (ufo.state === 'entering') {
      let t = (now - ufo.stateStartTime) / 1500.0;
      if (t >= 1.0) {
        ufo.state = 'hover_pre';
        ufo.stateStartTime = now;
        ufo.x = ufo.endX;
        ufo.y = ufo.endY;
      } else {
        ufo.x = evalQuadBezier(ufo.startX, ufo.ctrlX, ufo.endX, t);
        ufo.y = evalQuadBezier(ufo.startY, ufo.ctrlY, ufo.endY, t);
      }
    } else if (ufo.state === 'hover_pre') {
      if (now - ufo.stateStartTime > 500) {
        ufo.state = 'vibrating';
        ufo.stateStartTime = now;
      } else {
        ufo.x = ufo.endX;
        ufo.y = ufo.endY + Math.sin(now / 200) * 5;
      }
    } else if (ufo.state === 'vibrating') {
      if (now - ufo.stateStartTime > 1500) {
        ufo.state = 'hover_post';
        ufo.stateStartTime = now;
      } else {
        ufo.x = ufo.endX;
        ufo.y = ufo.endY + Math.sin(now / 200) * 5;
      }
    } else if (ufo.state === 'hover_post') {
      if (now - ufo.stateStartTime > 500) {
        ufo.startX = ufo.x;
        ufo.startY = ufo.y;
        
        let toRight = random(1) > 0.5;
        ufo.endX = toRight ? width/2 + 200 : -width/2 - 200;
        ufo.endY = random(-height/2, -height/2 + height * 0.3);
        
        ufo.ctrlX = (ufo.startX + ufo.endX) / 2;
        ufo.ctrlY = Math.min(ufo.startY, ufo.endY) - 400;
        
        ufo.state = 'leaving';
        ufo.stateStartTime = now;
      } else {
        ufo.x = ufo.endX;
        ufo.y = ufo.endY + Math.sin(now / 200) * 5;
      }
    } else if (ufo.state === 'leaving') {
      let t = (now - ufo.stateStartTime) / 1500.0;
      if (t >= 1.0) {
        ufo.state = 'hidden';
        ufo.stateStartTime = now;
      } else {
        ufo.x = evalQuadBezier(ufo.startX, ufo.ctrlX, ufo.endX, t);
        ufo.y = evalQuadBezier(ufo.startY, ufo.ctrlY, ufo.endY, t);
      }
    }

    if (ufo.state !== 'hidden') {
      let sw = 60; // Make it a little smaller
      let sh = sw * (bgSpaceshipImg.height / bgSpaceshipImg.width);
      image(bgSpaceshipImg, ufo.x, ufo.y, sw, sh);
    }
  }
  pop();
`;

code = code.replace(oldUFOLogicRegex, newUFOLogic + '\n\n');

// Also update the wiggling checks from 'hovering' to 'vibrating'
code = code.replace(/if \(ufo\.state === 'hovering'\)/g, "if (ufo.state === 'vibrating')");

fs.writeFileSync('dog.js', code);
console.log('done UFO timings');
