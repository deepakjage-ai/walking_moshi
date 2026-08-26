const fs = require('fs');
let code = fs.readFileSync('bmwalker.js', 'utf8');

let startIndex = code.indexOf('      if (this.sniffProgress > 0.0) {\n        let sniffMarkers = this.calculateSniffPosture(activeMarkers, walkertime) {');
let endIndex = code.indexOf('  calculateEatPosture(activeMarkers, walkertime) {');

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find the target block');
    process.exit(1);
}

// The replacement text for the blend loop:
let blendLoopStr = `      if (this.sniffProgress > 0.0) {
        let sniffMarkers = this.calculateSniffPosture(this.markers, walkertime);
        let easeT = 1 - Math.pow(1 - this.sniffProgress, 3);
        for (i = 0; i < this.nummarkers * 3; i++) this.markers[i] += (sniffMarkers[i] - this.markers[i]) * easeT;
      }
    }

    // Always solve front elbow IK for dog when in standard pee mode to prevent snaps/twitches
    if (this.type === BMW_TYPE_DOG && this.peeProgress > 0.0 && this.sitProgress === 0.0 && this.eatProgress === 0.0 && this.biteProgress === 0.0 && this.sniffProgress === 0.0) {
      let L1 = 58.85, L2 = 36.35;

      // Left Front Elbow IK
      let Px0 = this.markers[0], Pz0 = this.markers[0 + this.nummarkers * 2];
      let Sx0 = this.markers[2], Sz0 = this.markers[2 + this.nummarkers * 2];
      let elbowL = this.solveIK(Sx0, Sz0, Px0, Pz0, L1, L2, -1);
      this.markers[1] = elbowL.x;
      this.markers[1 + this.nummarkers * 2] = elbowL.z;

      // Right Front Elbow IK
      let Px1 = this.markers[12], Pz1 = this.markers[12 + this.nummarkers * 2];
      let Sx1 = this.markers[14], Sz1 = this.markers[14 + this.nummarkers * 2];
      let elbowR = this.solveIK(Sx1, Sz1, Px1, Pz1, L1, L2, -1);
      this.markers[13] = elbowR.x;
      this.markers[13 + this.nummarkers * 2] = elbowR.z;
    }
  }

  // --- End of update(delta) ---

  // ... skip ahead to place calculateSniffPosture ...
`;

// Actually, I can just replace the user's chunk exactly with the restored blend loop,
// and then I also need to make sure calculateSniffPosture is defined at class level.

let userChunk = code.substring(startIndex, endIndex);

// We will just do a string replace for userChunk. But what about the stuff after the blend loop?
// The user pasted calculateSniffPosture OVER the end of the update() function, erasing the IK solve and the end of update()!!!
// Wait! Look at lines 397-472.
// Line 397 is inside the blend loop (inside update(delta)).
// Line 474 is calculateEatPosture.
// What was in between them before the user pasted this?
