import * as THREE from 'three';

/* ============================================================
   RAIGE — Procedural textures

   Generated on a canvas at runtime. No image files, no network
   requests, no licensing, and every map is authored in brand colour.
   ============================================================ */

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/**
 * Dimple normal map.
 *
 * Modelling real dimples would cost tens of thousands of triangles for
 * something only a few pixels across. A generated normal map gives the
 * same read under moving light for one 512² texture.
 */
export function createDimpleNormalMap(): THREE.Texture {
  const size = 512;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  const data = image.data;

  // Flat surface = straight-up normal (128, 128, 255).
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128;
    data[i + 1] = 128;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  const cols = 30;
  const rows = 15;
  const cellW = size / cols;
  const cellH = size / rows;
  const radius = cellW * 0.44;
  const depth = 0.9;

  const stamp = (cx: number, cy: number) => {
    const r = Math.ceil(radius);
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const dist = Math.hypot(x, y);
        if (dist > radius) continue;

        // Wrap horizontally so the seam is invisible on the sphere.
        const px = ((Math.round(cx + x) % size) + size) % size;
        const py = Math.round(cy + y);
        if (py < 0 || py >= size) continue;

        // Spherical depression: h = D * (dx² + dy²) / r², so the normal
        // tilts back toward the centre of the dip.
        const nx = (-2 * depth * x) / (radius * radius);
        const ny = (-2 * depth * y) / (radius * radius);
        const len = Math.hypot(nx, ny, 1);
        // Soften the rim so dimples blend rather than cut.
        const edge = 1 - Math.pow(dist / radius, 6);

        const idx = (py * size + px) * 4;
        data[idx] = 128 + (nx / len) * 127 * edge;
        data[idx + 1] = 128 + (ny / len) * 127 * edge;
        data[idx + 2] = 128 + (1 / len) * 127;
      }
    }
  };

  for (let row = 0; row < rows; row++) {
    // Offset alternate rows for hexagonal packing, as on a real ball.
    const offset = row % 2 === 0 ? 0 : cellW * 0.5;
    for (let col = 0; col < cols; col++) {
      stamp(col * cellW + cellW * 0.5 + offset, row * cellH + cellH * 0.5);
    }
  }

  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return texture;
}

/**
 * The ball's colour map: a warm off-white with a small RAIGE stamp,
 * the way a real branded ball is printed.
 */
export function createBallColorMap(): THREE.Texture {
  const w = 1024;
  const h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(0, 0, w, h);

  // Barely-there warmth so the ball never reads as pure digital white.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(232, 222, 200, 0.5)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(1, 'rgba(226, 220, 205, 0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#183426';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Brand stamp.
  ctx.font = '600 44px Georgia, "Times New Roman", serif';
  ctx.letterSpacing = '14px';
  ctx.fillText('RAIGE', w * 0.26, h * 0.5);

  // A hairline rule beneath it, echoing the logo lockup.
  ctx.fillRect(w * 0.26 - 78, h * 0.5 + 38, 156, 2);

  // Opposite pole: the small "1" every ball carries.
  ctx.font = '600 40px Georgia, "Times New Roman", serif';
  ctx.letterSpacing = '0px';
  ctx.fillText('1', w * 0.76, h * 0.5);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Soft radial alpha used for the ball's contact shadow. Far cheaper and
 * far cleaner than a shadow map for a single small round object.
 */
export function createShadowTexture(): THREE.Texture {
  const size = 256;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  grad.addColorStop(0, 'rgba(12, 26, 16, 0.85)');
  grad.addColorStop(0.45, 'rgba(12, 26, 16, 0.4)');
  grad.addColorStop(1, 'rgba(12, 26, 16, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * A tiny equirectangular environment, generated from the same sky and
 * turf colours as the scene.
 *
 * Without one, any material with metalness reflects pure black — which
 * is exactly what a chrome shaft and a brass clubface did before this
 * existed. It also gives the golf ball its specular life.
 */
export function createEnvironmentMap(): THREE.Texture {
  const w = 256;
  const h = 128;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d')!;

  // Sky: zenith to horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  sky.addColorStop(0, '#9fb4ae');
  sky.addColorStop(0.7, '#d8dccf');
  sky.addColorStop(1, '#f0e2c4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.5);

  // Ground: turf falling away below the horizon.
  const ground = ctx.createLinearGradient(0, h * 0.5, 0, h);
  ground.addColorStop(0, '#6d7f55');
  ground.addColorStop(0.4, '#42603a');
  ground.addColorStop(1, '#22331f');
  ctx.fillStyle = ground;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  // The low sun, which is what actually reads as a highlight on the ball.
  const sunX = w * 0.62;
  const sunY = h * 0.46;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.34);
  sun.addColorStop(0, 'rgba(255, 246, 222, 1)');
  sun.addColorStop(0.25, 'rgba(255, 232, 186, 0.55)');
  sun.addColorStop(1, 'rgba(255, 228, 176, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Foliage for the tree line.
 *
 * A canopy built from a solid mesh reads as a blob on a stick. Real
 * foliage has a ragged, broken edge and lets light through, so this
 * paints a few thousand small leaf clusters into a roughly round mass
 * with a torn silhouette. Mapped onto crossed quads it reads as a tree
 * at the distances this scene uses it, for one texture and no geometry.
 */
export function createFoliageTexture(): THREE.Texture {
  const size = 512;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Deterministic, so the tree line never reshuffles between reloads.
  let seed = 8712361;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const cx = size / 2;
  const cy = size * 0.54;

  const leaves = 2600;
  for (let i = 0; i < leaves; i++) {
    // Cluster toward the middle, with enough outliers to tear the edge.
    const angle = rand() * Math.PI * 2;
    const radial = Math.pow(rand(), 0.62);
    const rx = radial * size * 0.46;
    const ry = radial * size * 0.4;
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry * 1.05;

    // Foliage is darker and denser low and inside, lighter at the crown.
    const lift = 1 - y / size;
    const shade = 0.42 + lift * 0.4 + rand() * 0.2 - radial * 0.15;
    const r = Math.round(26 + shade * 46);
    const g = Math.round(44 + shade * 74);
    const b = Math.round(22 + shade * 34);
    const alpha = 0.55 + rand() * 0.45;

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    const leaf = size * (0.013 + rand() * 0.028) * (1 - radial * 0.35);
    ctx.beginPath();
    ctx.ellipse(x, y, leaf, leaf * (0.6 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Warm radial falloff used for the sun's glare.
 *
 * Shooting into a low sun is the whole lighting idea of this scene, and a
 * real lens blooms when you do it. One soft additive sprite gives that
 * without a post-processing pass.
 */
export function createGlareTexture(): THREE.Texture {
  const size = 256;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  grad.addColorStop(0, 'rgba(255, 246, 219, 0.95)');
  grad.addColorStop(0.12, 'rgba(255, 235, 190, 0.55)');
  grad.addColorStop(0.4, 'rgba(255, 226, 172, 0.16)');
  grad.addColorStop(1, 'rgba(255, 220, 160, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
