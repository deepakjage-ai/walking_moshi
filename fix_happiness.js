const fs = require('fs');
let js = fs.readFileSync('dog.js', 'utf8');

// 1. Add currentHappiness variable
js = js.replace(/let targetSliderHappiness = 0\.0;/, 'let targetSliderHappiness = 0.0;\nlet currentHappiness = 3;');

// 2. Add sniff mode tail wag
js = js.replace(/\} else if \(type === 'eat' \|\| type === 'sniff'\) \{\n\s*targetSliderSpeed = 0\.0;\n\s*\}/,
  "} else if (type === 'eat') {\n    targetSliderSpeed = 0.0;\n  } else if (type === 'sniff') {\n    targetSliderSpeed = 0.0;\n    targetSliderHappiness = 1.0;\n  }");

// 3. Update the interpolation logic in draw()
const oldDrawLogic = `  let targetHappiness = happinessSlider ? happinessSlider.value() : 3;
  if (bmw.happiness !== targetHappiness) {
    bmw.setWalkerParam(undefined, undefined, undefined, targetHappiness);
  }`;
const newDrawLogic = `  let step = 0.125;
  if (Math.abs(currentHappiness - targetSliderHappiness) < step) {
    currentHappiness = targetSliderHappiness;
  } else {
    currentHappiness += Math.sign(targetSliderHappiness - currentHappiness) * step;
  }

  if (bmw.happiness !== currentHappiness) {
    bmw.setWalkerParam(undefined, undefined, undefined, currentHappiness);
  }`;
js = js.replace(oldDrawLogic, newDrawLogic);

// 4. Update the preset serialization logic to use currentHappiness
js = js.replace(/happiness: happinessSlider \? happinessSlider\.value\(\) : 3,/, 'happiness: currentHappiness,');

// 5. Update the preset loading logic
js = js.replace(/happinessSlider\.value\(config\.happiness\);/g, 'currentHappiness = config.happiness;');
js = js.replace(/happinessSlider \? happinessSlider\.value\(config\.happiness\) : null;/g, 'currentHappiness = config.happiness;');

// Remove the old dead slider code that throws errors if currentHappiness is used
js = js.replace(/let current = happinessSlider \? happinessSlider\.value\(\) : 3;/g, '');

fs.writeFileSync('dog.js', js);
console.log('Fixed happiness logic');
