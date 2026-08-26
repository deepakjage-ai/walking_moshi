const fs = require('fs');

let content = fs.readFileSync('bmwalker.js', 'utf8');

content = content.replace(
`const BMW_TYPE_HUMAN = 0;
const BMW_TYPE_DOG = 1;
const BMW_TYPE_CAT = 1; // (kept for compatibility)
const BMW_TYPE_PIGEON = 2;
const BMW_TYPE_BOX = 3; // (for debug)`,
`const BMW_TYPE_DOG = 1;`
);

content = content.replace(
`  constructor(type = BMW_TYPE_HUMAN) {`,
`  constructor(type = BMW_TYPE_DOG) {`
);

content = content.replace(
`    if (includeStructure) {
      if (this.type === BMW_TYPE_HUMAN) {
        initialpos +=
          this.bodyStructureaxis[i] * this.bodyStructure +
          this.weightaxis[i] * this.weight +
          this.nervousaxis[i] * this.nervousness +
          this.happyaxis[i] * this.happiness;
      }

      //invert or scale structure`,
`    if (includeStructure) {
      //invert or scale structure`
);

// We want to replace the `if (this.type === BMW_TYPE_HUMAN) ... } else {` 
// down to the corresponding `}`.
// Instead of full string replace, we'll do regex or a simple index search.
let blockStartStr = `    if (this.type === BMW_TYPE_HUMAN) {
      const b = this.bodyStructure;`;
let elseStr = `    } else {
      if (this.type === BMW_TYPE_DOG`;

let startIndex = content.indexOf(blockStartStr);
let elseIndex = content.indexOf(elseStr);

if (startIndex !== -1 && elseIndex !== -1) {
  // We want to replace everything from startIndex to elseIndex + "    } else {\n".length
  // with just empty string
  let toRemove = content.substring(startIndex, elseIndex + 13);
  content = content.replace(toRemove, "");
  
  // Now we must also remove one closing brace `    }` that matched the `} else {`
  // The structure is:
  //      } else {
  //        motionpos = ...
  //      }
  //    }
  //
  //    if (i >= this.nummarkers * 2 && i < this.nummarkers * 3)
  
  let endBlockStr = `        if (this.jointAmplitudes && this.jointAmplitudes[jointIdx] !== undefined) {
          motionpos *= this.jointAmplitudes[jointIdx];
        }
      }
    }

    if (i >= this.nummarkers * 2 && i < this.nummarkers * 3)`;
    
  let endBlockReplace = `        if (this.jointAmplitudes && this.jointAmplitudes[jointIdx] !== undefined) {
          motionpos *= this.jointAmplitudes[jointIdx];
        }
      }

    if (i >= this.nummarkers * 2 && i < this.nummarkers * 3)`;
    
  content = content.replace(endBlockStr, endBlockReplace);
}

// getFrequency block
let freqStr = `    if (this.type === BMW_TYPE_HUMAN) {
      speed += this.bodyStructure * this.bodyStructureaxis[i];
      speed += this.weight * this.weightaxis[i];
      speed += this.nervousness * this.nervousaxis[i];
      speed += this.happiness * this.happyaxis[i];
    }

    // avoid 0 speed`;
let freqReplace = `    // avoid 0 speed`;
content = content.replace(freqStr, freqReplace);

// calcTranslationSpeed block
let transStr = `    if (this.type === BMW_TYPE_HUMAN) {
      tspeed += this.bodyStructure * this.bodyStructureaxis[i];
      tspeed += this.weight * this.weightaxis[i];
      tspeed += this.nervousness * this.nervousaxis[i];
      tspeed += this.happiness * this.happyaxis[i];
    }

    return tspeed * 120;`;
let transReplace = `    return tspeed * 120;`;
content = content.replace(transStr, transReplace);

fs.writeFileSync('bmwalker.js', content);
console.log("Replaced logic.");
