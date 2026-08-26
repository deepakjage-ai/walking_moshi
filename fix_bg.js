const fs = require('fs');
let code = fs.readFileSync('dog.js', 'utf8');

// 1. Add global variables
if (!code.includes('let walkingSpeed')) {
  code = code.replace('let bgScrollX = 0;', 'let bgScrollX = 0;\nlet walkingSpeed = 4.0;\nlet runningSpeed = 8.0;\nlet currentMotionType = "walk";');
}

// 2. Update onMotionTypeChange
if (!code.includes('currentMotionType = type;')) {
  code = code.replace('window.onMotionTypeChange = function (type) {', 'window.onMotionTypeChange = function (type) {\n  currentMotionType = type;');
}

// 3. Update drawing logic
const oldDraw = `  // Update background scroll
  if (bmw.locomotionGait === 'walk' || bmw.locomotionGait === 'run') {
    bgScrollX += bmw.speed * 2.0;
  }
  
  let loopWidth = Math.max(2400, width + 400);

  function drawWrapped(img, baseX, y, w, h) {
    if (!img) return;
    let screenX = ((baseX - bgScrollX) % loopWidth + loopWidth) % loopWidth;
    if (screenX > loopWidth / 2) screenX -= loopWidth;
    image(img, screenX, y, w, h);
  }

  push();
  imageMode(CENTER);
  if (bgTreeImg) {
    drawWrapped(bgTreeImg, -450, 10, 130, 130);
    drawWrapped(bgTreeImg, 420, 10, 130, 130);
  }
  if (bgRainbowImg) {
    drawWrapped(bgRainbowImg, -650, 30, 80, 80);
  }
  if (bgSpaceshipImg) {
    let sw = 90;
    let sh = sw * (bgSpaceshipImg.height / bgSpaceshipImg.width);
    drawWrapped(bgSpaceshipImg, 450, -180, sw, sh);
  }
  if (bgMushroomImg) {
    let mw = 50;
    let mh = mw * (bgMushroomImg.height / bgMushroomImg.width);
    drawWrapped(bgMushroomImg, 550, 40, mw, mh);
  }
  pop();`;

const newDraw = `  // Update background scroll
  if (currentMotionType === 'walk') {
    bgScrollX += walkingSpeed;
  } else if (currentMotionType === 'run') {
    bgScrollX += runningSpeed;
  }
  
  let loopWidth = Math.max(2400, width + 400);

  function drawWrapped(img, baseX, y, w, h) {
    if (!img) return;
    let screenX = ((baseX - bgScrollX) % loopWidth + loopWidth) % loopWidth;
    if (screenX > loopWidth / 2) screenX -= loopWidth;
    image(img, screenX, y, w, h);
  }

  push();
  imageMode(CENTER);
  if (bgTreeImg) {
    drawWrapped(bgTreeImg, -450, 10, 130, 130);
    drawWrapped(bgTreeImg, 420, 10, 130, 130);
  }
  if (bgRainbowImg) {
    drawWrapped(bgRainbowImg, -850, 30, 80, 80);
  }
  if (bgMushroomImg) {
    let mw = 50;
    let mh = mw * (bgMushroomImg.height / bgMushroomImg.width);
    drawWrapped(bgMushroomImg, 750, 40, mw, mh);
  }
  // Spaceship has constant position, does not scroll with background
  if (bgSpaceshipImg) {
    let sw = 90;
    let sh = sw * (bgSpaceshipImg.height / bgSpaceshipImg.width);
    image(bgSpaceshipImg, 450, -180, sw, sh);
  }
  pop();`;

code = code.replace(oldDraw, newDraw);

fs.writeFileSync('dog.js', code);
console.log('done');
