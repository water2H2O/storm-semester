/* ============================================================
   城市：香港（临时版本）
   ------------------------------------------------------------
   ⚠️ 这是占位模型。正式模型做好后，用同一个 build(api) 接口替换即可。
   本文件除了地形和天际线，还提供两个「可读的锚点」：
     · anchors.observatory —— 天文台塔顶（风球挂在这里）
     · port              —— 码头与船（有活动时进港）
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

    /* 把 api.box 造出来的方块搬进一个子 group，改用局部坐标 */
    function partTo(group, x, y, z, w, h, d, c) {
      const m = api.box(0, 0, 0, w, h, d, c);
      api.group.remove(m);
      m.position.set(x, y, z);
      group.add(m);
      return m;
    }

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
      cyl(peakCx, 0.36 + i * 1.6 + 0.8, peakCz, rr * 0.86, rr, 1.6, pick([0x3f6b3a, 0x4a7a42]), 10);
    }

    /* ---------------- 天际线 ---------------- */
    const TOWER = [0x8fa3b8, 0xa9bccd, 0x78909f, 0xbecbd6, 0x6d8494];
    const glass = new THREE.MeshStandardMaterial({
      color: 0x2a4a63, roughness: 0.2, metalness: 0.6,
      emissive: 0xffd9a0, emissiveIntensity: 0.06,
    });

    function tower(x, z, w, h, d) {
      const c = pick(TOWER);
      box(x, 0.36 + h / 2, z, w, h, d, c);
      if (h > 9) box(x, 0.36 + h + 0.35, z, w * 0.62, 0.7, d * 0.62, c);

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

    [
      [-6, 6, 3.4, 14], [-1, 7.5, 3.0, 11], [4, 6.5, 3.6, 16], [9, 7, 3.2, 12],
      [14, 6, 3.0, 9.5], [19, 7.5, 3.4, 13], [24, 6.5, 2.8, 8], [-12, 6.5, 3.2, 10],
      [28, 7, 2.6, 7], [10, 11, 3.0, 8.5], [-4, 11.5, 3.2, 9.5],
    ].forEach(([x, z, w, h]) => tower(x, z, w, h, w * 0.92));

    [
      [-8, -6, 3.2, 10], [-2, -7, 3.6, 13], [4, -6.5, 3.0, 8], [10, -7.5, 3.2, 11],
      [16, -6, 2.8, 7], [22, -7, 3.0, 9], [-14, -6.5, 3.0, 8.5], [-24, -6, 2.6, 6.5],
      [1, -11, 3.2, 7.5], [-11, -11, 2.8, 6.5],
    ].forEach(([x, z, w, h]) => tower(x, z, w, h, w * 0.92));

    /* ---------------- 钟楼 ---------------- */
    box(-1, 0.36 + 2.2, 3.6, 1.1, 4.4, 1.1, 0xd9c9a8);
    box(-1, 0.36 + 4.6, 3.6, 1.5, 0.4, 1.5, 0x8a8f96);
    cone(-1, 0.36 + 6.1, 3.6, 0.85, 2.6, 0x5d6a72, 4);
    const face = new THREE.MeshStandardMaterial({
      color: 0xf7f0dc, roughness: 0.9, emissive: 0xffe9b8, emissiveIntensity: 0.12,
    });
    box(-1, 0.36 + 3.6, 4.16, 0.7, 0.7, 0.06, face);
    box(-1, 0.36 + 3.6, 3.04, 0.7, 0.7, 0.06, face);

    /* ============================================================
       天文台：塔顶挂风球信号
       ============================================================ */
    const obsX = -28;
    const obsZ = -4;
    box(obsX, 0.36 + 1.6, obsZ, 3.4, 3.2, 3.2, 0xe4dcc8);
    box(obsX, 0.36 + 3.35, obsZ, 3.8, 0.35, 3.6, 0xb9b2a0);
    cyl(obsX, 0.36 + 4.3, obsZ, 1.2, 1.75, 1.9, 0xf1ece0, 12);
    cyl(obsX, 0.36 + 7.6, obsZ, 0.09, 0.09, 4.6, 0xb8bfc6, 6);

    // 信号球：颜色随天气等级变化
    const signalMat = new THREE.MeshStandardMaterial({
      color: 0x333a44, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.5,
    });
    const signalBall = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), signalMat);
    signalBall.position.set(obsX, 0.36 + 10.2, obsZ);
    api.group.add(signalBall);

    const SIGNAL_COLORS = {
      clear: null,
      cloudy: null,
      overcast: 0x5c6672,
      rain: 0x2f80ed,
      storm: 0x8e6bd6,
      t3: 0xf2b231,
      t8: 0xe0533d,
      black: 0x14121a,
    };

    /* ============================================================
       码头与船
       ============================================================ */
    const pierX = 25;
    const pierZ = harbourZ(pierX);
    // 栈桥
    box(pierX - 2.2, 0.24, pierZ, 5.2, 0.3, 1.5, 0xb9a98a);
    box(pierX - 4.4, 0.2, pierZ, 0.7, 0.28, 1.9, 0xa8987f);
    cyl(pierX - 0.4, 0.5, pierZ + 0.9, 0.07, 0.07, 1.1, 0x8d8477, 5);
    cyl(pierX - 0.4, 0.5, pierZ - 0.9, 0.07, 0.07, 1.1, 0x8d8477, 5);

    const ship = new THREE.Group();
    api.group.add(ship);
    partTo(ship, 0, 0.34, 0, 2.6, 0.62, 1.2, 0xe8e2d2);
    partTo(ship, 0, 0.34, 0, 2.2, 0.4, 1.0, 0x1f5f4a);
    partTo(ship, 0.1, 0.86, 0, 1.5, 0.52, 0.86, 0x2f7d4f);
    partTo(ship, 0.1, 1.16, 0, 1.1, 0.24, 0.66, 0xf2eee2);
    partTo(ship, -1.15, 0.62, 0, 0.5, 0.42, 0.5, 0xd8d2c2);

    const dockPos = [pierX - 0.6, 0, pierZ];
    const waitPos = [pierX + 7.5, 0, pierZ + 1.2];
    ship.position.set(...waitPos);
    ship.visible = false;

    /* ---------------- 返回契约 ---------------- */
    return {
      windowMaterials: [glass, face],
      camera: { target: [0, -1.5, 0], distance: 104, elev: 0.3 },
      anchors: {
        observatory: [obsX, 0.36 + 11.2, obsZ],
      },
      port: { group: ship, dockPos, waitPos },
      setSignal(key) {
        const color = SIGNAL_COLORS[key];
        if (!color && color !== 0) {
          signalMat.emissiveIntensity = 0;
          signalBall.visible = false;
          return;
        }
        signalBall.visible = true;
        signalMat.color.setHex(color);
        // 等级越高，球越亮
        const power = { overcast: 0.2, rain: 0.5, storm: 1.0, t3: 1.8, t8: 2.6, black: 3.0 }[key] || 0.3;
        signalMat.emissive.setHex(color);
        signalMat.emissiveIntensity = power;
      },
    };
  },
});
