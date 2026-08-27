22// BMWalker.js
// Biological Motion 'Walker' library for JavaScript.

// LICENSE
// Attribution-NonCommercial-ShareAlike 4.0 International
// Copyright (c) 2022 Tetsunori Nakayama(https://twitter.com/tetunori_lego)
//   and Nikolaus Troje(https://www.biomotionlab.ca/niko-troje/).
// For commercial use, please contact us.

// This library is based on the results of BioMotion Lab's researches in York University.
// See the URL below in detail.
// https://www.biomotionlab.ca/

const BMW_TYPE_HUMAN = 0;
const BMW_TYPE_DOG = 1;
const BMW_TYPE_CAT = 1; // (kept for compatibility)
const BMW_TYPE_PIGEON = 2;

class BMWalker {
  // Constructor
  constructor(type = BMW_TYPE_DOG) {
    // External variables
    // Boundary values
    this.maxSpeed = 4.0;
    this.minSpeed = -4.0;
    this.maxBodyStructure = 6.0; // Type A
    this.minBodyStructure = -6.0; // Type B
    this.maxWeight = 6.0; // Heavy
    this.minWeight = -6.0; // Light
    this.maxNervousness = 6.0; // Nervous
    this.minNervousness = -6.0; // Relaxed
    this.maxHappiness = 6.0; // Happy
    this.minHappiness = -6.0; // Sad

    // Internal variables
    this.type = type;

    this.tm = new BMWTimer();
    this.starttime = this.tm.getTimer();

    this.mtrx = new BMWMatrix();

    // Walker Parameters
    this.speed = 1.0;
    this.bodyStructure = 0;
    this.weight = 0;
    this.nervousness = 0;
    this.happiness = 0;

    // Camera Parameters
    this.azimuth = 0; // rad
    this.angularVelocity = 0; // rad/sec
    this.elevation = 0; // rad
    this.roll = 0; // rad

    // Translation Parameters
    this.flagTranslation = false;
    this.translation_pos = 0;

    this.walker_size = 10;

    // Sit Transition State
    this.sitProgress = 0.0;
    this.targetSitProgress = 0.0;
    this.sitAnchorX = undefined;

    // Pee Transition State
    this.peeProgress = 0.0;
    this.targetPeeProgress = 0.0;
    this.peeAnchorX = undefined;

    // Bite Transition State
    this.biteProgress = 0.0;
    this.targetBiteProgress = 0.0;
    this.eatProgress = 0.0;
    this.targetEatProgress = 0.0;
    this.sniffProgress = 0.0;
    this.targetSniffProgress = 0.0;

    this.isConfigLoaded = false;

    this.runProgress = 0.0;
    this.targetRunProgress = 0.0;
    this.walkSize = undefined;
    this.runSize = undefined;

    // 35 is the exactly correct ratio but need offsetY in this case.
    this.walkerHeightRatio = 40;
    //graphical stuff
    this.motion_vertical_scale = 1;
    this.motion_horizontal_scale = 1;
    this.structure_vertical_scale = 1;
    this.structure_horizontal_scale = 1;

    // Each data
    const walkerData = new BMWData();
    this.meanwalker = walkerData.meanwalker;
    if (walkerData.meanwalker_walk) {
      this.meanwalker[1] = walkerData.meanwalker_walk;
    }
    this.walkerData = walkerData; // Save reference to raw data to swap later
    this.motionType = 'walk';
    this.locomotionGait = 'walk';
    this.bodyStructureaxis = walkerData.bodyStructureaxis;
    this.weightaxis = walkerData.weightaxis;
    this.nervousaxis = walkerData.nervousaxis;
    this.happyaxis = walkerData.happyaxis;

    //camera variables
    this.camera_distance = 1000;

    this.walker_rot_xaxis = 0;
    this.walker_rot_yaxis = 0;
    this.walker_rot_zaxis = 0;

    this.walker_translation_speed = 0;

    this.walkerxmin = 0;
    this.walkerymin = 0;
    this.walkerzmin = 0;
    this.walkerxmax = 0;
    this.walkerymax = 0;
    this.walkerzmax = 0;
    this.walkerxoff = 0;
    this.walkeryoff = 0;
    this.walkerzoff = 0;
    this.walkersizefactor = 0;

    this.axisrot = 0;
    this.nummarkers = 0;

    this.markers = [];

    this.jointOffsets = [];
    for (let k = 0; k < 20; k++) {
      this.jointOffsets.push({ x: 0.0, y: 0.0, z: 0.0 });
    }

    // Per-joint amplitude scale: 1.0 = default motion range, 0 = frozen, 2.0 = double range
    this.jointAmplitudes = [];
    for (let k = 0; k < 20; k++) {
      this.jointAmplitudes.push(1.0);
    }

    this.init();
  }

  // API: Get markers
  getMarkers(walkerHeight, tmsec = undefined, mx = undefined, my = undefined) {
    const markers = []; // return value

    // Update run progress first to keep all calculations coherent
    let oldFreq = this.getFrequency();
    let progressChanged = false;
    if (this.runProgress < this.targetRunProgress) {
      this.runProgress = Math.min(1.0, this.runProgress + 0.015);
      progressChanged = true;
    } else if (this.runProgress > this.targetRunProgress) {
      this.runProgress = Math.max(0.0, this.runProgress - 0.015);
      progressChanged = true;
    }

    let oldSpeed = this.speed;
    if (this.type === BMW_TYPE_DOG) {
      this.speed = this.overrideSpeed !== undefined ? this.overrideSpeed : (1.0 + this.runProgress * 1.0);
    }

    if (progressChanged || oldSpeed !== this.speed) {
      this.updateBlendedSizes();
      this.walker_translation_speed = this.calcTranslationSpeed();
      let newFreq = this.getFrequency();
      this.adjustStartTimeForNewFrequency(oldFreq, newFreq);
    }

    this.walker_size = walkerHeight / this.walkerHeightRatio;

    if (tmsec === undefined) {
      tmsec = this.tm.getTimer() - this.starttime;
    }
    // console.log(tmsec);

    let i = 0;
    let walkertime = 0;

    if (this.speed != 0) {
      walkertime = this.calcTime(tmsec);
      //console.log(walkertime)
    }

    // Translation calculation
    if (this.flagTranslation) {
      this.translation_pos = Math.round((this.getTranslationSpeed() * 120 * tmsec) / 1000);
    } else {
      this.translation_pos = 0;
    }

    // Calculate marker positions
    for (i = 0; i < this.nummarkers * 3 + 1; i++) {
      this.markers[i] = this.sample(i, walkertime, true);
    }

    // Update Progresses (Faster: 0.015 step)
    if (this.sitProgress < this.targetSitProgress) this.sitProgress = Math.min(1.0, this.sitProgress + 0.015);
    else if (this.sitProgress > this.targetSitProgress) this.sitProgress = Math.max(0.0, this.sitProgress - 0.015);

    if (this.peeProgress < this.targetPeeProgress) this.peeProgress = Math.min(1.0, this.peeProgress + 0.015);
    else if (this.peeProgress > this.targetPeeProgress) this.peeProgress = Math.max(0.0, this.peeProgress - 0.015);

    if (this.biteProgress < this.targetBiteProgress) this.biteProgress = Math.min(1.0, this.biteProgress + 0.015);
    else if (this.biteProgress > this.targetBiteProgress) this.biteProgress = Math.max(0.0, this.biteProgress - 0.015);

    if (this.eatProgress < this.targetEatProgress) this.eatProgress = Math.min(1.0, this.eatProgress + 0.015);
    else if (this.eatProgress > this.targetEatProgress) this.eatProgress = Math.max(0.0, this.eatProgress - 0.015);
    if (this.sniffProgress < this.targetSniffProgress) this.sniffProgress = Math.min(1.0, this.sniffProgress + 0.015);
    else if (this.sniffProgress > this.targetSniffProgress) this.sniffProgress = Math.max(0.0, this.sniffProgress - 0.015);

    // Apply Posture Blending
    let toSit = (this.sitProgress > 0.0 && this.targetSitProgress === 1.0);
    let toPee = (this.peeProgress > 0.0 && this.targetPeeProgress === 1.0);
    let fromSit = (this.sitProgress > 0.0 && this.targetEatProgress === 1.0);
    let fromPee = (this.peeProgress > 0.0 && this.targetEatProgress === 1.0);

    if (this.eatProgress > 0.0 && (toSit || toPee)) {
      // Transition Eat -> Sit OR Eat -> Pee
      let t = toSit ? this.sitProgress : this.peeProgress; // 0 to 1
      let smoothT = t * t * (3 - 2 * t); // Global smoothstep easing

      let anchor = toSit ? this.sitAnchorX : this.peeAnchorX;
      let eatMarkers = this.calculateEatPosture(this.markers, walkertime);
      let transMarkers = this.calculateEatToSitPosture(this.markers, anchor);
      let targetMarkers = toSit ? this.calculateSitPosture(this.markers, walkertime) : this.calculatePeePosture(this.markers, walkertime);

      for (i = 0; i < this.nummarkers * 3; i++) {
        if (smoothT < 0.5) {
          let localT = smoothT * 2.0; // linear segment
          this.markers[i] = eatMarkers[i] + (transMarkers[i] - eatMarkers[i]) * localT;
        } else {
          let localT = (smoothT - 0.5) * 2.0; // linear segment
          this.markers[i] = transMarkers[i] + (targetMarkers[i] - transMarkers[i]) * localT;
        }
      }

      // Override front paws with staggered stepping logic
      let tL = Math.max(0, Math.min(1, smoothT / 0.7)); // Left leg steps early
      let tR = Math.max(0, Math.min(1, (smoothT - 0.3) / 0.7)); // Right leg steps late

      // Left Paw Override
      let localTL = tL < 0.5 ? tL * 2.0 : (tL - 0.5) * 2.0;
      let srcL = tL < 0.5 ? eatMarkers : transMarkers;
      let dstL = tL < 0.5 ? transMarkers : targetMarkers;
      this.markers[0] = srcL[0] + (dstL[0] - srcL[0]) * localTL;
      this.markers[0 + this.nummarkers * 2] = srcL[0 + this.nummarkers * 2] + (dstL[0 + this.nummarkers * 2] - srcL[0 + this.nummarkers * 2]) * localTL + Math.sin(tL * Math.PI) * 8;

      // Right Paw Override
      let localTR = tR < 0.5 ? tR * 2.0 : (tR - 0.5) * 2.0;
      let srcR = tR < 0.5 ? eatMarkers : transMarkers;
      let dstR = tR < 0.5 ? transMarkers : targetMarkers;
      this.markers[12] = srcR[12] + (dstR[12] - srcR[12]) * localTR;
      this.markers[12 + this.nummarkers * 2] = srcR[12 + this.nummarkers * 2] + (dstR[12 + this.nummarkers * 2] - srcR[12 + this.nummarkers * 2]) * localTR + Math.sin(tR * Math.PI) * 8;

      // Apply IK to perfectly fold the elbows instead of scaling them
      let L1 = 58.85, L2 = 36.35;

      // Left Front Leg IK
      let Px0 = this.markers[0], Pz0 = this.markers[0 + this.nummarkers * 2];
      let Sx0 = this.markers[2], Sz0 = this.markers[2 + this.nummarkers * 2];
      let elbowL = this.solveIK(Sx0, Sz0, Px0, Pz0, L1, L2, -1);
      this.markers[1] = elbowL.x;
      this.markers[1 + this.nummarkers * 2] = elbowL.z;

      // Right Front Leg IK
      let Px1 = this.markers[12], Pz1 = this.markers[12 + this.nummarkers * 2];
      let Sx1 = this.markers[14], Sz1 = this.markers[14 + this.nummarkers * 2];
      let elbowR = this.solveIK(Sx1, Sz1, Px1, Pz1, L1, L2, -1);
      this.markers[13] = elbowR.x;
      this.markers[13 + this.nummarkers * 2] = elbowR.z;
    } else if (this.eatProgress > 0.0 && (fromSit || fromPee)) {
      // Transition Sit/Pee -> Eat
      let t = this.eatProgress; // 0 to 1
      let smoothT = t * t * (3 - 2 * t); // Global smoothstep easing

      let anchor = fromSit ? this.sitAnchorX : this.peeAnchorX;
      let sourceMarkers = fromSit ? this.calculateSitPosture(this.markers, walkertime) : this.calculatePeePosture(this.markers, walkertime);
      let transMarkers = this.calculateEatToSitPosture(this.markers, anchor);
      let eatMarkers = this.calculateEatPosture(this.markers, walkertime);

      for (i = 0; i < this.nummarkers * 3; i++) {
        if (smoothT < 0.5) {
          let localT = smoothT * 2.0; // linear segment
          this.markers[i] = sourceMarkers[i] + (transMarkers[i] - sourceMarkers[i]) * localT;
        } else {
          let localT = (smoothT - 0.5) * 2.0; // linear segment
          this.markers[i] = transMarkers[i] + (eatMarkers[i] - transMarkers[i]) * localT;
        }
      }

      // Override front paws with staggered stepping logic
      // In reverse (Sit -> Eat), the body moves forward. We can use the same stagger, or reverse it.
      let tL = Math.max(0, Math.min(1, smoothT / 0.7)); // Left leg steps early
      let tR = Math.max(0, Math.min(1, (smoothT - 0.3) / 0.7)); // Right leg steps late

      // Left Paw Override
      let localTL = tL < 0.5 ? tL * 2.0 : (tL - 0.5) * 2.0;
      let srcL = tL < 0.5 ? sourceMarkers : transMarkers;
      let dstL = tL < 0.5 ? transMarkers : eatMarkers;
      this.markers[0] = srcL[0] + (dstL[0] - srcL[0]) * localTL;
      this.markers[0 + this.nummarkers * 2] = srcL[0 + this.nummarkers * 2] + (dstL[0 + this.nummarkers * 2] - srcL[0 + this.nummarkers * 2]) * localTL + Math.sin(tL * Math.PI) * 8;

      // Right Paw Override
      let localTR = tR < 0.5 ? tR * 2.0 : (tR - 0.5) * 2.0;
      let srcR = tR < 0.5 ? sourceMarkers : transMarkers;
      let dstR = tR < 0.5 ? transMarkers : eatMarkers;
      this.markers[12] = srcR[12] + (dstR[12] - srcR[12]) * localTR;
      this.markers[12 + this.nummarkers * 2] = srcR[12 + this.nummarkers * 2] + (dstR[12 + this.nummarkers * 2] - srcR[12 + this.nummarkers * 2]) * localTR + Math.sin(tR * Math.PI) * 8;

      // Apply IK to perfectly fold the elbows instead of scaling them
      let L1 = 58.85, L2 = 36.35;

      // Left Front Leg IK
      let Px0 = this.markers[0], Pz0 = this.markers[0 + this.nummarkers * 2];
      let Sx0 = this.markers[2], Sz0 = this.markers[2 + this.nummarkers * 2];
      let elbowL = this.solveIK(Sx0, Sz0, Px0, Pz0, L1, L2, -1);
      this.markers[1] = elbowL.x;
      this.markers[1 + this.nummarkers * 2] = elbowL.z;

      // Right Front Leg IK
      let Px1 = this.markers[12], Pz1 = this.markers[12 + this.nummarkers * 2];
      let Sx1 = this.markers[14], Sz1 = this.markers[14 + this.nummarkers * 2];
      let elbowR = this.solveIK(Sx1, Sz1, Px1, Pz1, L1, L2, -1);
      this.markers[13] = elbowR.x;
      this.markers[13 + this.nummarkers * 2] = elbowR.z;
    } else if (this.sitProgress > 0.0 && this.peeProgress > 0.0 && (this.targetSitProgress === 1.0 || this.targetPeeProgress === 1.0)) {
      // Transition Sit <-> Pee
      let toPee = this.targetPeeProgress === 1.0;
      let t = toPee ? this.peeProgress : this.sitProgress; // 0 to 1
      let smoothT = t * t * (3 - 2 * t); // Global smoothstep easing

      let sourceMarkers = toPee ? this.calculateSitPosture(this.markers, walkertime) : this.calculatePeePosture(this.markers, walkertime);
      let targetMarkers = toPee ? this.calculatePeePosture(this.markers, walkertime) : this.calculateSitPosture(this.markers, walkertime);

      for (i = 0; i < this.nummarkers * 3; i++) {
        this.markers[i] = sourceMarkers[i] + (targetMarkers[i] - sourceMarkers[i]) * smoothT;
      }

      // Staggered stepping logic for Sit <-> Pee
      let tL = Math.max(0, Math.min(1, smoothT / 0.7)); // Left leg steps early
      let tR = Math.max(0, Math.min(1, (smoothT - 0.3) / 0.7)); // Right leg steps late

      // Left Front Paw Override
      this.markers[0] = sourceMarkers[0] + (targetMarkers[0] - sourceMarkers[0]) * tL;
      this.markers[0 + this.nummarkers * 2] = sourceMarkers[0 + this.nummarkers * 2] + (targetMarkers[0 + this.nummarkers * 2] - sourceMarkers[0 + this.nummarkers * 2]) * tL + Math.sin(tL * Math.PI) * 8;

      // Right Front Paw Override
      this.markers[12] = sourceMarkers[12] + (targetMarkers[12] - sourceMarkers[12]) * tR;
      this.markers[12 + this.nummarkers * 2] = sourceMarkers[12 + this.nummarkers * 2] + (targetMarkers[12 + this.nummarkers * 2] - sourceMarkers[12 + this.nummarkers * 2]) * tR + Math.sin(tR * Math.PI) * 8;

      // Move L and R shoulders slightly during weight shift
      let shoulderShift = Math.sin(smoothT * Math.PI);
      this.markers[2] += shoulderShift * 6; // Move L-Shoulder X (forward/backward)
      this.markers[2 + this.nummarkers * 2] += shoulderShift * 12; // Move L-Shoulder Z (upward)
      this.markers[14] += shoulderShift * 6; // Move R-Shoulder X
      this.markers[14 + this.nummarkers * 2] += shoulderShift * 12; // Move R-Shoulder Z

      // Apply IK to perfectly fold the elbows
      let L1 = 58.85, L2 = 36.35;

      let Px0 = this.markers[0], Pz0 = this.markers[0 + this.nummarkers * 2];
      let Sx0 = this.markers[2], Sz0 = this.markers[2 + this.nummarkers * 2];
      let elbowL = this.solveIK(Sx0, Sz0, Px0, Pz0, L1, L2, -1);
      this.markers[1] = elbowL.x;
      this.markers[1 + this.nummarkers * 2] = elbowL.z;

      let Px1 = this.markers[12], Pz1 = this.markers[12 + this.nummarkers * 2];
      let Sx1 = this.markers[14], Sz1 = this.markers[14 + this.nummarkers * 2];
      let elbowR = this.solveIK(Sx1, Sz1, Px1, Pz1, L1, L2, -1);
      this.markers[13] = elbowR.x;
      this.markers[13 + this.nummarkers * 2] = elbowR.z;
    } else {
      // Standard individual blends
      if (this.sitProgress > 0.0) {
        let sitMarkers = this.calculateSitPosture(this.markers, walkertime);
        let easeT = 1 - Math.pow(1 - this.sitProgress, 3);
        for (i = 0; i < this.nummarkers * 3; i++) this.markers[i] += (sitMarkers[i] - this.markers[i]) * easeT;
      }
      if (this.peeProgress > 0.0) {
        let peeMarkers = this.calculatePeePosture(this.markers, walkertime);
        let easeT = 1 - Math.pow(1 - this.peeProgress, 3);
        for (i = 0; i < this.nummarkers * 3; i++) this.markers[i] += (peeMarkers[i] - this.markers[i]) * easeT;
      }
      if (this.biteProgress > 0.0) {
        let biteMarkers = this.calculateBitePosture(this.markers, walkertime);
        let easeT = 1 - Math.pow(1 - this.biteProgress, 3);
        for (i = 0; i < this.nummarkers * 3; i++) this.markers[i] += (biteMarkers[i] - this.markers[i]) * easeT;
      }
      if (this.eatProgress > 0.0) {
        let eatMarkers = this.calculateEatPosture(this.markers, walkertime);
        let easeT = 1 - Math.pow(1 - this.eatProgress, 3);
        for (i = 0; i < this.nummarkers * 3; i++) this.markers[i] += (eatMarkers[i] - this.markers[i]) * easeT;
      }
      if (this.sniffProgress > 0.0) {
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

    let matrix = this.mtrx.rotateaxis(
      -this.axisrot,
      this.walker_rot_xaxis,
      this.walker_rot_yaxis,
      this.walker_rot_zaxis
    );

    matrix = this.mtrx.multmatrix(this.mtrx.translate(this.translation_pos, 0, 0), matrix);

    const angularVelocity = this.flagTranslation ? 0 : this.angularVelocity;
    matrix = this.mtrx.multmatrix(
      this.mtrx.rotateaxis(this.azimuth + (tmsec * angularVelocity) / 1000, 0, 0, 1),
      matrix
    );

    matrix = this.mtrx.multmatrix(this.mtrx.rotateY(this.elevation), matrix);
    matrix = this.mtrx.multmatrix(this.mtrx.rotateX(this.roll), matrix);

    for (i = 0; i < this.nummarkers; i++) {
      const vector = new Array(4);
      vector[0] = this.markers[i] + this.walkerxoff;
      vector[1] =
        this.markers[i + this.nummarkers] + this.walkeryoff * this.structure_vertical_scale;
      vector[2] = this.markers[i + this.nummarkers * 2] + this.walkerzoff;
      vector[3] = 1;

      const v2 = this.mtrx.multmatrixvector(matrix, vector);
      v2[3] = 1;

      //nudge up
      const pixelsperdegree = 37;
      const xpos = (v2[1] / this.walkersizefactor) * this.walker_size * pixelsperdegree;
      const ypos = -(v2[2] / this.walkersizefactor) * this.walker_size * pixelsperdegree;
      const zpos = (v2[0] / this.walkersizefactor) * this.walker_size * pixelsperdegree;
      // console.log(xpos, ypos, zpos);

      const descs = [
        [
          'Head',
          'Clavicles',
          'L-Shoulder',
          'L-Elbow',
          'L-Hand',
          'R-Shoulder',
          'R-Elbow',
          'R-Hand',
          'Belly',
          'L-Hip',
          'L-Knee',
          'L-Ankle',
          'R-Hip',
          'R-Knee',
          'R-Ankle',
        ],
        [
          // cat
        ],
        [
          'Head-C',
          'Head-R',
          'Head-L',
          'Body-1',
          'Body-2',
          'Body-3',
          'Body-4',
          'R-Foot-Front',
          'R-Foot-Rear',
          'L-Foot-Front',
          'L-Foot-Rear',
        ],
        [
          // box
        ],
      ];
      markers.push({ x: xpos, y: ypos, z: zpos, desc: descs[this.type][i] });
    }

    if (this.biteProgress > 0.0 && mx !== undefined && my !== undefined && mx > 0 && my > 0) {
      // Align the center of the line between the head point (index 9) and neck point (index 3) to mouse pointer
      let headMarker = markers[9];
      let neckMarker = markers[3];
      if (headMarker && neckMarker) {
        // Anchor the tip of the snout (end of the 'm') to the cursor
        let pivotX = headMarker.x;
        let pivotY = headMarker.y;

        let targetX = mx - (window.width || 800) / 2;
        let targetY = my - (window.height || 800) / 2;

        let dx_shift = targetX - pivotX;
        let dy_shift = targetY - pivotY;

        let t = this.biteProgress;
        let easeT = 1 - Math.pow(1 - t, 3);

        let shiftX = dx_shift * easeT;
        let shiftY = dy_shift * easeT;

        // 5 degrees in radians is 5 * Math.PI / 180 = 0.087266
        // Shake rapidly at ~5Hz (multiplier 8.5 on walkertime)
        let shakeAngle = 0.087266 * Math.sin(walkertime * 3);
        let currentAngle = shakeAngle * easeT;

        let cosA = Math.cos(currentAngle);
        let sinA = Math.sin(currentAngle);

        for (let k = 0; k < markers.length; k++) {
          let rx = markers[k].x - pivotX;
          let ry = markers[k].y - pivotY;

          let rotX = rx * cosA - ry * sinA;
          let rotY = rx * sinA + ry * cosA;

          markers[k].x = pivotX + rotX + shiftX;
          markers[k].y = pivotY + rotY + shiftY;
        }
      }
    }

    return markers;
  }

  // API: Get markers that make up the line.
  getLineMarkers(walkerHeight, tmsec = undefined) {
    const markers = this.getMarkers(walkerHeight, tmsec);
    const lineMarkers = [];
    const idxsArray = [
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [1, 5],
        [5, 6],
        [6, 7],
        [1, 8],
        [8, 9],
        [9, 10],
        [10, 11],
        [8, 12],
        [12, 13],
        [13, 14],
      ],
      [
        // cat
      ],
      [
        [0, 1],
        [0, 2],
        [3, 5],
        [4, 5],
        [5, 6],
        [7, 8],
        [9, 10],
      ],
      [
        // box
      ],
    ];
    idxsArray[this.type].forEach((idxs) => {
      const i0 = idxs[0];
      const i1 = idxs[1];

      lineMarkers.push([
        { x: markers[i0].x, y: markers[i0].y, z: markers[i0].z, i: i0 },
        { x: markers[i1].x, y: markers[i1].y, z: markers[i1].z, i: i1 },
      ]);
    });

    return lineMarkers;
  }

  // API: Set speed
  setSpeed(speed = 1.0) {
    if (this.type === BMW_TYPE_DOG) {
      return;
    }
    const freq = this.getFrequency();
    // avoid 0 divisor
    if (speed === 0) {
      speed += 0.001;
    }
    this.speed = this.clamp(this.minSpeed, this.maxSpeed, speed);

    this.init();
    let difffreq = freq / this.getFrequency();
    // avoid 0 divisor
    if (abs(difffreq) < 0.005) {
      difffreq += 0.01;
    }
    const t = this.tm.getTimer();
    this.starttime = t - (t - this.starttime) / difffreq;
    // console.log(x, difffreq, t, this.starttime);
  }

  // API: Set parameters on walker
  setWalkerParam(bodyStructure, weight, nervousness, happiness) {
    const freq = this.getFrequency();

    // Body Structure Parameter
    if (bodyStructure !== undefined) {
      this.bodyStructure = this.clamp(this.minBodyStructure, this.maxBodyStructure, bodyStructure);
    }

    // Weight Parameter
    if (weight !== undefined) {
      this.weight = this.clamp(this.minWeight, this.maxWeight, weight);
    }

    // Nervousness Parameter
    if (nervousness !== undefined) {
      this.nervousness = this.clamp(this.minNervousness, this.maxNervousness, nervousness);
    }

    // Happiness Parameter
    if (happiness !== undefined) {
      this.happiness = this.clamp(this.minHappiness, this.maxHappiness, happiness);
    }

    this.init();
    let difffreq = freq / this.getFrequency();
    // avoid 0 divisor
    if (abs(difffreq) < 0.005) {
      difffreq += 0.01;
    }
    const t = this.tm.getTimer();
    this.starttime = t - (t - this.starttime) / difffreq;
  }

  // API: Set parameters on camera
  setCameraParam(azimuth, angularVelocity, elevation, roll) {
    // Camera azimuth(rotation) Parameter
    if (azimuth !== undefined) {
      this.azimuth = azimuth;
    }

    // Camera angular velocity(rotation speed) Parameter
    if (angularVelocity !== undefined) {
      this.angularVelocity = angularVelocity;
    }

    // Camera elevation Parameter
    if (elevation !== undefined) {
      this.elevation = elevation;
    }

    // Camera roll Parameter
    if (roll !== undefined) {
      this.roll = roll;
    }
  }

  // API: Set parameters on translation
  setTranslationParam(flagTranslation) {
    if (flagTranslation !== undefined) {
      this.flagTranslation = flagTranslation;
    }
  }

  // API: Reset timer value
  resetTimer() {
    this.starttime = this.tm.getTimer();
    this.init();
  }

  // API: Get loop period in mesec
  getPeriod() {
    return 1000 * this.getFrequency() / 120;
  }

  // API: Set motion type ('walk' or 'run' or 'sit' or 'pee' or 'bite') for Dog
  setMotionType(motionType) {
    if (this.type === BMW_TYPE_DOG && this.walkerData) {
      this.motionType = motionType;
      if (motionType === 'sit') {
        this.targetSitProgress = 1.0;
        this.targetPeeProgress = 0.0;
        this.targetBiteProgress = 0.0;
        this.targetEatProgress = 0.0;
        this.targetSniffProgress = 0.0;
        this.targetRunProgress = 0.0;
        if (this.sitProgress === 0.0) {
          if (window.isMobileMode) {
            this.sitAnchorX = 0.0;
          } else if (this.markers && this.markers[5] !== undefined) {
            this.sitAnchorX = this.markers[5];
            if (this.eatProgress > 0.0) this.sitAnchorX -= 60;
          }
        }
      } else if (motionType === 'pee') {
        this.targetPeeProgress = 1.0;
        this.targetSitProgress = 0.0;
        this.targetBiteProgress = 0.0;
        this.targetEatProgress = 0.0;
        this.targetSniffProgress = 0.0;
        this.targetRunProgress = 0.0;
        if (this.peeProgress === 0.0) {
          if (window.isMobileMode) {
            this.peeAnchorX = 0.0;
          } else if (this.markers && this.markers[5] !== undefined) {
            this.peeAnchorX = this.markers[5];
            if (this.eatProgress > 0.0) this.peeAnchorX -= 60;
          }
        }
      } else if (motionType === 'bite') {
        this.targetBiteProgress = 1.0;
        this.targetSitProgress = 0.0;
        this.targetPeeProgress = 0.0;
        this.targetEatProgress = 0.0;
        this.targetSniffProgress = 0.0;
        this.targetRunProgress = 0.0;
      } else if (motionType === 'sniff') {
        this.targetSitProgress = 0.0;
        this.targetPeeProgress = 0.0;
        this.targetBiteProgress = 0.0;
        this.targetEatProgress = 0.0;
        this.targetSniffProgress = 1.0;
        this.targetRunProgress = 0.0;
        if (this.sniffProgress === 0.0) {
          if (window.isMobileMode) {
            this.sniffAnchorX = 0.0;
          } else if (this.markers && this.markers[5] !== undefined) {
            this.sniffAnchorX = this.markers[5];
            if (this.sitProgress > 0.0 || this.peeProgress > 0.0) this.sniffAnchorX += 60;
          }
        }
      } else if (motionType === 'eat') {
        this.targetSitProgress = 0.0;
        this.targetPeeProgress = 0.0;
        this.targetBiteProgress = 0.0;
        this.targetEatProgress = 1.0;
        this.targetSniffProgress = 0.0;
        this.targetRunProgress = 0.0;
        if (this.eatProgress === 0.0) {
          if (window.isMobileMode) {
            this.eatAnchorX = 0.0;
          } else if (this.markers && this.markers[5] !== undefined) {
            this.eatAnchorX = this.markers[5];
            if (this.sitProgress > 0.0 || this.peeProgress > 0.0) this.eatAnchorX += 60;
          }
        }
      } else {
        this.targetSitProgress = 0.0;
        this.targetPeeProgress = 0.0;
        this.targetBiteProgress = 0.0;
        this.targetEatProgress = 0.0;
        this.targetSniffProgress = 0.0;
        if (motionType === 'run') {
          this.targetRunProgress = 1.0;
          this.locomotionGait = 'run';
        } else if (motionType === 'walk') {
          this.targetRunProgress = 0.0;
          this.locomotionGait = 'walk';
        }
        if (motionType === 'run' && this.walkerData.meanwalker_run) {
          this.meanwalker[1] = this.walkerData.meanwalker_run;
        } else if (this.walkerData.meanwalker_walk) {
          this.meanwalker[1] = this.walkerData.meanwalker_walk;
        }
      }
    }
  }

  // ----- Internal methods
  solveIK(Hx, Hz, Px, Pz, L1, L2, bendDir) {
    let dx = Px - Hx;
    let dz = Pz - Hz;
    let d = Math.sqrt(dx * dx + dz * dz);

    if (d > L1 + L2) {
      let ratio = L1 / d;
      return { x: Hx + dx * ratio, z: Hz + dz * ratio };
    }
    if (d < Math.abs(L1 - L2)) {
      let ratio = L1 / d;
      return { x: Hx + dx * ratio, z: Hz + dz * ratio };
    }

    let alpha = Math.atan2(dz, dx);
    let cosBeta = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
    cosBeta = Math.max(-1, Math.min(1, cosBeta));
    let beta = Math.acos(cosBeta);

    return {
      x: Hx + L1 * Math.cos(alpha + bendDir * beta),
      z: Hz + L1 * Math.sin(alpha + bendDir * beta)
    };
  }

  calculateSitPosture(activeMarkers, walkertime) {
    let sitMarkers = new Array(this.nummarkers * 3);

    // Sample base markers at walkertime = 0 (frozen posture) to get default static Y coordinates
    let baseMarkers = new Array(this.nummarkers * 3);
    for (let i = 0; i < this.nummarkers * 3; i++) {
      baseMarkers[i] = this.sample(i, 0, true, true);
    }

    const defaultSitCoords = [
      { x: 40.759, z: -156.176 },  // 0: L-Paw-Front
      { x: 34.291, z: -113.69 },   // 1: L-Elbow-Front
      { x: 34.704, z: -54.842 },   // 2: L-Shoulder
      { x: 77.915, z: 68.989 },    // 3: Neck
      { x: 34.661, z: 58.363 },    // 4: Chest
      { x: -76.285, z: -151.097 }, // 5: L-Paw-Back
      { x: -140.016, z: -152.025 },// 6: L-Knee-Back
      { x: -73.968, z: -92.126 },  // 7: L-Hip
      { x: -175.5, z: -132.416 },  // 8: Pelvis
      { x: 123.971, z: 68.484 },   // 9: Head
      { x: -61.817, z: -25.534 },  // 10: Belly
      { x: -209.819, z: -125.097 },// 11: Tail
      { x: 33.167, z: -155.189 },  // 12: R-Paw-Front
      { x: 28.231, z: -107.135 },  // 13: R-Elbow-Front
      { x: 30.934, z: -52.52 },    // 14: R-Shoulder
      { x: -71.047, z: -157.297 }, // 15: R-Paw-Back
      { x: -127.586, z: -152.867 },// 16: R-Knee-Back
      { x: -58.854, z: -83.436 },  // 17: R-Hip
      { x: -244.284, z: -105.844 },// 18: Tail-Mid
      { x: -246.923, z: -68.615 }  // 19: Tail-End
    ];
    const sitCoords = this.customSitCoords || defaultSitCoords;

    // Find anchor point. We align the sit posture's L-Paw-Back (index 5) with the anchor X
    let anchorX = this.sitAnchorX !== undefined ? this.sitAnchorX : activeMarkers[5];
    let shiftX = anchorX - sitCoords[5].x;

    for (let i = 0; i < this.nummarkers; i++) {
      let ox = 0, oy = 0, oz = 0;
      if (this.jointOffsets && this.jointOffsets[i]) {
        ox = this.jointOffsets[i].x;
        oy = this.jointOffsets[i].y;
        oz = this.jointOffsets[i].z;
      }

      // X coordinate: Sit X + shift + offset
      sitMarkers[i] = sitCoords[i].x + shiftX + ox;

      // Y coordinate: static base Y + offset
      sitMarkers[i + this.nummarkers] = baseMarkers[i + this.nummarkers] + oy;

      // Z coordinate: Sit Z + offset
      sitMarkers[i + this.nummarkers * 2] = sitCoords[i].z + oz;
    }

    // Dynamic Tail Wag using walkertime and scaled by happiness
    let h = Math.max(0.15, this.happiness / 10.0); // minimum wag factor of 0.15
    if (h !== 0) {
      let t = walkertime;
      // Increased tail segment lengths for a longer tail
      let L1 = 26.0;
      let L2 = 45.0;
      let L3 = 50.0;

      let pelvisX = sitMarkers[8];
      let pelvisZ = sitMarkers[8 + this.nummarkers * 2];

      let theta1 = 135.0 * Math.PI / 180.0 + h * 45.0 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * t - 0.0));
      let theta2 = 98.13 * Math.PI / 180.0 + h * 81.93 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * t - 1.0));
      let theta3 = 50.19 * Math.PI / 180.0 + h * 129.9 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * t - 2.0));

      let tail1X = pelvisX + L1 * Math.cos(theta1);
      let tail1Z = pelvisZ + L1 * Math.sin(theta1);
      sitMarkers[11] = tail1X;
      sitMarkers[11 + this.nummarkers * 2] = tail1Z;

      let tail2X = tail1X + L2 * Math.cos(theta2);
      let tail2Z = tail1Z + L2 * Math.sin(theta2);
      sitMarkers[18] = tail2X;
      sitMarkers[18 + this.nummarkers * 2] = tail2Z;

      let tail3X = tail2X + L3 * Math.cos(theta3);
      let tail3Z = tail2Z + L3 * Math.sin(theta3);
      sitMarkers[19] = tail3X;
      sitMarkers[19 + this.nummarkers * 2] = tail3Z;
    }

    // Dynamic head movement: move to target coords quickly, hold 0.5s, return. Every 4 seconds.
    let timeMs = this.tm.getTimer();
    let cycleTime = timeMs % 4000; // 4 seconds total cycle

    let mix = 0; // 0 = initial position, 1 = target position

    if (cycleTime < 100) {
      // 0 to 100ms: move to target extremely fast (linear)
      mix = cycleTime / 100.0;
    } else if (cycleTime < 600) {
      // 100ms to 600ms: stay at target (exactly 0.5 seconds)
      mix = 1.0;
    } else if (cycleTime < 700) {
      // 600ms to 700ms: move back extremely fast (linear)
      mix = 1.0 - ((cycleTime - 600) / 100.0);
    } else {
      // 700ms to 4000ms: stay at initial
      mix = 0.0;
    }

    if (mix > 0) {
      // Head target from sit-head-move.json
      let ox = 0, oz = 0;
      if (this.jointOffsets && this.jointOffsets[9]) {
        ox = this.jointOffsets[9].x;
        oz = this.jointOffsets[9].z;
      }
      let targetHeadX = 132.971 + shiftX + ox;
      let targetHeadZ = 65.884 + oz;

      sitMarkers[9] = sitMarkers[9] * (1 - mix) + targetHeadX * mix;
      sitMarkers[9 + this.nummarkers * 2] = sitMarkers[9 + this.nummarkers * 2] * (1 - mix) + targetHeadZ * mix;

      // Neck target from sit-head-move.json to keep it connected naturally
      let oxN = 0, ozN = 0;
      if (this.jointOffsets && this.jointOffsets[3]) {
        oxN = this.jointOffsets[3].x;
        ozN = this.jointOffsets[3].z;
      }
      let targetNeckX = 50.215 + shiftX + oxN;
      let targetNeckZ = 70.589 + ozN;

      sitMarkers[3] = sitMarkers[3] * (1 - mix) + targetNeckX * mix;
      sitMarkers[3 + this.nummarkers * 2] = sitMarkers[3 + this.nummarkers * 2] * (1 - mix) + targetNeckZ * mix;
    }

    return sitMarkers;
  }

  calculatePeePosture(activeMarkers, walkertime) {
    let peeMarkers = new Array(this.nummarkers * 3);

    // Save locomotion state to ensure base markers are always sampled from standard walk baseline
    let originalMeanwalker = this.meanwalker[1];
    let originalLocomotionGait = this.locomotionGait;

    if (this.walkerData && this.walkerData.meanwalker_walk) {
      this.meanwalker[1] = this.walkerData.meanwalker_walk;
    }
    this.locomotionGait = 'walk';

    // Sample base markers at walkertime = 0 (frozen posture)
    let baseMarkers = new Array(this.nummarkers * 3 + 1);
    for (let i = 0; i < this.nummarkers * 3 + 1; i++) {
      baseMarkers[i] = this.sample(i, 0, true, true);
    }

    // Restore original locomotion state
    this.meanwalker[1] = originalMeanwalker;
    this.locomotionGait = originalLocomotionGait;

    const peeOffsets = [
      { x: -104, z: 3 },
      { x: -111, z: 14 },
      { x: -67, z: 21 },
      { x: -62, z: -3 },
      { x: -74, z: -10 },
      { x: -44, z: -4 },
      { x: -55, z: -33 },
      { x: -34, z: -48 },
      { x: -57, z: -107 },
      { x: -35, z: 8 },
      { x: -76, z: -18 },
      { x: -13, z: -14 },
      { x: 28, z: 8 },
      { x: 12, z: -7 },
      { x: -23, z: -15 },
      { x: 77, z: -10 },
      { x: 26, z: -92 },
      { x: -3, z: -63 },
      { x: -23, z: -13 },
      { x: -24, z: 5 }  // 19: Tail-End (Cumulative: Tail-Mid -79 + Tail-End -49, Tail-Mid -125 + Tail-End -2)
    ];

    // Target position of L-Paw-Back (node 5)
    let targetX_5 = baseMarkers[5] + peeOffsets[5].x;

    let anchorX = this.peeAnchorX !== undefined ? this.peeAnchorX : activeMarkers[5];
    let shiftX = anchorX - targetX_5;

    for (let i = 0; i < this.nummarkers; i++) {
      let offset = peeOffsets[i] || { x: 0, z: 0 };

      // X coordinate
      peeMarkers[i] = baseMarkers[i] + offset.x + shiftX;

      // Y coordinate (no change, Y is 0 offset)
      peeMarkers[i + this.nummarkers] = baseMarkers[i + this.nummarkers];

      // Z coordinate
      peeMarkers[i + this.nummarkers * 2] = baseMarkers[i + this.nummarkers * 2] + offset.z;
    }

    // Dynamic Tail Wag using absolute real time so it keeps wagging even when legs freeze
    let h = Math.max(0.15, this.happiness / 10.0); // minimum wag factor of 0.15
    if (h !== 0) {
      let t = this.tm.getTimer() / 90.0; // Uncouple from frozen walkertime
      let L1 = 26.0;
      let L2 = 45.0;
      let L3 = 50.0;

      let pelvisX = peeMarkers[8];
      let pelvisZ = peeMarkers[8 + this.nummarkers * 2];

      // Tail almost straight, rotated 20 deg clockwise (150 degrees), only the tip wags slightly
      let theta1 = 150.0 * Math.PI / 180.0;
      let theta2 = 150.0 * Math.PI / 180.0;
      let theta3 = 150.0 * Math.PI / 180.0 + (h * 0.5) * Math.sin(t * 3.0);

      let tail1X = pelvisX + L1 * Math.cos(theta1);
      let tail1Z = pelvisZ + L1 * Math.sin(theta1);
      peeMarkers[11] = tail1X;
      peeMarkers[11 + this.nummarkers * 2] = tail1Z;

      let tail2X = tail1X + L2 * Math.cos(theta2);
      let tail2Z = tail1Z + L2 * Math.sin(theta2);
      peeMarkers[18] = tail2X;
      peeMarkers[18 + this.nummarkers * 2] = tail2Z;

      let tail3X = tail2X + L3 * Math.cos(theta3);
      let tail3Z = tail2Z + L3 * Math.sin(theta3);
      peeMarkers[19] = tail3X;
      peeMarkers[19 + this.nummarkers * 2] = tail3Z;
    }

    return peeMarkers;
  }


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
    let targetAnchor = 170.0;
    let easeT = 1 - Math.pow(1 - this.sniffProgress, 3);
    let anchorX = startAnchor * (1 - easeT) + targetAnchor * easeT;

    let scaleFactor = 0.50;
    let pawX_sniff = sniffFrame[5].x;
    let pawY_base = baseMarkers[5 + this.nummarkers];
    let pawZ_sniff = sniffFrame[5].z;

    let shiftX = anchorX - pawX_sniff;
    let shiftZ = 55.0 * easeT; // Positive Z translates to negative Y (upwards) on screen

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
      sniffMarkers[i + this.nummarkers * 2] = scaledZ + shiftZ;
    }

    // Dynamic Tail Wag using absolute real time so it keeps wagging even when legs freeze
    let h = Math.max(0.15, this.happiness / 10.0);
    if (h !== 0) {
      let t = this.tm.getTimer() / 90.0; // Uncouple from frozen walkertime
      let L1 = 26.0 * scaleFactor;
      let L2 = 45.0 * scaleFactor;
      let L3 = 50.0 * scaleFactor;

      let pelvisX = sniffMarkers[8];
      let pelvisZ = sniffMarkers[8 + this.nummarkers * 2];

      let theta1 = 135.0 * Math.PI / 180.0 + h * 45.0 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * t - 0.0));
      let theta2 = 98.13 * Math.PI / 180.0 + h * 81.93 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * t - 1.0));
      let theta3 = 50.19 * Math.PI / 180.0 + h * 129.9 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * t - 2.0));

      let tail1X = pelvisX + L1 * Math.cos(theta1);
      let tail1Z = pelvisZ + L1 * Math.sin(theta1);
      sniffMarkers[11] = tail1X;
      sniffMarkers[11 + this.nummarkers * 2] = tail1Z;

      let tail2X = tail1X + L2 * Math.cos(theta2);
      let tail2Z = tail1Z + L2 * Math.sin(theta2);
      sniffMarkers[18] = tail2X;
      sniffMarkers[18 + this.nummarkers * 2] = tail2Z;

      let tail3X = tail2X + L3 * Math.cos(theta3);
      let tail3Z = tail2Z + L3 * Math.sin(theta3);
      sniffMarkers[19] = tail3X;
      sniffMarkers[19 + this.nummarkers * 2] = tail3Z;
    }

    return sniffMarkers;
  }

  calculateEatPosture(activeMarkers, walkertime) {
    let eatMarkers = new Array(this.nummarkers * 3);

    // Sample base markers at walkertime = 0
    let baseMarkers = new Array(this.nummarkers * 3);
    for (let i = 0; i < this.nummarkers * 3; i++) {
      baseMarkers[i] = this.sample(i, 0, true, true);
    }

    const eatFrames = [
      [
        { x: 147.659, z: -148.576 },
        { x: 128.791, z: -117.59 },
        { x: 110.404, z: -70.842 },
        { x: 224.015, z: -50.411 },
        { x: 188.261, z: -8.137 },
        { x: -108.085, z: -142.997 },
        { x: -129.216, z: -95.825 },
        { x: -104.068, z: -40.226 },
        { x: -132, z: 60.284 },
        { x: 260.535, z: -105.9 },
        { x: 8.383, z: 71.266 },
        { x: -152.2, z: 37.884 },
        { x: 70.267, z: -148.09 },
        { x: 55.531, z: -116.835 },
        { x: 69.034, z: -53.62 },
        { x: -162.647, z: -151.097 },
        { x: -181.086, z: -110.267 },
        { x: -136.154, z: -43.436 },
        { x: -181.7, z: 26.584 },
        { x: -215.298, z: 44.481 }
      ],
      [
        { x: 147.459, z: -148.676 },
        { x: 128.291, z: -117.69 },
        { x: 110.704, z: -70.842 },
        { x: 232.115, z: -43.011 },
        { x: 188.661, z: -7.637 },
        { x: -108.285, z: -143.097 },
        { x: -129.016, z: -96.025 },
        { x: -103.968, z: -40.126 },
        { x: -131.5, z: 60.584 },
        { x: 270.635, z: -122.2 },
        { x: 8.183, z: 71.466 },
        { x: -151.5, z: 38.584 },
        { x: 70.567, z: -147.689 },
        { x: 55.231, z: -117.135 },
        { x: 68.934, z: -53.52 },
        { x: -163.047, z: -151.297 },
        { x: -180.586, z: -109.867 },
        { x: -135.854, z: -43.436 },
        { x: -181.5, z: 27.584 },
        { x: -215.498, z: 45.581 }
      ]
    ];

    let timeMs = this.tm.getTimer();

    // Smoothly blend between frame 0 (up) and frame 1 (down) using a sine wave
    // A full cycle (up -> down -> up) is controlled by the multiplier (e.g. 16.0 for faster eating)
    let eatPhase = Math.sin((timeMs / 1000.0) * 16.0); // -1 to 1
    let mix = (eatPhase + 1.0) / 2.0; // 0 to 1

    let anchorX = this.eatAnchorX !== undefined ? this.eatAnchorX : activeMarkers[5];

    let scaleFactor = 0.9; // Scale down the dog body by 10%

    // Interpolate the base paw anchor from the two frames (now using index 5: L-Paw-Back)
    let pawX_eat = eatFrames[0][5].x * (1 - mix) + eatFrames[1][5].x * mix;
    let pawZ_eat = eatFrames[0][5].z * (1 - mix) + eatFrames[1][5].z * mix;
    let pawY_base = baseMarkers[5 + this.nummarkers];

    for (let i = 0; i < this.nummarkers; i++) {
      let ox = 0, oy = 0, oz = 0;
      if (this.jointOffsets && this.jointOffsets[i]) {
        ox = this.jointOffsets[i].x;
        oy = this.jointOffsets[i].y;
        oz = this.jointOffsets[i].z;
      }

      // Interpolate the current joint from the two frames
      let currentX = eatFrames[0][i].x * (1 - mix) + eatFrames[1][i].x * mix;
      let currentZ = eatFrames[0][i].z * (1 - mix) + eatFrames[1][i].z * mix;

      // X coordinate: Scale relative to interpolated paw, then shift to anchorX, then add offset
      let scaledX = pawX_eat + (currentX - pawX_eat) * scaleFactor;
      let shiftX = anchorX - pawX_eat;
      eatMarkers[i] = scaledX + shiftX + ox;

      // Y coordinate: Scale relative to base back paw Y, then add offset
      let scaledY = pawY_base + (baseMarkers[i + this.nummarkers] - pawY_base) * scaleFactor;
      eatMarkers[i + this.nummarkers] = scaledY + oy;

      // Z coordinate: Scale relative to interpolated paw Z, then add offset
      let scaledZ = pawZ_eat + (currentZ - pawZ_eat) * scaleFactor;
      eatMarkers[i + this.nummarkers * 2] = scaledZ + oz;
    }

    // Animate tail wag
    let pelvisX = eatMarkers[8];
    let pelvisZ = eatMarkers[8 + this.nummarkers * 2];

    let wagTime = timeMs / 500.0; // scales time for wagging
    let h = 0.5; // moderate wag amplitude

    let thetaTail1 = 135.0 * Math.PI / 180.0 + h * 45.0 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * wagTime - 0.0));
    let thetaTail2 = 98.13 * Math.PI / 180.0 + h * 81.93 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * wagTime - 1.0));
    let thetaTail3 = 50.19 * Math.PI / 180.0 + h * 129.9 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * wagTime - 2.0));

    let L1 = 26.0, L2 = 45.0, L3 = 50.0;

    eatMarkers[11] = pelvisX + L1 * Math.cos(thetaTail1);
    eatMarkers[11 + this.nummarkers * 2] = pelvisZ + L1 * Math.sin(thetaTail1);

    eatMarkers[18] = eatMarkers[11] + L2 * Math.cos(thetaTail2);
    eatMarkers[18 + this.nummarkers * 2] = eatMarkers[11 + this.nummarkers * 2] + L2 * Math.sin(thetaTail2);

    eatMarkers[19] = eatMarkers[18] + L3 * Math.cos(thetaTail3);
    eatMarkers[19 + this.nummarkers * 2] = eatMarkers[18 + this.nummarkers * 2] + L3 * Math.sin(thetaTail3);

    return eatMarkers;
  }


  calculateBitePosture(activeMarkers, walkertime) {
    let biteMarkers = new Array(this.nummarkers * 3);

    // Save locomotion state to ensure base markers are always sampled from standard walk baseline
    let originalMeanwalker = this.meanwalker[1];
    let originalLocomotionGait = this.locomotionGait;

    if (this.walkerData && this.walkerData.meanwalker_walk) {
      this.meanwalker[1] = this.walkerData.meanwalker_walk;
    }
    this.locomotionGait = 'walk';

    // Sample base markers at walkertime = 0 (frozen posture)
    let baseMarkers = new Array(this.nummarkers * 3 + 1);
    for (let i = 0; i < this.nummarkers * 3 + 1; i++) {
      baseMarkers[i] = this.sample(i, 0, true, true);
    }

    // Restore original locomotion state
    this.meanwalker[1] = originalMeanwalker;
    this.locomotionGait = originalLocomotionGait;

    const biteOffsets = [
      { x: 109, z: 136 },   // 0: L-Paw-Front
      { x: 84, z: 94 },    // 1: L-Elbow-Front
      { x: 123, z: 66 },    // 2: L-Shoulder
      { x: 112, z: -5 },    // 3: Neck
      { x: 98, z: -13 },   // 4: Chest
      { x: 52, z: -2 },    // 5: L-Paw-Back
      { x: 69, z: -34 },   // 6: L-Knee-Back
      { x: 63, z: -65 },   // 7: L-Hip
      { x: 101, z: -59 },   // 8: Pelvis
      { x: 151, z: -5 },    // 9: Head
      { x: 97, z: -4 },    // 10: Belly
      { x: 88, z: -44 },   // 11: Tail
      { x: 271, z: 103 },   // 12: R-Paw-Front
      { x: 213, z: 57 },    // 13: R-Elbow-Front
      { x: 135, z: -20 },   // 14: R-Shoulder
      { x: 283, z: 7 },     // 15: R-Paw-Back
      { x: 227, z: -83 },   // 16: R-Knee-Back
      { x: 170, z: -52 },   // 17: R-Hip
      { x: 70, z: -63 },   // 18: Tail-Mid
      { x: 47, z: -38 }     // 19: Tail-End
    ];

    // Compute basic bite positions
    for (let i = 0; i < this.nummarkers; i++) {
      let offset = biteOffsets[i] || { x: 0, z: 0 };
      biteMarkers[i] = baseMarkers[i] + offset.x;
      biteMarkers[i + this.nummarkers] = baseMarkers[i + this.nummarkers];
      biteMarkers[i + this.nummarkers * 2] = baseMarkers[i + this.nummarkers * 2] + offset.z;
    }

    // Animate front paws up and down (out of phase)
    let speedMult = 2.5; // Tugging scratch speed
    let amplitude = 0.0; // height of paw movement (set to 0 to stop paw movement)
    let phase = (walkertime / (2 * Math.PI)) % 1.0;
    if (phase < 0) phase += 1.0;
    let wave = Math.sin(2 * Math.PI * phase * speedMult);

    let lPawX = biteMarkers[0];
    let lPawZ = biteMarkers[0 + this.nummarkers * 2] + wave * amplitude;

    let rPawX = biteMarkers[12];
    let rPawZ = biteMarkers[12 + this.nummarkers * 2] - wave * amplitude;

    biteMarkers[0] = lPawX;
    biteMarkers[0 + this.nummarkers * 2] = lPawZ;
    biteMarkers[12] = rPawX;
    biteMarkers[12 + this.nummarkers * 2] = rPawZ;

    // Resolve front elbows using IK
    let lShoulderX = biteMarkers[2];
    let lShoulderZ = biteMarkers[2 + this.nummarkers * 2];
    let rShoulderX = biteMarkers[14];
    let rShoulderZ = biteMarkers[14 + this.nummarkers * 2];

    let lElbow = this.solveIK(lShoulderX, lShoulderZ, lPawX, lPawZ, 95.0, 35.0, 1);
    let rElbow = this.solveIK(rShoulderX, rShoulderZ, rPawX, rPawZ, 95.0, 35.0, 1);

    biteMarkers[1] = lElbow.x;
    biteMarkers[1 + this.nummarkers * 2] = lElbow.z;

    biteMarkers[13] = rElbow.x;
    biteMarkers[13 + this.nummarkers * 2] = rElbow.z;

    // Animate tail wag in bite mode using angular formulation
    let pelvisX = biteMarkers[8];
    let pelvisZ = biteMarkers[8 + this.nummarkers * 2];
    let wagPhase = (walkertime / (2 * Math.PI)) % 1.0;
    if (wagPhase < 0) wagPhase += 1.0;
    let wagSpeed = 2.5; // slightly faster than sit wag for excitement
    let h = 0.5; // moderate wag amplitude (0=no wag, 1=full happy)

    let thetaTail1 = 135.0 * Math.PI / 180.0 + h * 45.0 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * walkertime - 0.0));
    let thetaTail2 = 98.13 * Math.PI / 180.0 + h * 81.93 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * walkertime - 1.0));
    let thetaTail3 = 50.19 * Math.PI / 180.0 + h * 129.9 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * walkertime - 2.0));

    let L1 = 21.213, L2 = 35.355, L3 = 39.051;

    let tail1X = pelvisX + L1 * Math.cos(thetaTail1);
    let tail1Z = pelvisZ + L1 * Math.sin(thetaTail1);
    biteMarkers[11] = tail1X;
    biteMarkers[11 + this.nummarkers * 2] = tail1Z;

    let tail2X = tail1X + L2 * Math.cos(thetaTail2);
    let tail2Z = tail1Z + L2 * Math.sin(thetaTail2);
    biteMarkers[18] = tail2X;
    biteMarkers[18 + this.nummarkers * 2] = tail2Z;

    let tail3X = tail2X + L3 * Math.cos(thetaTail3);
    let tail3Z = tail2Z + L3 * Math.sin(thetaTail3);
    biteMarkers[19] = tail3X;
    biteMarkers[19 + this.nummarkers * 2] = tail3Z;

    return biteMarkers;

  }

  clamp(min, max, val) {
    return Math.min(max, Math.max(min, val));
  }

  init() {
    this.nummarkers = (this.meanwalker[this.type].length / 5 - 1) / 3;
    this.markers = new Array(this.nummarkers * 3);
    this.recalc_angle();
    this.calcsize();
    this.walker_translation_speed = this.calcTranslationSpeed();
  }

  recalc_angle() {
    const res = this.mtrx.angleBetween(0, 0, 1, 0, 0, 1);
    this.walker_rot_xaxis = res[0];
    this.walker_rot_yaxis = res[1];
    this.walker_rot_zaxis = res[2];
    this.axisrot = res[3];
  }

  calculateEatToSitPosture(activeMarkers, forceAnchorX) {
    let transMarkers = new Array(this.nummarkers * 3);

    // Sample base markers at walkertime = 0
    let baseMarkers = new Array(this.nummarkers * 3);
    for (let i = 0; i < this.nummarkers * 3; i++) {
      baseMarkers[i] = this.sample(i, 0, true, true);
    }

    const transCoords = [
      { x: 116.459, z: -140.806 },
      { x: 103.296, z: -93.419 },
      { x: 97.365, z: -61.718 },
      { x: 184.831, z: -3.623 },
      { x: 155.764, z: 44.252 },
      { x: -77.311, z: -143.585 },
      { x: -87.12, z: -103.757 },
      { x: -87.914, z: -71.837 },
      { x: -154.544, z: -25.524 },
      { x: 232.542, z: -45.693 },
      { x: -7.589, z: 14.233 },
      { x: -175.389, z: -9.983 },
      { x: 61.242, z: -148.033 },
      { x: 56.917, z: -99.294 },
      { x: 61.324, z: -56.591 },
      { x: -126.471, z: -150.902 },
      { x: -115.522, z: -111.392 },
      { x: -99.837, z: -69.553 },
      { x: -181.954, z: 34.535 },
      { x: -178.82, z: 84.437 }
    ];

    let anchorX = forceAnchorX !== undefined ? forceAnchorX : (this.sitAnchorX !== undefined ? this.sitAnchorX : activeMarkers[5]);
    let shiftX = anchorX - transCoords[5].x;

    for (let i = 0; i < this.nummarkers; i++) {
      let ox = 0, oy = 0, oz = 0;
      if (this.jointOffsets && this.jointOffsets[i]) {
        ox = this.jointOffsets[i].x;
        oy = this.jointOffsets[i].y;
        oz = this.jointOffsets[i].z;
      }
      transMarkers[i] = transCoords[i].x + shiftX + ox;
      transMarkers[i + this.nummarkers] = baseMarkers[i + this.nummarkers] + oy;
      transMarkers[i + this.nummarkers * 2] = transCoords[i].z + oz;
    }
    return transMarkers;
  }

  calcsize() {
    if (this.type === BMW_TYPE_DOG && this.walkerData && this.walkerData.meanwalker_walk && this.walkerData.meanwalker_run) {
      if (!this.walkSize) {
        this.walkSize = this.calcsizeForGait(this.walkerData.meanwalker_walk);
      }
      if (!this.runSize) {
        this.runSize = this.calcsizeForGait(this.walkerData.meanwalker_run);
      }
      this.updateBlendedSizes();
    } else {
      let n;
      this.walkerxmin = 0;
      this.walkerxmax = 0;
      this.walkerymin = 0;
      this.walkerymax = 0;
      this.walkerzmin = 0;
      this.walkerzmax = 0;

      // Calc min/max of x, y, z.
      for (n = 0; n < this.nummarkers; n++) {
        this.walkerxmin = Math.min(this.walkerxmin, this.meanwalker[this.type][n]);
        this.walkerxmax = Math.max(this.walkerxmax, this.meanwalker[this.type][n]);
      }
      for (n = this.nummarkers; n < this.nummarkers * 2; n++) {
        this.walkerymin = Math.min(this.walkerymin, this.meanwalker[this.type][n]);
        this.walkerymax = Math.max(this.walkerymax, this.meanwalker[this.type][n]);
      }
      for (n = this.nummarkers * 2; n < this.nummarkers * 3; n++) {
        this.walkerzmin = Math.min(this.walkerzmin, this.meanwalker[this.type][n]);
        this.walkerzmax = Math.max(this.walkerzmax, this.meanwalker[this.type][n]);
      }

      // The walker height in mm. Used later on to scale it to the desired size in degrees.
      this.walkersizefactor = this.walkerzmax - this.walkerzmin;

      this.walkerxoff = -(this.walkerxmax + this.walkerxmin) / 2;
      this.walkeryoff = -(this.walkerymax + this.walkerymin) / 2;
      this.walkerzoff = -(this.walkerzmax + this.walkerzmin) / 2;
    }
  } // end of calsize()

  calcsizeForGait(gaitData) {
    let xmin = Infinity, xmax = -Infinity;
    let ymin = Infinity, ymax = -Infinity;
    let zmin = Infinity, zmax = -Infinity;
    let nummarkers = (gaitData.length / 5 - 1) / 3;

    for (let n = 0; n < nummarkers; n++) {
      xmin = Math.min(xmin, gaitData[n]);
      xmax = Math.max(xmax, gaitData[n]);
    }
    for (let n = nummarkers; n < nummarkers * 2; n++) {
      ymin = Math.min(ymin, gaitData[n]);
      ymax = Math.max(ymax, gaitData[n]);
    }
    for (let n = nummarkers * 2; n < nummarkers * 3; n++) {
      zmin = Math.min(zmin, gaitData[n]);
      zmax = Math.max(zmax, gaitData[n]);
    }

    let sizefactor = zmax - zmin;
    let xoff = -(xmax + xmin) / 2;
    let yoff = -(ymax + ymin) / 2;
    let zoff = -(zmax + zmin) / 2;

    return { sizefactor, xoff, yoff, zoff };
  }

  updateBlendedSizes() {
    if (this.walkSize && this.runSize) {
      let t = this.runProgress;
      this.walkersizefactor = this.walkSize.sizefactor + (this.runSize.sizefactor - this.walkSize.sizefactor) * t;
      this.walkerxoff = this.walkSize.xoff + (this.runSize.xoff - this.walkSize.xoff) * t;
      this.walkeryoff = this.walkSize.yoff + (this.runSize.yoff - this.walkSize.yoff) * t;
      this.walkerzoff = this.walkSize.zoff + (this.runSize.zoff - this.walkSize.zoff) * t;
    }
  }

  adjustStartTimeForNewFrequency(oldFreq, newFreq) {
    if (Math.abs(oldFreq - newFreq) > 0.0001) {
      let difffreq = oldFreq / newFreq;
      const t = this.tm.getTimer();
      this.starttime = t - (t - this.starttime) / difffreq;
    }
  }

  sample(i, walkertime, includeStructure, ignoreActiveMarkers = false) {
    if (this.type === BMW_TYPE_DOG && i < this.nummarkers * 3 && this.walkerData && this.walkerData.meanwalker_run && this.walkerData.meanwalker_walk) {
      // Save state
      let originalMeanwalker = this.meanwalker[1];
      let originalLocomotionGait = this.locomotionGait;

      // Sample Walk
      this.meanwalker[1] = this.walkerData.meanwalker_walk;
      this.locomotionGait = 'walk';
      let walkVal = this.sampleSingleGait(i, walkertime, includeStructure, ignoreActiveMarkers);

      // Sample Run
      this.meanwalker[1] = this.walkerData.meanwalker_run;
      this.locomotionGait = 'run';
      let runVal = this.sampleSingleGait(i, walkertime, includeStructure, ignoreActiveMarkers);

      // Restore state
      this.meanwalker[1] = originalMeanwalker;
      this.locomotionGait = originalLocomotionGait;

      // Blend based on runProgress
      return walkVal + (runVal - walkVal) * this.runProgress;
    }

    return this.sampleSingleGait(i, walkertime, includeStructure, ignoreActiveMarkers);
  }

  sampleSingleGait(i, walkertime, includeStructure, ignoreActiveMarkers = false) {
    if (this.type === BMW_TYPE_DOG && this.locomotionGait === 'run' && i < this.nummarkers * 3) {
      let cacheKey = walkertime;
      if (this._runCacheKey !== cacheKey) {
        this._runCache = this.calculateRotaryGallop(walkertime);
        this._runCacheKey = cacheKey;
      }

      let jointIdx = i % this.nummarkers;
      let coord = Math.floor(i / this.nummarkers);

      let baseVal = this.meanwalker[this.type][i];
      if (includeStructure) {
        if (coord === 2) {
          baseVal *= this.structure_vertical_scale;
        } else if (coord === 0) {
          baseVal *= this.structure_horizontal_scale;
        }
      } else {
        baseVal = 0;
      }

      let offset = 0;
      if (this.jointOffsets && this.jointOffsets[jointIdx]) {
        if (coord === 0) offset = this.jointOffsets[jointIdx].x;
        else if (coord === 1) offset = this.jointOffsets[jointIdx].y;
        else if (coord === 2) offset = this.jointOffsets[jointIdx].z;
      }

      let computedVal = this._runCache[i];
      let deviation = computedVal - this.meanwalker[this.type][i];

      // Apply motion scale
      if (coord === 2) {
        deviation *= this.motion_vertical_scale;
      } else if (coord === 0) {
        deviation *= this.motion_horizontal_scale;
      }

      let amplitude = (this.jointAmplitudes && this.jointAmplitudes[jointIdx] !== undefined) ? this.jointAmplitudes[jointIdx] : 1.0;

      return baseVal + deviation * amplitude + offset;
    }

    let initialpos = this.meanwalker[this.type][i];

    if (includeStructure) {
      if (this.type === BMW_TYPE_HUMAN) {
        initialpos +=
          this.bodyStructureaxis[i] * this.bodyStructure +
          this.weightaxis[i] * this.weight +
          this.nervousaxis[i] * this.nervousness +
          this.happyaxis[i] * this.happiness;
      }

      //invert or scale structure
      if (i >= this.nummarkers * 2 && i < this.nummarkers * 3)
        initialpos *= this.structure_vertical_scale;
      else initialpos *= this.structure_horizontal_scale;
    } else {
      initialpos = 0;
    }

    //motion!
    let motionpos = 0;
    const j = this.nummarkers * 3 + 1;

    let jointIdx = i % this.nummarkers;
    let coord = Math.floor(i / this.nummarkers);

    // Get custom joint offset
    let offset = 0;
    if (this.jointOffsets && this.jointOffsets[jointIdx]) {
      if (coord === 0) offset = this.jointOffsets[jointIdx].x;
      else if (coord === 1) offset = this.jointOffsets[jointIdx].y;
      else if (coord === 2) offset = this.jointOffsets[jointIdx].z;
    }

    if (this.type === BMW_TYPE_HUMAN) {
      const b = this.bodyStructure;
      const w = this.weight;
      const n = this.nervousness;
      const h = this.happiness;
      motionpos =
        (this.meanwalker[this.type][i + j] +
          this.bodyStructureaxis[i + j] * b +
          this.weightaxis[i + j] * w +
          this.nervousaxis[i + j] * n +
          this.happyaxis[i + j] * h) *
        Math.sin(walkertime) +
        (this.meanwalker[this.type][i + j * 2] +
          this.bodyStructureaxis[i + j * 2] * b +
          this.weightaxis[i + j * 2] * w +
          this.nervousaxis[i + j * 2] * n +
          this.happyaxis[i + j * 2] * h) *
        Math.cos(walkertime) +
        (this.meanwalker[this.type][i + j * 3] +
          this.bodyStructureaxis[i + j * 3] * b +
          this.weightaxis[i + j * 3] * w +
          this.nervousaxis[i + j * 3] * n +
          this.happyaxis[i + j * 3] * h) *
        Math.sin(2 * walkertime) +
        (this.meanwalker[this.type][i + j * 4] +
          this.bodyStructureaxis[i + j * 4] * b +
          this.weightaxis[i + j * 4] * w +
          this.nervousaxis[i + j * 4] * n +
          this.happyaxis[i + j * 4] * h) *
        Math.cos(2 * walkertime);
    } else {
      if (this.type === BMW_TYPE_DOG && this.locomotionGait !== 'run' && (jointIdx === 11 || jointIdx === 18 || jointIdx === 19 || jointIdx === 9)) {
        // We override tail and head joints completely to use angular formulation
        if (coord === 1) {
          // Y coordinate keeps tail centered
          return 1.0 + offset;
        }

        let t = walkertime;
        let h = this.happiness / 10.0; // scaled happiness factor

        // Base angles for Extreme 1 (upward curve) in radians
        let theta1 = 135.0 * Math.PI / 180.0 + h * 45.0 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * t - 0.0));
        let theta2 = 98.13 * Math.PI / 180.0 + h * 81.93 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * t - 1.0));
        let theta3 = 50.19 * Math.PI / 180.0 + h * 129.9 * Math.PI / 180.0 * (1.0 - Math.cos(2.0 * t - 2.0));

        // Head bobbing logic (constant length to prevent expanding/contracting)
        let thetaHead = 0.15 + 0.15 * Math.sin(t); // Positive angle points slightly up, with a bobbing motion

        let L1 = 30.15;
        let L2 = 31.57;
        let L3 = 38.05;
        let LHead = 76.92;

        let getJointPos = (jIdx, coordIdx) => {
          let idx = jIdx + coordIdx * this.nummarkers;
          if (!ignoreActiveMarkers && this.markers[idx] !== undefined) {
            return this.markers[idx];
          }
          return this.sample(idx, walkertime, includeStructure, ignoreActiveMarkers);
        };

        if (jointIdx === 11) {
          let parentVal = getJointPos(8, coord);
          return parentVal + L1 * (coord === 0 ? Math.cos(theta1) : Math.sin(theta1)) + offset;
        } else if (jointIdx === 18) {
          let parentVal = getJointPos(11, coord);
          return parentVal + L2 * (coord === 0 ? Math.cos(theta2) : Math.sin(theta2)) + offset;
        } else if (jointIdx === 19) {
          let parentVal = getJointPos(18, coord);
          return parentVal + L3 * (coord === 0 ? Math.cos(theta3) : Math.sin(theta3)) + offset;
        } else if (jointIdx === 9) { // Head
          let parentVal = getJointPos(3, coord); // Neck is 3
          return parentVal + LHead * (coord === 0 ? Math.cos(thetaHead) : Math.sin(thetaHead)) + offset;
        }
      } else {
        motionpos =
          this.meanwalker[this.type][i + j] * Math.sin(walkertime) +
          this.meanwalker[this.type][i + j * 2] * Math.cos(walkertime) +
          this.meanwalker[this.type][i + j * 3] * Math.sin(2 * walkertime) +
          this.meanwalker[this.type][i + j * 4] * Math.cos(2 * walkertime);
        // Apply per-joint amplitude scale
        if (this.jointAmplitudes && this.jointAmplitudes[jointIdx] !== undefined) {
          motionpos *= this.jointAmplitudes[jointIdx];
        }
      }
    }

    if (i >= this.nummarkers * 2 && i < this.nummarkers * 3)
      motionpos *= this.motion_vertical_scale;
    else motionpos *= this.motion_horizontal_scale;
    return initialpos + motionpos + offset;
  }

  setJointOffset(jointIdx, x, y, z) {
    if (this.jointOffsets[jointIdx]) {
      if (x !== undefined) this.jointOffsets[jointIdx].x = x;
      if (y !== undefined) this.jointOffsets[jointIdx].y = y;
      if (z !== undefined) this.jointOffsets[jointIdx].z = z;
    }
  }

  // API: Set per-joint motion amplitude scale (1.0 = default, 0 = frozen, 2.0 = double)
  setJointAmplitude(jointIdx, scale) {
    if (this.jointAmplitudes && jointIdx >= 0 && jointIdx < this.jointAmplitudes.length) {
      this.jointAmplitudes[jointIdx] = scale;
    }
  }

  getFrequency() {
    const i = this.nummarkers * 3;
    let speed;
    if (this.type === BMW_TYPE_DOG && this.walkerData && this.walkerData.meanwalker_run && this.walkerData.meanwalker_walk) {
      let walkSpeed = this.walkerData.meanwalker_walk[i];
      let runSpeed = this.walkerData.meanwalker_run[i];
      speed = walkSpeed + (runSpeed - walkSpeed) * this.runProgress;
    } else {
      speed = this.meanwalker[this.type][i];
    }

    if (this.type === BMW_TYPE_HUMAN) {
      speed += this.bodyStructure * this.bodyStructureaxis[i];
      speed += this.weight * this.weightaxis[i];
      speed += this.nervousness * this.nervousaxis[i];
      speed += this.happiness * this.happyaxis[i];
    }

    // avoid 0 speed
    if (this.speed === 0) {
      return speed / 0.001;
    }
    return speed / this.speed;
  }

  calcTranslationSpeed() {
    const i = (this.nummarkers * 3 + 1) * 3 - 1;
    let tspeed;
    if (this.type === BMW_TYPE_DOG && this.walkerData && this.walkerData.meanwalker_run && this.walkerData.meanwalker_walk) {
      let walkTSpeed = this.walkerData.meanwalker_walk[i];
      let runTSpeed = this.walkerData.meanwalker_run[i];
      tspeed = walkTSpeed + (runTSpeed - walkTSpeed) * this.runProgress;
    } else {
      tspeed = this.meanwalker[this.type][i];
    }

    if (this.type === BMW_TYPE_HUMAN) {
      tspeed += this.bodyStructure * this.bodyStructureaxis[i];
      tspeed += this.weight * this.weightaxis[i];
      tspeed += this.nervousness * this.nervousaxis[i];
      tspeed += this.happiness * this.happyaxis[i];
    }

    return tspeed * 120;
  }

  getTranslationSpeed() {
    return this.speed * (this.walker_translation_speed / 120);
  }

  calcTime(curtime) {
    return ((curtime * 2 * Math.PI) / 1000) * (120 / this.getFrequency());
  }

  calculateRotaryGallop(walkertime) {
    let cache = new Array(this.nummarkers * 3);

    let phase = (walkertime / (2 * Math.PI)) % 1.0;
    if (phase < 0) phase += 1.0;

    // Core parameters
    let baseBellyX = 4.219;
    let baseBellyZ = 0.0; // Lowered from 7.0 to force more resting knee bend

    // 1. Continuous Squash and Stretch Engine
    // S peaks (stretch = 1.4) at phase 0.40 (extended suspension).
    // S valleys (squash = 0.6) at phase 0.90 (collected suspension).
    let S = 1.0 + 0.4 * Math.sin(2 * Math.PI * (phase - 0.15));

    // 2. Double Bounding Vertical Lift
    // Peaks at 0.40 and 0.90. (Two leaps per cycle)
    let dz = 15 + 45 * Math.abs(Math.sin(2 * Math.PI * (phase - 0.15)));

    let bellyX = baseBellyX + 20 * Math.sin(2 * Math.PI * (phase - 0.25));
    let bellyZ = baseBellyZ + dz;

    // Vertical Squash & Stretch factor (conservation of volume)
    let Sv = 1.0 - 0.5 * (S - 1.0);

    // 3. Pelvis (Node 8)
    // Rotates backward (negative) during stretch, forward (positive) during tuck
    let pelvisRot = -0.4 * Math.sin(2 * Math.PI * (phase - 0.15));

    let pelvisX = bellyX - 89.91 * S;
    let pelvisZ = bellyZ + 13.5 * Sv - 25 * pelvisRot;

    // 4. Chest (Node 4)
    // Rises relative to belly during stretch, drops during tuck
    let chestVaultZ = 25 * Math.sin(2 * Math.PI * (phase - 0.15));

    let chestX = bellyX + 103.72 * S;
    let chestZ = bellyZ + 27.7 * Sv + chestVaultZ;

    // 5. Neck (Node 3) and Head (Node 9)
    // Dives forward during stretch, pulls up during tuck
    let neckRot = -0.15 - 0.4 * Math.sin(2 * Math.PI * (phase - 0.15));

    let neckX = chestX + 37.06 * Math.cos(neckRot) - 16.3 * Math.sin(neckRot);
    let neckZ = chestZ + 16.3 * Math.cos(neckRot) + 37.06 * Math.sin(neckRot);

    let headRot = neckRot * 0.8 + 0.15 * Math.sin(2 * Math.PI * (phase - 0.5));
    let headX = neckX + 70.0 * Math.cos(headRot) - 3.0 * Math.sin(headRot);
    let headZ = neckZ + 3.0 * Math.cos(headRot) + 70.0 * Math.sin(headRot);

    // 6. Tail (11, 18, 19)
    let theta1 = 2.17 - 0.7 * pelvisRot - 0.4 * Math.sin(2 * Math.PI * (phase - 0.1));
    let theta2 = 1.71 - 0.5 * pelvisRot - 0.6 * Math.sin(2 * Math.PI * (phase - 0.2));
    let theta3 = 0.87 - 0.3 * pelvisRot - 0.8 * Math.sin(2 * Math.PI * (phase - 0.3));

    let tailX = pelvisX + 26.6 * Math.cos(theta1);
    let tailZ = pelvisZ + 26.6 * Math.sin(theta1);
    let tailMidX = tailX + 35.4 * Math.cos(theta2);
    let tailMidZ = tailZ + 35.4 * Math.sin(theta2);
    let tailEndX = tailMidX + 39.1 * Math.cos(theta3);
    let tailEndZ = tailMidZ + 39.1 * Math.sin(theta3);

    // 7. Hind Hips 
    // Reduced the constant offset from pelvis to make it shorter
    let hipOffsetX = 10.0 * Math.cos(pelvisRot) - (-30.0) * Math.sin(pelvisRot);
    let hipOffsetZ = -30.0 * Math.cos(pelvisRot) + 10.0 * Math.sin(pelvisRot);

    // Sweeps backward during stretch, forward during tuck
    let globalHipSweepX = -20 * Math.sin(2 * Math.PI * (phase - 0.15));

    // Individual hip separation based on strike phase (decreased spatial drift)
    let lHipSweepX = 25 * Math.cos(2 * Math.PI * (phase - 0.00));
    let rHipSweepX = 25 * Math.cos(2 * Math.PI * (phase - 0.15));
    let lHipSweepZ = 5 * Math.sin(2 * Math.PI * (phase - 0.00));
    let rHipSweepZ = 5 * Math.sin(2 * Math.PI * (phase - 0.15));

    let lHipX = pelvisX + hipOffsetX + globalHipSweepX + lHipSweepX;
    let lHipZ = pelvisZ + hipOffsetZ + lHipSweepZ;
    let rHipX = pelvisX + hipOffsetX + globalHipSweepX + rHipSweepX;
    let rHipZ = pelvisZ + hipOffsetZ + rHipSweepZ;

    // 8. Front Shoulders
    let shoulderRot = 0.7 * Math.sin(2 * Math.PI * (phase - 0.25));
    // Reduced the constant offset from chest to make it shorter
    let shoulderOffsetX = -20.0 * Math.cos(shoulderRot) - (-50.0) * Math.sin(shoulderRot);
    let shoulderOffsetZ = -50.0 * Math.cos(shoulderRot) + (-20.0) * Math.sin(shoulderRot);

    // Individual shoulder separation based on strike phase (decreased spatial drift)
    let lShoulderSweepX = 20 * Math.cos(2 * Math.PI * (phase - 0.55));
    let rShoulderSweepX = 20 * Math.cos(2 * Math.PI * (phase - 0.70));
    let lShoulderSweepZ = 5 * Math.sin(2 * Math.PI * (phase - 0.55));
    let rShoulderSweepZ = 5 * Math.sin(2 * Math.PI * (phase - 0.70));

    let lShoulderX = chestX + shoulderOffsetX + lShoulderSweepX;
    let lShoulderZ = chestZ + shoulderOffsetZ + lShoulderSweepZ;
    let rShoulderX = chestX + shoulderOffsetX + rShoulderSweepX;
    let rShoulderZ = chestZ + shoulderOffsetZ + rShoulderSweepZ;

    // Paw clamping to prevent IK detachment when jumping high
    let clampPaw = (Hx, Hz, Px, Pz, L1, L2) => {
      let dx = Px - Hx;
      let dz = Pz - Hz;
      let d = Math.sqrt(dx * dx + dz * dz);
      let maxD = L1 + L2 - 0.1;
      if (d > maxD) {
        let ratio = maxD / d;
        return { x: Hx + dx * ratio, z: Hz + dz * ratio };
      }
      return { x: Px, z: Pz };
    };

    // 9. Paws (gait offsets & extremely long fast trajectories)
    let getPawHind = (strikePhase, Hx, Hz) => {
      let lp = (phase - strikePhase) % 1.0;
      if (lp < 0) lp += 1.0;

      let stanceDuration = 0.15; // Shorter stance for more air time
      let baseOffsetX = -10;
      let stepLength = 140; // Reduced stride
      let Px, Pz;

      let stanceHeight = Math.max(0, Hz - (-143.0));

      if (lp < stanceDuration) {
        let t = lp / stanceDuration;
        Px = Hx + baseOffsetX + (stepLength / 2) * (1.0 - 2.0 * t);
        Pz = -143.0;
      } else {
        let t = (lp - stanceDuration) / (1.0 - stanceDuration);
        let t_warp = t * t * (3 - 2 * t);
        Px = Hx + baseOffsetX + (stepLength / 2) * (2.0 * t_warp - 1.0);
        let liftCurve = Math.sin(t * Math.PI);
        Pz = Hz - stanceHeight * (1.0 - 0.95 * liftCurve); // Increased paw lift for more knee bend
      }
      // Passed updated L1/L2
      return clampPaw(Hx, Hz, Px, Pz, 100.0, 55.0);
    };

    let getPawFront = (strikePhase, Sx, Sz) => {
      let lp = (phase - strikePhase) % 1.0;
      if (lp < 0) lp += 1.0;

      let stanceDuration = 0.15;
      let baseOffsetX = 20;
      let stepLength = 110; // Reduced stride
      let Px, Pz;

      let stanceHeight = Math.max(0, Sz - (-143.0));

      if (lp < stanceDuration) {
        let t = lp / stanceDuration;
        Px = Sx + baseOffsetX + (stepLength / 2) * (1.0 - 2.0 * t);
        Pz = -143.0;
      } else {
        let t = (lp - stanceDuration) / (1.0 - stanceDuration);
        let t_warp = t * t * (3 - 2 * t);
        Px = Sx + baseOffsetX + (stepLength / 2) * (2.0 * t_warp - 1.0);
        let liftCurve = Math.sin(t * Math.PI);
        Pz = Sz - stanceHeight * (1.0 - 0.95 * liftCurve); // Increased paw lift for more knee bend
      }
      // Passed updated L1/L2
      return clampPaw(Sx, Sz, Px, Pz, 95.0, 35.0);
    };

    // Increased strike phase difference from 0.10 to 0.15
    let lPawBack = getPawHind(0.00, lHipX, lHipZ);
    let rPawBack = getPawHind(0.15, rHipX, rHipZ);
    let lPawFront = getPawFront(0.55, lShoulderX, lShoulderZ);
    let rPawFront = getPawFront(0.70, rShoulderX, rShoulderZ);

    let lKneeBack = this.solveIK(lHipX, lHipZ, lPawBack.x, lPawBack.z, 100.0, 55.0, -1);
    let rKneeBack = this.solveIK(rHipX, rHipZ, rPawBack.x, rPawBack.z, 100.0, 55.0, -1);
    let lElbowFront = this.solveIK(lShoulderX, lShoulderZ, lPawFront.x, lPawFront.z, 95.0, 35.0, 1);
    let rElbowFront = this.solveIK(rShoulderX, rShoulderZ, rPawFront.x, rPawFront.z, 95.0, 35.0, 1);

    // Assign calculated coordinates back to cache array
    let assign = (idx, x, z) => {
      cache[idx] = x;
      cache[idx + this.nummarkers * 2] = z;
    };

    // X and Z coordinates
    assign(0, lPawFront.x, lPawFront.z);
    assign(1, lElbowFront.x, lElbowFront.z);
    assign(2, lShoulderX, lShoulderZ);
    assign(3, neckX, neckZ);
    assign(4, chestX, chestZ);
    assign(5, lPawBack.x, lPawBack.z);
    assign(6, lKneeBack.x, lKneeBack.z);
    assign(7, lHipX, lHipZ);
    assign(8, pelvisX, pelvisZ);
    assign(9, headX, headZ);
    assign(10, bellyX, bellyZ);
    assign(11, tailX, tailZ);

    assign(12, rPawFront.x, rPawFront.z);
    assign(13, rElbowFront.x, rElbowFront.z);
    assign(14, rShoulderX, rShoulderZ);
    assign(15, rPawBack.x, rPawBack.z);
    assign(16, rKneeBack.x, rKneeBack.z);
    assign(17, rHipX, rHipZ);

    assign(18, tailMidX, tailMidZ);
    assign(19, tailEndX, tailEndZ);

    // Y coordinates (width/depth)
    for (let k = 0; k < this.nummarkers; k++) {
      let yVal = 0.0;
      if (k < 3 || (k >= 5 && k <= 7)) {
        yVal = 10.0; // Left side
      } else if ((k >= 12 && k <= 14) || k >= 15) {
        yVal = -10.0; // Right side
      }
      cache[k + this.nummarkers] = yVal;
    }

    return cache;
  }

}

// Simple Timer class
class BMWTimer {
  // Constructor
  constructor() {
    const d = new Date().valueOf();
    this.time = d;
    this.start = d;

    const precision = 10; // 10msec
    setInterval(
      function () {
        this.time += precision;
      }.bind(this),
      precision
    );
  }

  getTimer() {
    return this.time - this.start;
  }
}

//// Matrix calculation
class BMWMatrix {
  constructor() { }

  newMatrix() {
    const m = [new Array(4), new Array(4), new Array(4), new Array(4)];
    return m;
  }

  // Identity matrix
  newIdentMatrix() {
    const m = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    return m;
  }

  rotateY(angle) {
    const m = [
      [Math.cos(angle), 0, Math.sin(angle), 0],
      [0, 1, 0, 0],
      [-Math.sin(angle), 0, Math.cos(angle), 0],
      [0, 0, 0, 1],
    ];
    return m;
  }

  rotateX(angle) {
    const m = [
      [1, 0, 0, 0],
      [0, Math.cos(angle), -Math.sin(angle), 0],
      [0, Math.sin(angle), Math.cos(angle), 0],
      [0, 0, 0, 1],
    ];
    return m;
  }

  rotateZ(angle) {
    const m = [
      [Math.cos(angle), Math.sin(angle), 0, 0],
      [-Math.sin(angle), Math.cos(angle), 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    return m;
  }

  perspective(zfar) {
    const znear = 1;
    const f = zfar;
    const m = [
      [(zfar + znear) / (znear - zfar), (2 * zfar * znear) / (znear - zfar), 0, 0],
      [0, f, 0, 0],
      [0, 0, f, 0],
      [-1, 0, 0, 0],
    ];
    return m;
  }

  translate(tx, ty, tz) {
    const m = [
      [1, 0, 0, tx],
      [0, 1, 0, ty],
      [0, 0, 1, tz],
      [0, 0, 0, 1],
    ];
    return m;
  }

  rotateaxis(angle, rx, ry, rz) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const len = Math.sqrt(rx * rx + ry * ry + rz * rz);
    rx = rx / len;
    ry = ry / len;
    rz = rz / len;
    const m = [
      [rx * rx * (1 - c) + c, rx * ry * (1 - c) - rz * s, rx * rz * (1 - c) + ry * s, 0],
      [ry * rx * (1 - c) + rz * s, ry * ry * (1 - c) + c, ry * rz * (1 - c) - rx * s, 0],
      [rz * rx * (1 - c) - ry * s, rz * ry * (1 - c) + rx * s, rz * rz * (1 - c) + c, 0],
      [0, 0, 0, 1],
    ];
    return m;
  }

  multmatrix(m1, m2) {
    const m3 = this.newMatrix();
    let r = 0;
    let c = 0;

    for (r = 0; r < 4; r++) {
      for (c = 0; c < 4; c++) {
        m3[r][c] = 0;
      }
    }

    for (r = 0; r < 4; r++) {
      for (c = 0; c < 4; c++) {
        for (let i = 0; i < 4; i++) {
          m3[r][c] += m1[r][i] * m2[i][c];
        }
      }
    }
    return m3;
  }

  multmatrixvector(m, v) {
    const v2 = new Array(4);

    for (let i = 0; i < 4; i++) {
      v2[i] = 0;
    }

    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 4; i++) {
        v2[r] += m[r][i] * v[i];
      }
    }
    return v2;
  }

  multvectormatrix(v, m) {
    const v2 = new Array(4);

    for (let i = 0; i < 4; i++) {
      v2[i] = 0;
    }

    for (let r = 0; r < 4; r++) {
      for (i = 0; i < 4; i++) {
        v2[r] += m[i][r] * v[i];
      }
    }
    return v2;
  }

  dotProd(x1, y1, z1, x2, y2, z2) {
    return x1 * x2 + y1 * y2 + z1 * z2;
  }

  angleBetween(x1, y1, z1, x2, y2, z2) {
    const axislen1 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1);
    const axislen2 = Math.sqrt(x2 * x2 + y2 * y2 + z2 * z2);

    const angle = Math.acos(this.dotProd(x1, y1, z1, x2, y2, z2) / (axislen1 * axislen2));

    if (Math.abs(angle) < 0.0001) return [0, 0, 1, 0];
    if (angle > PI) {
      angle = -(TAU - angle);
    }

    //cross product
    const x3 = y1 * z2 - z1 * y2;
    const y3 = z1 * x2 - x1 * z2;
    const z3 = x1 * y2 - y1 * x2;

    return [x3, y3, z3, angle];
  }
}

// Walker data class
class BMWData {
  // Constructor
  constructor() {
    this.meanwalker = new Array(4);
    this.meanwalker[0] = [];
    this.meanwalker_run = new Array(
      89.0600,
      84.5110,
      58.3470,
      145.0000,
      107.9420,
      -97.1540,
      -111.9700,
      -62.8010,
      -85.6880,
      215.0000,
      4.2190,
      -100.6880,
      89.0600,
      84.5110,
      58.3470,
      -97.1540,
      -111.9700,
      -62.8010,
      -105.6880,
      -80.6880,
      0.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      1.0000,
      -143.0000,
      -123.0000,
      -79.4810,
      51.0000,
      34.6970,
      -143.0000,
      -80.0000,
      -47.0000,
      20.5000,
      54.0000,
      7.0000,
      42.5000,
      -143.0000,
      -123.0000,
      -79.4810,
      -143.0000,
      -80.0000,
      -47.0000,
      77.5000,
      107.5000,
      150.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      43.1483,
      28.7655,
      19.1770,
      0.0000,
      0.0000,
      0.0000,
      4.7943,
      -43.1483,
      -28.7655,
      -19.1770,
      0.0000,
      0.0000,
      0.0000,
      14.7257,
      24.9374,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      70.0000,
      40.0000,
      0.0000,
      0.0000,
      0.0000,
      -61.4308,
      -52.6550,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      -9.5885,
      61.4308,
      35.1033,
      0.0000,
      -70.0000,
      -60.0000,
      0.0000,
      -29.4515,
      -49.8747,
      0.0000,
      -90.0000,
      -60.0000,
      -40.0000,
      -55.0000,
      -45.0000,
      78.9824,
      52.6550,
      35.1033,
      45.0000,
      -65.0000,
      0.0000,
      8.7758,
      -78.9824,
      -52.6550,
      -35.1033,
      90.0000,
      60.0000,
      40.0000,
      9.4553,
      1.7684,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      30.0000,
      -25.0000,
      33.5598,
      28.7655,
      0.0000,
      -25.0000,
      20.0000,
      -20.0000,
      -17.5517,
      -33.5598,
      -19.1770,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      -18.9106,
      -3.5369,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      -0.0000,
      -0.0000,
      0.0000,
      0.0000,
      0.0000,
      16.8294,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      16.8294,
      12.6221,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      20.0000,
      15.0000,
      0.0000,
      0.0000,
      0.0000,
      10.8060,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      25.0000,
      0.0000,
      10.8060,
      8.1045,
      0.0000,
      20.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000,
      0.0000
    );
    this.meanwalker_walk = new Array(
      89.06,
      84.511,
      58.347,
      128.0,
      107.942,
      -97.154,
      -111.97,
      -62.801,
      -85.688,
      185.0,
      4.219000000000001,
      -100.688,
      89.06,
      84.511,
      58.347,
      -97.154,
      -111.97,
      -62.801,
      -105.688,
      -80.688,
      0.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      -143.0,
      -108.0,
      -56.0,
      68.0,
      52.0,
      -143.0,
      -68.0,
      -30.0,
      38.0,
      70.0,
      25.0,
      60.0,
      -143.0,
      -108.0,
      -56.0,
      -143.0,
      -68.0,
      -30.0,
      95.0,
      125.0,
      70.857,
      22.689,
      7.547,
      8.046,
      2.845,
      3.135,
      -33.592,
      -25.853,
      -17.601,
      -1.558,
      0.714,
      2.456,
      0.0,
      -22.689,
      -7.547,
      -8.046,
      33.592,
      25.853,
      17.601,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      -11.9455,
      -12.21,
      -2.216,
      4.898,
      5.943,
      -14.6322,
      -3.6738,
      -2.663,
      0.849,
      -1.312,
      1.877,
      0.0,
      11.9455,
      12.21,
      2.216,
      14.6322,
      3.6738,
      2.663,
      0.0,
      0.0,
      10.0,
      80.946,
      73.03,
      32.385,
      8.504,
      0.598,
      75.381,
      44.785,
      26.443,
      0.168,
      -1.295,
      -0.564,
      0.0,
      -80.946,
      -73.03,
      -32.385,
      -75.381,
      -44.785,
      -26.443,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      3.0065,
      -4.2775,
      -13.161,
      3.015,
      0.926,
      -4.4,
      -26.5788,
      -0.345,
      1.165,
      0.045,
      0.287,
      0.0,
      -3.0065,
      4.2775,
      13.161,
      4.4,
      26.5788,
      0.345,
      0.0,
      0.0,
      0.0,
      -21.478,
      -16.859,
      0.445,
      2.55,
      3.536,
      -14.571,
      -8.079,
      -0.346,
      3.344,
      1.847,
      3.655,
      0.0,
      -21.478,
      -16.859,
      0.445,
      -14.571,
      -8.079,
      -0.346,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      -2.9155,
      -9.645,
      -2.506,
      -8.628,
      -4.966,
      3.1152,
      12.9474,
      -1.683,
      3.183,
      -9.5025,
      -4.296,
      0.0,
      -2.9155,
      -9.645,
      -2.506,
      3.1152,
      12.9474,
      -1.683,
      0.0,
      0.0,
      0.0,
      11.453,
      3.75,
      7.972,
      0.411,
      -0.879,
      -13.512,
      -4.831,
      -6.61,
      -0.98,
      0.53,
      -0.472,
      0.0,
      11.453,
      3.75,
      7.972,
      -13.512,
      -4.831,
      -6.61,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      -4.683,
      -1.4125,
      -1.681,
      -4.026,
      -2.563,
      -4.697,
      -6.4458,
      -0.781,
      -3.581,
      3.855,
      -0.821,
      0.0,
      -4.683,
      -1.4125,
      -1.681,
      -4.697,
      -6.4458,
      -0.781,
      0.0,
      0.0,
      0.0
    );

    //PIGEON
    this.meanwalker[2] = [];
    this.meanwalker[3] = [];
    this.bodyStructureaxis = [];
    this.weightaxis = [];
    this.nervousaxis = [];
    this.happyaxis = [];
  }
}


// Override getContext to set willReadFrequently attribute to true to silence Chrome warnings
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, attributes) {
  if (type === '2d') {
    attributes = attributes || {};
    attributes.willReadFrequently = true;
  }
  return originalGetContext.call(this, type, attributes);
};

let bmw;
let walkerHeight = 380;
let speedSlider;
let happinessSlider;
let randomizeButton;
let letters = ["M", "o", "s", "h", "i", "m", "b", "o"];

let logoImages = [];
let fixedLogoImages = {};
let smallImages = [];

let currentImagesMode = 'logo'; // 'logo', 'small'
let activeBone1 = -1;
let activeBone2 = -1;
let activeBone3 = -1;
let activeBone4 = -1;
let activeEmotionImg1 = null;
let activeEmotionImg2 = null;
let activeEmotionImg3 = null;
let activeEmotionImg4 = null;
let lastImageSwitchTime = 0;
let lastPositionSwitchTime = 0;

let peeParticles = [];
let releasePeeParticles = true;
let targetSliderSpeed = 1.0;
let currentSpeed = 1.0;
let targetSliderHappiness = 0.0;
let currentHappiness = 3;

let isEating = false;
let cameraOffsetX = 0;

// Configurable camera offsets for different modes to easily fine-tune framing
let cameraOffsetEat = -120;
let cameraOffsetSniff = -230;
let cameraOffsetPee = -30;
let cameraOffsetSit = -30;
let cameraOffsetBite = 0;

let bowlImg;
let bowlX = 2000; // start off-screen right
let targetBowlX = 2000;
let targetBowlY = 100;
let ufo = {
  state: 'hidden',
  stateStartTime: 0,
  x: -1000, y: -1000,
  startX: 0, startY: 0,
  endX: 0, endY: 0,
  ctrlX: 0, ctrlY: 0
};
function evalQuadBezier(p0, p1, p2, t) {
  return Math.pow(1 - t, 2) * p0 + 2 * (1 - t) * t * p1 + Math.pow(t, 2) * p2;
}

let bgScrollX = 0;
let walkingSpeed = 5.5;
let runningSpeed = 18.0;
let currentMotionType = "walk";

let bgTreeImg, bgRainbowImg, bgSpaceshipImg, bgMushroomImg;
function preload() {
  let wf = "https://cdn.prod.website-files.com/682599915e115cb1f3b11952/";
  bgTreeImg = loadImage(wf + '6a8fc493c5ebb416ebcfb645_tree.avif');
  bgRainbowImg = loadImage(wf + '6a8fc493dec834181956d157_rainbow.avif');
  bgSpaceshipImg = loadImage(wf + '6a8fc4935b6b9edf9b058e3b_spaceship.avif');
  bgMushroomImg = loadImage(wf + '6a8fc493437e07816ea4abf4_mushroom.avif');

  fixedLogoImages[0] = loadImage(wf + '6a8fc41dcd7764f54d16092d_m.svg');
  fixedLogoImages[2] = loadImage(wf + '6a8fc41dcd7764f54d160930_b.svg');
  fixedLogoImages[3] = loadImage(wf + '6a8fc41d4a84a8e59e42f229_o.svg');

  logoImages.push(loadImage(wf + '6a8fc41dcd7764f54d16092d_m.svg'));
  logoImages.push(loadImage(wf + '6a8fc41d4a84a8e59e42f229_o.svg'));
  logoImages.push(loadImage(wf + '6a8fc41d6001358cc8abf8b1_s.svg'));
  logoImages.push(loadImage(wf + '6a8fc41d2d8d2fcfe6ce8ba4_h.svg'));
  logoImages.push(loadImage(wf + '6a8fc41dcd99f2b5b7066d22_i.svg'));
  logoImages.push(loadImage(wf + '6a8fc41dc5ebb416ebcf962b_m2.svg'));
  logoImages.push(loadImage(wf + '6a8fc41dcd7764f54d160930_b.svg'));
  logoImages.push(loadImage(wf + '6a8fc41d11c6f066666d9ff1_o2.svg'));

  let smallLinks = [
    "6a8fc51841975f14932f8f67_image0.avif",
    "6a8fc518525735221fbf18c9_image1.avif",
    "6a8fc518c5ebb416ebcfdb0e_image2.avif",
    "6a8fc518dec834181956ee41_image3.avif",
    "6a8fc5185f737fe02f5dac80_image4.avif",
    "6a8fc5187d9488d6e73d724f_image5.avif",
    "6a8fc518ae785707565b58a5_image6.avif",
    "6a8fc5180ec37c4f7d2100e8_image7.avif",
    "6a8fc51754d9e5f756e722c5_image8.avif",
    "6a8fc518e576a29bc66f8262_image9.avif",
    "6a8fc5172d8d2fcfe6ced832_image10.avif",
    "6a8fc518dec834181956ee2f_image11.avif",
    "6a8fc5186d7c133127234a88_image12.avif"
  ];
  smallLinks.forEach(l => smallImages.push(loadImage(wf + l)));

  bowlImg = loadImage(wf + '6a8fc78afa2b23c464d8db0c_bowlmain.avif');
}

// 1. Custom Joint Index Names (since Dog type in the library doesn't have default names)
const dogJointNames = [
  "L-Paw-Front",   // 0
  "L-Elbow-Front", // 1
  "L-Shoulder",    // 2
  "Neck",          // 3
  "Chest",         // 4
  "L-Paw-Back",    // 5
  "L-Knee-Back",   // 6
  "L-Hip",         // 7
  "Pelvis",        // 8
  "Head",          // 9
  "Belly",         // 10
  "Tail",          // 11
  "R-Paw-Front",   // 12
  "R-Elbow-Front", // 13
  "R-Shoulder",    // 14
  "R-Paw-Back",    // 15
  "R-Knee-Back",   // 16
  "R-Hip",         // 17
  "Tail-Mid",      // 18
  "Tail-End"       // 19
];

// 2. Custom Bone Connections
const dogBones = [
  [9, 3],   // Head to Neck
  [3, 4],   // Neck to Chest
  [4, 10],  // Chest to Belly
  [10, 8],  // Belly to Pelvis
  [8, 11],  // Pelvis to Tail
  [11, 18], // Tail to Tail-Mid
  [18, 19], // Tail-Mid to Tail-End

  // Front Left Leg
  [4, 2],   // Chest to L-Shoulder
  [2, 1],   // L-Shoulder to L-Elbow
  [1, 0],   // L-Elbow to L-Paw

  // Front Right Leg
  [4, 14],  // Chest to R-Shoulder
  [14, 13], // R-Shoulder to R-Elbow
  [13, 12], // R-Elbow to R-Paw

  // Back Left Leg
  [8, 7],   // Pelvis to L-Hip
  [7, 6],   // L-Hip to L-Knee
  [6, 5],   // L-Knee to L-Paw

  // Back Right Leg
  [8, 17],  // Pelvis to R-Hip
  [17, 16], // R-Hip to R-Knee
  [16, 15]  // R-Knee to R-Paw
];

function setupWebflowUI() {
  const buttons = {
    'walk-btn': 'walk',
    'sniff-btn': 'sniff',
    'run-btn': 'run',
    'sit-btn': 'sit',
    'pee-btn': 'pee',
    'eat-btn': 'eat',
    'bite-btn': 'bite'
  };
  
  for (const [id, motion] of Object.entries(buttons)) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        window.onMotionTypeChange(motion);
        // Active state
        for (const otherId of Object.keys(buttons)) {
           let otherBtn = document.getElementById(otherId);
           if (otherBtn) otherBtn.classList.remove('active');
        }
        btn.classList.add('active');
      });
    }
  }

  const funBtn = document.getElementById('fun-btn');
  if (funBtn) {
    funBtn.addEventListener('click', () => {
      window.setImagesMode && window.setImagesMode(currentImagesMode === 'logo' ? 'small' : 'logo');
      funBtn.classList.toggle('active');
    });
  }
}

function setup() {

  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');
  setupWebflowUI();

  // Type 1 is the Dog walk cycle (modified from the original cat walk cycle)
  bmw = new BMWalker(BMW_TYPE_DOG);





  // Randomize Button
  randomizeButton = createButton('Randomize Images');
  randomizeButton.position(20, 80);
  randomizeButton.mousePressed(shuffleImages);

  let btnLogo = createButton('Logo');
  btnLogo.position(20, 110);
  btnLogo.mousePressed(() => { if (window.setImagesMode) window.setImagesMode('logo'); });

  let btnSmall = createButton('Images');
  btnSmall.position(70, 110);
  btnSmall.mousePressed(() => { if (window.setImagesMode) window.setImagesMode('small'); });

  // Initialize the Sidebar Control Panel UI

}

function draw() {
  let isMobile = windowWidth <= 768; // Declare at the very top to prevent ReferenceErrors
  let loopWidth = Math.max(2400, width + 400);
  let stopModes = ['eat', 'sit', 'pee'];
  let activeTargetType = window.pendingMotionType || currentMotionType;
  
  // Sniff ALWAYS triggers the seek logic (to find the tree).
  // Other stop modes only trigger it on mobile.
  let isStopping = (activeTargetType === 'sniff') || (window.isMobileMode && (window.pendingMotionType !== null || stopModes.includes(currentMotionType)));

  if (isStopping) {
    let currentWrapped = bgScrollX % loopWidth;
    let baseLoops = bgScrollX - currentWrapped;
    let safeSpots;
    if (activeTargetType === 'sniff') {
      safeSpots = [0, loopWidth]; // Sniff mode MUST align perfectly with the tree
    } else {
      // 85, 1150, 1850 perfectly center the dog in the empty gaps between the trees, rainbow, and mushroom
      safeSpots = [85, 1150, 1850, loopWidth + 85];
    }

    // Find the safe spot we are currently approaching. 
    let targetWrapped = safeSpots.find(s => s >= currentWrapped - 2.0);
    if (targetWrapped === undefined) targetWrapped = loopWidth;

    let targetScroll = baseLoops + targetWrapped;
    let distance = Math.max(0, targetScroll - bgScrollX);

    let maxApproachSpeed = (activeTargetType === 'sniff') ? 2.0 : 1.0;
    let brakingDist = (maxApproachSpeed > 1.0) ? 150.0 : 60.0;

    // If we have a pending type and we've reached the braking zone, START the transition!
    if (window.pendingMotionType !== null && distance <= brakingDist) {
      window.applyMotionType(window.pendingMotionType);
      window.pendingMotionType = null; // Transition has begun
    }

    if (distance <= brakingDist) {
      // Smooth kinematic deceleration (v = sqrt(2ad)) to stop exactly on the target
      currentSpeed = Math.min(currentSpeed, maxApproachSpeed * Math.sqrt(distance / brakingDist));
      if (distance < 0.5) {
        currentSpeed = 0;
        bgScrollX = targetScroll; // Snap perfectly to the spot
      }
    } else {
      // Accelerate toward the target until we get close enough to brake
      currentSpeed = Math.min(maxApproachSpeed, currentSpeed + 0.05);
    }

    // Tie background speed perfectly to the dog's leg animation speed
    let bgSpeed = 0;
    if (currentSpeed <= 1.0) {
      bgSpeed = lerp(0, walkingSpeed, currentSpeed);
    } else {
      bgSpeed = lerp(walkingSpeed, runningSpeed, currentSpeed - 1.0);
    }

    if (currentSpeed > 0) {
      bgScrollX += bgSpeed;
    }
  } else {
    // Normal walking / running / user-controlled speed
    let speedStep = 0.05;
    if (Math.abs(currentSpeed - targetSliderSpeed) < speedStep) {
      currentSpeed = targetSliderSpeed;
    } else {
      currentSpeed += Math.sign(targetSliderSpeed - currentSpeed) * speedStep;
    }

    let bgSpeed = 0;
    if (currentMotionType === 'bite') {
      bgSpeed = 0; // Freeze the background instantly
      currentSpeed = 1.0; // Force the animation to keep playing so it wiggles
    } else if (currentSpeed <= 1.0) {
      bgSpeed = lerp(0, walkingSpeed, currentSpeed);
    } else {
      bgSpeed = lerp(walkingSpeed, runningSpeed, currentSpeed - 1.0);
    }
    bgScrollX += bgSpeed;
  }

  if (bmw) {
    bmw.overrideSpeed = currentSpeed;
  }

  background(0);

  // Draw UI Labels
  fill(0);
  noStroke();
  textSize(16);
  textAlign(LEFT, CENTER);



  // Mobile layout state
  window.isMobileMode = isMobile;

  // Dynamically hide/disable the bite option on mobile (since mouse tracking is tricky on touch)
  let biteOption = document.querySelector('option[value="bite"]');
  if (biteOption) {
    biteOption.hidden = isMobile;
    biteOption.disabled = isMobile;
    if (isMobile && currentMotionType === 'bite') {
      onMotionTypeChange('walk');
      let selectEl = document.getElementById('motion-type-select');
      if (selectEl) selectEl.value = 'walk';
    }
  }

  // Move origin to center so walker is visible
  translate(width / 2, height / 2);
  if (isMobile) {
    scale(0.55); // Global dog & particle reduction
  }

  // Smoothly pan camera to configured offsets based on active mode (Mobile Only)
  let targetCameraOffsetX = 0;
  if (isMobile) {
    if (isEating) {
      targetCameraOffsetX = cameraOffsetEat;
    } else if (currentMotionType === 'sniff') {
      targetCameraOffsetX = cameraOffsetSniff;
    } else if (currentMotionType === 'pee') {
      targetCameraOffsetX = cameraOffsetPee;
    } else if (currentMotionType === 'sit') {
      targetCameraOffsetX = cameraOffsetSit;
    } else if (currentMotionType === 'bite') {
      targetCameraOffsetX = cameraOffsetBite;
    }
  }

  cameraOffsetX = lerp(cameraOffsetX, targetCameraOffsetX, 0.1);

  translate(cameraOffsetX, 0);
  // Background scroll is now updated concurrently with currentSpeed kinematics at the top of draw()
  // to ensure perfect synchronization between the dog's legs and the ground.

  // (We redefine loopWidth here for the drawWrapped function below)
  let loopWidthWrap = Math.max(2400, width + 400);

  function drawWrapped(img, baseX, y, w, h) {
    if (!img) return;
    let screenX = ((baseX - bgScrollX) % loopWidthWrap + loopWidthWrap) % loopWidthWrap;
    if (screenX > loopWidthWrap / 2) screenX -= loopWidthWrap;

    image(img, screenX, y, w, h);
  }

  push();
  imageMode(CENTER);
  if (bgTreeImg) {
    // Left tree in the background
    let treeL = isMobile ? -250 : -450;
    // Right tree positioned safely to the right of the dog for sniffing
    let treeR = 420;
    drawWrapped(bgTreeImg, treeL, 10, 130, 130);
    drawWrapped(bgTreeImg, treeR, 10, 130, 130);
  }
  if (bgRainbowImg) {
    drawWrapped(bgRainbowImg, -850, 30, 80, 80);
  }
  if (bgMushroomImg) {
    let mw = 50;
    let mh = mw * (bgMushroomImg.height / bgMushroomImg.width);
    drawWrapped(bgMushroomImg, 750, 40, mw, mh);
  }
  // Animated Spaceship logic
  if (bgSpaceshipImg) {
    let now = millis();
    if (ufo.state === 'hidden') {
      if (now - ufo.stateStartTime > 5000) {
        // Prepare to enter
        let scaleF = isMobile ? 0.55 : 1.0;
        let vWidth = width / scaleF;
        let vHeight = height / scaleF;
        let uBoundX = vWidth / 2 - (isMobile ? 20 : 100);
        ufo.endX = random(-uBoundX, uBoundX);
        ufo.endY = random(-vHeight / 2 + 50, -vHeight / 2 + vHeight * 0.3); // Top 30%

        let fromRight = random(1) > 0.5;
        let maxPan = isMobile ? 300 : 0; // Buffer for extreme camera panning
        ufo.startX = fromRight ? vWidth / 2 + 200 + maxPan : -vWidth / 2 - 200 - maxPan;
        ufo.startY = random(-vHeight / 2, -vHeight / 2 + vHeight * 0.3);

        // Control point for a curve
        ufo.ctrlX = (ufo.startX + ufo.endX) / 2;
        ufo.ctrlY = Math.min(ufo.startY, ufo.endY) - 400;

        ufo.state = 'entering';
        ufo.stateStartTime = now;
      }
    } else if (ufo.state === 'entering') {
      let t = (now - ufo.stateStartTime) / 1500.0;
      if (t >= 1.0) {
        ufo.state = 'hover_pre';
        ufo.stateStartTime = now;
        ufo.x = ufo.endX;
        ufo.y = ufo.endY;
      } else {
        ufo.x = evalQuadBezier(ufo.startX, ufo.ctrlX, ufo.endX, t);
        ufo.y = evalQuadBezier(ufo.startY, ufo.ctrlY, ufo.endY, t);
      }
    } else if (ufo.state === 'hover_pre') {
      if (now - ufo.stateStartTime > 500) {
        ufo.state = 'vibrating';
        ufo.stateStartTime = now;
      } else {
        ufo.x = ufo.endX;
        ufo.y = ufo.endY + Math.sin(now / 200) * 5;
      }
    } else if (ufo.state === 'vibrating') {
      if (now - ufo.stateStartTime > 1500) {
        ufo.state = 'hover_post';
        ufo.stateStartTime = now;
      } else {
        ufo.x = ufo.endX;
        ufo.y = ufo.endY + Math.sin(now / 200) * 5;
      }
    } else if (ufo.state === 'hover_post') {
      if (now - ufo.stateStartTime > 500) {
        ufo.startX = ufo.x;
        ufo.startY = ufo.y;

        let scaleF = isMobile ? 0.7 : 1.0;
        let vWidth = width / scaleF;
        let vHeight = height / scaleF;

        let toRight = random(1) > 0.5;
        let maxPan = isMobile ? 300 : 0;
        ufo.endX = toRight ? vWidth / 2 + 200 + maxPan : -vWidth / 2 - 200 - maxPan;
        ufo.endY = random(-vHeight / 2, -vHeight / 2 + vHeight * 0.3);

        ufo.ctrlX = (ufo.startX + ufo.endX) / 2;
        ufo.ctrlY = Math.min(ufo.startY, ufo.endY) - 400;

        ufo.state = 'leaving';
        ufo.stateStartTime = now;
      } else {
        ufo.x = ufo.endX;
        ufo.y = ufo.endY + Math.sin(now / 200) * 5;
      }
    } else if (ufo.state === 'leaving') {
      let t = (now - ufo.stateStartTime) / 1500.0;
      if (t >= 1.0) {
        ufo.state = 'hidden';
        ufo.stateStartTime = now;
      } else {
        ufo.x = evalQuadBezier(ufo.startX, ufo.ctrlX, ufo.endX, t);
        ufo.y = evalQuadBezier(ufo.startY, ufo.ctrlY, ufo.endY, t);
      }
    }

    if (ufo.state !== 'hidden') {
      let sw = 60; // Make it a little smaller
      let sh = sw * (bgSpaceshipImg.height / bgSpaceshipImg.width);
      image(bgSpaceshipImg, ufo.x, ufo.y, sw, sh);
    }
  }
  pop();

  // Set side profile angle (azimuth = PI / 2) so the dog walks sideways
  bmw.setCameraParam(PI / 2, 0, 0, 0);

  // Get the markers for the current frame
  let markers = bmw.getMarkers(walkerHeight, undefined, mouseX, mouseY);

  // Handle eating animation AND draw bowl (so it renders behind the dog)
  if (isEating) {
    let pawX = markers[0] ? markers[0].x : 100;
    let floorY = markers[0] ? markers[0].y : 100; // Paw Y is floor
    targetBowlX = pawX + 117; // exactly below head point
    targetBowlY = floorY - 10;     // lowered so bowl bottom perfectly aligns with paws

    bowlX = lerp(bowlX, targetBowlX, 0.1);
  } else {
    let offScreenX = (width / 2) / (isMobile ? 0.55 : 1.0) - cameraOffsetX + 100;
    targetBowlX = offScreenX;
    if (bowlX < targetBowlX - 5) {
      bowlX = lerp(bowlX, targetBowlX, 0.1);
    } else {
      bowlX = targetBowlX;
    }
  }

  let clipX = (width / 2) / (isMobile ? 0.55 : 1.0) - cameraOffsetX + 90;
  if (bowlX < clipX && bowlImg) {
    push();
    imageMode(CENTER);
    let aspect = bowlImg.width / bowlImg.height;
    let bWidth = 80;
    let bHeight = bWidth / aspect;
    image(bowlImg, bowlX, targetBowlY, bWidth, bHeight);
    pop();
  }

  // Update and draw pee particles
  updateAndDrawPeeParticles(markers);

  // Update happiness parameter of the walker dynamically
  let step = 0.125;
  if (Math.abs(currentHappiness - targetSliderHappiness) < step) {
    currentHappiness = targetSliderHappiness;
  } else {
    currentHappiness += Math.sign(targetSliderHappiness - currentHappiness) * step;
  }

  if (bmw.happiness !== currentHappiness) {
    bmw.setWalkerParam(undefined, undefined, undefined, currentHappiness);
  }

  // Check if skeleton toggle is checked
  let showSkeleton = false;
  let toggleSkeleton = document.getElementById('toggle-skeleton');
  if (toggleSkeleton) {
    showSkeleton = toggleSkeleton.checked;
  }

  // Check if image rotation toggle is checked
  let rotateImages = true;
  let toggleRotate = document.getElementById('toggle-rotate-images');
  if (toggleRotate) {
    rotateImages = toggleRotate.checked;
  }

  // Draw bones as lines
  if (showSkeleton) {
    stroke(100);
    strokeWeight(3);
    dogBones.forEach((bone) => {
      let jointA = markers[bone[0]];
      let jointB = markers[bone[1]];
      if (jointA && jointB) {
        line(jointA.x, jointA.y, jointB.x, jointB.y);
      }
    });
  }

  // Check if show images toggle is checked
  let showImages = true;
  let toggleShowImages = document.getElementById('toggle-show-images');
  if (toggleShowImages) {
    showImages = toggleShowImages.checked;
  }

  // Handle special image modes: images change every 3s, positions change every 1s
  if (currentImagesMode !== 'logo') {
    let sourceArray = [];
    if (currentImagesMode === 'small') sourceArray = smallImages;

    if (sourceArray.length > 0) {
      let currentTime = millis();
      // Change images every 3 seconds
      if (currentTime - lastImageSwitchTime >= 3000) {
        lastImageSwitchTime = currentTime;
        let pickedIndices = [];
        if (sourceArray.length >= 4) {
          while (pickedIndices.length < 4) {
            let r = Math.floor(random(sourceArray.length));
            if (!pickedIndices.includes(r)) pickedIndices.push(r);
          }
        } else {
          while (pickedIndices.length < 4) {
            pickedIndices.push(Math.floor(random(sourceArray.length)));
          }
        }
        activeEmotionImg1 = sourceArray[pickedIndices[0]];
        activeEmotionImg2 = sourceArray[pickedIndices[1]];
        activeEmotionImg3 = sourceArray[pickedIndices[2]];
        activeEmotionImg4 = sourceArray[pickedIndices[3]];
      }

      // Change positions every 1 second
      if (currentTime - lastPositionSwitchTime >= 1000) {
        lastPositionSwitchTime = currentTime;
        let numBones = dogBones.length;

        // Pick 4 unique random bones
        let picked = [];
        if (numBones >= 4) {
          while (picked.length < 4) {
            let r = Math.floor(random(numBones));
            if (!picked.includes(r)) picked.push(r);
          }
        } else {
          while (picked.length < 4) {
            picked.push(Math.floor(random(numBones)));
          }
        }
        activeBone1 = picked[0];
        activeBone2 = picked[1];
        activeBone3 = picked[2];
        activeBone4 = picked[3];
      }
    }
  }

  // Draw bones as logo images (upright, no rotation)
  if (showImages) {
    imageMode(CENTER);
    dogBones.forEach((bone, idx) => {
      let jointA = markers[bone[0]];
      let jointB = markers[bone[1]];
      if (jointA && jointB) {
        let img = logoImages.length > 0 ? logoImages[idx % logoImages.length] : null;
        if (fixedLogoImages[idx]) {
          img = fixedLogoImages[idx];
        }
        if (currentImagesMode !== 'logo') {
          if (idx === activeBone1 && activeEmotionImg1) img = activeEmotionImg1;
          else if (idx === activeBone2 && activeEmotionImg2) img = activeEmotionImg2;
          else if (idx === activeBone3 && activeEmotionImg3) img = activeEmotionImg3;
          else if (idx === activeBone4 && activeEmotionImg4) img = activeEmotionImg4;
        }
        if (img) {
          let xA = jointA.x;
          let yA = jointA.y;
          let xB = jointB.x;
          let yB = jointB.y;

          let midX = (xA + xB) / 2;
          let midY = (yA + yB) / 2;
          let d = dist(xA, yA, xB, yB);

          // Get the heading (direction) of the line going between two marker points
          let heading = atan2(yB - yA, xB - xA);

          let isHorizontal = img.width >= img.height;
          let rotationAngle = rotateImages ? (isHorizontal ? heading : (heading - PI / 2)) : 0;

          let isEmotionImg = (currentImagesMode !== 'logo' && (idx === activeBone1 || idx === activeBone2 || idx === activeBone3 || idx === activeBone4));

          let imgW, imgH;
          let aspect = img.width / img.height;
          if (isEmotionImg) {
            if (isHorizontal) {
              imgW = d;
              imgH = d / aspect;
            } else {
              imgH = d;
              imgW = d * aspect;
            }
          } else {
            if (isHorizontal) {
              imgW = d;
              imgH = d / 1.5;
            } else {
              imgH = d;
              imgW = d / 1.5;
            }
          }

          push();
          translate(midX, midY);
          if (rotationAngle !== 0) {
            rotate(rotationAngle);
          }
          image(img, 0, 0, imgW, imgH);
          pop();
        }
      }
    });
  }

  // Draw each marker (joints)
  if (showSkeleton) {
    markers.forEach((m, index) => {
      // Highlight Left side in Red, Right side in Blue, spine in Black
      let col = color(0);
      if (index < 3 || (index >= 5 && index <= 7)) {
        col = color(200, 0, 0); // Red for Left limbs
      } else if ((index >= 12 && index <= 14) || index >= 15) {
        col = color(0, 0, 200); // Blue for Right limbs
      }

      // Draw joint point
      fill(col);
      noStroke();
      circle(m.x, m.y, 8);

      // Draw description text to the left
      let jointName = dogJointNames[index];
      fill(0);
      textSize(10);
      textAlign(RIGHT, CENTER);
      text(jointName, m.x - 10, m.y);
    });
  }
}

function shuffleImages() {
  // Shuffle letters
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(random(i + 1));
    let temp = letters[i];
    letters[i] = letters[j];
    letters[j] = temp;
  }
  // Shuffle logo images
  for (let i = logoImages.length - 1; i > 0; i--) {
    const j = Math.floor(random(i + 1));
    let temp = logoImages[i];
    logoImages[i] = logoImages[j];
    logoImages[j] = temp;
  }
}

// --- Control Panel Integration Helper Functions ---

window.setImagesMode = function (mode) {
  currentImagesMode = mode;
  lastImageSwitchTime = 0; // force immediate update next frame
  lastPositionSwitchTime = 0;
};

window.onSliderChange = function (index, axis, value) {
  let val = parseFloat(value);
  if (axis === 'x') {
    bmw.setJointOffset(index, val, undefined, undefined);
    let el = document.getElementById(`offset-x-${index}`);
    if (el) el.innerText = (val >= 0 ? "+" : "") + val;
  } else if (axis === 'z') {
    bmw.setJointOffset(index, undefined, undefined, val);
    let el = document.getElementById(`offset-z-${index}`);
    if (el) el.innerText = (val >= 0 ? "+" : "") + val;
  }
};

window.onAmplitudeChange = function (index, value) {
  let val = parseFloat(value);
  bmw.setJointAmplitude(index, val);
  let el = document.getElementById(`offset-a-${index}`);
  if (el) el.innerText = val.toFixed(2) + "×";
};

window.pendingMotionType = null;

window.applyMotionType = function (type) {
  currentMotionType = type;
  if (bmw && bmw.setMotionType) {
    if (type === 'eat') {
      bmw.setMotionType('eat');
      isEating = true;
    } else {
      bmw.setMotionType(type);
      isEating = false;
      targetBowlX = 900;
    }
  }

  if (type === 'walk') {
    targetSliderSpeed = 1.0;
    targetSliderHappiness = 5.0;
  } else if (type === 'run') {
    targetSliderSpeed = 2.0;
  } else if (type === 'eat') {
    targetSliderSpeed = 0.0;
  } else if (type === 'sniff') {
    targetSliderSpeed = 0.0;
    targetSliderHappiness = 1.0;
  } else if (type === 'sit') {
    targetSliderSpeed = 0.0;
  } else if (type === 'pee') {
    targetSliderSpeed = 0.0;
  } else if (type === 'bite') {
    targetSliderSpeed = 1.0; // Keep the timer ticking so the dog can wiggle!
  }

  if (type === 'pee') {
    releasePeeParticles = true;
  }
};

window.onMotionTypeChange = function (type) {
  let stopModes = ['eat', 'sit', 'pee'];
  let shouldQueue = (type === 'sniff') || (window.isMobileMode && stopModes.includes(type));
  
  if (shouldQueue) {
    // On mobile (or always for sniff), queue the motion type. We will NOT transition until we are near the safe spot!
    window.pendingMotionType = type;

    // If we are currently stopped (e.g. sitting) and the user clicks a different stop mode,
    // we need to stand up and walk to the new target.
    if (currentSpeed === 0 && currentMotionType !== type) {
      window.applyMotionType('walk');
    }
  } else {
    // Walk or Run apply immediately
    window.pendingMotionType = null;
    window.applyMotionType(type);
  }
};

window.stopEating = function () {
  isEating = false;
  targetBowlX = 900;
  
  let walkBtn = document.getElementById('walk-btn');
  if (walkBtn) walkBtn.click();
  else if (bmw) bmw.setMotionType('walk');

  window.resetAllOffsets();
};

window.stopPeeing = function () {
  releasePeeParticles = false;
  let stopBtn = document.getElementById('stop-pee-btn');
  if (stopBtn) {
    stopBtn.style.display = 'none';
  }
};

window.resetAllOffsets = function () {
  peeParticles = [];
  if (bmw) bmw.isConfigLoaded = false;
  targetSliderSpeed = 1.0;
  targetSliderHappiness = 0.0;
  for (let i = 0; i < 20; i++) {
    bmw.setJointOffset(i, 0, 0, 0);
    bmw.setJointAmplitude(i, 1.0);
    let sliderX = document.getElementById(`slider-x-${i}`);
    let sliderZ = document.getElementById(`slider-z-${i}`);
    let sliderA = document.getElementById(`slider-a-${i}`);
    let elX = document.getElementById(`offset-x-${i}`);
    let elZ = document.getElementById(`offset-z-${i}`);
    let elA = document.getElementById(`offset-a-${i}`);
    if (sliderX) sliderX.value = 0;
    if (sliderZ) sliderZ.value = 0;
    if (sliderA) sliderA.value = 1;
    if (elX) elX.innerText = "0";
    if (elZ) elZ.innerText = "0";
    if (elA) elA.innerText = "1.00×";
  }
};

window.saveConfigToJSON = function () {
  // Prompt for a name (default: "dog-walk")
  let name = prompt("Name this configuration:", "dog-walk");
  if (name === null) return; // user cancelled
  if (!name.trim()) name = "dog-walk";

  const config = {
    name: name.trim(),
    savedAt: new Date().toISOString(),
    speed: currentSpeed,
    happiness: currentHappiness,
    joints: dogJointNames.map((jointName, i) => ({
      index: i,
      name: jointName,
      offsetX: bmw.jointOffsets[i].x,
      offsetZ: bmw.jointOffsets[i].z,
      amplitude: bmw.jointAmplitudes[i]
    }))
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name.trim().replace(/\s+/g, '-') + '.json';
  a.click();
  URL.revokeObjectURL(url);
};

window.loadConfigFromFile = function () {
  document.getElementById('json-file-input').click();
};

window.onJSONFileSelected = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const config = JSON.parse(e.target.result);

      // Restore speed & happiness
      if (config.speed !== undefined) {
        currentSpeed = config.speed;
        bmw.setSpeed(config.speed);
        targetSliderSpeed = config.speed;
      }
      if (config.happiness !== undefined) {
        currentHappiness = config.happiness;
        bmw.setWalkerParam(undefined, undefined, undefined, config.happiness);
        targetSliderHappiness = config.happiness;
      }

      // Restore all joint settings
      if (config.joints && Array.isArray(config.joints)) {
        bmw.isConfigLoaded = true;

        let isSitPose = config.name && config.name.toLowerCase().includes('sit');

        if (isSitPose) {
          let customSit = [];
          config.joints.forEach(j => {
            customSit[j.index] = { x: j.absoluteX !== undefined ? j.absoluteX : 0, z: j.absoluteZ !== undefined ? j.absoluteZ : 0 };
          });
          bmw.customSitCoords = customSit;

          bmw.setMotionType('sit');
          const motionSelect = document.getElementById('motionType');
          if (motionSelect) motionSelect.value = 'sit';
        } else {
          config.joints.forEach(joint => {
            const i = joint.index;
            if (i < 0 || i >= 20) return;

            const ox = joint.offsetX ?? 0;
            const oz = joint.offsetZ ?? 0;
            const amp = joint.amplitude ?? 1.0;

            bmw.setJointOffset(i, ox, undefined, oz);
            bmw.setJointAmplitude(i, amp);

            // Sync sliders
            let sx = document.getElementById(`slider-x-${i}`);
            let sz = document.getElementById(`slider-z-${i}`);
            let sa = document.getElementById(`slider-a-${i}`);
            let ex = document.getElementById(`offset-x-${i}`);
            let ez = document.getElementById(`offset-z-${i}`);
            let ea = document.getElementById(`offset-a-${i}`);

            if (sx) sx.value = ox;
            if (sz) sz.value = oz;
            if (sa) sa.value = amp;
            if (ex) ex.innerText = (ox >= 0 ? "+" : "") + ox.toFixed(1);
            if (ez) ez.innerText = (oz >= 0 ? "+" : "") + oz.toFixed(1);
            if (ea) ea.innerText = amp.toFixed(2) + "×";
          });
        }
      }

      alert(`Loaded "${config.name || file.name}" successfully!`);
    } catch (err) {
      alert("Failed to load config: " + err.message);
    }
    // Reset the input so the same file can be re-loaded
    event.target.value = '';
  };
  reader.readAsText(file);
};

class PeeParticle {
  constructor(x, y, img) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.startX = x;
    this.startY = y;
    this.vx = 0; // All start identically with no horizontal speed
    this.vy = random(2, 5);
    this.angle = random(TWO_PI);
    this.vAngle = random(-0.15, 0.15);
    this.targetSize = random(10, 50); // Final randomized size
    this.size = 10; // All particles start uniformly tiny
    this.opacity = 255;
    this.id = Math.random();
  }

  update() {
    // Smoothly grow from initial size (10) to their target randomized size
    this.size += (this.targetSize - this.size) * 0.05;

    // Randomize horizontal velocity slightly as they fall to create mid-air scatter
    this.vx += random(-0.02, 0.02);

    // Apply gravity
    this.vy += 0.25;

    // Apply simple air drag
    this.vx *= 0.99;
    this.vy *= 0.99;

    // Move
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.vAngle;
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    imageMode(CENTER);

    // Use native globalAlpha instead of p5's extremely slow CPU-bound tint()
    drawingContext.globalAlpha = Math.max(0, this.opacity / 255.0);

    let imgAspectRatio = this.img.width / this.img.height;
    let imgW = this.size * imgAspectRatio;
    let imgH = this.size;

    image(this.img, 0, 0, imgW, imgH);

    // Reset global alpha so it doesn't affect other rendering
    drawingContext.globalAlpha = 1.0;
    pop();
  }
}

function updateAndDrawPeeParticles(markers) {
  let isMobile = windowWidth <= 768;
  let floorY = (height / 2) / (isMobile ? 0.55 : 1.0);

  // Spawn particles when peeing and release is enabled
  if (bmw && bmw.motionType === 'pee' && bmw.peeProgress > 0.8 && releasePeeParticles) {
    if (frameCount % 2 === 0) {
      let pelvis = markers[8];
      if (pelvis) {
        let choices = [...logoImages];
        if (smallImages && smallImages.length > 0) {
          choices = choices.concat(smallImages);
        }
        let randomImg = choices[Math.floor(random(choices.length))];
        peeParticles.push(new PeeParticle(pelvis.x, pelvis.y, randomImg));
      }
    }
  }

  // Update physics for all particles
  for (let p of peeParticles) {
    p.update();
  }

  // Resolve circle-circle collisions using Spatial Hashing to prevent O(N^2) lag
  let cellSize = 50; // slightly larger than max particle size
  let grid = {};

  // 1. Assign particles to grid cells
  for (let p of peeParticles) {
    p._cx = Math.floor(p.x / cellSize);
    p._cy = Math.floor(p.y / cellSize);
    let key = p._cx + "," + p._cy;
    if (!grid[key]) grid[key] = [];
    grid[key].push(p);
  }

  // 2. Check collisions only within adjacent cells
  for (let pA of peeParticles) {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        let key = (pA._cx + ox) + "," + (pA._cy + oy);
        if (grid[key]) {
          for (let pB of grid[key]) {
            // Only process each pair once using their unique ids
            if (pA.id >= pB.id) continue;

            let clearance = ((pA.size + pB.size) / 2) * 0.85;
            let dx = pA.x - pB.x;
            let dy = pA.y - pB.y;

            // Fast bounding box check before expensive Math.sqrt
            if (Math.abs(dx) > clearance || Math.abs(dy) > clearance) continue;

            // Prevent the "shower head" scatter: don't collide particles that have just spawned
            // This guarantees they fall in a perfectly straight line for the first 80 pixels
            if (pA.y < pA.startY + 80 && pB.y < pB.startY + 80) continue;

            let distSq = dx * dx + dy * dy;
            if (distSq < clearance * clearance) {
              let d = Math.sqrt(distSq);
              if (d === 0) {
                pA.x += random(-1, 1);
                pA.y += random(-1, 1);
                continue;
              }

              let overlap = clearance - d;
              let pushX = (dx / d) * overlap * 0.5;
              let pushY = (dy / d) * overlap * 0.5;

              pA.x += pushX;
              pA.y += pushY;
              pB.x -= pushX;
              pB.y -= pushY;

              // Add a bit of horizontal flow when particles press against each other
              let flowFactor = 0.08;
              pA.vx += pushX * flowFactor;
              pA.vy += pushY * flowFactor;
              pB.vx -= pushX * flowFactor;
              pB.vy -= pushY * flowFactor;
            }
          }
        }
      }
    }
  }

  // Constrain all particles to floor (bottom of canvas)
  for (let p of peeParticles) {
    let bottomLimit = floorY - p.size / 2;
    if (p.y >= bottomLimit) {
      p.y = bottomLimit;
      p.vy = 0;
      p.vx *= 0.85; // floor friction
      p.vAngle *= 0.9; // spin friction
    }
  }

  // If not actively releasing particles, fade out all particles
  if (bmw && (bmw.motionType !== 'pee' || !releasePeeParticles)) {
    for (let p of peeParticles) {
      p.opacity -= 4; // Fade out
    }
    // Remove faded out particles
    peeParticles = peeParticles.filter(p => p.opacity > 0);
  }

  // Cap total particles at 300 to maintain performance
  if (peeParticles.length > 300) {
    peeParticles.shift(); // Remove the oldest particle
  }

  // Draw all particles
  for (let p of peeParticles) {
    p.draw();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
