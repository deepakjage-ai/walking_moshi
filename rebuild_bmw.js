const fs = require('fs');
let code = fs.readFileSync('../walking_moshimbo 2/bmwalker.js', 'utf8');

// 1. Progress variables
code = code.replace(
    'this.targetEatProgress = 0.0;',
    'this.targetEatProgress = 0.0;\n    this.sniffProgress = 0.0;\n    this.targetSniffProgress = 0.0;'
);

// 2. update() progress logic
code = code.replace(
    'else if (this.eatProgress > this.targetEatProgress) this.eatProgress = Math.max(0.0, this.eatProgress - 0.015);',
    'else if (this.eatProgress > this.targetEatProgress) this.eatProgress = Math.max(0.0, this.eatProgress - 0.015);\n    if (this.sniffProgress < this.targetSniffProgress) this.sniffProgress = Math.min(1.0, this.sniffProgress + 0.015);\n    else if (this.sniffProgress > this.targetSniffProgress) this.sniffProgress = Math.max(0.0, this.sniffProgress - 0.015);'
);

// 3. update() blend loop
code = code.replace(
    '      if (this.eatProgress > 0.0) {\n        let eatMarkers = this.calculateEatPosture(this.markers, walkertime);\n        let easeT = 1 - Math.pow(1 - this.eatProgress, 3);\n        for (i = 0; i < this.nummarkers * 3; i++) this.markers[i] += (eatMarkers[i] - this.markers[i]) * easeT;\n      }',
    '      if (this.eatProgress > 0.0) {\n        let eatMarkers = this.calculateEatPosture(this.markers, walkertime);\n        let easeT = 1 - Math.pow(1 - this.eatProgress, 3);\n        for (i = 0; i < this.nummarkers * 3; i++) this.markers[i] += (eatMarkers[i] - this.markers[i]) * easeT;\n      }\n      if (this.sniffProgress > 0.0) {\n        let sniffMarkers = this.calculateSniffPosture(this.markers, walkertime);\n        let easeT = 1 - Math.pow(1 - this.sniffProgress, 3);\n        for (i = 0; i < this.nummarkers * 3; i++) this.markers[i] += (sniffMarkers[i] - this.markers[i]) * easeT;\n      }'
);

// 4. IK condition
code = code.replace(
    'this.eatProgress === 0.0 && this.biteProgress === 0.0)',
    'this.eatProgress === 0.0 && this.biteProgress === 0.0 && this.sniffProgress === 0.0)'
);

// 5. setMotionType logic
// Reset targetSniffProgress
const modes = ['sit', 'pee', 'bite', 'eat'];
modes.forEach(mode => {
    code = code.replace(
        new RegExp(`this\\.targetEatProgress = (1\\.0|0\\.0);(?=\\s*this\\.targetRunProgress)`, 'g'),
        (match) => {
            return match + `\n        this.targetSniffProgress = 0.0;`;
        }
    );
});

// Add sniff block
code = code.replace(
    '} else if (motionType === \'eat\') {',
    `} else if (motionType === 'sniff') {
        this.targetSitProgress = 0.0;
        this.targetPeeProgress = 0.0;
        this.targetBiteProgress = 0.0;
        this.targetEatProgress = 0.0;
        this.targetSniffProgress = 1.0;
        this.targetRunProgress = 0.0;
        if (this.sniffProgress === 0.0 && this.markers && this.markers[5] !== undefined) {
          this.sniffAnchorX = this.markers[5];
          if (this.sitProgress > 0.0 || this.peeProgress > 0.0) this.sniffAnchorX += 60;
        }
      } else if (motionType === 'eat') {`
);

// Reset sniff in else block
code = code.replace(
    '        this.targetEatProgress = 0.0;\n        if (motionType === \'run\') {',
    '        this.targetEatProgress = 0.0;\n        this.targetSniffProgress = 0.0;\n        if (motionType === \'run\') {'
);

// 6. calculateSniffPosture function
const sniffFn = `
  calculateSniffPosture(activeMarkers, walkertime) {
    let baseMarkers = new Array(this.nummarkers * 3);
    for (let i = 0; i < this.nummarkers * 3; i++) {
      baseMarkers[i] = this.sample(i, 0, true, true);
    }
    
    let sniffMarkers = new Array(this.nummarkers * 3);
    
    const sniffFrame = [
      { x: 148.759, z: -148.676 },
      { x: 128.291, z: -117.69 },
      { x: 110.704, z: -70.842 },
      { x: 208.515, z: -6.611 },
      { x: 179.561, z: 50.863 },
      { x: -86.185, z: -144.397 },
      { x: -129.016, z: -96.025 },
      { x: -88.368, z: -14.126 },
      { x: -130.2, z: 98.284 },
      { x: 267.871, z: -66.316 }, // Head
      { x: 9.483, z: 96.166 },
      { x: -177.319, z: 102.103 },
      { x: 70.567, z: -147.689 },
      { x: 55.231, z: -117.135 },
      { x: 59.834, z: -41.82 },
      { x: -163.047, z: -151.297 },
      { x: -180.586, z: -109.867 },
      { x: -135.854, z: -43.436 },
      { x: -224.984, z: 123.756 },
      { x: -257.023, z: 176.085 }
    ];

    let timeMs = this.tm.getTimer();
    
    // Cycle: 0.8s animate, 1.5s pause. Total = 2.3s = 2300ms
    let cycleT = timeMs % 2300;
    let headFactor = 0;
    if (cycleT < 800) {
        headFactor = (1 - Math.cos((cycleT / 800) * Math.PI * 4)) / 2.0;
    }

    let startAnchor = this.sniffAnchorX !== undefined ? this.sniffAnchorX : (activeMarkers ? activeMarkers[5] : 0);
    // Tree is roughly to the right, we shrink the dog and move it
    let targetAnchor = 260.0; 
    let easeT = 1 - Math.pow(1 - this.sniffProgress, 3);
    let anchorX = startAnchor * (1 - easeT) + targetAnchor * easeT;

    let scaleFactor = 0.50; 
    let pawX_sniff = sniffFrame[5].x;
    let pawY_base = baseMarkers[5 + this.nummarkers];
    let pawZ_sniff = sniffFrame[5].z;

    let shiftX = anchorX - pawX_sniff;

    for (let i = 0; i < this.nummarkers; i++) {
      let currentX = sniffFrame[i].x;
      let currentZ = sniffFrame[i].z;

      if (i === 9) { // Head
          let dx = 25; 
          let dz = -15; 
          currentX += dx * headFactor;
          currentZ += dz * headFactor;
      }

      let scaledX = pawX_sniff + (currentX - pawX_sniff) * scaleFactor;
      sniffMarkers[i] = scaledX + shiftX;
      
      let scaledY = pawY_base + (baseMarkers[i + this.nummarkers] - pawY_base) * scaleFactor;
      sniffMarkers[i + this.nummarkers] = scaledY;
      
      let scaledZ = pawZ_sniff + (currentZ - pawZ_sniff) * scaleFactor;
      sniffMarkers[i + this.nummarkers * 2] = scaledZ;
    }

    return sniffMarkers;
  }
`;

code = code.replace(
    '  calculateEatPosture(activeMarkers, walkertime) {',
    sniffFn + '\n  calculateEatPosture(activeMarkers, walkertime) {'
);

fs.writeFileSync('bmwalker.js', code);
console.log('Restored and rebuilt bmwalker.js successfully');
