# 实现交接单：香港浮空岛 3D 模型

> 交给实现模型（Claude 等）。这份文档自包含，不需要看别的文件。
> 你只需要产出**一个文件**：`cities/hongkong.js`。

---

## 0. 背景（30 秒）

这是一个网页版「学业天气」产品。页面背后是一个用 Three.js r160 渲染的**浮空岛城市**，城市的天气（晴、雨、雷暴、风球）由用户的截止日期压力决定。

现在需要把岛上的建筑换成一个**一眼认得出是香港**的微缩景观。地形和浮空岛的生成逻辑已经写好，你主要负责建模。

---

## 1. 输出要求

- **只输出一个完整的 JavaScript 文件**，文件名 `cities/hongkong.js`
- 文件里直接调用全局的 `STORM_CITIES.register(...)`，**不要**用 `import` / `export` / `require`
- 不用构建工具，不用 npm 包，**不发任何网络请求，不加载任何外部贴图或模型文件**
- 只用全局的 `THREE`（Three.js r160 已由页面提供）
- 代码用 `const` / 箭头函数，注释用中文，保持简洁

---

## 2. 运行环境与 API

场景已经有：渲染器、灯光、雾、雨、闪电、云、镜头、天气切换。**你不需要碰这些**，只负责往岛上摆东西。

`build(api)` 接收的 `api` 对象：

| 成员 | 签名 | 说明 |
|---|---|---|
| `THREE` | — | Three.js 命名空间 |
| `group` | `THREE.Group` | 你的城市根节点，所有东西挂在这里 |
| `box` | `(x, y, z, w, h, d, color, ry?)` | 方块。**位置是方块中心**，`color` 是 0xRRGGBB 或 Material 对象，`ry` 是绕 Y 轴弧度 |
| `cyl` | `(x, y, z, rTop, rBottom, h, color, seg?)` | 圆柱 / 圆台，`seg` 默认 12 |
| `cone` | `(x, y, z, r, h, color, seg?)` | 圆锥，等价于 `cyl` 顶部半径为 0 |
| `beam` | `(a, b, radius, color)` | 连接 `[x,y,z]` 到 `[x,y,z]` 两点的一根杆子 |
| `voxel` | `(x, y, z, w, h, d, color, ry?)` | **轻量方块，会合批成一次 draw call**。地形、大量小方块用它 |
| `mat` | `(color)` | 取一个缓存材质；直接传颜色数字给 box 也等价 |
| `addAnim` | `(fn)` | 注册每帧回调，`fn(time)` 的 `time` 是秒。切城市时会被清空 |
| `rand` | `()` | 0~1 的确定性随机数 |

**性能红线（必须遵守）：**

- `voxel()` 调用总数 **≤ 4500**（地形已经用掉约 1500）
- `box / cyl / cone / beam` 每个都会消耗一次 draw call，总数 **≤ 320**
- 不要用 `SphereGeometry` 做大量圆球，需要圆就用 `cyl` 低分段近似
- 不要自己写 `requestAnimationFrame`，动画一律用 `addAnim`

---

## 3. 坐标系与尺寸预算

```
         z = -18  ┌──────────────┐
                  │   九龙一侧    │   ← 尖沙咀、钟楼、矮而密的旧楼
         z = 0    │ ～～～维港～～～│   ← 一条横贯东西的水道
                  │   港岛一侧    │   ← IFC、中银、中环广场、摩天轮
         z = +18  └──────────────┘
                x=-33            x=+33
```

| 项 | 值 |
|---|---|
| 岛面高度 | `y ≈ 0.4` 是地面；低于 0 是岩层，可以直接挖 |
| 水平范围 | `x ∈ [-33, 33]`，`z ∈ [-18, 18]`，椭圆形，边缘是不规则海岸线 |
| 高度上限 | **y ≤ 25**。超过 25 会被相机切掉，观感很差 |
| 建议最高楼 | 18~20（IFC 那一档） |

岛外是空的，所以**不要**在 `inside()` 判定为 false 的位置放建筑（会飘在空中）。

---

## 4. 一眼认得出是香港：必须出现的元素

按重要性排序，**前 6 项必须做，后 3 项有时间再做**。

### 必须

| 元素 | 怎么用方块表达 | 建议位置 |
|---|---|---|
| **维多利亚港** | 一条横贯的水道，深蓝绿色，两岸分开 | 沿 `z ≈ 0` |
| **IFC 国际金融中心二期** | 最高的楼，方柱 + **顶部阶梯状收分** + 顶端细尖。灰蓝玻璃 | 港岛侧，x ≈ 0~6 |
| **中银大厦** | 三角/菱形棱柱，**节节收窄**，顶部两根细天线，带斜切面 | 港岛侧，x ≈ 10~14 |
| **中环广场** | 方柱 + **金字塔形尖顶** + 顶上一根针 | 港岛侧，x ≈ -12 |
| **尖沙咀钟楼** | 红砖色方塔 + 白色圆顶（用 `cyl` 低分段）+ 顶部小尖 | 九龙侧，靠码头 |
| **天星小轮** | 绿白双层小船，停在水道上 | 水道里，靠近码头 |

### 加分

| 元素 | 表达方式 |
|---|---|
| **太平山** | 港岛侧后方隆起一座绿色山脊（用 `cyl` 叠几层圆台），山顶放一个小碗状观景台（凌霄阁） |
| **中环摩天轮** | 一个细圆环 + 若干辐条，放在港岛岸边。很抓眼，成本低 |
| **九龙旧楼群** | 九龙侧铺一片 2~4 高的矮密楼，颜色偏暖灰旧，和港岛的高玻璃楼形成对比 |

### 配色参考

| 用途 | 颜色 |
|---|---|
| 玻璃幕墙楼身 | `0x8fa3b8` `0xa9bccd` `0x78909f` |
| 窗户材质（会被压力驱动变亮） | 底 `0x2a4a63`，`emissive: 0xffd9a0` |
| 维港水面 | `0x1d4f66` `0x256078` |
| 山体 | `0x3f6b3a` `0x4a7a42` |
| 钟楼红砖 | `0x9c4a3c` |
| 天星小轮 | 深绿 `0x1f5f4a` + 米白 `0xf2eee2` |

---

## 5. 返回契约（很重要，不做会被判不合格）

`build()` 必须返回一个对象：

```js
return {
  // 窗户材质数组。场景会随着「压力」调高它们的 emissiveIntensity，
  // 压力越大，城市的窗越亮。不返回的话，晚上会是一片黑。
  windowMaterials: [glass],

  // 镜头取景。target 是看向哪里，distance 是相机距离，elev 是俯角（弧度）
  camera: { target: [0, -1.5, 0], distance: 104, elev: 0.3 },

  // 气泡挂点：页面上有个「天文台」气泡会挂在这个坐标上
  // 请把它指到天文台塔顶（下面第 6 节会把天文台给你）
  anchors: { observatory: [obsX, obsY, obsZ] },

  // 可选：港口与船。气泡会指向船的当前位置
  port: {
    group: shipGroup,          // 你的船（THREE.Group）
    dockPos: [x, 0, z],        // 靠岸位置
    waitPos: [x, 0, z],        // 在外海等待的位置（离岸 6~8 个单位）
  },

  // 可选：天气变化回调，用来改天文台的信号灯颜色
  setSignal(weatherKey) {
    // weatherKey: 'clear' | 'cloudy' | 'overcast' | 'rain'
    //            | 'storm' | 't3' | 't8' | 'black'
  },
};
```

---

## 6. 直接改这份骨架

把下面的代码作为起点，**保留第 1 节的地形生成，在第 2 节里建模**。

```js
/* 香港浮空岛 —— 微缩维港 */
STORM_CITIES.register({
  id: 'hongkong',
  label: '香港',

  build(api) {
    const { THREE, box, cyl, cone, beam, voxel, mat, addAnim, rand } = api;
    const pick = (a) => a[Math.floor(rand() * a.length)];

    /* ================= 1. 地形（可微调，别删） ================= */
    const GRASS = [0x5f8f4a, 0x6c9c52, 0x79aa5a];
    const ROCK = [0x7d6a55, 0x96806a, 0xa89078];
    const SEA = [0x1d4f66, 0x256078, 0x2c6d88];

    // 维港中心线：一条轻微弯曲的水道
    const harbourZ = (x) => 1.2 * Math.sin(x * 0.09);
    const isSea = (x, z) => Math.abs(z - harbourZ(x)) < 3.2;

    // 岛屿轮廓：椭圆 + 两个正弦扰动
    const inside = (x, z) => {
      const a = Math.atan2(z / 17, x / 33);
      const r = Math.sqrt((x / 33) ** 2 + (z / 17) ** 2);
      return r < 1 + 0.055 * Math.sin(6 * a) + 0.03 * Math.cos(9 * a);
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
                ROCK[(k + Math.floor(x + z)) % 3]);
            }
          }
        }
        voxel(x, sea ? -0.06 : 0.18, z, 1.55, sea ? 0.3 : 0.38, 1.55,
          sea ? SEA[Math.abs(Math.floor(x / 3)) % 3] : GRASS[Math.floor((x + 33) / 4) % 3]);
      }
    }

    /* ================= 2. 你的部分：香港天际线 ================= */

    // 所有窗户共用一个材质，场景靠它表现「压力越大，城市越亮」
    const glass = new THREE.MeshStandardMaterial({
      color: 0x2a4a63, roughness: 0.2, metalness: 0.6,
      emissive: 0xffd9a0, emissiveIntensity: 0.06,
    });

    // ---- 在这里建：IFC、中银、中环广场、钟楼、天星小轮、太平山…… ----

    /* ================= 3. 天文台（气泡会挂在这里） ================= */
    // 一座带塔的小楼，塔顶有个信号球，颜色随天气变
    const obsX = -28, obsZ = -4;
    // box / cyl / cone 建塔……

    const signalMat = new THREE.MeshStandardMaterial({
      color: 0x333a44, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.5,
    });

    /* ================= 4. 码头与船 ================= */
    const ship = new THREE.Group();
    api.group.add(ship);
    // 船的零件注意：box() 会把东西挂到城市根节点，
    // 要挂进 ship 需要下面这种写法（局部坐标）
    function partTo(group, x, y, z, w, h, d, c) {
      const m = api.box(0, 0, 0, w, h, d, c);
      api.group.remove(m);
      m.position.set(x, y, z);
      group.add(m);
      return m;
    }

    /* ================= 5. 返回契约 ================= */
    return {
      windowMaterials: [glass],
      camera: { target: [0, -1.5, 0], distance: 104, elev: 0.3 },
      anchors: { observatory: [obsX, 12, obsZ] },
      port: { group: ship, dockPos: [25, 0, harbourZ(25)], waitPos: [33, 0, harbourZ(33)] },
      setSignal(key) {
        const colors = {
          overcast: 0x5c6672, rain: 0x2f80ed, storm: 0x8e6bd6,
          t3: 0xf2b231, t8: 0xe0533d, black: 0x14121a,
        };
        const c = colors[key];
        if (!c) { signalMat.emissiveIntensity = 0; return; }
        signalMat.color.setHex(c);
        signalMat.emissive.setHex(c);
        signalMat.emissiveIntensity = { overcast: .2, rain: .5, storm: 1, t3: 1.8, t8: 2.6, black: 3 }[key];
      },
    };
  },
});
```

---

## 7. 验收清单

做完自己过一遍，全部满足才算完成：

- [ ] 文件是一个完整的 `cities/hongkong.js`，没有 `import` / `export` / `fetch`
- [ ] `STORM_CITIES.register({ id: 'hongkong', label: '香港', build })` 结构正确
- [ ] 打开页面能看到**维港把岛分成两岸**，一侧高楼一侧矮楼
- [ ] IFC / 中银 / 中环广场 三座塔在轮廓上能区分开（高度、顶部形状不同）
- [ ] 有钟楼和天星小轮
- [ ] 没有任何建筑飘在岛外或超过 `y = 25`
- [ ] `voxel` 调用 ≤ 4500，`box/cyl/cone` 总数 ≤ 320
- [ ] 返回了 `windowMaterials`（否则窗户不亮）
- [ ] 返回了 `anchors.observatory`，坐标落在天文台塔顶
- [ ] 返回了 `port`，船在 `waitPos` 和 `dockPos` 之间移动看着合理
- [ ] 控制台没有报错
- [ ] 帧率在核显笔记本上 ≥ 30fps

---

## 8. 容易踩的坑

| 坑 | 说明 |
|---|---|
| `box` 的位置是**中心**不是角 | `box(0, 5, 0, 2, 10, 2)` 是一根从 y=0 到 y=10 的柱子 |
| 忘了 `partTo` | 直接 `box()` 会把零件挂到城市根节点，船的零件不会跟着船动 |
| 用 `box` 铺地形 | 几千个 box = 几千次 draw call，会卡死。地形一律用 `voxel` |
| 楼太高 | 超过 y=25 会被相机切掉，看起来像断了 |
| 忘了 `windowMaterials` | 晚上城市一片黑，效果差很多 |
| 自己写 `requestAnimationFrame` | 会和场景主循环打架，动画一律用 `addAnim(fn)` |
| 在 `inside()` 之外放建筑 | 会飘在岛外的空气中 |

---

## 9. 只输出代码

请直接输出完整的 `cities/hongkong.js` 内容，不要额外的解释文字。
