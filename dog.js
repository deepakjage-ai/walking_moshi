// Override getContext to set willReadFrequently attribute to true to silence Chrome warnings
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, attributes) {
  if (type === '2d') {
    attributes = attributes || {};
    attributes.willReadFrequently = true;
  }
  return originalGetContext.call(this, type, attributes);
};

let bmw;
let walkerHeight = 380;
let speedSlider;
let happinessSlider;
let randomizeButton;
let letters = ["M", "o", "s", "h", "i", "m", "b", "o"];

let logoImages = [];
let fixedLogoImages = {};
let smallImages = [];

let currentImagesMode = 'logo'; // 'logo', 'small'
let activeBone1 = -1;
let activeBone2 = -1;
let activeBone3 = -1;
let activeBone4 = -1;
let activeEmotionImg1 = null;
let activeEmotionImg2 = null;
let activeEmotionImg3 = null;
let activeEmotionImg4 = null;
let lastImageSwitchTime = 0;
let lastPositionSwitchTime = 0;

let peeParticles = [];
let releasePeeParticles = true;
let targetSliderSpeed = 1.0;
let currentSpeed = 1.0;
let targetSliderHappiness = 0.0;
let currentHappiness = 3;

let isEating = false;
let cameraOffsetX = 0;

// Configurable camera offsets for different modes to easily fine-tune framing
let cameraOffsetEat = -120;
let cameraOffsetSniff = -230;
let cameraOffsetPee = -30;
let cameraOffsetSit = -30;
let cameraOffsetBite = 0;

let bowlImg;
let bowlX = 2000; // start off-screen right
let targetBowlX = 2000;
let targetBowlY = 100;
let ufo = {
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

let bgScrollX = 0;
let walkingSpeed = 5.5;
let runningSpeed = 18.0;
let currentMotionType = "walk";

let bgTreeImg, bgRainbowImg, bgSpaceshipImg, bgMushroomImg;
function preload() {
  bgTreeImg = loadImage('images_rep/background/tree.png');
  bgRainbowImg = loadImage('images_rep/background/rainbow.png');
  bgSpaceshipImg = loadImage('images_rep/background/spaceship.png');
  bgMushroomImg = loadImage('images_rep/background/mushroom.png');

  fixedLogoImages[0] = loadImage('logo/svg/m.svg');
  fixedLogoImages[2] = loadImage('logo/svg/b.svg');
  fixedLogoImages[3] = loadImage('logo/svg/o.svg');

  logoImages.push(loadImage('logo/svg/m.svg'));
  logoImages.push(loadImage('logo/svg/o.svg'));
  logoImages.push(loadImage('logo/svg/s.svg'));
  logoImages.push(loadImage('logo/svg/h.svg'));
  logoImages.push(loadImage('logo/svg/i.svg'));
  logoImages.push(loadImage('logo/svg/m2.svg'));
  logoImages.push(loadImage('logo/svg/b.svg'));
  logoImages.push(loadImage('logo/svg/o2.svg'));

  let smallFiles = [
    "image0.png", "image1.png", "image2.png", "image3.png", "image4.png",
    "image5.png", "image6.png", "image7.png", "image8.png",
    "image9.png", "image10.png", "image11.png", "image12.png"
  ];
  smallFiles.forEach(f => smallImages.push(loadImage('images_rep/Small/' + f)));

  bowlImg = loadImage('bowlmain.png');
}

// 1. Custom Joint Index Names (since Dog type in the library doesn't have default names)
const dogJointNames = [
  "L-Paw-Front",   // 0
  "L-Elbow-Front", // 1
  "L-Shoulder",    // 2
  "Neck",          // 3
  "Chest",         // 4
  "L-Paw-Back",    // 5
  "L-Knee-Back",   // 6
  "L-Hip",         // 7
  "Pelvis",        // 8
  "Head",          // 9
  "Belly",         // 10
  "Tail",          // 11
  "R-Paw-Front",   // 12
  "R-Elbow-Front", // 13
  "R-Shoulder",    // 14
  "R-Paw-Back",    // 15
  "R-Knee-Back",   // 16
  "R-Hip",         // 17
  "Tail-Mid",      // 18
  "Tail-End"       // 19
];

// 2. Custom Bone Connections
const dogBones = [
  [9, 3],   // Head to Neck
  [3, 4],   // Neck to Chest
  [4, 10],  // Chest to Belly
  [10, 8],  // Belly to Pelvis
  [8, 11],  // Pelvis to Tail
  [11, 18], // Tail to Tail-Mid
  [18, 19], // Tail-Mid to Tail-End

  // Front Left Leg
  [4, 2],   // Chest to L-Shoulder
  [2, 1],   // L-Shoulder to L-Elbow
  [1, 0],   // L-Elbow to L-Paw

  // Front Right Leg
  [4, 14],  // Chest to R-Shoulder
  [14, 13], // R-Shoulder to R-Elbow
  [13, 12], // R-Elbow to R-Paw

  // Back Left Leg
  [8, 7],   // Pelvis to L-Hip
  [7, 6],   // L-Hip to L-Knee
  [6, 5],   // L-Knee to L-Paw

  // Back Right Leg
  [8, 17],  // Pelvis to R-Hip
  [17, 16], // R-Hip to R-Knee
  [16, 15]  // R-Knee to R-Paw
];

function setup() {

  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');

  // Adjust UI positions that might have relied on fixed width?
  // The user UI controls (buttons, sliders) are fixed at top-left, which is fine.

  // Type 1 is the Dog walk cycle (modified from the original cat walk cycle)
  bmw = new BMWalker(BMW_TYPE_DOG);





  // Randomize Button
  randomizeButton = createButton('Randomize Images');
  randomizeButton.position(20, 80);
  randomizeButton.mousePressed(shuffleImages);

  let btnLogo = createButton('Logo');
  btnLogo.position(20, 110);
  btnLogo.mousePressed(() => { if (window.setImagesMode) window.setImagesMode('logo'); });

  let btnSmall = createButton('Images');
  btnSmall.position(70, 110);
  btnSmall.mousePressed(() => { if (window.setImagesMode) window.setImagesMode('small'); });

  // Initialize the Sidebar Control Panel UI

}

function draw() {
  let loopWidth = Math.max(2400, width + 400);
  let stopModes = ['sniff', 'eat', 'sit', 'pee', 'bite'];
  let isStopping = stopModes.includes(currentMotionType);

  if (isStopping) {
    if (currentSpeed === 0) {
      // We are perfectly locked at a safe zone. DO NOTHING!
      // This completely prevents the background from ever moving while stopped.
    } else {
      let currentWrapped = bgScrollX % loopWidth;
      let baseLoops = bgScrollX - currentWrapped;
      
      // Define exact background scroll positions where no objects overlap the dog
      let safeSpots;
      if (currentMotionType === 'sniff') {
        safeSpots = [0, loopWidth]; // Sniff mode MUST align perfectly with the tree
      } else {
        // 120, 1150, 1850 perfectly center the dog in the empty gaps between the trees, rainbow, and mushroom
        safeSpots = [120, 1150, 1850, loopWidth + 120]; 
      }
      
      // Find the safe spot we are currently approaching. 
      // The -2.0 tolerance prevents the target from jumping to the next one when we are 1 pixel away!
      let targetWrapped = safeSpots.find(s => s >= currentWrapped - 2.0);
      if (targetWrapped === undefined) targetWrapped = loopWidth;
      
      let targetScroll = baseLoops + targetWrapped;
      // Clamp to 0 to completely prevent negative square roots (NaN bugs)
      let distance = Math.max(0, targetScroll - bgScrollX);
      
      let brakingDist = 60.0; // Distance required to gracefully brake to 0
      
      if (distance <= brakingDist) {
        // Smooth kinematic deceleration (v = sqrt(2ad)) to stop exactly on the target
        currentSpeed = Math.min(currentSpeed, Math.sqrt(distance / brakingDist));
        if (distance < 0.5) {
          currentSpeed = 0;
          bgScrollX = targetScroll; // Snap perfectly to the spot
        }
      } else {
        // Keep walking at full speed until we get close enough to brake
        currentSpeed = Math.min(1.0, currentSpeed + 0.05);
      }
      
      // Tie background speed perfectly to the dog's leg animation speed
      let bgSpeed = lerp(0, walkingSpeed, currentSpeed);
      if (currentSpeed > 0) {
          bgScrollX += bgSpeed;
      }
    }
  } else {
    // Normal walking / running / user-controlled speed
    let speedStep = 0.05;
    if (Math.abs(currentSpeed - targetSliderSpeed) < speedStep) {
      currentSpeed = targetSliderSpeed;
    } else {
      currentSpeed += Math.sign(targetSliderSpeed - currentSpeed) * speedStep;
    }
    
    let bgSpeed = 0;
    if (currentSpeed <= 1.0) {
      bgSpeed = lerp(0, walkingSpeed, currentSpeed);
    } else {
      bgSpeed = lerp(walkingSpeed, runningSpeed, currentSpeed - 1.0);
    }
    bgScrollX += bgSpeed;
  }

  if (bmw.speed !== currentSpeed) {
    bmw.setSpeed(currentSpeed);
  }

  background(0);

  // Draw UI Labels
  fill(0);
  noStroke();
  textSize(16);
  textAlign(LEFT, CENTER);



  // Mobile layout state
  let isMobile = windowWidth <= 768;
  window.isMobileMode = isMobile;

  // Dynamically hide/disable the bite option on mobile (since mouse tracking is tricky on touch)
  let biteOption = document.querySelector('option[value="bite"]');
  if (biteOption) {
    biteOption.hidden = isMobile;
    biteOption.disabled = isMobile;
    if (isMobile && currentMotionType === 'bite') {
      onMotionTypeChange('walk');
      let selectEl = document.getElementById('motion-type-select');
      if (selectEl) selectEl.value = 'walk';
    }
  }

  // Move origin to center so walker is visible
  translate(width / 2, height / 2);
  if (isMobile) {
    scale(0.55); // Global dog & particle reduction
  }

  // Smoothly pan camera to configured offsets based on active mode (Mobile Only)
  let targetCameraOffsetX = 0;
  if (isMobile) {
    if (isEating) {
      targetCameraOffsetX = cameraOffsetEat;
    } else if (currentMotionType === 'sniff') {
      targetCameraOffsetX = cameraOffsetSniff;
    } else if (currentMotionType === 'pee') {
      targetCameraOffsetX = cameraOffsetPee;
    } else if (currentMotionType === 'sit') {
      targetCameraOffsetX = cameraOffsetSit;
    } else if (currentMotionType === 'bite') {
      targetCameraOffsetX = cameraOffsetBite;
    }
  }

  cameraOffsetX = lerp(cameraOffsetX, targetCameraOffsetX, 0.1);

  translate(cameraOffsetX, 0);
  // Background scroll is now updated concurrently with currentSpeed kinematics at the top of draw()
  // to ensure perfect synchronization between the dog's legs and the ground.
  
  // (We redefine loopWidth here for the drawWrapped function below)
  let loopWidthWrap = Math.max(2400, width + 400);

  function drawWrapped(img, baseX, y, w, h) {
    if (!img) return;
    let screenX = ((baseX - bgScrollX) % loopWidthWrap + loopWidthWrap) % loopWidthWrap;
    if (screenX > loopWidthWrap / 2) screenX -= loopWidthWrap;

    image(img, screenX, y, w, h);
  }

  push();
  imageMode(CENTER);
  if (bgTreeImg) {
    // Left tree in the background
    let treeL = isMobile ? -250 : -450;
    // Right tree positioned safely to the right of the dog for sniffing
    let treeR = 420;
    drawWrapped(bgTreeImg, treeL, 10, 130, 130);
    drawWrapped(bgTreeImg, treeR, 10, 130, 130);
  }
  if (bgRainbowImg) {
    drawWrapped(bgRainbowImg, -850, 30, 80, 80);
  }
  if (bgMushroomImg) {
    let mw = 50;
    let mh = mw * (bgMushroomImg.height / bgMushroomImg.width);
    drawWrapped(bgMushroomImg, 750, 40, mw, mh);
  }
  // Animated Spaceship logic
  if (bgSpaceshipImg) {
    let now = millis();
    if (ufo.state === 'hidden') {
      if (now - ufo.stateStartTime > 5000) {
        // Prepare to enter
        let scaleF = isMobile ? 0.55 : 1.0;
        let vWidth = width / scaleF;
        let vHeight = height / scaleF;
        let uBoundX = vWidth / 2 - (isMobile ? 20 : 100);
        ufo.endX = random(-uBoundX, uBoundX);
        ufo.endY = random(-vHeight / 2 + 50, -vHeight / 2 + vHeight * 0.3); // Top 30%

        let fromRight = random(1) > 0.5;
        let maxPan = isMobile ? 300 : 0; // Buffer for extreme camera panning
        ufo.startX = fromRight ? vWidth / 2 + 200 + maxPan : -vWidth / 2 - 200 - maxPan;
        ufo.startY = random(-vHeight / 2, -vHeight / 2 + vHeight * 0.3);

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

        let scaleF = isMobile ? 0.7 : 1.0;
        let vWidth = width / scaleF;
        let vHeight = height / scaleF;

        let toRight = random(1) > 0.5;
        let maxPan = isMobile ? 300 : 0;
        ufo.endX = toRight ? vWidth / 2 + 200 + maxPan : -vWidth / 2 - 200 - maxPan;
        ufo.endY = random(-vHeight / 2, -vHeight / 2 + vHeight * 0.3);

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

  // Set side profile angle (azimuth = PI / 2) so the dog walks sideways
  bmw.setCameraParam(PI / 2, 0, 0, 0);

  // Get the markers for the current frame
  let markers = bmw.getMarkers(walkerHeight, undefined, mouseX, mouseY);

  // Handle eating animation AND draw bowl (so it renders behind the dog)
  if (isEating) {
    let pawX = markers[0] ? markers[0].x : 100;
    let floorY = markers[0] ? markers[0].y : 100; // Paw Y is floor
    targetBowlX = pawX + 117; // exactly below head point
    targetBowlY = floorY - 10;     // lowered so bowl bottom perfectly aligns with paws

    bowlX = lerp(bowlX, targetBowlX, 0.1);
  } else {
    let offScreenX = (width / 2) / (isMobile ? 0.55 : 1.0) - cameraOffsetX + 100;
    targetBowlX = offScreenX;
    if (bowlX < targetBowlX - 5) {
      bowlX = lerp(bowlX, targetBowlX, 0.1);
    } else {
      bowlX = targetBowlX;
    }
  }

  let clipX = (width / 2) / (isMobile ? 0.55 : 1.0) - cameraOffsetX + 90;
  if (bowlX < clipX && bowlImg) {
    push();
    imageMode(CENTER);
    let aspect = bowlImg.width / bowlImg.height;
    let bWidth = 80;
    let bHeight = bWidth / aspect;
    image(bowlImg, bowlX, targetBowlY, bWidth, bHeight);
    pop();
  }

  // Update and draw pee particles
  updateAndDrawPeeParticles(markers);

  // Update happiness parameter of the walker dynamically
  let step = 0.125;
  if (Math.abs(currentHappiness - targetSliderHappiness) < step) {
    currentHappiness = targetSliderHappiness;
  } else {
    currentHappiness += Math.sign(targetSliderHappiness - currentHappiness) * step;
  }

  if (bmw.happiness !== currentHappiness) {
    bmw.setWalkerParam(undefined, undefined, undefined, currentHappiness);
  }

  // Check if skeleton toggle is checked
  let showSkeleton = false;
  let toggleSkeleton = document.getElementById('toggle-skeleton');
  if (toggleSkeleton) {
    showSkeleton = toggleSkeleton.checked;
  }

  // Check if image rotation toggle is checked
  let rotateImages = true;
  let toggleRotate = document.getElementById('toggle-rotate-images');
  if (toggleRotate) {
    rotateImages = toggleRotate.checked;
  }

  // Draw bones as lines
  if (showSkeleton) {
    stroke(100);
    strokeWeight(3);
    dogBones.forEach((bone) => {
      let jointA = markers[bone[0]];
      let jointB = markers[bone[1]];
      if (jointA && jointB) {
        line(jointA.x, jointA.y, jointB.x, jointB.y);
      }
    });
  }

  // Check if show images toggle is checked
  let showImages = true;
  let toggleShowImages = document.getElementById('toggle-show-images');
  if (toggleShowImages) {
    showImages = toggleShowImages.checked;
  }

  // Handle special image modes: images change every 3s, positions change every 1s
  if (currentImagesMode !== 'logo') {
    let sourceArray = [];
    if (currentImagesMode === 'small') sourceArray = smallImages;

    if (sourceArray.length > 0) {
      let currentTime = millis();
      // Change images every 3 seconds
      if (currentTime - lastImageSwitchTime >= 3000) {
        lastImageSwitchTime = currentTime;
        let pickedIndices = [];
        if (sourceArray.length >= 4) {
          while (pickedIndices.length < 4) {
            let r = Math.floor(random(sourceArray.length));
            if (!pickedIndices.includes(r)) pickedIndices.push(r);
          }
        } else {
          while (pickedIndices.length < 4) {
            pickedIndices.push(Math.floor(random(sourceArray.length)));
          }
        }
        activeEmotionImg1 = sourceArray[pickedIndices[0]];
        activeEmotionImg2 = sourceArray[pickedIndices[1]];
        activeEmotionImg3 = sourceArray[pickedIndices[2]];
        activeEmotionImg4 = sourceArray[pickedIndices[3]];
      }

      // Change positions every 1 second
      if (currentTime - lastPositionSwitchTime >= 1000) {
        lastPositionSwitchTime = currentTime;
        let numBones = dogBones.length;

        // Pick 4 unique random bones
        let picked = [];
        if (numBones >= 4) {
          while (picked.length < 4) {
            let r = Math.floor(random(numBones));
            if (!picked.includes(r)) picked.push(r);
          }
        } else {
          while (picked.length < 4) {
            picked.push(Math.floor(random(numBones)));
          }
        }
        activeBone1 = picked[0];
        activeBone2 = picked[1];
        activeBone3 = picked[2];
        activeBone4 = picked[3];
      }
    }
  }

  // Draw bones as logo images (upright, no rotation)
  if (showImages) {
    imageMode(CENTER);
    dogBones.forEach((bone, idx) => {
      let jointA = markers[bone[0]];
      let jointB = markers[bone[1]];
      if (jointA && jointB) {
        let img = logoImages.length > 0 ? logoImages[idx % logoImages.length] : null;
        if (fixedLogoImages[idx]) {
          img = fixedLogoImages[idx];
        }
        if (currentImagesMode !== 'logo') {
          if (idx === activeBone1 && activeEmotionImg1) img = activeEmotionImg1;
          else if (idx === activeBone2 && activeEmotionImg2) img = activeEmotionImg2;
          else if (idx === activeBone3 && activeEmotionImg3) img = activeEmotionImg3;
          else if (idx === activeBone4 && activeEmotionImg4) img = activeEmotionImg4;
        }
        if (img) {
          let xA = jointA.x;
          let yA = jointA.y;
          let xB = jointB.x;
          let yB = jointB.y;

          let midX = (xA + xB) / 2;
          let midY = (yA + yB) / 2;
          let d = dist(xA, yA, xB, yB);

          // Get the heading (direction) of the line going between two marker points
          let heading = atan2(yB - yA, xB - xA);

          let isHorizontal = img.width >= img.height;
          let rotationAngle = rotateImages ? (isHorizontal ? heading : (heading - PI / 2)) : 0;

          let isEmotionImg = (currentImagesMode !== 'logo' && (idx === activeBone1 || idx === activeBone2 || idx === activeBone3 || idx === activeBone4));

          let imgW, imgH;
          let aspect = img.width / img.height;
          if (isEmotionImg) {
            if (isHorizontal) {
              imgW = d;
              imgH = d / aspect;
            } else {
              imgH = d;
              imgW = d * aspect;
            }
          } else {
            if (isHorizontal) {
              imgW = d;
              imgH = d / 1.5;
            } else {
              imgH = d;
              imgW = d / 1.5;
            }
          }

          push();
          translate(midX, midY);
          if (rotationAngle !== 0) {
            rotate(rotationAngle);
          }
          image(img, 0, 0, imgW, imgH);
          pop();
        }
      }
    });
  }

  // Draw each marker (joints)
  if (showSkeleton) {
    markers.forEach((m, index) => {
      // Highlight Left side in Red, Right side in Blue, spine in Black
      let col = color(0);
      if (index < 3 || (index >= 5 && index <= 7)) {
        col = color(200, 0, 0); // Red for Left limbs
      } else if ((index >= 12 && index <= 14) || index >= 15) {
        col = color(0, 0, 200); // Blue for Right limbs
      }

      // Draw joint point
      fill(col);
      noStroke();
      circle(m.x, m.y, 8);

      // Draw description text to the left
      let jointName = dogJointNames[index];
      fill(0);
      textSize(10);
      textAlign(RIGHT, CENTER);
      text(jointName, m.x - 10, m.y);
    });
  }
}

function shuffleImages() {
  // Shuffle letters
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(random(i + 1));
    let temp = letters[i];
    letters[i] = letters[j];
    letters[j] = temp;
  }
  // Shuffle logo images
  for (let i = logoImages.length - 1; i > 0; i--) {
    const j = Math.floor(random(i + 1));
    let temp = logoImages[i];
    logoImages[i] = logoImages[j];
    logoImages[j] = temp;
  }
}

// --- Control Panel Integration Helper Functions ---

window.setImagesMode = function (mode) {
  currentImagesMode = mode;
  lastImageSwitchTime = 0; // force immediate update next frame
  lastPositionSwitchTime = 0;
};

window.onSliderChange = function (index, axis, value) {
  let val = parseFloat(value);
  if (axis === 'x') {
    bmw.setJointOffset(index, val, undefined, undefined);
    let el = document.getElementById(`offset-x-${index}`);
    if (el) el.innerText = (val >= 0 ? "+" : "") + val;
  } else if (axis === 'z') {
    bmw.setJointOffset(index, undefined, undefined, val);
    let el = document.getElementById(`offset-z-${index}`);
    if (el) el.innerText = (val >= 0 ? "+" : "") + val;
  }
};

window.onAmplitudeChange = function (index, value) {
  let val = parseFloat(value);
  bmw.setJointAmplitude(index, val);
  let el = document.getElementById(`offset-a-${index}`);
  if (el) el.innerText = val.toFixed(2) + "×";
};

window.onMotionTypeChange = function (type) {
  currentMotionType = type;
  if (bmw && bmw.setMotionType) {
    if (type === 'eat') {
      bmw.setMotionType('eat');
      isEating = true;
    } else {
      bmw.setMotionType(type);
      isEating = false;
      targetBowlX = 900;
    }
  }

  if (type === 'walk') {
    targetSliderSpeed = 1.0;
    targetSliderHappiness = 5.0;
  } else if (type === 'run') {
    targetSliderSpeed = 2.0;
  } else if (type === 'eat') {
    targetSliderSpeed = 0.0;
  } else if (type === 'sniff') {
    targetSliderSpeed = 0.0;
    targetSliderHappiness = 1.0;
  } else if (type === 'sit' || type === 'pee' || type === 'bite') {
    targetSliderSpeed = 0.0;
  }

  let stopPeeBtn = document.getElementById('stop-pee-btn');
  let stopEatBtn = document.getElementById('stop-eat-btn');

  if (type === 'pee') {
    releasePeeParticles = true;
    if (stopPeeBtn) stopPeeBtn.style.display = 'inline-block';
  } else {
    if (stopPeeBtn) stopPeeBtn.style.display = 'none';
  }

  if (type === 'eat') {
    if (stopEatBtn) stopEatBtn.style.display = 'inline-block';
  } else {
    if (stopEatBtn) stopEatBtn.style.display = 'none';
  }
};

window.stopEating = function () {
  isEating = false;
  targetBowlX = 900;
  let stopEatBtn = document.getElementById('stop-eat-btn');
  if (stopEatBtn) stopEatBtn.style.display = 'none';

  let select = document.getElementById('motion-type-select');
  if (select) select.value = 'walk';
  if (bmw) bmw.setMotionType('walk');

  window.resetAllOffsets();
};

window.stopPeeing = function () {
  releasePeeParticles = false;
  let stopBtn = document.getElementById('stop-pee-btn');
  if (stopBtn) {
    stopBtn.style.display = 'none';
  }
};

window.resetAllOffsets = function () {
  peeParticles = [];
  if (bmw) bmw.isConfigLoaded = false;
  targetSliderSpeed = 1.0;
  targetSliderHappiness = 0.0;
  for (let i = 0; i < 20; i++) {
    bmw.setJointOffset(i, 0, 0, 0);
    bmw.setJointAmplitude(i, 1.0);
    let sliderX = document.getElementById(`slider-x-${i}`);
    let sliderZ = document.getElementById(`slider-z-${i}`);
    let sliderA = document.getElementById(`slider-a-${i}`);
    let elX = document.getElementById(`offset-x-${i}`);
    let elZ = document.getElementById(`offset-z-${i}`);
    let elA = document.getElementById(`offset-a-${i}`);
    if (sliderX) sliderX.value = 0;
    if (sliderZ) sliderZ.value = 0;
    if (sliderA) sliderA.value = 1;
    if (elX) elX.innerText = "0";
    if (elZ) elZ.innerText = "0";
    if (elA) elA.innerText = "1.00×";
  }
};

window.saveConfigToJSON = function () {
  // Prompt for a name (default: "dog-walk")
  let name = prompt("Name this configuration:", "dog-walk");
  if (name === null) return; // user cancelled
  if (!name.trim()) name = "dog-walk";

  const config = {
    name: name.trim(),
    savedAt: new Date().toISOString(),
    speed: currentSpeed,
    happiness: currentHappiness,
    joints: dogJointNames.map((jointName, i) => ({
      index: i,
      name: jointName,
      offsetX: bmw.jointOffsets[i].x,
      offsetZ: bmw.jointOffsets[i].z,
      amplitude: bmw.jointAmplitudes[i]
    }))
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name.trim().replace(/\s+/g, '-') + '.json';
  a.click();
  URL.revokeObjectURL(url);
};

window.loadConfigFromFile = function () {
  document.getElementById('json-file-input').click();
};

window.onJSONFileSelected = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const config = JSON.parse(e.target.result);

      // Restore speed & happiness
      if (config.speed !== undefined) {
        currentSpeed = config.speed;
        bmw.setSpeed(config.speed);
        targetSliderSpeed = config.speed;
      }
      if (config.happiness !== undefined) {
        currentHappiness = config.happiness;
        bmw.setWalkerParam(undefined, undefined, undefined, config.happiness);
        targetSliderHappiness = config.happiness;
      }

      // Restore all joint settings
      if (config.joints && Array.isArray(config.joints)) {
        bmw.isConfigLoaded = true;

        let isSitPose = config.name && config.name.toLowerCase().includes('sit');

        if (isSitPose) {
          let customSit = [];
          config.joints.forEach(j => {
            customSit[j.index] = { x: j.absoluteX !== undefined ? j.absoluteX : 0, z: j.absoluteZ !== undefined ? j.absoluteZ : 0 };
          });
          bmw.customSitCoords = customSit;

          bmw.setMotionType('sit');
          const motionSelect = document.getElementById('motionType');
          if (motionSelect) motionSelect.value = 'sit';
        } else {
          config.joints.forEach(joint => {
            const i = joint.index;
            if (i < 0 || i >= 20) return;

            const ox = joint.offsetX ?? 0;
            const oz = joint.offsetZ ?? 0;
            const amp = joint.amplitude ?? 1.0;

            bmw.setJointOffset(i, ox, undefined, oz);
            bmw.setJointAmplitude(i, amp);

            // Sync sliders
            let sx = document.getElementById(`slider-x-${i}`);
            let sz = document.getElementById(`slider-z-${i}`);
            let sa = document.getElementById(`slider-a-${i}`);
            let ex = document.getElementById(`offset-x-${i}`);
            let ez = document.getElementById(`offset-z-${i}`);
            let ea = document.getElementById(`offset-a-${i}`);

            if (sx) sx.value = ox;
            if (sz) sz.value = oz;
            if (sa) sa.value = amp;
            if (ex) ex.innerText = (ox >= 0 ? "+" : "") + ox.toFixed(1);
            if (ez) ez.innerText = (oz >= 0 ? "+" : "") + oz.toFixed(1);
            if (ea) ea.innerText = amp.toFixed(2) + "×";
          });
        }
      }

      alert(`Loaded "${config.name || file.name}" successfully!`);
    } catch (err) {
      alert("Failed to load config: " + err.message);
    }
    // Reset the input so the same file can be re-loaded
    event.target.value = '';
  };
  reader.readAsText(file);
};

class PeeParticle {
  constructor(x, y, img) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.startX = x;
    this.startY = y;
    this.vx = 0; // All start identically with no horizontal speed
    this.vy = random(2, 5);
    this.angle = random(TWO_PI);
    this.vAngle = random(-0.15, 0.15);
    this.targetSize = random(10, 50); // Final randomized size
    this.size = 10; // All particles start uniformly tiny
    this.opacity = 255;
    this.id = Math.random();
  }

  update() {
    // Smoothly grow from initial size (10) to their target randomized size
    this.size += (this.targetSize - this.size) * 0.05;

    // Randomize horizontal velocity slightly as they fall to create mid-air scatter
    this.vx += random(-0.02, 0.02);

    // Apply gravity
    this.vy += 0.25;

    // Apply simple air drag
    this.vx *= 0.99;
    this.vy *= 0.99;

    // Move
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.vAngle;
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    imageMode(CENTER);

    // Use native globalAlpha instead of p5's extremely slow CPU-bound tint()
    drawingContext.globalAlpha = Math.max(0, this.opacity / 255.0);

    let imgAspectRatio = this.img.width / this.img.height;
    let imgW = this.size * imgAspectRatio;
    let imgH = this.size;
    
    image(this.img, 0, 0, imgW, imgH);
    
    // Reset global alpha so it doesn't affect other rendering
    drawingContext.globalAlpha = 1.0;
    pop();
  }
}

function updateAndDrawPeeParticles(markers) {
  let isMobile = windowWidth <= 768;
  let floorY = (height / 2) / (isMobile ? 0.55 : 1.0);

  // Spawn particles when peeing and release is enabled
  if (bmw && bmw.motionType === 'pee' && bmw.peeProgress > 0.8 && releasePeeParticles) {
    if (frameCount % 2 === 0) {
      let pelvis = markers[8];
      if (pelvis) {
        let choices = [...logoImages];
        if (smallImages && smallImages.length > 0) {
          choices = choices.concat(smallImages);
        }
        let randomImg = choices[Math.floor(random(choices.length))];
        peeParticles.push(new PeeParticle(pelvis.x, pelvis.y, randomImg));
      }
    }
  }

  // Update physics for all particles
  for (let p of peeParticles) {
    p.update();
  }

  // Resolve circle-circle collisions using Spatial Hashing to prevent O(N^2) lag
  let cellSize = 50; // slightly larger than max particle size
  let grid = {};

  // 1. Assign particles to grid cells
  for (let p of peeParticles) {
    p._cx = Math.floor(p.x / cellSize);
    p._cy = Math.floor(p.y / cellSize);
    let key = p._cx + "," + p._cy;
    if (!grid[key]) grid[key] = [];
    grid[key].push(p);
  }

  // 2. Check collisions only within adjacent cells
  for (let pA of peeParticles) {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        let key = (pA._cx + ox) + "," + (pA._cy + oy);
        if (grid[key]) {
          for (let pB of grid[key]) {
            // Only process each pair once using their unique ids
            if (pA.id >= pB.id) continue;

            let clearance = ((pA.size + pB.size) / 2) * 0.85;
            let dx = pA.x - pB.x;
            let dy = pA.y - pB.y;
            
            // Fast bounding box check before expensive Math.sqrt
            if (Math.abs(dx) > clearance || Math.abs(dy) > clearance) continue;

            // Prevent the "shower head" scatter: don't collide particles that have just spawned
            // This guarantees they fall in a perfectly straight line for the first 80 pixels
            if (pA.y < pA.startY + 80 && pB.y < pB.startY + 80) continue;

            let distSq = dx * dx + dy * dy;
            if (distSq < clearance * clearance) {
              let d = Math.sqrt(distSq);
              if (d === 0) {
                pA.x += random(-1, 1);
                pA.y += random(-1, 1);
                continue;
              }

              let overlap = clearance - d;
              let pushX = (dx / d) * overlap * 0.5;
              let pushY = (dy / d) * overlap * 0.5;

              pA.x += pushX;
              pA.y += pushY;
              pB.x -= pushX;
              pB.y -= pushY;

              // Add a bit of horizontal flow when particles press against each other
              let flowFactor = 0.08;
              pA.vx += pushX * flowFactor;
              pA.vy += pushY * flowFactor;
              pB.vx -= pushX * flowFactor;
              pB.vy -= pushY * flowFactor;
            }
          }
        }
      }
    }
  }

  // Constrain all particles to floor (bottom of canvas)
  for (let p of peeParticles) {
    let bottomLimit = floorY - p.size / 2;
    if (p.y >= bottomLimit) {
      p.y = bottomLimit;
      p.vy = 0;
      p.vx *= 0.85; // floor friction
      p.vAngle *= 0.9; // spin friction
    }
  }

  // If not actively releasing particles, fade out all particles
  if (bmw && (bmw.motionType !== 'pee' || !releasePeeParticles)) {
    for (let p of peeParticles) {
      p.opacity -= 4; // Fade out
    }
    // Remove faded out particles
    peeParticles = peeParticles.filter(p => p.opacity > 0);
  }

  // Cap total particles at 300 to maintain performance
  if (peeParticles.length > 300) {
    peeParticles.shift(); // Remove the oldest particle
  }

  // Draw all particles
  for (let p of peeParticles) {
    p.draw();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
