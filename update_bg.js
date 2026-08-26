const fs = require('fs');

let content = fs.readFileSync('dog.js', 'utf8');

// 1. Add variable declarations
if (!content.includes('let bgTreeImg;')) {
  let decl = `let bgTreeImg, bgRainbowImg, bgSpaceshipImg, bgMushroomImg;\n`;
  content = content.replace('function preload() {', decl + 'function preload() {');
}

// 2. Add loading to preload()
if (!content.includes('bgTreeImg = loadImage')) {
  let loads = `
  bgTreeImg = loadImage('images_rep/background/tree.png');
  bgRainbowImg = loadImage('images_rep/background/rainbow.png');
  bgSpaceshipImg = loadImage('images_rep/background/spaceship.png');
  bgMushroomImg = loadImage('images_rep/background/mushroom.png');
`;
  content = content.replace('function preload() {', 'function preload() {' + loads);
}

// 3. Add drawing after translate(width / 2, height / 2);
if (!content.includes('image(bgTreeImg')) {
  let drawCode = `
  push();
  imageMode(CENTER);
  if (bgTreeImg) {
    image(bgTreeImg, -380, 10, 100, 100);
    image(bgTreeImg, 350, 10, 100, 100);
  }
  if (bgRainbowImg) {
    image(bgRainbowImg, -500, 30, 120, 120);
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
  pop();
`;
  content = content.replace('translate(width / 2, height / 2);', 'translate(width / 2, height / 2);' + drawCode);
}

fs.writeFileSync('dog.js', content);
console.log('done');
