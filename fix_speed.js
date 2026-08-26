const fs = require('fs');
let js = fs.readFileSync('dog.js', 'utf8');

// 1. Add currentSpeed variable
js = js.replace(/let targetSliderSpeed = 1\.0;/, 'let targetSliderSpeed = 1.0;\nlet currentSpeed = 1.0;');

// 2. Replace lines 180 to 200 completely with currentSpeed logic
const oldDrawLogic = `  // Update targets if user is dragging happiness slider manually
  if (mouseIsPressed && mouseX > 20 && mouseX < 170 && mouseY > 40 && mouseY < 75) {
    targetSliderHappiness = happinessSlider ? happinessSlider.value() : 3;
  } else {
    // Interpolate towards target gradually
    if (happinessSlider && happinessSlider.value() !== targetSliderHappiness) {
      
      let step = 0.125; // Transition step for happiness
      if (Math.abs(current - targetSliderHappiness) < step) {
        happinessSlider.value(targetSliderHappiness);
      } else {
        happinessSlider.value(current + Math.sign(targetSliderHappiness - current) * step);
      }
    }
  }

  // Always force speed slider to reflect the walker's actual internal speed
  if (speedSlider) {
    speedSlider.value(bmw.speed);
  }`;

const newDrawLogic = `  // Interpolate currentSpeed towards targetSliderSpeed
  let speedStep = 0.05;
  if (Math.abs(currentSpeed - targetSliderSpeed) < speedStep) {
    currentSpeed = targetSliderSpeed;
  } else {
    currentSpeed += Math.sign(targetSliderSpeed - currentSpeed) * speedStep;
  }

  if (bmw.speed !== currentSpeed) {
    bmw.setSpeed(currentSpeed);
  }`;

js = js.replace(oldDrawLogic, newDrawLogic);

// 3. Update preset serialization to use currentSpeed
js = js.replace(/speed: speedSlider \? speedSlider\.value\(\) : 1\.0,/, 'speed: currentSpeed,');

// 4. Update preset loading to use currentSpeed
js = js.replace(/speedSlider \? speedSlider\.value\(config\.speed\) : null;/g, 'currentSpeed = config.speed;');
js = js.replace(/speedSlider\.value\(config\.speed\);/g, 'currentSpeed = config.speed;');

fs.writeFileSync('dog.js', js);
console.log('Fixed speed logic');
