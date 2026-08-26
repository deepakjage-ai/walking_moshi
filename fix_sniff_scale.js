const fs = require('fs');

// 1. Update dog.js background logic
let dogCode = fs.readFileSync('dog.js', 'utf8');
const oldBgLogic = `  // Update background scroll
  if (currentMotionType === 'walk') {
    bgScrollX += walkingSpeed;
  } else if (currentMotionType === 'run') {
    bgScrollX += runningSpeed;
  }`;
const newBgLogic = `  // Update background scroll
  if (currentMotionType === 'walk') {
    bgScrollX += walkingSpeed;
  } else if (currentMotionType === 'run') {
    bgScrollX += runningSpeed;
  } else if (currentMotionType === 'sniff') {
    let loopWidth = Math.max(2400, width + 400);
    let targetScroll = Math.round(bgScrollX / loopWidth) * loopWidth;
    bgScrollX = lerp(bgScrollX, targetScroll, 0.05);
  }`;
dogCode = dogCode.replace(oldBgLogic, newBgLogic);
fs.writeFileSync('dog.js', dogCode);


// 2. Update bmwalker.js sniff scaling and shift
let bmwCode = fs.readFileSync('bmwalker.js', 'utf8');

const regex = /calculateSniffPosture\([\s\S]*?return sniffMarkers;\n  }/;

const newSniffPosture = `calculateSniffPosture(activeMarkers, walkertime) {
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
    let targetAnchor = 260.0; // Pushes dog to right
    let easeT = 1 - Math.pow(1 - this.sniffProgress, 3);
    let anchorX = startAnchor * (1 - easeT) + targetAnchor * easeT;

    let scaleFactor = 0.50; // Scale dog down to 50%
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
  }`;

bmwCode = bmwCode.replace(regex, newSniffPosture);
fs.writeFileSync('bmwalker.js', bmwCode);

console.log('done!');
