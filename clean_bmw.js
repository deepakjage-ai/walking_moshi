const fs = require('fs');
let code = fs.readFileSync('bmwalker.js', 'utf8');

// Replace meanwalker[0]
code = code.replace(
  /this\.meanwalker\[0\] = new Array\([\s\S]*?this\.meanwalker_run = new Array\(/,
  'this.meanwalker[0] = [];\n    this.meanwalker_run = new Array('
);

// Replace meanwalker[2]
code = code.replace(
  /this\.meanwalker\[2\] = new Array\([\s\S]*?this\.meanwalker\[3\] = new Array\(/,
  'this.meanwalker[2] = [];\n    this.meanwalker[3] = new Array('
);

// Replace meanwalker[3]
code = code.replace(
  /this\.meanwalker\[3\] = new Array\([\s\S]*?this\.bodyStructureaxis = new Array\(/,
  'this.meanwalker[3] = [];\n    this.bodyStructureaxis = new Array('
);

// Replace the 4 trailing human axes
code = code.replace(
  /this\.bodyStructureaxis = new Array\([\s\S]*$/,
  'this.bodyStructureaxis = [];\n    this.weightaxis = [];\n    this.nervousaxis = [];\n    this.happyaxis = [];\n  }\n}\n'
);

// Remove BMW_TYPE_HUMAN blocks where possible, but safely.
// Let's not remove the logic blocks because they are small and don't hurt.

fs.writeFileSync('bmwalker.js', code);
console.log('Cleaned up bmwalker.js successfully');
