const fs = require('fs');
let bm = fs.readFileSync('bmwalker.js', 'utf8');

let match = bm.match(/calculateEatPosture\([\s\S]*?return eatMarkers;/);
if (match) {
    console.log(match[0]);
}
