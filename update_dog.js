const fs = require('fs');
let code = fs.readFileSync('dog.js', 'utf8');

// Update targetSliderSpeed for sniff
code = code.replace(
    /} else if \(type === 'eat'\) {\n    targetSliderSpeed = 0.0;\n  }/,
    `} else if (type === 'eat' || type === 'sniff') {\n    targetSliderSpeed = 0.0;\n  }`
);

fs.writeFileSync('dog.js', code);
console.log('updated dog.js');
