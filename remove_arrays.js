const fs = require('fs');

let content = fs.readFileSync('bmwalker.js', 'utf8');
let lines = content.split('\n');

// Arrays to delete (0-indexed line numbers, so subtract 1 from 1-indexed)
const rangesToDelete = [
  [2101, 2332], // this.meanwalker[0]
  [2949, 3121], // //PIGEON and this.meanwalker[2]
  [3123, 3250], // //BOX and this.meanwalker[3]
  [3253, 3484], // this.bodyStructureaxis
  [3486, 3717], // this.weightaxis
  [3721, 3952], // this.nervousaxis
  [3954, 4185]  // this.happyaxis
];

let linesToKeep = [];
for (let i = 0; i < lines.length; i++) {
  let keep = true;
  for (const [start, end] of rangesToDelete) {
    if (i >= start && i <= end) {
      keep = false;
      break;
    }
  }
  if (keep) {
    linesToKeep.push(lines[i]);
  }
}

fs.writeFileSync('bmwalker.js', linesToKeep.join('\n'));
