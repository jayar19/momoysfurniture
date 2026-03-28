<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>AR Viewer - MOMOY'S Furniture</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #000;
      font-family: system-ui, sans-serif;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }

    /* Camera feed fills the screen */
    #camera-feed {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 0;
    }

    /* Canvas for AR overlay on top of camera */
    #ar-canvas {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: none;
    }

    /* ── UI Layer ── */
    #ui {
      position: fixed;
      inset: 0;
      z-index: 10;
      pointer-events: none;
    }

    /* Top bar */
    #topbar {
      position: absolute;
      top: 0; left: 0; right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: linear-gradient(to bottom, rgba(0,0,0,0.75), transparent);
      pointer-events: all;
    }

    #back-btn {
      background: rgba(255,255,255,0.18);
      backdrop-filter: blur(8px);
      border: none;
      color: #fff;
      border-radius: 999px;
      padding: 0.5rem 1.1rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }

    #product-label {
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(8px);
      color: #fff;
      border-radius: 999px;
      padding: 0.4rem 1rem;
      font-size: 0.82rem;
      font-weight: 600;
    }

    /* Status pill */
    #status-bar {
      position: absolute;
      top: 4.5rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(8px);
      color: #fff;
      border-radius: 999px;
      padding: 0.4rem 1rem;
      font-size: 0.78rem;
      white-space: nowrap;
    }

    #status-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #e74c3c;
      flex-shrink: 0;
    }
    #status-dot.tracking { background: #27ae60; animation: blink 1.5s infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

    /* Bottom hint card */
    #hint-card {
      position: absolute;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.82);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      color: #fff;
      text-align: center;
      width: calc(100% - 3rem);
      max-width: 340px;
      pointer-events: all;
    }

    #hint-card h3 { font-size: 0.95rem; color: #FFDA1A; margin-bottom: 0.4rem; }
    #hint-card p  { font-size: 0.8rem; color: #bbb; line-height: 1.6; margin-bottom: 1rem; }

    #show-marker-btn {
      background: #FFDA1A;
      color: #111;
      border: none;
      border-radius: 999px;
      padding: 0.6rem 1.25rem;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
    }

    /* Right controls */
    #controls {
      position: absolute;
      right: 1.25rem;
      bottom: 7rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      pointer-events: all;
    }

    .ctrl {
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.15);
      color: #fff;
      border-radius: 12px;
      width: 48px; height: 48px;
      font-size: 1.15rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .ctrl:hover, .ctrl.on { background: rgba(255,218,26,0.4); border-color: #FFDA1A; }

    /* Marker modal */
    #marker-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.9);
      z-index: 50;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    #marker-modal.open { display: flex; }

    .modal-box {
      background: #fff;
      border-radius: 16px;
      padding: 1.75rem;
      max-width: 340px;
      width: 100%;
      text-align: center;
    }
    .modal-box h3 { font-size: 1.05rem; font-weight: 700; margin-bottom: 0.4rem; color: #111; }
    .modal-box p  { font-size: 0.82rem; color: #666; line-height: 1.6; margin-bottom: 1rem; }

    #marker-img {
      width: 200px; height: 200px;
      margin: 0 auto 1rem;
      display: block;
      border: 6px solid #fff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      image-rendering: pixelated;
    }

    #close-modal-btn {
      background: #111;
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 0.65rem 1.5rem;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
    }

    /* Permission / error screen */
    #error-screen {
      display: none;
      position: fixed;
      inset: 0;
      background: #111;
      z-index: 100;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      text-align: center;
      padding: 2rem;
    }
    #error-screen h2 { margin-bottom: 0.75rem; font-size: 1.2rem; }
    #error-screen p  { color: #999; font-size: 0.9rem; line-height: 1.7; margin-bottom: 1.5rem; }
    #retry-btn {
      background: #FFDA1A;
      color: #111;
      border: none;
      border-radius: 999px;
      padding: 0.75rem 2rem;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
    }

    /* Loading screen */
    #loading-screen {
      position: fixed;
      inset: 0;
      background: #111;
      z-index: 200;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      text-align: center;
      gap: 1rem;
    }
    .spinner {
      width: 44px; height: 44px;
      border: 4px solid rgba(255,255,255,0.1);
      border-top-color: #FFDA1A;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #loading-screen p { font-size: 0.9rem; color: #999; }
  </style>
</head>
<body>

  <!-- Live camera feed -->
  <video id="camera-feed" autoplay playsinline muted></video>

  <!-- AR.js renders 3D on top of this canvas -->
  <canvas id="ar-canvas"></canvas>

  <!-- UI -->
  <div id="ui">
    <div id="topbar">
      <button id="back-btn" onclick="history.back()">← Back</button>
      <div id="product-label">Loading...</div>
    </div>

    <div id="status-bar">
      <div id="status-dot"></div>
      <span id="status-text">Starting camera…</span>
    </div>

    <div id="hint-card">
      <h3>📍 Marker AR</h3>
      <p>Point your camera at the <strong>Hiro marker</strong>. The 3D furniture model will appear on top of it and track wherever you move the marker.</p>
      <button id="show-marker-btn" onclick="openMarkerModal()">Show Hiro Marker 🎯</button>
    </div>

    <div id="controls">
      <button class="ctrl" id="btn-rotate" title="Auto-rotate" onclick="toggleRotate()">🔄</button>
      <button class="ctrl" title="Scale up"   onclick="scaleUp()">＋</button>
      <button class="ctrl" title="Scale down" onclick="scaleDown()">－</button>
      <button class="ctrl" title="Show marker" onclick="openMarkerModal()">🎯</button>
    </div>
  </div>

  <!-- Marker modal -->
  <div id="marker-modal">
    <div class="modal-box">
      <h3>🎯 Hiro Marker</h3>
      <p>Show this on a flat surface or print it out. Keep it well-lit and fully visible.</p>
      <img id="marker-img" src="" alt="Hiro Marker">
      <p style="font-size:0.72rem; color:#aaa; margin-bottom:1rem;">Tip: Display on another phone or tablet for easiest use.</p>
      <button id="close-modal-btn" onclick="closeMarkerModal()">Start Tracking →</button>
    </div>
  </div>

  <!-- Error screen -->
  <div id="error-screen">
    <div style="font-size:3rem;margin-bottom:1rem;">📷</div>
    <h2>Camera Access Needed</h2>
    <p>Marker AR requires your camera.<br>Please allow camera access and try again.</p>
    <button id="retry-btn" onclick="location.reload()">Allow & Retry</button>
  </div>

  <!-- Loading screen -->
  <div id="loading-screen">
    <div class="spinner"></div>
    <p>Starting camera…</p>
  </div>

  <!-- A-Frame + AR.js (stable CDN versions) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/aframe/1.4.2/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js"></script>

  <script>
    const params      = new URLSearchParams(window.location.search);
    const productName = params.get('name')  || 'Furniture';
    const modelUrl    = params.get('model') || '';
    const imageUrl    = params.get('image') || '';

    document.getElementById('product-label').textContent = productName;

    // ── Generate Hiro marker as data URL (reliable fallback) ──
    // Use official AR.js hosted image
    const HIRO_URL = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/images/hiro.png';
    document.getElementById('marker-img').src = HIRO_URL;

    // ── Start camera manually and show feed ──
    const video = document.getElementById('camera-feed');
    const loading = document.getElementById('loading-screen');
    const errorScreen = document.getElementById('error-screen');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }, // rear camera
            width:  { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          loading.style.display = 'none';
          statusText.textContent = 'Point camera at Hiro marker';
        };
      } catch (err) {
        console.error('Camera error:', err);
        loading.style.display = 'none';
        errorScreen.style.display = 'flex';
      }
    }

    startCamera();

    // ── Build A-Frame AR scene programmatically ──
    // This avoids the issue of A-Frame conflicting with our manual camera setup
    function buildARScene() {
      // Remove loading screen after AR.js initializes
      const scene = document.createElement('a-scene');
      scene.setAttribute('embedded', '');
      scene.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false; trackingMethod: best;');
      scene.setAttribute('renderer', 'logarithmicDepthBuffer: true;');
      scene.setAttribute('vr-mode-ui', 'enabled: false');
      scene.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:2;';

      const marker = document.createElement('a-marker');
      marker.setAttribute('preset', 'hiro');
      marker.setAttribute('smooth', 'true');
      marker.setAttribute('smoothCount', '5');
      marker.setAttribute('emitevents', 'true');

      // 3D model or fallback sofa
      if (modelUrl && modelUrl.trim() !== '') {
        const model = document.createElement('a-entity');
        model.setAttribute('gltf-model', modelUrl);
        model.setAttribute('position', '0 0 0');
        model.setAttribute('scale', '0.5 0.5 0.5');
        model.id = 'ar-obj';
        marker.appendChild(model);
      } else {
        // Sofa placeholder
        const sofa = buildSofa();
        sofa.id = 'ar-obj';
        marker.appendChild(sofa);
      }

      // Tracking ring on floor of marker
      const ring = document.createElement('a-ring');
      ring.setAttribute('position', '0 0.01 0');
      ring.setAttribute('rotation', '-90 0 0');
      ring.setAttribute('radius-inner', '0.8');
      ring.setAttribute('radius-outer', '0.85');
      ring.setAttribute('color', '#FFDA1A');
      ring.setAttribute('opacity', '0.7');
      marker.appendChild(ring);

      const camera = document.createElement('a-entity');
      camera.setAttribute('camera', '');

      scene.appendChild(marker);
      scene.appendChild(camera);
      document.body.appendChild(scene);

      // Tracking events
      marker.addEventListener('markerFound', () => {
        statusDot.classList.add('tracking');
        statusText.textContent = '✓ Marker found — tracking active';
        document.getElementById('hint-card').style.opacity = '0.3';
      });

      marker.addEventListener('markerLost', () => {
        statusDot.classList.remove('tracking');
        statusText.textContent = 'Marker lost — point camera at Hiro marker';
        document.getElementById('hint-card').style.opacity = '1';
      });

      window._arMarker = marker;
    }

    function buildSofa() {
      const g = document.createElement('a-entity');
      g.setAttribute('position', '0 0 0');

      const parts = [
        // seat
        { el:'a-box',      pos:'0 0.08 0',      w:'1.3', h:'0.18', d:'0.65', color:'#8B6914' },
        // back
        { el:'a-box',      pos:'0 0.32 -0.24',  w:'1.3', h:'0.48', d:'0.18', color:'#8B6914' },
        // left arm
        { el:'a-box',      pos:'-0.6 0.22 0',   w:'0.18',h:'0.28', d:'0.65', color:'#7a5c10' },
        // right arm
        { el:'a-box',      pos:'0.6 0.22 0',    w:'0.18',h:'0.28', d:'0.65', color:'#7a5c10' },
      ];

      const legs = [
        [-0.52, -0.07,  0.24],
        [ 0.52, -0.07,  0.24],
        [-0.52, -0.07, -0.24],
        [ 0.52, -0.07, -0.24],
      ];

      parts.forEach(p => {
        const el = document.createElement(p.el);
        el.setAttribute('position', p.pos);
        if (p.w) el.setAttribute('width', p.w);
        if (p.h) el.setAttribute('height', p.h);
        if (p.d) el.setAttribute('depth', p.d);
        el.setAttribute('color', p.color);
        g.appendChild(el);
      });

      legs.forEach(([x,y,z]) => {
        const leg = document.createElement('a-cylinder');
        leg.setAttribute('position', `${x} ${y} ${z}`);
        leg.setAttribute('radius', '0.04');
        leg.setAttribute('height', '0.16');
        leg.setAttribute('color', '#5a3e0a');
        g.appendChild(leg);
      });

      return g;
    }

    // Wait for A-Frame to be ready then build scene
    document.addEventListener('DOMContentLoaded', () => {
      // Small delay to ensure A-Frame is fully loaded
      setTimeout(buildARScene, 500);
    });

    // ── Controls ──
    let currentScale = 1;
    let rotating = false;
    let rotY = 0;
    let rotTimer = null;

    function getObj() {
      return document.getElementById('ar-obj');
    }

    function scaleUp() {
      currentScale = Math.min(currentScale * 1.2, 5);
      applyScale();
    }

    function scaleDown() {
      currentScale = Math.max(currentScale * 0.8, 0.05);
      applyScale();
    }

    function applyScale() {
      const obj = getObj();
      if (obj) obj.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);
    }

    function toggleRotate() {
      rotating = !rotating;
      document.getElementById('btn-rotate').classList.toggle('on', rotating);
      if (rotating) {
        rotTimer = setInterval(() => {
          rotY = (rotY + 1.5) % 360;
          const obj = getObj();
          if (obj) obj.setAttribute('rotation', `0 ${rotY} 0`);
        }, 16);
      } else {
        clearInterval(rotTimer);
      }
    }

    // ── Marker modal ──
    function openMarkerModal()  { document.getElementById('marker-modal').classList.add('open'); }
    function closeMarkerModal() { document.getElementById('marker-modal').classList.remove('open'); }
  </script>
</body>
</html>