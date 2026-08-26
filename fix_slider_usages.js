const fs = require('fs');
let js = fs.readFileSync('dog.js', 'utf8');

js = js.replace(/let targetHappiness = happinessSlider\.value\(\);/g, 'let targetHappiness = happinessSlider ? happinessSlider.value() : 3;');
js = js.replace(/targetSliderHappiness = happinessSlider\.value\(\);/g, 'targetSliderHappiness = happinessSlider ? happinessSlider.value() : 3;');
js = js.replace(/speed: speedSlider\.value\(\),/g, 'speed: speedSlider ? speedSlider.value() : 1.0,');
js = js.replace(/happiness: happinessSlider\.value\(\),/g, 'happiness: happinessSlider ? happinessSlider.value() : 3,');
js = js.replace(/let current = happinessSlider\.value\(\);/g, 'let current = happinessSlider ? happinessSlider.value() : 3;');

fs.writeFileSync('dog.js', js);
console.log('Fixed usages');
