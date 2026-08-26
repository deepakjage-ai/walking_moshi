const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Replace control panel
const newUI = `  <div id="ui-controls" style="position: absolute; left: 20px; top: 150px; display: flex; flex-direction: column; gap: 12px; z-index: 100;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <input type="checkbox" id="toggle-skeleton" checked style="cursor: pointer; width: 16px; height: 16px; accent-color: #6366f1;">
      <label for="toggle-skeleton" style="font-size: 13px; font-weight: 500; color: #d1d1d6; cursor: pointer; user-select: none;">Show skeleton lines & dots</label>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <input type="checkbox" id="toggle-rotate-images" checked style="cursor: pointer; width: 16px; height: 16px; accent-color: #6366f1;">
      <label for="toggle-rotate-images" style="font-size: 13px; font-weight: 500; color: #d1d1d6; cursor: pointer; user-select: none;">Align images with bones direction</label>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <input type="checkbox" id="toggle-show-images" checked style="cursor: pointer; width: 16px; height: 16px; accent-color: #6366f1;">
      <label for="toggle-show-images" style="font-size: 13px; font-weight: 500; color: #d1d1d6; cursor: pointer; user-select: none;">Show bone logo images</label>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <label for="motion-type-select" style="font-size: 13px; font-weight: 600; color: #e2e2e9;">Motion:</label>
      <select id="motion-type-select" onchange="onMotionTypeChange(this.value)" style="background: rgba(255,255,255,0.1); color: white; border: none; padding: 4px 8px; border-radius: 4px; font-family: 'Outfit', sans-serif;">
        <option value="walk">Walk (Dachshund)</option>
        <option value="run">Run (Gallop)</option>
        <option value="sit">Sit</option>
        <option value="pee">Pee</option>
        <option value="bite">Bite</option>
        <option value="eat">Eat</option>
      </select>
      <button id="stop-pee-btn" onclick="stopPeeing()" style="display: none; background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-family: 'Outfit', sans-serif; cursor: pointer; font-size: 12px; font-weight: 600; transition: background 0.2s;">Stop Pee</button>
      <button id="stop-eat-btn" onclick="stopEating()" style="display: none; background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-family: 'Outfit', sans-serif; cursor: pointer; font-size: 12px; font-weight: 600; transition: background 0.2s;">Done Eating</button>
    </div>
  </div>`;

// Delete <div id="control-panel"> to its end </div>
const startIdx = html.indexOf('  <!-- Sidebar Control Panel -->');
const endIdx = html.indexOf('  <!-- Load the main sketch file -->');
if (startIdx !== -1 && endIdx !== -1) {
  html = html.substring(0, startIdx) + newUI + '\n\n' + html.substring(endIdx);
}
fs.writeFileSync('index.html', html);
console.log('updated index.html');
