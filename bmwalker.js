// BMWalker.js
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
const BMW_TYPE_BOX = 3; // (for debug)

class BMWalker {
  // Constructor
  constructor(type = BMW_TYPE_HUMAN) {
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

    if (this.type === BMW_TYPE_DOG) {
      this.speed = 1.0 + this.runProgress * 1.0;
    }

    if (progressChanged) {
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
        let centerX = (headMarker.x + neckMarker.x) / 2;
        let centerY = (headMarker.y + neckMarker.y) / 2;

        let targetX = mx - (window.width || 800) / 2;
        let targetY = my - (window.height || 800) / 2;

        let dx_shift = targetX - centerX;
        let dy_shift = targetY - centerY;

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
          let rx = markers[k].x - centerX;
          let ry = markers[k].y - centerY;

          let rotX = rx * cosA - ry * sinA;
          let rotY = rx * sinA + ry * cosA;

          markers[k].x = centerX + rotX + shiftX;
          markers[k].y = centerY + rotY + shiftY;
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
        // Capture anchor X from the back paws (index 5) if not already sitting
        if (this.sitProgress === 0.0 && this.markers && this.markers[5] !== undefined) {
          this.sitAnchorX = this.markers[5];
          // If transitioning from Eat, shift the whole dog backward to keep the visual center stable
          if (this.eatProgress > 0.0) this.sitAnchorX -= 60;
        }
      } else if (motionType === 'pee') {
        this.targetPeeProgress = 1.0;
        this.targetSitProgress = 0.0;
        this.targetBiteProgress = 0.0;
        this.targetEatProgress = 0.0;
        this.targetSniffProgress = 0.0;
        this.targetRunProgress = 0.0;
        // Capture anchor X from the back paws (index 5) if not already peeing
        if (this.peeProgress === 0.0 && this.markers && this.markers[5] !== undefined) {
          this.peeAnchorX = this.markers[5];
          // If transitioning from Eat, shift the whole dog backward to keep the visual center stable
          if (this.eatProgress > 0.0) this.peeAnchorX -= 60;
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
        if (this.sniffProgress === 0.0 && this.markers && this.markers[5] !== undefined) {
          this.sniffAnchorX = this.markers[5];
          if (this.sitProgress > 0.0 || this.peeProgress > 0.0) this.sniffAnchorX += 60;
        }
      } else if (motionType === 'eat') {
        this.targetSitProgress = 0.0;
        this.targetPeeProgress = 0.0;
        this.targetBiteProgress = 0.0;
        this.targetEatProgress = 1.0;
        this.targetSniffProgress = 0.0;
        this.targetRunProgress = 0.0;
        // Capture anchor X from the back paws (index 5) if not already eating
        if (this.eatProgress === 0.0 && this.markers && this.markers[5] !== undefined) {
          this.eatAnchorX = this.markers[5];
          // If transitioning from Sit or Pee, shift the whole dog forward to compensate for the backward shift
          if (this.sitProgress > 0.0 || this.peeProgress > 0.0) this.eatAnchorX += 60;
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

    // Dynamic Tail Wag using walkertime and scaled by happiness
    let h = Math.max(0.15, this.happiness / 10.0); // minimum wag factor of 0.15
    if (h !== 0) {
      let t = walkertime;
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

    // Dynamic Tail Wag using walkertime and scaled by happiness
    let h = Math.max(0.15, this.happiness / 10.0);
    if (h !== 0) {
      let t = walkertime;
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
