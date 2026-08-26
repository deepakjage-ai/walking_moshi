const fs = require('fs');
let code = fs.readFileSync('bmwalker.js', 'utf8');

// The vertical shift should be applied to the Z axis, which maps to the 2D Y axis visually.
code = code.replace(
    'let shiftY = -55.0 * easeT; // Push dog up slightly to align with tree trunk',
    'let shiftZ = 55.0 * easeT; // Positive Z translates to negative Y (upwards) on screen'
);

code = code.replace(
    'sniffMarkers[i + this.nummarkers] = scaledY + shiftY;',
    'sniffMarkers[i + this.nummarkers] = scaledY;'
);

code = code.replace(
    'sniffMarkers[i + this.nummarkers * 2] = scaledZ;',
    'sniffMarkers[i + this.nummarkers * 2] = scaledZ + shiftZ;'
);

fs.writeFileSync('bmwalker.js', code);
console.log('Fixed vertical shift mapping to screen Y');
