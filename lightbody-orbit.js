(function () {
  'use strict';

  // Coordinates share the illustration's scale: 250 image pixels per scene unit.
  const parts = [];
  // Match the original illustration's shoulder width and crown-to-sole framing.
  const registration = {width: 1.08, height: 1.057, offsetY: -.202};
  function form(x, y, z, width, height, depth, angle = 0) {
    parts.push({x, y, z, width, height, depth, sin: Math.sin(angle), cos: Math.cos(angle),
      scale: Math.min(width, height, depth),
      boundsX: width + height * Math.abs(Math.sin(angle)) + .16,
      boundsY: height + width * Math.abs(Math.sin(angle)) + .16});
  }

  form(0, 2.29, -.025, .255, .344, .247); // Cranium
  form(0, 2.12, .069, .215, .24, .206);
  form(0, 1.99, .07, .157, .128, .15);
  form(0, 2.18, .264, .065, .093, .064); // Nose
  form(0, 1.79, -.02, .151, .246, .153);
  form(0, 1.29, -.027, .491, .495, .246); // Rib cage
  form(0, .87, -.005, .373, .49, .208);
  form(0, .33, -.025, .464, .45, .237); // Pelvis
  for (const side of [-1, 1]) {
    const limb = (x, y, z, w, h, d, angle = 0) => form(side * x, y, z, w, h, d, side * angle);
    limb(.234, 2.24, -.022, .046, .103, .058);
    limb(.355, 1.47, -.085, .298, .165, .169, .39);
    limb(.251, 1.387, .131, .262, .193, .146, .14); // Pectorals
    limb(.49, 1.423, -.029, .196, .247, .193, .24);
    limb(.585, 1.12, -.023, .139, .359, .149, .26);
    limb(.72, .767, -.02, .121, .199, .124, .39);
    limb(.848, .48, .003, .116, .292, .11, .45);
    limb(.983, .184, .01, .075, .177, .068, .43);
    limb(1.09, .006, .026, .12, .158, .071, .53);
    for (let finger = 0; finger < 4; finger++) {
      limb(1.025 + .056 * finger, -.182 + .034 * finger, .037,
        .026, .096 - .009 * Math.abs(finger - 1), .029, .21 + .14 * finger);
    }
    limb(1.19, -.054, .04, .025, .103, .031, .85);
    limb(.246, .193, -.14, .248, .263, .187, -.12); // Glutes
    limb(.261, -.253, .007, .224, .572, .216, -.13);
    limb(.319, -.665, .021, .148, .288, .152, -.08);
    limb(.316, -.929, .022, .129, .211, .137);
    limb(.302, -1.306, -.037, .146, .412, .164, -.075);
    limb(.253, -1.755, .005, .087, .359, .095, -.105);
    limb(.237, -2.076, .115, .105, .203, .15, -.045);
    limb(.249, -2.225, .225, .131, .111, .23, .10);
  }

  function field(x, y, z) {
    let distance = 1;
    for (const p of parts) {
      const dx = x - p.x, dy = y - p.y, dz = z - p.z;
      if (Math.abs(dx) > p.boundsX
          || Math.abs(dy) > p.boundsY
          || Math.abs(dz) > p.depth + .16) continue;
      const u = (p.cos * dx + p.sin * dy) / p.width;
      const v = (-p.sin * dx + p.cos * dy) / p.height;
      const w = dz / p.depth;
      const d = (Math.sqrt(u * u + v * v + w * w) - 1) * p.scale;
      const blend = Math.max(.048 - Math.abs(distance - d), 0) / .048;
      distance = Math.min(distance, d) - blend * blend * .012;
    }
    return distance;
  }

  function normal([x, y, z]) {
    const e = .005;
    const dx = field(x + e, y, z) - field(x - e, y, z);
    const dy = field(x, y + e, z) - field(x, y - e, z);
    const dz = field(x, y, z + e) - field(x, y, z - e);
    const magnitude = Math.hypot(dx, dy, dz) || 1;
    return [dx / magnitude, dy / magnitude, dz / magnitude];
  }

  function mesh() {
    const step = .045;
    const sizes = [64, 114, 25];
    const origin = [-1.42, -2.46, -.54];
    const index = (x, y, z) => (z * sizes[1] + y) * sizes[0] + x;
    const samples = new Float32Array(sizes.reduce((a, b) => a * b));
    for (let z = 0; z < sizes[2]; z++) {
      for (let y = 0; y < sizes[1]; y++) {
        for (let x = 0; x < sizes[0]; x++) {
          samples[index(x, y, z)] = field(origin[0] + x * step, origin[1] + y * step, origin[2] + z * step);
        }
      }
    }

    const corners = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
    const tetrahedra = [[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
    const data = [];
    for (let z = 0; z < sizes[2] - 1; z++) {
      for (let y = 0; y < sizes[1] - 1; y++) {
        for (let x = 0; x < sizes[0] - 1; x++) {
          const values = corners.map(([dx, dy, dz]) => samples[index(x + dx, y + dy, z + dz)]);
          if (values.every(value => value >= 0) || values.every(value => value < 0)) continue;
          const cell = [x, y, z].map((axis, i) => origin[i] + axis * step);
          const vertices = new Map();
          function edge(a, b) {
            const key = 8 * Math.min(a, b) + Math.max(a, b);
            if (!vertices.has(key)) {
              const t = values[a] / (values[a] - values[b]);
              const point = cell.map((coord, i) => coord + step * (corners[a][i] * (1 - t) + corners[b][i] * t));
              vertices.set(key, [...point, ...normal(point)]);
            }
            return vertices.get(key);
          }
          for (const tetrahedron of tetrahedra) {
            const inside = tetrahedron.filter(i => values[i] < 0);
            const outside = tetrahedron.filter(i => values[i] >= 0);
            if (!inside.length || !outside.length) continue;
            if (inside.length === 2) {
              const [a, b] = inside;
              const [c, d] = outside;
              data.push(...edge(a,c), ...edge(a,d), ...edge(b,c), ...edge(b,c), ...edge(a,d), ...edge(b,d));
            } else {
              const [single, others] = inside.length === 1 ? [inside[0], outside] : [outside[0], inside];
              for (const other of others) data.push(...edge(single, other));
            }
          }
        }
      }
    }
    return new Float32Array(data);
  }

  function surface(x, y, side) {
    for (let depth = .52; depth >= -.51; depth -= .011) {
      if (field(x, y, side * depth) < 0) return side * (depth + .024);
    }
    return null;
  }

  function energyGeometry(nodes) {
    const lines = [];
    const points = [];
    const colors = [[1,.46,.12],[.18,.52,1],[1,.78,.31],[1,.21,.27]];
    function segment(a, b, color) { lines.push(...a, ...color, ...b, ...color); }

    // Follow longitudinal paths across the front and back of each limb.
    const guides = [
      [[0,2.57],[0,1.95],[0,1.45],[0,.62],[0,.02]],
      [[0,1.58],[.42,1.47],[.57,1.17],[.68,.86],[.78,.62],[.90,.36],[1.03,.10],[1.15,-.12]],
      [[.22,.36],[.25,-.12],[.29,-.55],[.32,-.94],[.29,-1.42],[.24,-1.91],[.26,-2.22]],
      [[.02,2.48],[.14,2.39],[.16,2.27],[.12,2.09],[.06,1.97]],
      [[.04,1.49],[.34,1.38],[.38,1.19],[.29,.94],[.26,.54],[.35,.25],[.21,-.06]]
    ];
    for (const side of [-1, 1]) {
      for (const facing of [-1, 1]) {
        guides.forEach((guide, group) => {
          for (let strand = 0; strand < 8; strand++) {
            let previous = null;
            for (let leg = 0; leg < guide.length - 1; leg++) {
              const [ax, ay] = guide[leg], [bx, by] = guide[leg + 1];
              for (let step = 0; step <= 22; step++) {
                const t = step / 22;
                const phase = (leg + t) * 3.3 + strand * 1.53;
                const offset = (strand - 3.5) * .021 + Math.sin(phase) * .023 + Math.sin(phase * 2.1) * .008;
                const x = side * (ax + (bx - ax) * t + offset);
                const y = ay + (by - ay) * t + .018 * Math.sin(phase);
                const z = surface(x, y, facing);
                const point = z === null ? null : [x, y, z];
                if (point && previous && Math.abs(point[2] - previous[2]) < .10) {
                  segment(previous, point, colors[(strand + group) % colors.length]);
                }
                previous = point;
              }
            }
          }
        });
      }
    }

    for (let ring = 0; ring < 7; ring++) {
      for (let i = 0; i < 120; i++) {
        const orbit = angle => {
          const radius = 1.7 + ring * .06;
          const x = radius * Math.cos(angle);
          const y = (2.55 - ring * .07) * Math.sin(angle);
          const slope = .48 * Math.sin(ring * 1.93);
          return [x * Math.cos(slope), y, x * Math.sin(slope) + .60 * Math.cos(ring * 1.4)];
        };
        segment(orbit(i / 120 * 2 * Math.PI), orbit((i + 1) / 120 * 2 * Math.PI), [.36,.15,.057]);
      }
    }

    for (const {x, y, color, radius} of nodes) {
      const worldX = (x - 512) / 250, worldY = (768 - y) / 250;
      const modelX = worldX / registration.width;
      const modelY = (worldY - registration.offsetY) / registration.height;
      const z = surface(modelX, modelY, 1) ?? (.25 + .27 * Math.cos(x * .04 + y * .012));
      const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255);
      points.push(modelX, modelY, z + .035, ...rgb, radius === 58 ? 1 : .52);
    }
    return {lines: new Float32Array(lines), points: new Float32Array(points)};
  }

  const vertexShader = `
    attribute vec3 position;
    attribute vec3 detail;
    attribute float size;
    uniform vec2 angle;
    uniform vec2 viewport;
    uniform vec3 registration;
    uniform float pixelRatio;
    varying mediump vec3 colorOrNormal;
    varying mediump vec3 modelPosition;
    varying mediump vec3 viewNormal;

    vec3 rotate(vec3 p) {
      float cy = cos(angle.x), sy = sin(angle.x);
      float cx = cos(angle.y), sx = sin(angle.y);
      p = vec3(cy*p.x + sy*p.z, p.y, -sy*p.x + cy*p.z);
      return vec3(p.x, cx*p.y - sx*p.z, sx*p.y + cx*p.z);
    }

    void main() {
      vec3 registered = vec3(position.xy * registration.xy, position.z);
      registered.y += registration.z;
      vec3 p = rotate(registered);
      gl_Position = vec4(p.xy * viewport, -p.z * .23, 1.0);
      gl_PointSize = max(1.0, (8.0 + 32.0 * size) * pixelRatio);
      colorOrNormal = detail;
      modelPosition = registered;
      viewNormal = rotate(vec3(detail.xy / registration.xy, detail.z));
    }`;

  const fragmentShader = `
    precision mediump float;
    uniform sampler2D artwork;
    uniform sampler2D angleAtlas;
    uniform float atlasReady;
    uniform float artworkReady;
    uniform int material;
    uniform float radiance;
    varying mediump vec3 colorOrNormal;
    varying mediump vec3 modelPosition;
    varying mediump vec3 viewNormal;

    void main() {
      if (material == 0) {
        vec3 n = normalize(viewNormal);
        float key = max(0.0, dot(n, normalize(vec3(-.45,.72,.65))));
        float fill = max(0.0, dot(n, normalize(vec3(.64,-.12,.45))));
        float rim = pow(1.0 - max(0.0,n.z), 3.0);
        float gloss = pow(max(0.0, dot(n, normalize(vec3(-.22,.37,1.0)))), 22.0);
        float filaments = sin(modelPosition.y * 102.0 + sin(modelPosition.x * 51.0) * 2.2) * .013;
        vec3 c = vec3(.071,.026,.106) + key * vec3(.30,.16,.24)
          + fill * vec3(.07,.105,.24) + rim * vec3(.38,.16,.36)
          + gloss * vec3(.31,.19,.31) + filaments;
        vec2 uv = vec2(.5 + modelPosition.x * (250.0 / 1024.0),
          .5 - modelPosition.y * (250.0 / 1536.0));
        vec3 original = texture2D(artwork, uv).rgb;
        vec2 backPixel = vec2(769.0 - modelPosition.x * 80.0, 230.0 - modelPosition.y * 77.0);
        float backSurface = atlasReady * smoothstep(.10, .50, -colorOrNormal.z);
        original = mix(original, texture2D(angleAtlas, backPixel / vec2(1536.0, 1024.0)).rgb, backSurface);
        float frontSurface = smoothstep(-.06, .22, colorOrNormal.z);
        float likeness = max(artworkReady * frontSurface, backSurface) * smoothstep(.06, .28, max(original.r, max(original.g, original.b)));
        vec3 textured = original * (.67 + .25 * key + .08 * fill) + rim * vec3(.13,.05,.14);
        gl_FragColor = vec4(mix(c, textured, likeness), 1.0);
      } else if (material == 1) {
        gl_FragColor = vec4(colorOrNormal * (.44 + .56 * radiance), .83);
      } else {
        float r = 2.0 * length(gl_PointCoord - .5);
        float a = max(0.0, 1.0-r);
        float core = exp(-r*r*80.0);
        gl_FragColor = vec4(mix(colorOrNormal, vec3(1.0), core), radiance * (a*a*.72 + core*.65));
      }
    }`;

  function renderer(canvas, nodes, state, requestDraw) {
    const gl = canvas.getContext('webgl', {antialias: true, alpha: false});
    if (!gl) throw new Error('WebGL is unavailable');
    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const artworkReady = gl.getUniformLocation(program, 'artworkReady');
    let hasTexture = false;
    const source = new Image();
    source.onload = () => {
      if (gl.isContextLost()) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      hasTexture = true;
      requestDraw();
    };
    source.src = document.querySelector('#art image').getAttribute('href');

    const atlasReady = gl.getUniformLocation(program, 'atlasReady');
    gl.uniform1i(gl.getUniformLocation(program, 'angleAtlas'), 1);
    const atlas = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.activeTexture(gl.TEXTURE0);
    let hasAtlas = false;
    const atlasImage = new Image();
    atlasImage.onload = () => {
      if (gl.isContextLost()) return;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasImage);
      gl.activeTexture(gl.TEXTURE0);
      hasAtlas = true;
      requestDraw();
    };
    atlasImage.src = document.querySelector('#angleArt image').getAttribute('href');

    const position = gl.getAttribLocation(program, 'position');
    const detail = gl.getAttribLocation(program, 'detail');
    const size = gl.getAttribLocation(program, 'size');
    const uniform = name => gl.getUniformLocation(program, name);
    const angle = uniform('angle'), viewport = uniform('viewport');
    gl.uniform3f(uniform('registration'), registration.width, registration.height, registration.offsetY);
    const pixelRatio = uniform('pixelRatio'), material = uniform('material'), radiance = uniform('radiance');

    function upload(values) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
      return buffer;
    }
    const body = mesh();
    const energy = energyGeometry(nodes);
    const bodyBuffer = upload(body);
    const lineBuffer = upload(energy.lines);
    const pointBuffer = upload(energy.points);
    const rearPoints = energy.points.slice();
    for (let i = 0; i < rearPoints.length; i += 7) {
      const z = surface(rearPoints[i], rearPoints[i + 1], -1);
      if (z === null) rearPoints[i] = 100;
      else rearPoints[i + 2] = z - .035;
      rearPoints[i + 6] = z === null ? 0 : rearPoints[i + 6] * .8;
    }
    const rearBuffer = upload(rearPoints);
    gl.enableVertexAttribArray(position);
    gl.enableVertexAttribArray(detail);
    gl.enable(gl.DEPTH_TEST);

    function drawBuffer(buffer, stride, count, mode, style) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(position, 3, gl.FLOAT, false, stride * 4, 0);
      gl.vertexAttribPointer(detail, 3, gl.FLOAT, false, stride * 4, 12);
      if (stride === 7) {
        gl.enableVertexAttribArray(size);
        gl.vertexAttribPointer(size, 1, gl.FLOAT, false, 28, 24);
      } else {
        gl.disableVertexAttribArray(size);
        gl.vertexAttrib1f(size, 0);
      }
      gl.uniform1i(material, style);
      gl.drawArrays(mode, 0, count);
    }

    return function draw() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || gl.isContextLost()) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(.032, .017, .061, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const frame = Math.min(width / (1024 / 250), height / (1536 / 250));
      gl.uniform2f(viewport, 2 * frame / width, 2 * frame / height);
      gl.uniform2f(angle, state.yaw, state.pitch);
      gl.uniform1f(pixelRatio, dpr);
      gl.uniform1f(radiance, state.radiance);
      gl.uniform1f(artworkReady, Number(hasTexture));
      gl.uniform1f(atlasReady, Number(hasAtlas));
      drawBuffer(bodyBuffer, 6, body.length / 6, gl.TRIANGLES, 0);
      gl.enable(gl.BLEND);
      gl.depthMask(false);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      drawBuffer(lineBuffer, 6, energy.lines.length / 6, gl.LINES, 1);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      drawBuffer(pointBuffer, 7, state.active, gl.POINTS, 2);
      drawBuffer(rearBuffer, 7, state.active, gl.POINTS, 2);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    };
  }

  window.createLightBodyOrbit = function (viewer, nodes) {
    const canvas = document.getElementById('orbit');
    const viewMode = document.getElementById('viewMode');
    const angleArt = document.getElementById('angleArt');
    const angleButtons = [...document.querySelectorAll('[data-angle]')];
    const presets = [
      [0, 0, ''],
      [Math.PI, 0, '606 3 326 473'],
      [0, 1.24, '1028 3 505 473'],
      [0, -1.24, '3 481 507 539'],
      [-.48, .64, '515 481 508 539'],
      [0, -.76, '1028 481 505 539']
    ];
    let selected = 0;
    const help = document.getElementById('viewHelp');
    const state = {yaw: 0, pitch: 0, active: 0, radiance: .8};
    let draw;
    let dragging;
    let frame = 0;

    function requestDraw() {
      viewer.style.setProperty('--sheet-image', !canvas.hidden && selected > 0 ? '1' : '0');
      const facing = Math.cos(state.yaw) * Math.cos(state.pitch);
      const front = Math.max(0, Math.min(1, (facing - .965) / .035));
      const upright = Math.cos(state.pitch) > 0 && Math.cos(state.yaw) > 0;
      viewer.style.setProperty('--front-image', upright && selected <= 0 ? String(front) : '0');
      if (canvas.hidden || !draw || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        draw();
      });
    }

    function setView(enabled) {
      if (enabled && !draw) {
        try {
          draw = renderer(canvas, nodes, state, requestDraw);
        } catch (error) {
          console.warn('LightBody 3D could not initialize:', error);
          help.textContent = '3D requires WebGL. The original illustration is still available.';
          viewMode.disabled = true;
          return;
        }
      }
      canvas.hidden = !enabled;
      viewer.classList.toggle('orbit-mode', enabled);
      viewer.tabIndex = enabled ? 0 : -1;
      angleButtons.forEach(button => { button.disabled = !enabled; });
      viewMode.setAttribute('aria-pressed', String(enabled));
      requestDraw();
    }

    function rotate(horizontal, vertical) {
      selected = -1;
      angleButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
      const turn = 2 * Math.PI;
      state.yaw = (state.yaw + horizontal) % turn;
      state.pitch = (state.pitch + vertical) % turn;
      requestDraw();
    }

    angleButtons.forEach((button, index) => button.addEventListener('click', () => {
      selected = index;
      const [yaw, pitch, crop] = presets[index];
      Object.assign(state, {yaw, pitch});
      if (crop) {
        angleArt.setAttribute('viewBox', crop);
        const bounds = angleArt.querySelector('rect');
        crop.split(' ').forEach((value, i) => bounds.setAttribute(['x', 'y', 'width', 'height'][i], value));
      }
      angleButtons.forEach((item, i) => item.setAttribute('aria-pressed', String(i === index)));
      requestDraw();
    }));
    viewMode.addEventListener('click', () => setView(canvas.hidden));
    viewer.addEventListener('pointerdown', event => {
      if (canvas.hidden || dragging || event.button !== 0) return;
      dragging = {id: event.pointerId, x: event.clientX, y: event.clientY};
      viewer.setPointerCapture(dragging.id);
      viewer.classList.add('is-dragging');
    });
    viewer.addEventListener('pointermove', event => {
      if (dragging?.id !== event.pointerId) return;
      rotate((event.clientX - dragging.x) * .012, (event.clientY - dragging.y) * .012);
      dragging.x = event.clientX;
      dragging.y = event.clientY;
    });
    viewer.addEventListener('lostpointercapture', event => {
      if (dragging?.id !== event.pointerId) return;
      dragging = undefined;
      viewer.classList.remove('is-dragging');
    });
    viewer.addEventListener('keydown', event => {
      if (canvas.hidden) return;
      const direction = {
        ArrowLeft: [-.16, 0], ArrowRight: [.16, 0], ArrowUp: [0, -.16], ArrowDown: [0, .16]
      }[event.key];
      if (!direction) return;
      event.preventDefault();
      rotate(...direction);
    });

    new ResizeObserver(requestDraw).observe(viewer);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      draw = undefined;
      setView(false);
      help.textContent = '3D paused after a graphics interruption. Select 3D Orbit to try again.';
    });
    setView(true);

    return function update(active, radiance) {
      state.active = active;
      state.radiance = radiance;
      requestDraw();
    };
  };
})();
