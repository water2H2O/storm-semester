/* ============================================================
   城市：通用岛
   一座悬浮的体素小岛，上面有几栋楼、一座钟楼和一片树林。
   ============================================================ */
STORM_CITIES.register({
  id: 'generic',
  label: '通用岛',

  build(api) {
    const { THREE, group, box, cyl, cone, voxel, addAnim, rand } = api;
    const pick = (a) => a[Math.floor(rand() * a.length)];

    const GRASS = [0x6ca24c, 0x78ae54, 0x84ba5b, 0x5f9646];
    const ROCK = [0x8f6a4d, 0xb07f52, 0xcf9a63, 0x7a6454, 0xa87f57];

    const inside = (x, z) => {
      const a = Math.atan2(z / 20, x / 29);
      const r = Math.sqrt((x / 29) ** 2 + (z / 20) ** 2);
      return r < 1 + 0.05 * Math.sin(7 * a) + 0.035 * Math.cos(11 * a);
    };

    /* ---------------- 地形 ---------------- */
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
            voxel(x, (top + lo) / 2, z, 1.76, top - lo + 0.06, 1.76,
              ROCK[(k + Math.floor(x + z)) % 5]);
          }
        }
        voxel(x, 0.2, z, 1.76, 0.42, 1.76, GRASS[Math.floor((x + 30) / 3) % 4]);
      }
    }

    /* ---------------- 树 ---------------- */
    for (let i = 0; i < 130; i++) {
      const x = (rand() - 0.5) * 52;
      const z = (rand() - 0.5) * 36;
      if (!inside(x, z)) continue;
      const h = 1.2 + rand() * 1.4;
      voxel(x, 0.4 + h / 2, z, 0.26, h, 0.26, 0x78593e);
      const c = pick([0x40793f, 0x559447, 0x6aa84f]);
      for (let j = 0; j < 4; j++) {
        const s = 1.05 - j * 0.2;
        voxel(x, 0.4 + h + j * 0.42, z, s, 0.62, s, c);
      }
    }

    /* ---------------- 楼 ---------------- */
    const BODY = [0xd8c9a8, 0xc4b590, 0xe0d4b8, 0xb9a98a];
    const ROOF = [0x5a6072, 0x6b4a44, 0x47505f];

    // 所有楼的窗户共用一个材质，场景用它的自发光强度表现「压力越大，亮灯越多」
    const glass = new THREE.MeshStandardMaterial({
      color: 0x2b4a63,
      roughness: 0.25,
      metalness: 0.5,
      emissive: 0xffd9a0,
      emissiveIntensity: 0.06,
    });

    function building(x, z, w, h, d) {
      box(x, 0.42 + h / 2, z, w, h, d, pick(BODY));
      const rows = Math.max(2, Math.floor(h / 1.5));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 3; c++) {
          const wx = x - w / 2 + (c + 0.5) * (w / 3);
          const wy = 0.42 + 0.9 + (r * (h - 1.2)) / rows;
          box(wx, wy, z + d / 2 + 0.04, w / 5, 0.42, 0.06, glass);
          box(wx, wy, z - d / 2 - 0.04, w / 5, 0.42, 0.06, glass);
        }
      }
      const roof = cone(x, 0.42 + h + 0.35, z, Math.max(w, d) * 0.62, 0.9, pick(ROOF), 4);
      roof.rotation.y = Math.PI / 4;
    }

    const spots = [[-13, 4], [-4, -7], [7, 3], [15, -5], [-9, 12], [12, 11], [-18, -9]];
    spots.forEach(([x, z], i) => {
      building(x, z, 3.2 + (i % 3) * 0.9, 2.6 + (i % 4) * 1.1, 3.0 + (i % 2) * 0.8);
    });

    /* ---------------- 钟楼 ---------------- */
    box(0, 0.42 + 3, 0, 1.7, 6, 1.7, 0xd8cbb0);
    box(0, 0.42 + 6.3, 0, 2.1, 0.5, 2.1, 0x5a6072);
    cyl(0, 0.42 + 7.6, 0, 0.05, 1.0, 2.2, 0x5a6072, 4);
    const face = new THREE.MeshStandardMaterial({
      color: 0xf5efdd, roughness: 0.9, emissive: 0xffe9b8, emissiveIntensity: 0.12,
    });
    box(0, 0.42 + 5.2, 0.88, 1.0, 1.0, 0.06, face);
    box(0, 0.42 + 5.2, -0.88, 1.0, 1.0, 0.06, face);

    return {
      windowMaterials: [glass, face],
      camera: { target: [0, 1.2, 0], distance: 78, elev: 0.3 },
    };
  },
});
