/* 香港浮空岛 —— 微缩维港
   九龙一侧（z < 0）：尖沙咀钟楼、文化中心、太空馆、矮密旧楼、霓虹招牌、天文台
   维港（z ≈ 0）：天星小轮往返、红帆船、邮轮码头
   港岛一侧（z > 0）：IFC、中银大厦、中环广场、摩天轮、太平山与凌霄阁 */
STORM_CITIES.register({
  id: 'hongkong',
  label: '香港',

  build(api) {
    const { THREE, box, cyl, cone, beam, voxel, mat, addAnim, rand } = api;
    const pick = (a) => a[Math.floor(rand() * a.length)];
    const Y0 = 0.36;                                  // 地面高度
    const snap = (v) => Math.round(v / 1.5) * 1.5;    // 对齐地形网格
    const ease = (s) => s * s * (3 - 2 * s);

    /* ================= 1. 地形 ================= */
    const GRASS = [0x5f8f4a, 0x6c9c52, 0x79aa5a];
    const ROCK = [0x7d6a55, 0x96806a, 0xa89078];
    const SEA = [0x1d4f66, 0x256078, 0x2c6d88];
    const PAVE = [0x9b968d, 0xa6a197, 0x8e8a83];
    const HILL = [0x3f6b3a, 0x4a7a42, 0x557f45];
    const ROAD = 0x5f5d5a;

    // 维港中心线：一条轻微弯曲的水道
    const harbourZ = (x) => 1.2 * Math.sin(x * 0.09);
    const isSea = (x, z) => Math.abs(z - harbourZ(x)) < 4.4;

    // 岛屿轮廓：椭圆 + 两个正弦扰动
    const inside = (x, z) => {
      const a = Math.atan2(z / 17, x / 33);
      const r = Math.sqrt((x / 33) ** 2 + (z / 17) ** 2);
      return r < 1 + 0.055 * Math.sin(6 * a) + 0.03 * Math.cos(9 * a);
    };
    const ellR = (x, z) => Math.sqrt((x / 33) ** 2 + (z / 17) ** 2);
    const landAt = (x, z) => {
      const gx = snap(x), gz = snap(z);
      return inside(gx, gz) && !isSea(gx, gz);
    };
    const kowloon = (x, z) => z < harbourZ(x) - 4.4;
    const isRoad = (x, z) => kowloon(x, z) && ((x === 7.5 && z < -3) || z === -10.5); // 弥敦道 + 横街
    const inPark = (x, z) => x > -12.5 && x < -7 && z > -12.5 && z < -8;               // 九龙公园

    // 太平山：港岛后方一座山峰（不是一条横贯全岛的绿墙）
    const PEAK = [-6, 13.5];
    const hillH = (x, z) => {
      if (z < 10) return 0;
      // 只用高斯衰减，两端自然归零；原来那句 `3.2 + ...` 会让整条边带都有山
      const ridge = 5.2 * Math.exp(-(((x + 6) / 8.5) ** 2))
        + 1.6 * Math.exp(-(((x - 15) / 5.5) ** 2));
      const s = ease(Math.min(1, (z - 10) / 3.2));
      const fade = Math.min(1, Math.max(0, (1 - ellR(x, z)) / 0.16));
      return Math.round((ridge * s * fade) / 0.5) * 0.5;
    };

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
                ROCK[(((k + Math.floor(x + z)) % 3) + 3) % 3]);
            }
          }
        }
        // 地表：海 / 公路 / 城区铺装 / 海岸与山坡草地
        let top;
        if (sea) top = SEA[Math.abs(Math.floor(x / 3)) % 3];
        else if (isRoad(x, z)) top = ROAD;
        else if (ellR(x, z) > 0.9 || inPark(x, z) || z > 10) top = GRASS[Math.floor((x + 33) / 4) % 3];
        else top = PAVE[Math.abs(Math.floor(x * 0.7 + z)) % 3];
        voxel(x, sea ? -0.06 : 0.18, z, 1.55, sea ? 0.3 : 0.38, 1.55, top);

        // 太平山体素 + 山上的树
        const h = sea ? 0 : hillH(x, z);
        if (h >= 0.5) {
          voxel(x, h / 2, z, 1.57, h, 1.57, h > 5.5 ? HILL[0] : h > 3 ? HILL[1] : HILL[2]);
          const nearPeak = Math.abs(x - PEAK[0]) < 2 && Math.abs(z - PEAK[1]) < 2;
          if (!nearPeak && h > 1 && rand() < 0.35) {
            voxel(x + (rand() - 0.5) * 0.6, h + 0.3, z + (rand() - 0.5) * 0.6, 0.75, 0.6, 0.75, 0x2f5a2c);
          }
        }
      }
    }

    /* ================= 2. 香港天际线 ================= */

    // 所有窗户共用一个材质，场景靠它表现「压力越大，城市越亮」
    const glass = new THREE.MeshStandardMaterial({
      color: 0x2a4a63, roughness: 0.2, metalness: 0.6,
      emissive: 0xffd9a0, emissiveIntensity: 0.06,
    });

    // 窗户收集起来，最后合成一个 InstancedMesh（只占一次 draw call）
    const wins = [];
    const win = (x, y, z, w, h, d) => wins.push([x, y, z, w, h, d]);
    // 方楼四面横向窗带
    const bands = (x, z, w, d, yLo, yHi, step = 0.9, hh = 0.3, keep = 1) => {
      for (let y = yLo; y <= yHi; y += step) {
        if (rand() < keep) win(x, y, z + d / 2 + 0.03, w * 0.86, hh, 0.06);
        if (rand() < keep) win(x, y, z - d / 2 - 0.03, w * 0.86, hh, 0.06);
        if (rand() < keep) win(x + w / 2 + 0.03, y, z, 0.06, hh, d * 0.86);
        if (rand() < keep) win(x - w / 2 - 0.03, y, z, 0.06, hh, d * 0.86);
      }
    };

    // 占地登记：地标先占位，旧楼群和中层楼再见缝插针
    const taken = [];
    const reserve = (x0, x1, z0, z1) => taken.push([x0, x1, z0, z1]);
    const isFree = (x, z, pad) => taken.every(([a, b, c, d]) =>
      x < a - pad || x > b + pad || z < c - pad || z > d + pad);

    // 把 api 造出来的零件搬进子 group，改用局部坐标
    const adopt = (g, m) => { api.group.remove(m); g.add(m); return m; };
    const partTo = (g, x, y, z, w, h, d, c) => {
      const m = adopt(g, box(0, 0, 0, w, h, d, c));
      m.position.set(x, y, z);
      return m;
    };

    /* ---------- IFC 二期：方柱 + 阶梯收分 + 爪形冠顶 + 细尖 ---------- */
    {
      const x = 2, z = 7, s = 2.6;
      reserve(x - 2.6, x + 2.6, z - 1.9, z + 1.7);
      box(x, Y0 + 0.7, z - 0.3, 5.0, 1.4, 3.2, 0xa9bccd);           // 裙楼（IFC 商场）
      box(x, Y0 + 6.5, z, s, 13, s, 0x8fa3b8);
      bands(x, z, s, s, Y0 + 1.9, Y0 + 12.6, 0.75, 0.28);
      let y = Y0 + 13;
      [[2.3, 1.5], [2.0, 1.3], [1.7, 1.1], [1.4, 0.9]].forEach(([w, h], i) => {
        box(x, y + h / 2, z, w, h, w, i % 2 ? 0xa9bccd : 0x8fa3b8);
        bands(x, z, w, w, y + h / 2, y + h / 2, 1, 0.24);
        y += h;
      });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
        box(x + sx * 0.6, y + 0.45, z + sz * 0.6, 0.22, 0.9, 0.22, 0xc8d4de));
      cyl(x, y + 0.7, z, 0.04, 0.1, 1.4, 0xdfe5ea, 6);              // 顶尖 ≈ 19.6
    }

    /* ---------- 中银大厦：四个三角棱柱节节收窄，斜切顶 + 双天线 ---------- */
    {
      const cx = 12, cz = 8, s = 1.5;
      reserve(cx - s, cx + s, cz - s, cz + s);
      const bocMat = new THREE.MeshStandardMaterial({
        color: 0x6f8797, roughness: 0.3, metalness: 0.5, side: THREE.DoubleSide,
      });
      box(cx, Y0 + 0.3, cz, s * 2 + 0.6, 0.6, s * 2 + 0.6, bocMat);  // 基座（同时登记材质）

      // 三角棱柱：pts 为三个 [x,z]，tops 为三个顶点的高度（不等高 = 斜切面）
      const prism = (pts, tops) => {
        const lo = pts.map(([px, pz]) => [px, Y0, pz]);
        const hi = pts.map(([px, pz], i) => [px, Y0 + tops[i], pz]);
        const P = [];
        const tri = (a, b, c) => P.push(...a, ...b, ...c);
        tri(hi[0], hi[1], hi[2]);
        tri(lo[0], lo[2], lo[1]);
        for (let i = 0; i < 3; i++) {
          const j = (i + 1) % 3;
          tri(lo[i], lo[j], hi[j]);
          tri(lo[i], hi[j], hi[i]);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, bocMat);
        m.castShadow = true;
        m.receiveShadow = true;
        api.group.add(m);
      };

      const C = [[s, s], [-s, s], [-s, -s], [s, -s]].map(([dx, dz]) => [cx + dx, cz + dz]);
      const H = [16, 12.5, 9.5, 6.5];                                // 四个象限的高度
      for (let i = 0; i < 4; i++) {
        const a = C[i], b = C[(i + 1) % 4];
        prism([[cx, cz], a, b], [H[i], H[i] - 1.6, H[i]]);
        // 外立面白色 X 形斜撑
        const segs = Math.max(1, Math.round((H[i] - 1.6) / 4.5));
        const sh = (H[i] - 1.6) / segs;
        const nx = (a[0] + b[0]) / 2 - cx, nz = (a[1] + b[1]) / 2 - cz;
        const off = 0.04 / Math.hypot(nx, nz);
        const A = [a[0] + nx * off, a[1] + nz * off], B = [b[0] + nx * off, b[1] + nz * off];
        for (let k = 0; k < segs; k++) {
          const y0 = Y0 + k * sh, y1 = Y0 + (k + 1) * sh;
          beam([A[0], y0, A[1]], [B[0], y1, B[1]], 0.045, 0xe9eef2);
          beam([B[0], y0, B[1]], [A[0], y1, A[1]], 0.045, 0xe9eef2);
        }
      }
      // 双天线立在最高象限的高边上
      [0.3, 0.7].forEach((f) => {
        const px = cx + (C[1][0] - cx) * f, pz = cz + (C[1][1] - cz) * f;
        cyl(px, Y0 + H[0] + 1.3, pz, 0.03, 0.06, 2.6, 0xdfe5ea, 6);  // 顶 ≈ 19.0
      });
    }

    /* ---------- 中环广场：方柱 + 金色灯带 + 金字塔尖顶 + 顶针 ---------- */
    {
      const x = -13, z = 7, s = 2.4, h = 12;
      reserve(x - 1.6, x + 1.6, z - 1.6, z + 1.6);
      box(x, Y0 + 0.5, z, s + 0.8, 1, s + 0.8, 0xbfc6cc);
      box(x, Y0 + h / 2, z, s, h, s, 0xa9bccd);
      bands(x, z, s, s, Y0 + 1.6, Y0 + h - 1, 0.8, 0.28);
      [h * 0.35, h * 0.7, h - 0.4].forEach((yy) =>
        box(x, Y0 + yy, z, s + 0.12, 0.2, s + 0.12, 0xd8b25a));
      box(x, Y0 + h + 0.4, z, s * 0.82, 0.8, s * 0.82, 0xc9d3dc);
      const pyr = cone(x, Y0 + h + 0.8 + 1.2, z, s * 0.58, 2.4, 0xd8b25a, 4);
      pyr.rotation.y = Math.PI / 4;                                  // 四棱锥对齐楼身
      cyl(x, Y0 + h + 3.2 + 1.2, z, 0.03, 0.07, 2.4, 0xdfe5ea, 6);    // 顶针 ≈ 18.0
    }

    /* ---------- 港岛其余玻璃楼 ---------- */
    const TOWER = [0x8fa3b8, 0xa9bccd, 0x78909f, 0xbecbd6];
    const tower = (x, z, w, h) => {
      reserve(x - w / 2, x + w / 2, z - w / 2, z + w / 2);
      const c = pick(TOWER);
      box(x, Y0 + h / 2, z, w, h, w, c);
      box(x, Y0 + h + 0.25, z, w * 0.6, 0.5, w * 0.6, c);
      bands(x, z, w, w, Y0 + 1.2, Y0 + h - 0.5, 0.85, 0.28);
    };
    [
      [-9, 6.5, 2.0, 9], [-17, 6.5, 2.2, 8], [-20.5, 8, 2.0, 6.5], [7, 6.5, 2.0, 10],
      [16, 6.5, 2.2, 11], [19.5, 8.5, 2.0, 8], [-3, 8.5, 2.0, 8], [-24, 6, 1.8, 5.5],
      [23, 5.6, 1.8, 6],
    ].forEach(([x, z, w, h]) => tower(x, z, w, h));

    /* ---------- 中环摩天轮 ---------- */
    {
      const wx = -5, wz = 4.2, R = 2.7, hubY = Y0 + 3.3;
      reserve(wx - 1.6, wx + 1.6, wz - 0.9, wz + 0.9);
      box(wx, Y0 + 0.15, wz, 3.2, 0.3, 1.6, 0xd7d2c6);
      [-1, 1].forEach((sz) => [-1, 1].forEach((sx) =>
        beam([wx + sx * 1.3, Y0 + 0.3, wz + sz * 0.65], [wx, hubY, wz + sz * 0.18], 0.07, 0xe6e6e6)));
      const hub = cyl(wx, hubY, wz, 0.2, 0.2, 0.5, 0xcfd4d8, 8);
      hub.rotation.x = Math.PI / 2;

      const wheel = new THREE.Group();
      wheel.position.set(wx, hubY, wz);
      api.group.add(wheel);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 6, 36), mat(0xf4f4f4));
      ring.castShadow = true;
      wheel.add(ring);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        adopt(wheel, beam([0, 0, 0], [R * Math.cos(a), R * Math.sin(a), 0], 0.025, 0xe8e8e8));
      }
      const cabins = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        cabins.push(partTo(wheel, R * Math.cos(a), R * Math.sin(a), 0, 0.32, 0.36, 0.32,
          i % 3 === 0 ? 0xe05a4f : 0xf2eee2));
      }
      addAnim((t) => {
        const a = t * 0.15;
        wheel.rotation.z = a;
        cabins.forEach((c) => { c.rotation.z = -a; });               // 车厢保持竖直
      });
    }

    /* ---------- 太平山顶：凌霄阁（碗状观景台） ---------- */
    {
      const [px, pz] = PEAK, py = hillH(px, pz);
      cyl(px, py + 0.5, pz, 0.45, 0.6, 1.0, 0xd9d4c8, 8);
      cyl(px, py + 1.35, pz, 1.25, 0.5, 0.7, 0xe8e4da, 10);
      cyl(px, py + 1.75, pz, 1.25, 1.25, 0.1, 0xb9b2a4, 10);
    }

    /* ---------- 尖沙咀钟楼：红砖方塔 + 白色圆顶 + 小尖 ---------- */
    const face = new THREE.MeshStandardMaterial({
      color: 0xf7f0dc, roughness: 0.9, emissive: 0xffe9b8, emissiveIntensity: 0.12,
    });
    {
      const x = 1, z = -4.6;
      reserve(x - 0.8, x + 0.8, z - 0.8, z + 0.8);
      box(x, Y0 + 0.2, z, 1.5, 0.4, 1.5, 0xcfc6b4);                   // 花岗岩基座
      box(x, Y0 + 3.0, z, 1.2, 5.2, 1.2, 0x9c4a3c);                   // 红砖塔身
      [2.2, 4.0].forEach((yy) => box(x, Y0 + yy, z, 1.3, 0.16, 1.3, 0xe2dccd));
      box(x, Y0 + 6.15, z, 1.3, 1.1, 1.3, 0x9c4a3c);                  // 钟座
      box(x, Y0 + 6.15, z + 0.66, 0.6, 0.6, 0.04, face);
      box(x, Y0 + 6.15, z - 0.66, 0.6, 0.6, 0.04, face);
      box(x + 0.66, Y0 + 6.15, z, 0.04, 0.6, 0.6, face);
      box(x - 0.66, Y0 + 6.15, z, 0.04, 0.6, 0.6, face);
      box(x, Y0 + 6.77, z, 1.45, 0.14, 1.45, 0xf2eee2);               // 檐口
      cyl(x, Y0 + 7.2, z, 0.42, 0.48, 0.72, 0xf2eee2, 8);             // 八角亭
      cyl(x, Y0 + 7.78, z, 0.16, 0.5, 0.44, 0xf7f4ec, 8);             // 白色圆顶
      cone(x, Y0 + 8.45, z, 0.07, 0.9, 0xd8d2c4, 6);                  // 小尖 ≈ 9.3
    }

    /* ---------- 文化中心（斜屋面）+ 太空馆（白色圆顶） ---------- */
    {
      reserve(-5.2, -1.6, -6.4, -4.3);
      box(-3.4, Y0 + 0.8, -5.4, 3.4, 1.6, 1.8, 0xd8a090);
      const roof = box(-3.4, Y0 + 1.75, -5.55, 3.5, 0.18, 1.6, 0xc98e7f);
      roof.rotation.x = 0.35;
      reserve(-7.6, -5.4, -6.7, -4.5);
      cyl(-6.5, Y0 + 0.55, -5.6, 0.45, 1.05, 1.1, 0xf4f1ea, 12);
      cyl(-6.5, Y0 + 1.2, -5.6, 0.05, 0.45, 0.2, 0xf4f1ea, 12);
    }

    /* ---------- 天星码头（两岸各一个） ---------- */
    const FX = 4;
    reserve(3, 5.2, -4.2, -1.5);
    box(FX, 0.24, -2.45, 1.0, 0.3, 1.1, 0xcfc6b0);
    box(FX, Y0 + 0.45, -3.2, 1.6, 0.9, 0.9, 0xe8e2d2);
    box(FX, Y0 + 0.95, -3.2, 1.8, 0.12, 1.1, 0x1f5f4a);
    reserve(3, 5.2, 2.6, 5.0);
    box(FX, 0.24, 3.4, 1.0, 0.3, 1.2, 0xcfc6b0);
    box(FX, Y0 + 0.45, 4.4, 1.6, 0.9, 0.9, 0xe8e2d2);
    box(FX, Y0 + 0.95, 4.4, 1.8, 0.12, 1.1, 0x1f5f4a);

    /* ---------- 九龙旧楼群：矮、密、暖灰，带霓虹招牌 ---------- */
    const OLD = [0xb8a998, 0xa89a8a, 0xc4b5a0, 0x9d8f80, 0xd1c3ad, 0xb5a28c, 0xc9b9a6, 0x998a7b, 0xd9c2a3];
    const NEON = [0xff3b6b, 0xff9a2e, 0x3fe0ff, 0xffe14a, 0xb46bff, 0x4dff8a];
    const neons = [];
    const obsX = -24.5, obsZ = -7;
    reserve(obsX - 2, obsX + 2, obsZ - 2, obsZ + 2);
    reserve(20.5, 26.5, -4, -2.5);                                    // 邮轮码头大楼

    for (let x = -33; x <= 33; x += 1.5) {
      for (let z = -18; z < 0; z += 1.5) {
        if (!kowloon(x, z) || !landAt(x, z) || ellR(x, z) > 0.92) continue;
        if (isRoad(x, z) || !isFree(x, z, 0.6)) continue;
        if (inPark(x, z)) {
          if (rand() < 0.8) voxel(x, Y0 + 0.5, z, 1.0, 0.9, 1.0, pick([0x3d6e36, 0x4f8341]));
          continue;
        }
        if (rand() < 0.12) continue;
        const w = 1.15 + rand() * 0.25, d = 1.15 + rand() * 0.25;
        const h = 1.4 + rand() * 2.4 + (rand() < 0.08 ? 1.5 : 0);
        voxel(x, Y0 + h / 2, z, w, h, d, pick(OLD));
        if (rand() < 0.35) {
          voxel(x + (rand() - 0.5) * 0.5, Y0 + h + 0.2, z + (rand() - 0.5) * 0.5, 0.35, 0.4, 0.35, 0x8a7f74);
        }
        bands(x, z, w, d, Y0 + 0.6, Y0 + h - 0.35, 0.72, 0.2, 0.8);
        // 弥敦道两侧挂满招牌，其他街道零星几块
        const street = x === 6 || x === 9;
        if ((street && z < -4 && rand() < 0.75) || rand() < 0.08) {
          const side = x === 9 ? -1 : 1;
          const sy = Y0 + 0.8 + rand() * Math.max(0.2, h - 1.5);
          neons.push([x + side * (w / 2 + 0.06), sy, z, 0.1, 0.5 + rand() * 0.5, 0.4, pick(NEON)]);
        }
      }
    }

    /* ---------- 港岛中层楼：填满地标之间的空隙 ---------- */
    const COOL = [0x9fb0bf, 0xb7c3cc, 0x8798a6, 0xc9d1d6, 0xa9bccd];
    for (let x = -33; x <= 33; x += 1.5) {
      for (let z = 3; z <= 9; z += 1.5) {
        if (z - harbourZ(x) < 5 || !landAt(x, z) || ellR(x, z) > 0.9) continue;
        if (!isFree(x, z, 0.75) || rand() < 0.45) continue;
        const w = 1.1 + rand() * 0.3, h = 3 + rand() * 4.5;
        voxel(x, Y0 + h / 2, z, w, h, w, pick(COOL));
        bands(x, z, w, w, Y0 + 0.8, Y0 + h - 0.4, 0.8, 0.24, 0.85);
      }
    }

    /* ================= 3. 天文台（气泡会挂在这里） ================= */
    box(obsX, Y0 + 1.5, obsZ, 3.0, 3.0, 2.8, 0xe4dcc8);
    box(obsX, Y0 + 3.15, obsZ, 3.4, 0.3, 3.2, 0xb9b2a0);
    bands(obsX, obsZ, 3.0, 2.8, Y0 + 1.0, Y0 + 2.4, 1.2, 0.4);
    cyl(obsX, Y0 + 4.2, obsZ, 1.1, 1.5, 1.8, 0xf1ece0, 12);
    cyl(obsX, Y0 + 7.4, obsZ, 0.09, 0.09, 4.6, 0xb8bfc6, 6);
    box(obsX, Y0 + 8.6, obsZ, 1.6, 0.06, 0.06, 0xb8bfc6);              // 信号横杆

    const signalMat = new THREE.MeshStandardMaterial({
      color: 0x333a44, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.5,
    });
    const signalBall = box(obsX, Y0 + 10.2, obsZ, 1, 1, 1, signalMat); // 借 box 登记材质，再换成圆球
    signalBall.geometry = new THREE.SphereGeometry(0.62, 12, 8);
    signalBall.scale.set(1, 1, 1);
    signalBall.visible = false;

    /* ================= 4. 码头与船 ================= */
    // 天星小轮：绿白双层，在两个码头之间往返
    const ferry = new THREE.Group();
    api.group.add(ferry);
    partTo(ferry, 0, 0.26, 0, 0.9, 0.42, 1.9, 0x1f5f4a);                // 船身（长轴沿 z）
    partTo(ferry, 0, 0.55, 0, 0.84, 0.18, 1.7, 0xf2eee2);               // 下层白色窗带
    partTo(ferry, 0, 0.75, 0, 0.8, 0.24, 1.5, 0x2f7d4f);                // 上层
    partTo(ferry, 0, 0.92, 0, 0.88, 0.08, 1.6, 0xf2eee2);               // 白色顶棚
    partTo(ferry, 0, 1.1, 0, 0.05, 0.3, 0.05, 0xf2eee2);                // 小桅
    const fz = [-0.95, 1.85];
    ferry.position.set(FX, 0, fz[0]);
    addAnim((t) => {
      const p = (t % 18) / 18;   // 停九龙 → 过海 → 停港岛 → 回程
      const k = p < 0.2 ? 0 : p < 0.5 ? ease((p - 0.2) / 0.3) : p < 0.7 ? 1 : 1 - ease((p - 0.7) / 0.3);
      ferry.position.z = fz[0] + (fz[1] - fz[0]) * k;
      ferry.position.y = 0.03 * Math.sin(t * 2.1);
    });

    // 红帆船：在维港西段慢慢游
    const junk = new THREE.Group();
    api.group.add(junk);
    partTo(junk, 0, 0.25, 0, 2.0, 0.35, 0.7, 0x6b3f2a);
    partTo(junk, 0.8, 0.5, 0, 0.5, 0.2, 0.6, 0x5a3424);
    partTo(junk, -0.35, 1.15, 0, 0.9, 1.3, 0.05, 0xb3332a);
    partTo(junk, 0.5, 1.0, 0, 0.7, 1.0, 0.05, 0xb3332a);
    addAnim((t) => {
      const x = -15.5 + 5.5 * Math.sin(t * 0.06);
      junk.position.set(x, 0.02 * Math.sin(t * 1.7), harbourZ(x) + 0.9);
      const want = Math.cos(t * 0.06) >= 0 ? 0 : Math.PI;
      junk.rotation.y += (want - junk.rotation.y) * 0.03;
    });

    // 邮轮码头（九龙东）+ 进港的邮轮（port 船，长轴沿局部 z）
    box(23.5, 0.24, -1.6, 7, 0.3, 1.0, 0xb9a98a);
    box(23.5, Y0 + 0.6, -3.2, 5, 1.2, 1.3, 0xd9dde0);
    box(23.5, Y0 + 1.3, -3.2, 5.4, 0.2, 1.5, 0x8fa3b8);
    cyl(20.4, 0.5, -1.2, 0.07, 0.07, 0.6, 0x8d8477, 5);
    cyl(26.6, 0.5, -1.2, 0.07, 0.07, 0.6, 0x8d8477, 5);

    const ship = new THREE.Group();
    api.group.add(ship);
    partTo(ship, 0, 0.32, 0, 1.1, 0.58, 3.4, 0xf4f3ef);                 // 白色船身
    partTo(ship, 0, 0.42, 0, 1.12, 0.12, 3.42, 0x2b5d8c);               // 蓝色腰线
    partTo(ship, 0, 0.8, -0.2, 0.95, 0.4, 2.4, 0xeceae4);
    partTo(ship, 0, 0.82, -0.2, 0.97, 0.12, 2.2, glass);                // 舷窗
    partTo(ship, 0, 1.15, -0.35, 0.8, 0.32, 1.6, 0xf4f3ef);
    partTo(ship, 0, 1.55, -0.55, 0.36, 0.5, 0.5, 0xc94a3a);             // 烟囱
    const dockPos = [23.5, 0, -0.45];
    const waitPos = [30.5, 0, 0.8];
    ship.position.set(...waitPos);
    ship.visible = false;

    /* ---------- 合批：窗户与霓虹 ---------- */
    const dummy = new THREE.Object3D();
    const winMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glass, wins.length);
    wins.forEach(([x, y, z, w, h, d], i) => {
      dummy.position.set(x, y, z);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      winMesh.setMatrixAt(i, dummy.matrix);
    });
    api.group.add(winMesh);

    const neonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    box(9, Y0 + 5.6, -4.5, 0.12, 0.7, 1.3, neonMat).visible = false;   // 只为登记材质，切城时随城市释放
    const neonMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), neonMat, Math.max(1, neons.length));
    const tmpC = new THREE.Color();
    neons.forEach(([x, y, z, w, h, d, c], i) => {
      dummy.position.set(x, y, z);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      neonMesh.setMatrixAt(i, dummy.matrix);
      neonMesh.setColorAt(i, tmpC.setHex(c));
    });
    neonMesh.count = neons.length;
    if (neonMesh.instanceColor) neonMesh.instanceColor.needsUpdate = true;
    api.group.add(neonMesh);

    /* ================= 5. 返回契约 ================= */
    const SIGNAL_COLORS = {
      overcast: 0x5c6672, rain: 0x2f80ed, storm: 0x8e6bd6,
      t3: 0xf2b231, t8: 0xe0533d, black: 0x14121a,
    };
    const SIGNAL_POWER = { overcast: 0.2, rain: 0.5, storm: 1, t3: 1.8, t8: 2.6, black: 3 };

    return {
      windowMaterials: [glass, face],
      camera: { target: [0, -1.5, 0], distance: 104, elev: 0.3 },
      anchors: { observatory: [obsX, Y0 + 11.2, obsZ] },
      port: { group: ship, dockPos, waitPos },
      setSignal(key) {
        const c = SIGNAL_COLORS[key];
        if (!c) {
          signalMat.emissiveIntensity = 0;
          signalBall.visible = false;
          return;
        }
        signalBall.visible = true;
        signalMat.color.setHex(c);
        signalMat.emissive.setHex(c);
        signalMat.emissiveIntensity = SIGNAL_POWER[key];
      },
    };
  },
});
