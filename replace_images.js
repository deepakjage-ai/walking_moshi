const fs = require('fs');
let code = fs.readFileSync('dog.js', 'utf8');

// 1. Array declaration
code = code.replace(
    'let angryImages = [];\nlet happyImages = [];\nlet sadImages = [];',
    'let smallImages = [];'
);

// 2. Modes
code = code.replace(
    "let currentImagesMode = 'logo'; // 'logo', 'angry', 'happy', 'sad'",
    "let currentImagesMode = 'logo'; // 'logo', 'small'"
);

// 3. Preload loading
const oldPreload = `  let angryFiles = [
    "angry-0.png", "angry-1.gif", "angry-2.png", "angry-3.png", "angry-4.png",
    "angry-5.png", "angry-6.png", "angry-7.png", "angry-9.png",
    "angry-10.png"
  ];
  angryFiles.forEach(f => angryImages.push(loadImage('images_rep/angry/' + f)));

  let happyFiles = [
    "happy-0.png", "happy-1.png", "happy-2.png", "happy-3.png", "happy-4.png",
    "happy-5.png", "happy-6.png", "happy-7.png", "happy-8.png", "happy-9.png", "happy-10.gif"
  ];
  happyFiles.forEach(f => happyImages.push(loadImage('images_rep/Happy/' + f)));

  let sadFiles = [
    "sad-0.png", "sad-1.png", "sad-2.png", "sad-3.png", "sad-4.png",
    "sad-5.png", "sad-6.png", "sad-7.png", "sad-8.png", "sad-9.png",
    "sad-10.png", "sad-11.png"
  ];
  sadFiles.forEach(f => sadImages.push(loadImage('images_rep/sad/' + f)));`;

const newPreload = `  let smallFiles = [
    "1-02.png", "1-03.png", "1-04.png", "Website-02.png", "Website-03.png", 
    "Website-04.png", "Website-06.png", "Website-07.png", "Website-12.png", 
    "Website-13.png", "Website-14.png", "Website-15.png", "Website-16.png", "hands.png"
  ];
  smallFiles.forEach(f => smallImages.push(loadImage('images_rep/Small/' + f)));`;

code = code.replace(oldPreload, newPreload);

// 4. Buttons in setup
const oldButtons = `  let btnAngry = createButton('Angry');
  btnAngry.position(70, 110);
  btnAngry.mousePressed(() => { if (window.setImagesMode) window.setImagesMode('angry'); });

  let btnHappy = createButton('Happy');
  btnHappy.position(130, 110);
  btnHappy.mousePressed(() => { if (window.setImagesMode) window.setImagesMode('happy'); });

  let btnSad = createButton('Sad');
  btnSad.position(190, 110);
  btnSad.mousePressed(() => { if (window.setImagesMode) window.setImagesMode('sad'); });`;

const newButtons = `  let btnSmall = createButton('Images');
  btnSmall.position(70, 110);
  btnSmall.mousePressed(() => { if (window.setImagesMode) window.setImagesMode('small'); });`;

code = code.replace(oldButtons, newButtons);

// 5. Draw loop source array logic
const oldDrawLogic = `  if (currentImagesMode !== 'logo') {
    let sourceArray = [];
    if (currentImagesMode === 'angry') sourceArray = angryImages;
    else if (currentImagesMode === 'happy') sourceArray = happyImages;
    else if (currentImagesMode === 'sad') sourceArray = sadImages;`;

const newDrawLogic = `  if (currentImagesMode !== 'logo') {
    let sourceArray = [];
    if (currentImagesMode === 'small') sourceArray = smallImages;`;

code = code.replace(oldDrawLogic, newDrawLogic);

fs.writeFileSync('dog.js', code);
console.log('Replaced images');
