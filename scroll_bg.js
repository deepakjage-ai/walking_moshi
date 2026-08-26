const fs = require('fs');

let content = fs.readFileSync('dog.js', 'utf8');

if (!content.includes('let bgScrollX = 0;')) {
  content = content.replace('let targetBowlY = 100;', 'let targetBowlY = 100;\nlet bgScrollX = 0;');
}

const originalDrawing = `  push();
  imageMode(CENTER);
  if (bgTreeImg) {
    image(bgTreeImg, -450, 10, 130, 130);
    image(bgTreeImg, 420, 10, 130, 130);
  }
  if (bgRainbowImg) {
    image(bgRainbowImg, -650, 30, 80, 80);
  }
  if (bgSpaceshipImg) {
    let sw = 90;
    let sh = sw * (bgSpaceshipImg.height / bgSpaceshipImg.width);
    image(bgSpaceshipImg, 450, -180, sw, sh);
  }
  if (bgMushroomImg) {
    let mw = 50;
    let mh = mw * (bgMushroomImg.height / bgMushroomImg.width);
    image(bgMushroomImg, 550, 40, mw, mh);
  }
  pop();`;

const newDrawing = `  // Update background scroll
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

content = content.replace(originalDrawing, newDrawing);
fs.writeFileSync('dog.js', content);
console.log('updated background scroll logic');
