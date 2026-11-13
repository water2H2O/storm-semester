/* ============================================================
   Storm Semester — 3D 浮空岛背景
   程序化体素地形 + 天气驱动光照/雾/雨/闪电
   暴露 window.STORM_SCENE.setWeather(key)
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('sky3d');
  if (!canvas || !window.THREE) return;
  const THREE = window.THREE;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
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
  const pick = (a) => a[Math.floor(rand() * a.length)];

  const mats = new Map();
  const mat = (c) => {
    if (!mats.has(c)) {
      mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.84, metalness: 0 }));
    }
    return mats.get(c);
  };

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

  const anims = [];
  const addAnim = (f) => anims.push(f);

  /* ---------------- 地形 ---------------- */
  const voxels = [];
  const v = (x, y, z, w, h, d, c, ry) => voxels.push({ x, y, z, w, h, d, c, ry: ry || 0 });

  const GRASS = [0x6ca24c, 0x78ae54, 0x84ba5b, 0x5f9646];
  const ROCK = [0x8f6a4d, 0xb07f52, 0xcf9a63, 0x7a6454, 0xa87f57];

  const inside = (x, z) => {
    const a = Math.atan2(z / 20, x / 29);
    const r = Math.sqrt((x / 29) ** 2 + (z / 20) ** 2);
    return r < 1 + 0.05 * Math.sin(7 * a) + 0.035 * Math.cos(11 * a);
  };

  const STEP = 1.7;
  for (let x = -29; x <= 29; x += STEP) {
    for (let z = -20; z <= 20; z += STEP) {
      if (!inside(x, z)) continue;
      const r = Math.sqrt((x / 30) ** 2 + (z / 21) ** 2);
      const bottom = -2.6 - 6.5 * Math.max(0, 1 - r) + rand() * 1.4;

      for (let k = 0; k < 4; k++) {
        const top = -k * 1.15;
        const lo = Math.max(bottom, top - 1.15);
        if (top > bottom) {
          v(x, (top + lo) / 2, z, 1.76, top - lo + 0.06, 1.76, ROCK[(k + Math.floor(x + z)) % 5]);
        }
      }
      v(x, 0.2, z, 1.76, 0.42, 1.76, GRASS[(Math.floor((x + 30) / 3) % 4)]);
    }
  }

  /* 小树 */
  for (let i = 0; i < 130; i++) {
    const x = (rand() - 0.5) * 52;
    const z = (rand() - 0.5) * 36;
    if (!inside(x, z)) continue;
    const h = 1.2 + rand() * 1.4;
    v(x, 0.4 + h / 2, z, 0.26, h, 0.26, 0x78593e);
    const c = pick([0x40793f, 0x559447, 0x6aa84f]);
    for (let j = 0; j < 4; j++) {
      const s = 1.05 - j * 0.2;
      v(x, 0.4 + h + j * 0.42, z, s, 0.62, s, c);
    }
  }

  /* ---------------- 建筑群 ---------------- */
  const BUILDING_COLORS = [0xd8c9a8, 0xc4b590, 0xe0d4b8, 0xb9a98a];
  const ROOF_COLORS = [0x5a6072, 0x6b4a44, 0x47505f];

  const landmarkGroups = [];

  function placeBuilding(x, z, w, h, d) {
    const g = new THREE.Group();
    g.position.set(x, 0.42, z);
    world.add(g);

    const body = pick(BUILDING_COLORS);
    box(g, 0, h / 2, 0, w, h, d, body);

    // 窗户：两面各一排
    const glass = new THREE.MeshStandardMaterial({
      color: 0x2b4a63, roughness: 0.25, metalness: 0.5,
      emissive: 0x0d1b26, emissiveIntensity: 1,
    });
    const rows = Math.max(2, Math.floor(h / 1.5));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        const wx = -w / 2 + (c + 0.5) * (w / 3);
        const wy = 0.9 + r * (h - 1.2) / rows;
        box(g, wx, wy, d / 2 + 0.04, w / 5, 0.42, 0.06, glass);
        box(g, wx, wy, -d / 2 - 0.04, w / 5, 0.42, 0.06, glass);
      }
    }

    // 屋顶
    const roof = cone(g, 0, h + 0.35, 0, Math.max(w, d) * 0.62, 0.9, pick(ROOF_COLORS), 4);
    roof.rotation.y = Math.PI / 4;

    landmarkGroups.push({ name: 'building', position: g.position.clone() });
    return g;
  }

  const spots = [[-13, 4], [-4, -7], [7, 3], [15, -5], [-9, 12], [12, 11], [-18, -9]];
  spots.forEach(([x, z], i) => {
    placeBuilding(x, z, 3.2 + (i % 3) * 0.9, 2.6 + (i % 4) * 1.1, 3.0 + (i % 2) * 0.8);
  });

  /* 钟楼 */
  (function clockTower() {
    const g = new THREE.Group();
    g.position.set(0, 0.42, 0);
    world.add(g);
    box(g, 0, 3, 0, 1.7, 6, 1.7, 0xd8cbb0);
    box(g, 0, 6.3, 0, 2.1, 0.5, 2.1, 0x5a6072);
    cyl(g, 0, 7.6, 0, 0.05, 1.0, 2.2, 0x5a6072, 4);
    const face = new THREE.MeshStandardMaterial({
      color: 0xf5efdd, roughness: 0.9, emissive: 0x332e20, emissiveIntensity: 1,
    });
    box(g, 0, 5.2, 0.88, 1.0, 1.0, 0.06, face);
    box(g, 0, 5.2, -0.88, 1.0, 1.0, 0.06, face);
  })();

  /* ---------------- 云 ---------------- */
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
    addAnim((t) => { g.position.x = baseX + 1.6 * Math.sin(t * 0.25 + i); });
    clouds.push(g);
  }

  /* ---------------- 地形实例化 ---------------- */
  const inst = new THREE.InstancedMesh(
    cubeGeo,
    new THREE.MeshStandardMaterial({ roughness: 0.92 }),
    voxels.length,
  );
  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  voxels.forEach((o, i) => {
    dummy.position.set(o.x, o.y, o.z);
    dummy.scale.set(o.w, o.h, o.d);
    dummy.rotation.set(0, o.ry, 0);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    inst.setColorAt(i, tmpColor.setHex(o.c));
  });
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.castShadow = true;
  inst.receiveShadow = true;
  world.add(inst);

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

  let current = PRESETS.storm;
  let target = PRESETS.storm;
  let flashEnergy = 0;
  let flashCooldown = 1.5;
  let flashChance = 0;

  const lerp = (a, b, t) => a + (b - a) * t;
  const colorLerp = (from, to, t) => {
    const c = new THREE.Color(from);
    c.lerp(new THREE.Color(to), t);
    return c;
  };

  function setWeather(key) {
    const p = PRESETS[key] || PRESETS.cloudy;
    target = p;
    flashChance = p.flash;
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
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom = Math.max(0.82, Math.min(1.3, zoom + e.deltaY * 0.0004));
  }, { passive: false });

  /* ---------------- 尺寸 ---------------- */
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 竖屏时拉远一点，避免岛被切掉
    const wide = Math.max(1, 1.35 / camera.aspect);
    camera.updateProjectionMatrix();
    camera.userData.wide = wide;
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------------- 主循环 ---------------- */
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;

    // 平滑过渡
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
    renderer.toneMappingExposure = current.exposure;
    cloudMat.opacity = 0.55 + current.cloud * 0.4;

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
        const fall = (speedBase * (sp / 26)) * dt;
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
    anims.forEach((f) => f(time));

    // 相机
    const wide = camera.userData.wide || 1;
    const angle = 0.72 + Math.sin(time * 0.16) * 0.3 + yaw;
    const elev = 0.36 + pitch;
    const dist = 98 * zoom * wide;
    camera.position.set(
      Math.sin(angle) * Math.cos(elev) * dist,
      Math.sin(elev) * dist + 6,
      Math.cos(angle) * Math.cos(elev) * dist,
    );
    camera.lookAt(0, 1.2, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  /* ---------------- 对外接口 ---------------- */
  window.STORM_SCENE = {
    setWeather,
    scene,
    world,
    camera,
    THREE,
    /* 给后面加地标用：传一个 (api) => void 的函数，api 里有 group / box / cyl / cone / mat */
    addLandmark(name, position, build) {
      const g = new THREE.Group();
      g.position.set(position[0], position[1] ?? 0.42, position[2]);
      world.add(g);
      build({
        THREE, group: g,
        box: (x, y, z, w, h, d, c, ry) => box(g, x, y, z, w, h, d, c, ry),
        cyl: (x, y, z, rt, rb, h, c, n) => cyl(g, x, y, z, rt, rb, h, c, n),
        cone: (x, y, z, r, h, c, n) => cone(g, x, y, z, r, h, c, n),
        mat, addAnim, rand,
      });
      landmarkGroups.push({ name, position: g.position.clone() });
      return g;
    },
    stats: { voxels: voxels.length, clouds: clouds.length, rain: RAIN_COUNT },
  };

  requestAnimationFrame(frame);
})();
