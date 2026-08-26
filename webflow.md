# Webflow Integration Guide

To get this custom p5.js program running inside Webflow, you have two options. **Option 1 (iframe)** is highly recommended because it handles all the images and large files automatically. **Option 2 (Custom Code)** is the native Webflow way but requires you to host your images and JavaScript files manually.

---

## Option 1: The Iframe Method (Highly Recommended)
Since this project uses local image folders (`logo/`, `images_rep/`) and large JavaScript files that exceed Webflow's 10,000 character limit, the easiest way to add it to Webflow is to host it for free on a site like Vercel, Netlify, or GitHub Pages, and embed it using an iframe.

1. Upload this entire folder to GitHub.
2. Connect the GitHub repository to **Vercel** or **Netlify** (it's free and takes 1 minute).
3. Once deployed, they will give you a URL (e.g., `https://moshimbo-dog.vercel.app`).
4. In Webflow, add an **Embed** element and paste this code:
```html
<iframe src="YOUR_VERCEL_OR_NETLIFY_URL" width="100%" height="100%" style="border:none; min-height: 100vh;"></iframe>
```

---

## Option 2: Webflow Custom Code (Head & Body)

If you strictly want to paste the code into Webflow's Page Settings, use the code below. 

⚠️ **CRITICAL WARNING:** 
1. Webflow has a **10,000 character limit** for custom code. You cannot paste the contents of `bmwalker.js` (100k+ characters) or `dog.js` (26k+ characters) directly. You **must** host these two files externally (e.g., on GitHub + jsDelivr) and link to them.
2. Webflow flattens all image assets. You must upload every image to Webflow's Asset panel, get their individual URLs, and manually update the `loadImage('...')` paths inside your hosted `dog.js` file.

### 1. Inside <head> tag
Paste this in your Page Settings -> Custom Code -> **Inside <head> tag**:

```html
<!-- Load p5.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
<!-- Load Google Fonts -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap">

<!-- CSS Styles -->
<style>
  html, body {
    margin: 0; padding: 0; display: flex;
    background-color: #0f0f13; color: #f0f0f5;
    font-family: 'Outfit', 'Inter', sans-serif;
    height: 100vh; overflow: hidden;
  }
  #canvas-container {
    flex: 1; display: flex; justify-content: center; align-items: center;
    position: relative;
    background: radial-gradient(circle at center, #1a1a24 0%, #0f0f13 100%);
  }
  canvas {
    display: block; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-radius: 12px;
  }
  #control-panel {
    width: 380px; background: rgba(20, 20, 28, 0.95);
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    display: flex; flex-direction: column; height: 100%;
    box-shadow: -5px 0 25px rgba(0,0,0,0.5); z-index: 10;
    backdrop-filter: blur(10px);
  }
  .panel-header {
    padding: 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(to bottom, rgba(255,255,255,0.01) 0%, transparent 100%);
  }
  .panel-header h2 { margin: 0 0 10px 0; font-size: 22px; font-weight: 600; color: #fff; }
  .panel-header p { margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5; }
  .joints-list { flex: 1; overflow-y: auto; padding: 20px; }
  /* (Add the rest of the style.css contents here if it fits, otherwise link it as an external stylesheet) */
</style>
```

### 2. Before </body> tag
Paste this in your Page Settings -> Custom Code -> **Before </body> tag**:

```html
<!-- App Layout -->
<div style="display: flex; width: 100%; height: 100vh;">
  <!-- Container for the p5.js canvas -->
  <div id="canvas-container"></div>

  <!-- Sidebar Control Panel -->
  <div id="control-panel">
    <div class="panel-header">
      <h2>Dog Joint Offset Editor</h2>
      <p>Fine-tune individual joint positions in real-time. Use coordinates offset (X: Horizontal, Z: Vertical) relative to current mean.</p>
      <div style="margin-top: 15px; display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" id="toggle-skeleton" checked style="cursor: pointer; width: 16px; height: 16px; accent-color: #6366f1;">
        <label for="toggle-skeleton" style="font-size: 13px; font-weight: 500; color: #d1d1d6; cursor: pointer; user-select: none;">Show skeleton lines & dots</label>
      </div>
      <div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" id="toggle-rotate-images" checked style="cursor: pointer; width: 16px; height: 16px; accent-color: #6366f1;">
        <label for="toggle-rotate-images" style="font-size: 13px; font-weight: 500; color: #d1d1d6; cursor: pointer; user-select: none;">Align images with bones direction</label>
      </div>
      <div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" id="toggle-show-images" checked style="cursor: pointer; width: 16px; height: 16px; accent-color: #6366f1;">
        <label for="toggle-show-images" style="font-size: 13px; font-weight: 500; color: #d1d1d6; cursor: pointer; user-select: none;">Show bone logo images</label>
      </div>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; gap: 10px;">
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
    </div>
    <div id="joints-list" class="joints-list">
      <!-- Will be populated dynamically by dog.js -->
    </div>
    <div class="panel-footer" style="padding: 20px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 10px; justify-content: space-between;">
      <button class="btn-secondary" onclick="resetAllOffsets()">Reset All</button>
      <button class="btn-secondary" onclick="loadConfigFromFile()">Load JSON</button>
      <button class="btn-primary" onclick="saveConfigToJSON()">Save JSON</button>
      <input type="file" id="json-file-input" accept=".json" style="display:none" onchange="onJSONFileSelected(event)">
    </div>
  </div>
</div>



<!-- Load Hosted JavaScript Files -->
<!-- REPLACE THESE URLS WITH YOUR HOSTED FILES -->
<script src="https://YOUR_EXTERNAL_HOSTING/bmwalker.js"></script>
<script src="https://YOUR_EXTERNAL_HOSTING/dog.js"></script>
```


