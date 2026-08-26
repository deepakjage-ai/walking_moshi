const fs = require('fs');
let code = fs.readFileSync('bmwalker.js', 'utf8');

let match = code.match(/setMotionType\([\s\S]*?if \(motionType === 'run' && this\.walkerData\.meanwalker_run\)/);
if (match) {
    console.log(match[0]);
} else {
    console.log("NOT FOUND");
}
