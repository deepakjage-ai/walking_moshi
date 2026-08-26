const fs = require('fs');
let code = fs.readFileSync('dog.js', 'utf8');

const missingCode = `
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
    targetBowlX = width / 2 + 100;
    if (bowlX < targetBowlX - 5) {
      bowlX = lerp(bowlX, targetBowlX, 0.1);
    } else {
      bowlX = targetBowlX;
    }
  }

  if (bowlX < width / 2 + 90 && bowlImg) {
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
  let targetHappiness = happinessSlider.value();
  if (bmw.happiness !== targetHappiness) {
    bmw.setWalkerParam(undefined, undefined, undefined, targetHappiness);
  }

  // Check if skeleton toggle is checked
  let showSkeleton = true;
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
`;

// It should be inserted between `pop();` of the UFO logic and `// Draw bones as lines`
// We'll replace:
//   pop();
// 
//   // Draw bones as lines
// with:
//   pop();
//   [missingCode]
//   // Draw bones as lines

code = code.replace(/pop\(\);\n\n\n\s*\/\/ Draw bones as lines/, 'pop();\n' + missingCode + '\n  // Draw bones as lines');

fs.writeFileSync('dog.js', code);
console.log('Restored missing code');
