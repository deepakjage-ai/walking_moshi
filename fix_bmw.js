const fs = require('fs');
let code = fs.readFileSync('bmwalker.js', 'utf8');

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
      let y = baseMarkers[i + this.nummarkers]; 
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

if (!code.includes('calculateSniffPosture(activeMarkers, walkertime)')) {
    code = code.replace(
        '  calculateEatPosture(activeMarkers, walkertime) {',
        sniffFn + '\n  calculateEatPosture(activeMarkers, walkertime) {'
    );
    fs.writeFileSync('bmwalker.js', code);
    console.log('injected function successfully');
}
