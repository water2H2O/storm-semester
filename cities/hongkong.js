/* ============================================================
   城市：香港（临时版本）
   ------------------------------------------------------------
   ⚠️ 这是占位模型，等正式的城市模型做好后，直接用同一个
      build(api) 接口替换本文件的 build 内容即可。
   现在这版只保证「切换可用 + 有维港和高楼的天际线」。
   ============================================================ */
STORM_CITIES.register({
  id: 'hongkong',
  label: '香港',

  build(api) {
    const { THREE, box, cyl, cone, voxel, addAnim, rand } = api;
    const pick = (a) => a[Math.floor(rand() * a.length)];

    const GRASS = [0x5f8f4a, 0x6c9c52, 0x79aa5a];
    const ROCK = [0x7d6a55, 0x96806a, 0xa89078];
    const SEA = [0x1d4f66, 0x256078, 0x2c6d88];

    // 维港：中间一条横贯的水道
    const harbourZ = (x) => 1.2 * Math.sin(x * 0.09);
    const isSea = (x, z) => Math.abs(z - harbourZ(x)) < 3.2;

    const inside = (x, z) => {
      const a = Math.atan2(z / 17, x / 33);
      const r = Math.sqrt((x / 33) ** 2 + (z / 17) ** 2);
      return r < 1 + 0.055 * Math.sin(6 * a) + 0.03 * Math.cos(9 * a);
    };

    /* ---------------- 地形 ---------------- */
    for (let x = -33; x <= 33; x += 1.5) {
      for (let z = -18; z <= 18; z += 1.5) {
        if (!inside(x, z)) continue;
        const r = Math.sqrt((x / 34) ** 2 + (z / 18) ** 2);
        const bottom = -2.2 - 5.6 * Math.max(0, 1 - r) + rand() * 1.1;
        const sea = isSea(x, z);

        if (!sea) {
          for (let k = 0; k < 3; k++) {
            const top = -k * 1.1;
            const lo = Math.max(bottom, top - 1.1);
            if (top > bottom) {
              voxel(x, (top + lo) / 2, z, 1.55, top - lo + 0.06, 1.55,
                ROCK[(k + Math.floor(x + z)) % 3]);
            }
          }
        }
        voxel(x, sea ? -0.06 : 0.18, z, 1.55, sea ? 0.3 : 0.38, 1.55,
          sea ? SEA[Math.abs(Math.floor(x / 3)) % 3] : GRASS[Math.floor((x + 33) / 4) % 3]);
      }
    }

    /* ---------------- 太平山 ---------------- */
    const peakCx = -17;
    const peakCz = 11;
    for (let i = 0; i < 5; i++) {
      const rr = 8 - i * 1.3;
      const h = 1.6;
      cyl(peakCx, 0.36 + i * h + h / 2, peakCz, rr * 0.86, rr, h, pick([0x3f6b3a, 0x4a7a42]), 10);
    }
    // 山顶信号塔
    cyl(peakCx, 0.36 + 8.6, peakCz, 0.08, 0.14, 4.2, 0x9aa4ad, 6);
    box(peakCx, 0.36 + 10.9, peakCz, 0.5, 0.4, 0.5, 0xc8ccd2);

    /* ---------------- 天际线 ---------------- */
    const TOWER = [0x8fa3b8, 0xa9bccd, 0x78909f, 0xbecbd6, 0x6d8494];
    const glass = new THREE.MeshStandardMaterial({
      color: 0x2a4a63,
      roughness: 0.2,
      metalness: 0.6,
      emissive: 0xffd9a0,
      emissiveIntensity: 0.06,
    });

    function tower(x, z, w, h, d) {
      const c = pick(TOWER);
      box(x, 0.36 + h / 2, z, w, h, d, c);
      // 顶部小收分
      if (h > 9) box(x, 0.36 + h + 0.35, z, w * 0.62, 0.7, d * 0.62, c);

      // 窗：只在两面上做几排，控制 draw call
      const rows = Math.min(5, Math.max(2, Math.floor(h / 2.4)));
      for (let r = 0; r < rows; r++) {
        const wy = 0.36 + 1.1 + (r * (h - 1.6)) / rows;
        for (let c2 = 0; c2 < 2; c2++) {
          const wx = x - w / 4 + c2 * (w / 2);
          box(wx, wy, z + d / 2 + 0.04, w / 3.6, 0.5, 0.06, glass);
          box(wx, wy, z - d / 2 - 0.04, w / 3.6, 0.5, 0.06, glass);
        }
      }
    }

    // 港岛侧（z > 0）密、高
    const hkSide = [
      [-6, 6, 3.4, 14], [-1, 7.5, 3.0, 11], [4, 6.5, 3.6, 16], [9, 7, 3.2, 12],
      [14, 6, 3.0, 9.5], [19, 7.5, 3.4, 13], [24, 6.5, 2.8, 8], [-12, 6.5, 3.2, 10],
      [-22, 5.5, 2.8, 7.5], [28, 7, 2.6, 7], [10, 11, 3.0, 8.5], [-4, 11.5, 3.2, 9.5],
    ];
    hkSide.forEach(([x, z, w, h]) => tower(x, z, w, h, w * 0.92));

    // 九龙侧（z < 0）稍疏、稍矮
    const klnSide = [
      [-8, -6, 3.2, 10], [-2, -7, 3.6, 13], [4, -6.5, 3.0, 8], [10, -7.5, 3.2, 11],
      [16, -6, 2.8, 7], [22, -7, 3.0, 9], [-15, -6.5, 3.0, 8.5], [-24, -6, 2.6, 6.5],
      [1, -11, 3.2, 7.5], [-11, -11, 2.8, 6.5],
    ];
    klnSide.forEach(([x, z, w, h]) => tower(x, z, w, h, w * 0.92));

    /* ---------------- 钟楼 ---------------- */
    box(-1, 0.36 + 2.2, 3.6, 1.1, 4.4, 1.1, 0xd9c9a8);
    box(-1, 0.36 + 4.6, 3.6, 1.5, 0.4, 1.5, 0x8a8f96);
    cone(-1, 0.36 + 6.1, 3.6, 0.85, 2.6, 0x5d6a72, 4);
    const face = new THREE.MeshStandardMaterial({
      color: 0xf7f0dc, roughness: 0.9, emissive: 0xffe9b8, emissiveIntensity: 0.12,
    });
    box(-1, 0.36 + 3.6, 4.16, 0.7, 0.7, 0.06, face);
    box(-1, 0.36 + 3.6, 3.04, 0.7, 0.7, 0.06, face);

    /* ---------------- 天星小轮 ---------------- */
    const ferry = new THREE.Group();
    const hz0 = harbourZ(-6);
    ferry.position.set(-6, 0, hz0);
    api.group.add(ferry);

    // api.box 默认挂到城市根节点，这里搬进 ferry 并改用局部坐标
    function part(x, y, z, w, h, d, c) {
      const m = api.box(0, 0, 0, w, h, d, c);
      api.group.remove(m);
      m.position.set(x, y, z);
      ferry.add(m);
      return m;
    }
    part(0, 0.5, 0, 1.9, 0.5, 0.9, 0xe8e2d2);
    part(0, 0.9, 0, 1.3, 0.5, 0.75, 0x2f7d4f);
    part(0, 1.2, 0, 1.0, 0.25, 0.6, 0xf2eee2);

    addAnim((t) => {
      const x = -18 + ((t * 1.6) % 36);
      ferry.position.set(x, 0, harbourZ(x));
      ferry.rotation.y = -Math.atan(0.108 * Math.cos(x * 0.09));
    });

    /* ---------------- 风球信号杆（给天气用） ---------------- */
    cyl(9, 0.36 + 3, 3.4, 0.07, 0.12, 6, 0xb8bfc6, 6);
    box(9, 0.36 + 6.2, 3.4, 0.9, 0.9, 0.16, 0x2f3a44);

    return {
      windowMaterials: [glass, face],
      camera: { target: [0, -1.5, 0], distance: 104, elev: 0.3 },
      signal: { position: [9, 6.56, 3.4] },
    };
  },
});
