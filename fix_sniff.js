const fs = require('fs');
let code = fs.readFileSync('bmwalker.js', 'utf8');

// Use baseMarkers for Y
code = code.replace(
    '  calculateSniffPosture(activeMarkers, walkertime) {',
    `  calculateSniffPosture(activeMarkers, walkertime) {
    let baseMarkers = new Array(this.nummarkers * 3);
    for (let i = 0; i < this.nummarkers * 3; i++) {
      baseMarkers[i] = this.sample(i, 0, true, true);
    }`
);

code = code.replace(
    'let y = activeMarkers[i + this.nummarkers];',
    'let y = baseMarkers[i + this.nummarkers];'
);

fs.writeFileSync('bmwalker.js', code);
console.log('Fixed sniff y coordinates');
