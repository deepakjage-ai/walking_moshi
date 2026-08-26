const fs = require('fs');
let code = fs.readFileSync('bmwalker.js', 'utf8');

// 1. Add progress variables to constructor
if (!code.includes('this.sniffProgress = 0.0;')) {
    code = code.replace(
        'this.targetEatProgress = 0.0;',
        'this.targetEatProgress = 0.0;\n    this.sniffProgress = 0.0;\n    this.targetSniffProgress = 0.0;'
    );
}

// 2. Add progress logic in update()
if (!code.includes('this.sniffProgress < this.targetSniffProgress')) {
    code = code.replace(
        'else if (this.eatProgress > this.targetEatProgress) this.eatProgress = Math.max(0.0, this.eatProgress - 0.015);',
        'else if (this.eatProgress > this.targetEatProgress) this.eatProgress = Math.max(0.0, this.eatProgress - 0.015);\n    if (this.sniffProgress < this.targetSniffProgress) this.sniffProgress = Math.min(1.0, this.sniffProgress + 0.015);\n    else if (this.sniffProgress > this.targetSniffProgress) this.sniffProgress = Math.max(0.0, this.sniffProgress - 0.015);'
    );
}

// 3. Add to blend loop
if (!code.includes('calculateSniffPosture')) {
    code = code.replace(
        '      if (this.eatProgress > 0.0) {\n        let eatMarkers = this.calculateEatPosture(this.markers, walkertime);\n        let easeT = 1 - Math.pow(1 - this.eatProgress, 3);\n        for (i = 0; i < this.nummarkers * 3; i++) this.markers[i] += (eatMarkers[i] - this.markers[i]) * easeT;\n      }',
        '      if (this.eatProgress > 0.0) {\n        let eatMarkers = this.calculateEatPosture(this.markers, walkertime);\n        let easeT = 1 - Math.pow(1 - this.eatProgress, 3);\n        for (i = 0; i < this.nummarkers * 3; i++) this.markers[i] += (eatMarkers[i] - this.markers[i]) * easeT;\n      }\n      if (this.sniffProgress > 0.0) {\n        let sniffMarkers = this.calculateSniffPosture(this.markers, walkertime);\n        let easeT = 1 - Math.pow(1 - this.sniffProgress, 3);\n        for (i = 0; i < this.nummarkers * 3; i++) this.markers[i] += (sniffMarkers[i] - this.markers[i]) * easeT;\n      }'
    );
}

// 4. IK pee progress condition update
code = code.replace(
    'this.eatProgress === 0.0 && this.biteProgress === 0.0)',
    'this.eatProgress === 0.0 && this.biteProgress === 0.0 && this.sniffProgress === 0.0)'
);

// 5. setMotionType changes
// Set targetSniffProgress = 0.0 in sit, pee, bite, eat, walk, run blocks
const modes = ['sit', 'pee', 'bite', 'eat'];
modes.forEach(mode => {
    code = code.replace(
        new RegExp(`this\\.targetEatProgress = (1\\.0|0\\.0);(?=\\s*(?://|if|else|\\}))`, 'g'),
        (match) => {
            return match + `\n        this.targetSniffProgress = 0.0;`;
        }
    );
});

// Fix any duplicates or missing bits in setMotionType
// Add sniff motion block
if (!code.includes('motionType === \'sniff\'')) {
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
}

// Update the else block for walk/run to reset sniffProgress
code = code.replace(
    '        this.targetEatProgress = 0.0;\n        if (motionType === \'run\') {',
    '        this.targetEatProgress = 0.0;\n        this.targetSniffProgress = 0.0;\n        if (motionType === \'run\') {'
);

// Add calculateSniffPosture function
const sniffFn = `
  calculateSniffPosture(activeMarkers, walkertime) {
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
        // Extend twice: phase goes 0->1->0 twice in 800ms
        headFactor = (1 - Math.cos((cycleT / 800) * Math.PI * 4)) / 2.0;
    }

    let diffX = 0;
    if (this.sniffAnchorX !== undefined && activeMarkers && activeMarkers[5] !== undefined) {
      diffX = this.sniffAnchorX - sniffFrame[5].x;
    } else {
      diffX = activeMarkers[5] - sniffFrame[5].x;
    }

    for (let i = 0; i < this.nummarkers; i++) {
      let x = sniffFrame[i].x + diffX;
      let y = activeMarkers[i + this.nummarkers]; 
      let z = sniffFrame[i].z;
      
      if (i === 9) { // Head
          // Extend vector from neck (index 3) to head (index 9)
          let dx = 25;  // 25 pixels forward
          let dz = -15; // 15 pixels up
          x += dx * headFactor;
          z += dz * headFactor;
      }
      
      sniffMarkers[i] = x;
      sniffMarkers[i + this.nummarkers] = y;
      sniffMarkers[i + this.nummarkers * 2] = z;
    }

    return sniffMarkers;
  }
`;

if (!code.includes('calculateSniffPosture')) {
    code = code.replace(
        '  calculateEatPosture(activeMarkers, walkertime) {',
        sniffFn + '\n  calculateEatPosture(activeMarkers, walkertime) {'
    );
}

fs.writeFileSync('bmwalker.js', code);
console.log('updated bmwalker.js');
