/* ============================================================
   Storm Semester — 3D 场景核心
   ------------------------------------------------------------
   负责：渲染器、灯光、雾、雨、闪电、云、镜头、天气切换、
        窗户亮灯、城市注册与切换。
   城市本身（地形 + 建筑）由 cities/*.js 通过 STORM_CITIES.register 提供。
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('sky3d');
  if (!canvas || !window.THREE) return;
  const THREE = window.THREE;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
    });
  } catch (e) {
    canvas.style.display = 'none';
    return;
  }

  const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, isTouch ? 1.35 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.shadowMap.enabled = !isTouch;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const world = new THREE.Group();
  scene.add(world);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 500);

  /* ---------------- 灯光 ---------------- */
  const hemi = new THREE.HemisphereLight(0xcbe9ff, 0x8a7c58, 2.3);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0c0, 4.0);
  sun.position.set(-40, 58, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -55, right: 55, top: 48, bottom: -48, near: 1, far: 170,
  });
  sun.shadow.normalBias = 0.1;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x66baff, 0.9);
  fill.position.set(22, 16, -26);
  scene.add(fill);

  scene.fog = new THREE.Fog(0xc6e8ff, 80, 220);

  /* ---------------- 基础工具 ---------------- */
  let seed = 28419;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const mats = new Map();
  function mat(c) {
    if (!mats.has(c)) {
      mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.84, metalness: 0 }));
    }
    return mats.get(c);
  }
  const sharedMats = new Set();

  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

  function box(parent, x, y, z, w, h, d, c, ry) {
    const m = new THREE.Mesh(cubeGeo, typeof c === 'object' ? c : mat(c));
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function cyl(parent, x, y, z, rt, rb, h, c, n) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rt, rb, h, n || 12),
      typeof c === 'object' ? c : mat(c),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function cone(parent, x, y, z, r, h, c, n) {
    return cyl(parent, x, y, z, 0, r, h, c, n || 4);
  }

  function beam(parent, a, b, r, c) {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const m = cyl(parent, ...va.clone().add(vb).multiplyScalar(0.5).toArray(), r, r, dir.length(), c, 6);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return m;
  }

  /* ---------------- 云（属于场景，不属于城市） ---------------- */
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf5fcff, roughness: 1, transparent: true, opacity: 0.85,
  });
  const clouds = [];
  for (let i = 0; i < 15; i++) {
    const g = new THREE.Group();
    const a = rand() * Math.PI * 2;
    const r = 46 + rand() * 16;
    g.position.set(Math.cos(a) * r, -8 + rand() * 24, Math.sin(a) * r * 0.7);
    for (let j = 0; j < 5; j++) {
      box(g, (rand() - 0.5) * 6, (rand() - 0.5) * 1.2, (rand() - 0.5) * 2.6,
        1.6 + rand() * 2.2, 1.0 + rand(), 1.4 + rand(), cloudMat);
    }
    world.add(g);
    const baseX = g.position.x;
    clouds.push({ g, baseX, phase: i });
  }

  /* ---------------- 雨 ---------------- */
  const RAIN_COUNT = 1500;
  const rainPos = new Float32Array(RAIN_COUNT * 6);
  const rainSeed = new Float32Array(RAIN_COUNT * 4);
  for (let i = 0; i < RAIN_COUNT; i++) {
    const x = (rand() - 0.5) * 130;
    const y = rand() * 80 - 20;
    const z = (rand() - 0.5) * 130;
    const len = 1.2 + rand() * 2.4;
    rainPos[i * 6] = x;
    rainPos[i * 6 + 1] = y;
    rainPos[i * 6 + 2] = z;
    rainPos[i * 6 + 3] = x + 0.12;
    rainPos[i * 6 + 4] = y - len;
    rainPos[i * 6 + 5] = z;
    rainSeed[i * 4] = len;
    rainSeed[i * 4 + 1] = 18 + rand() * 16;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xbfe4ff, transparent: true, opacity: 0, depthWrite: false,
  });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  scene.add(rain);

  /* ---------------- 天气预设 ---------------- */
  const PRESETS = {
    clear:    { sun: 4.2, sunC: 0xfff0c0, hemi: 2.4, hemiSky: 0xcbe9ff, hemiG: 0x8a7c58, fog: 0xc6e8ff, near: 90, far: 240, rain: 0.00, flash: 0.00, exposure: 1.16, cloud: 0.90 },
    cloudy:   { sun: 2.2, sunC: 0xe6eef6, hemi: 1.9, hemiSky: 0xc9d8e4, hemiG: 0x7d7660, fog: 0xbfd0dc, near: 75, far: 215, rain: 0.00, flash: 0.00, exposure: 1.10, cloud: 0.95 },
    overcast: { sun: 1.2, sunC: 0xd6dde3, hemi: 1.5, hemiSky: 0xaebcc6, hemiG: 0x6c6656, fog: 0x8f9fa9, near: 60, far: 190, rain: 0.10, flash: 0.00, exposure: 1.05, cloud: 1.00 },
    rain:     { sun: 0.7, sunC: 0xc3cdd6, hemi: 1.2, hemiSky: 0x8fa1ae, hemiG: 0x5f5a4c, fog: 0x6d7d88, near: 50, far: 165, rain: 0.45, flash: 0.00, exposure: 1.00, cloud: 1.00 },
    storm:    { sun: 0.4, sunC: 0xb9a6d6, hemi: 0.9, hemiSky: 0x6e5f8c, hemiG: 0x3b3548, fog: 0x342b4a, near: 42, far: 145, rain: 0.72, flash: 0.45, exposure: 0.94, cloud: 1.00 },
    t3:       { sun: 0.32, sunC: 0xc0a3e8, hemi: 0.85, hemiSky: 0x6b4f94, hemiG: 0x362b45, fog: 0x3a2559, near: 38, far: 138, rain: 0.86, flash: 0.65, exposure: 0.90, cloud: 1.00 },
    t8:       { sun: 0.24, sunC: 0xc9a5f5, hemi: 0.75, hemiSky: 0x5c3d85, hemiG: 0x2b2238, fog: 0x2b1642, near: 34, far: 130, rain: 1.00, flash: 0.85, exposure: 0.86, cloud: 1.00 },
    black:    { sun: 0.16, sunC: 0x9d7ec9, hemi: 0.6, hemiSky: 0x3c2a55, hemiG: 0x1c1826, fog: 0x140c1f, near: 30, far: 120, rain: 1.15, flash: 1.00, exposure: 0.80, cloud: 1.00 },
  };

  let current = Object.assign({}, PRESETS.storm);
  let target = PRESETS.storm;
  let flashEnergy = 0;
  let flashCooldown = 1.5;
  let flashChance = 0;

  const lerp = (a, b, t) => a + (b - a) * t;
  const colorLerp = (from, to, t) => new THREE.Color(from).lerp(new THREE.Color(to), t);

  function setWeather(key) {
    const p = PRESETS[key] || PRESETS.cloudy;
    target = p;
    flashChance = p.flash;
    lastWeatherKey = key;
    if (cityMeta && cityMeta.setSignal) cityMeta.setSignal(key);
  }

  let lastWeatherKey = 'storm';

  /* ---------------- 港口：船 ---------------- */
  let portState = { phase: 'away', inDays: null };

  function setPort(state) {
    portState = state || { phase: 'away', inDays: null };
  }

  /* ---------------- 气泡（HTML 叠在 3D 上） ---------------- */
  let bubbleItems = [];
  const bubbleLayer = document.getElementById('bubbles');

  /**
   * 气泡：贴在城市的某个锚点上，点一下就跳进面板对应区块。
   * list: [{ id, anchorKey, icon, title, sub, target }]
   */
  function setBubbles(list) {
    if (!bubbleLayer) return;
    bubbleLayer.innerHTML = '';
    bubbleItems = (list || []).map((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'bubble bubble-' + b.id;
      el.innerHTML = `<span class="bubble-icon">${b.icon}</span>
        <span class="bubble-text"><b>${b.title}</b><i>${b.sub}</i></span>`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (b.target && window.STORM_APP) window.STORM_APP.jumpTo(b.target);
      });
      bubbleLayer.appendChild(el);
      return { el, anchorKey: b.anchorKey };
    });
  }

  function anchorOf(key) {
    if (key === 'ship') {
      const port = cityMeta.port;
      if (!port) return null;
      return port.group.position.clone().add(new THREE.Vector3(0, 3.4, 0));
    }
    const a = cityMeta.anchors && cityMeta.anchors[key];
    return a ? new THREE.Vector3(a[0], a[1], a[2]) : null;
  }


  /* ---------------- 压力 → 窗户亮灯 ---------------- */
  let windowHeat = 0;      // 目标值 0..1
  let windowHeatNow = 0;   // 平滑后的值

  function setPressure(score) {
    windowHeat = Math.max(0, Math.min(1, score / 20));
  }

  /* ---------------- 相机 ---------------- */
  let time = 0;
  let last = performance.now();
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let yaw = 0;
  let pitch = 0;
  let zoom = 1;

  let mode = 'city';
  let modeMix = 0;
  function setMode(m) { mode = m; }

  let camTarget = new THREE.Vector3(0, 1.2, 0);
  let camTargetWanted = new THREE.Vector3(0, 1.2, 0);
  let camDist = 78;
  let camDistWanted = 78;
  let camElev = 0.3;
  let camElevWanted = 0.3;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    yaw -= (e.clientX - lastX) * 0.004;
    pitch = Math.max(-0.18, Math.min(0.3, pitch + (e.clientY - lastY) * 0.002));
    lastX = e.clientX;
    lastY = e.clientY;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  /* ---------------- 尺寸 ---------------- */
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    camera.userData.wide = Math.max(1, 1.35 / camera.aspect);
  }
  window.addEventListener('resize', resize);
  resize();

  /* ============================================================
     城市注册与切换
     ============================================================ */
  const registry = (window.STORM_CITIES && window.STORM_CITIES.list) || [];
  const byId = new Map();
  registry.forEach((c) => byId.set(c.id, c));

  let cityGroup = null;
  let cityAnims = [];
  let cityWindowMats = [];
  let cityMats = [];
  let currentCityId = null;
  let cityMeta = {};

  function disposeCity() {
    if (!cityGroup) return;
    world.remove(cityGroup);
    cityGroup.traverse((o) => {
      if (o.isMesh || o.isInstancedMesh) {
        if (o.geometry && o.geometry !== cubeGeo) o.geometry.dispose();
      }
    });
    cityMats.forEach((m) => { if (!sharedMats.has(m)) m.dispose(); });
    cityGroup = null;
    cityAnims = [];
    cityWindowMats = [];
    cityMats = [];
  }

  /**
   * 建一座城市。
   * 城市文件只需要在 api 上摆东西，光照、雾、雨、镜头都由场景统一负责。
   */
  function buildCity(id) {
    const def = byId.get(id) || registry[0];
    if (!def) return null;

    disposeCity();
    cityGroup = new THREE.Group();
    world.add(cityGroup);

    const voxels = [];
    const cityMat = (c) => {
      const m = mat(c);
      if (!cityMats.includes(m)) cityMats.push(m);
      return m;
    };

    const api = {
      THREE,
      group: cityGroup,
      box: (x, y, z, w, h, d, c, ry) => {
        if (typeof c === 'object' && !cityMats.includes(c)) cityMats.push(c);
        return box(cityGroup, x, y, z, w, h, d, c, ry);
      },
      cyl: (x, y, z, rt, rb, h, c, n) => {
        if (typeof c === 'object' && !cityMats.includes(c)) cityMats.push(c);
        return cyl(cityGroup, x, y, z, rt, rb, h, c, n);
      },
      cone: (x, y, z, r, h, c, n) => {
        if (typeof c === 'object' && !cityMats.includes(c)) cityMats.push(c);
        return cone(cityGroup, x, y, z, r, h, c, n);
      },
      beam: (a, b, r, c) => beam(cityGroup, a, b, r, c),
      mat: cityMat,
      voxel: (x, y, z, w, h, d, c, ry) => voxels.push({ x, y, z, w, h, d, c, ry: ry || 0 }),
      addAnim: (f) => cityAnims.push(f),
      rand,
    };

    let meta = {};
    try {
      meta = def.build(api) || {};
    } catch (err) {
      console.error('[city] build failed:', def.id, err);
    }

    // 体素地形合批成一次 draw call
    if (voxels.length) {
      const inst = new THREE.InstancedMesh(
        cubeGeo,
        new THREE.MeshStandardMaterial({ roughness: 0.92 }),
        voxels.length,
      );
      const dummy = new THREE.Object3D();
      const tmp = new THREE.Color();
      voxels.forEach((o, i) => {
        dummy.position.set(o.x, o.y, o.z);
        dummy.scale.set(o.w, o.h, o.d);
        dummy.rotation.set(0, o.ry, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        inst.setColorAt(i, tmp.setHex(o.c));
      });
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.castShadow = true;
      inst.receiveShadow = true;
      cityGroup.add(inst);
      cityMats.push(inst.material);
    }

    // 窗户材质：记下基准自发光，之后按压力调
    cityWindowMats = (meta.windowMaterials || []).map((m) => {
      m.userData.baseEmissive = m.emissiveIntensity || 0.1;
      if (!cityMats.includes(m)) cityMats.push(m);
      return m;
    });

    // 镜头取景
    const cam = meta.camera || {};
    camTargetWanted.set(...(cam.target || [0, 1.2, 0]));
    camDistWanted = cam.distance || 80;
    camElevWanted = cam.elev || 0.32;

    currentCityId = def.id;
    cityMeta = meta;
    if (meta.setSignal) meta.setSignal(lastWeatherKey);
    return def.id;
  }

  function setCity(id) {
    if (id === currentCityId) return currentCityId;
    // 切城市时给一个淡入：先把世界压暗
    switchFade = 1;
    return buildCity(id);
  }

  let switchFade = 0;

  /* ---------------- 对外接口 ---------------- */
  window.STORM_SCENE = {
    setWeather,
    setPressure,
    setMode,
    setCity,
    setPort,
    setBubbles,
    buildCity,
    registerCity(def) {
      byId.set(def.id, def);
      if (!registry.includes(def)) registry.push(def);
      return def.id;
    },
    cities: () => registry.map((c) => ({ id: c.id, label: c.label })),
    get currentCity() { return currentCityId; },
    scene, world, camera, THREE,
  };

  /* ---------------- 主循环 ---------------- */
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;

    const k = 1 - Math.pow(0.01, dt * 0.9);
    current.sun = lerp(current.sun, target.sun, k);
    current.hemi = lerp(current.hemi, target.hemi, k);
    current.near = lerp(current.near, target.near, k);
    current.far = lerp(current.far, target.far, k);
    current.rain = lerp(current.rain, target.rain, k);
    current.exposure = lerp(current.exposure, target.exposure, k);
    current.cloud = lerp(current.cloud, target.cloud, k);

    sun.intensity = current.sun + flashEnergy * 9;
    sun.color.copy(colorLerp(sun.color.getHex(), target.sunC, k));
    hemi.intensity = current.hemi + flashEnergy * 5;
    hemi.color.copy(colorLerp(hemi.color.getHex(), target.hemiSky, k));
    hemi.groundColor.copy(colorLerp(hemi.groundColor.getHex(), target.hemiG, k));
    scene.fog.color.copy(colorLerp(scene.fog.color.getHex(), target.fog, k));
    scene.fog.near = current.near;
    scene.fog.far = current.far;
    renderer.toneMappingExposure = current.exposure - switchFade * 0.5;
    cloudMat.opacity = 0.55 + current.cloud * 0.4;
    if (switchFade > 0) switchFade = Math.max(0, switchFade - dt * 2.2);

    // 窗户：压力越大亮得越多
    windowHeatNow = lerp(windowHeatNow, windowHeat, 1 - Math.pow(0.05, dt));
    const lit = 0.06 + windowHeatNow * 1.5;
    cityWindowMats.forEach((m) => { m.emissiveIntensity = lit; });

    // 雨
    rainMat.opacity = Math.min(0.75, current.rain * 0.65);
    rain.visible = current.rain > 0.02;
    if (rain.visible) {
      const arr = rainGeo.attributes.position.array;
      const speedBase = 26 + current.rain * 22;
      for (let i = 0; i < RAIN_COUNT; i++) {
        const o = i * 6;
        const len = rainSeed[i * 4];
        const sp = rainSeed[i * 4 + 1];
        const fall = speedBase * (sp / 26) * dt;
        arr[o + 1] -= fall;
        arr[o + 4] -= fall;
        arr[o] += dt * 2.4;
        arr[o + 3] += dt * 2.4;
        if (arr[o + 4] < -26) {
          const nx = (Math.random() - 0.5) * 130;
          const nz = (Math.random() - 0.5) * 130;
          arr[o] = nx; arr[o + 1] = 62; arr[o + 2] = nz;
          arr[o + 3] = nx + 0.12; arr[o + 4] = 62 - len; arr[o + 5] = nz;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    // 闪电
    flashCooldown -= dt;
    if (flashChance > 0 && flashCooldown <= 0) {
      flashEnergy = 0.55 + Math.random() * 0.45;
      flashCooldown = 2.6 + Math.random() * 5.5 - flashChance * 1.6;
    }
    flashEnergy *= Math.pow(0.02, dt);

    // 动画
    clouds.forEach((c) => {
      c.g.position.x = c.baseX + 1.6 * Math.sin(time * 0.25 + c.phase);
    });
    cityAnims.forEach((f) => f(time));

    // 相机
    const wide = camera.userData.wide || 1;
    modeMix = lerp(modeMix, mode === 'data' ? 1 : 0, 1 - Math.pow(0.02, dt));
    camTarget.lerp(camTargetWanted, k);
    camDist = lerp(camDist, camDistWanted, k);
    camElev = lerp(camElev, camElevWanted, k);

    if (!dragging) yaw *= Math.pow(0.6, dt);
    const angle = 0.72 + time * 0.05 + yaw;
    const elev = camElev + modeMix * 0.22 + pitch;
    const dist = camDist * lerp(1, 1.4, modeMix) * zoom * wide;
    camera.position.set(
      Math.sin(angle) * Math.cos(elev) * dist,
      Math.sin(elev) * dist + 6,
      Math.cos(angle) * Math.cos(elev) * dist,
    );
    camera.lookAt(camTarget.x, camTarget.y, camTarget.z);

    // 船：靠岸 / 在外海等待 / 离港
    const port = cityMeta.port;
    if (port && port.group) {
      const docked = portState.phase === 'docked';
      const dest = new THREE.Vector3(...(docked || portState.phase === 'leaving' ? port.dockPos : port.waitPos));
      port.group.position.lerp(dest, 1 - Math.pow(0.15, dt));
      port.group.visible = portState.phase !== 'away';
      if (port.group.visible) {
        const dx = port.dockPos[0] - port.group.position.x;
        const dz = port.dockPos[2] - port.group.position.z;
        if (Math.abs(dx) + Math.abs(dz) > 0.15) {
          port.group.rotation.y = Math.atan2(dx, dz);
        }
      }
    }

    // 气泡跟着锚点走
    if (bubbleItems.length) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const inCity = mode === 'city';
      bubbleItems.forEach((b) => {
        const wp = anchorOf(b.anchorKey);
        if (!wp) { b.el.style.opacity = '0'; return; }
        const v = wp.project(camera);
        const sx = (v.x * 0.5 + 0.5) * vw;
        const sy = (-v.y * 0.5 + 0.5) * vh;
        const on = inCity && v.z < 1;
        b.el.style.transform = `translate(-50%, -100%) translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
        b.el.style.opacity = on ? '1' : '0';
        b.el.style.pointerEvents = on ? 'auto' : 'none';
      });
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  // 先建默认城市
  buildCity(registry.length ? registry[0].id : null);
  requestAnimationFrame(frame);
})();
