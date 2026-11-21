(() => {
  'use strict';

  const stage = document.querySelector('.stage');
  const display = document.getElementById('musicScene');
  const context = display.getContext('2d');
  const start = document.getElementById('musicStart');
  const stop = document.getElementById('musicStop');
  const input = document.getElementById('musicFile');
  const bpm = document.getElementById('musicBpm');
  const status = document.getElementById('musicStatus');
  const art = new Image();
  art.src = document.querySelector('#art image').getAttribute('href');

  const sheet = new Image();
  sheet.src = document.querySelector('#angleArt image').getAttribute('href');
  const angleButtons = [...document.querySelectorAll('[data-angle]')];
  const angleNames = ['Front', 'Back', 'Top', 'Bottom', 'Overhead', 'Underneath'];

  const centers = [
    ['Root', 825, '#ff4353'], ['Sacral', 725, '#ff963e'],
    ['Solar Plexus', 612, '#ffdb46'], ['Heart', 470, '#68ff70'],
    ['Throat', 335, '#42e4ff'], ['Brow', 207, '#8473ff'],
    ['Crown', 140, '#f87bff']
  ];
  // Trace the artwork in its original 1024 × 1536 coordinate space.
  const guides = [
    [[524,433],[546,402],[586,370],[640,375],[666,452],[689,546],[727,633],[766,744]],
    [[535,448],[563,520],[557,625],[553,733],[584,835],[581,946],[568,1030],[564,1150],[545,1325],[571,1418]],
    [[525,432],[535,356],[537,299],[551,246],[554,193],[536,151]],
    [[766,744],[797,780],[822,802],[851,823]],
    [[766,744],[781,798],[778,847],[786,872]],
    [[766,744],[803,809],[810,862],[812,894]],
    [[766,744],[816,813],[830,848],[832,881]],
    [[590,381],[603,426],[599,501],[571,557],[541,580]],
    [[545,1325],[535,1375],[539,1431]]
  ];
  const fiberLayers = [
    ['Arteries', '#ff3b52', 0], ['Veins', '#327aff', 9], ['Nerves', '#ffca5e', 18]
  ].map(([name, color, spread], layer) => ({
    name, color,
    paths: guides.flatMap((guide, branch) => [-1, 1].flatMap(side =>
      Array.from({length: layer === 2 ? 3 : 2}, (_, strand) => guide.map(([x, y], i) => {
        const drift = (spread + strand * 6) * Math.sin(i * 1.4 + branch * .35 + layer);
        return [512 + side * (x - 512 + drift), y + (strand * 5 + layer * 3) * Math.sin(i)];
      }))))
  }));
  const bubbles = [
    [512,41],[512,85],[404,114],[618,114],[327,229],[696,229],
    [214,231],[810,231],[96,408],[925,408],[159,508],[865,508],
    [100,696],[924,696],[116,797],[906,797],[286,918],[736,918],
    [270,1028],[753,1028],[326,1128],[696,1128],[383,1247],[641,1247],
    [289,1286],[734,1286],[228,1357],[796,1357],[355,1473],[668,1473]
  ];
  // Each row registers the front artwork's height to a point and width scale on the sheet.
  // For the foreshortened views the scale varies from head to hands to feet.
  const views = [
    {crop: [0, 0, 1024, 1536], heart: [548, 436, 51, 61]},
    {crop: [606, 3, 326, 473], heart: null, rows: [
      [140,769,47,.32],[207,769,67,.32],[335,769,111,.33],[470,769,153,.32],
      [612,769,196,.33],[725,769,228,.32],[825,769,259,.32],[1028,769,324,.32],
      [1326,769,421,.32],[1437,769,452,.32]
    ]},
    {crop: [1028, 3, 505, 473], heart: [1311, 274, 22, 19], rows: [
      [140,1279,166,.78],[207,1279,233,.64],[335,1279,252,.63],[470,1279,286,.61],
      [612,1279,308,.53],[725,1279,324,.55],[825,1279,338,.53],[1028,1279,365,.37],
      [1326,1279,383,.38],[1437,1279,399,.43]
    ]},
    {crop: [3, 481, 507, 539], heart: [277, 592, 21, 13], rows: [
      [140,257,543,.34],[207,257,567,.35],[335,257,579,.39],[470,257,587,.45],
      [612,257,611,.55],[725,257,633,.62],[825,257,660,.65],[1028,257,687,.70],
      [1326,257,823,1.03],[1437,257,964,1.10]
    ]},
    {crop: [515, 481, 508, 539], heart: [775, 685, 25, 22], rows: [
      [140,758,537,.53],[207,743,575,.46],[335,757,627,.51],[470,741,688,.45],
      [612,742,727,.47],[725,741,754,.43],[825,742,783,.43],[1028,760,839,.41],
      [1326,739,917,.41],[1437,725,950,.37]
    ]},
    {crop: [1028, 481, 505, 539], heart: [1302, 581, 21, 17], rows: [
      [140,1280,513,.34],[207,1280,537,.36],[335,1280,561,.41],[470,1280,576,.48],
      [612,1280,610,.55],[725,1280,637,.60],[825,1280,668,.63],[1028,1280,712,.67],
      [1326,1280,867,.98],[1437,1280,959,1]
    ]}
  ];
  const waves = [...fiberLayers.map(layer => layer.name), 'Light bubbles', 'Golden field', 'Lotus and full LightBody'];
  const total = centers.length + waves.length;

  const mask = document.createElement('canvas');
  mask.width = 1024;
  mask.height = 1536;
  const brush = mask.getContext('2d');
  let session;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Feather the crop into the chest while keeping the green chakra stationary.
  const heart = document.createElement('canvas');
  heart.width = 116;
  heart.height = 130;
  const heartBrush = heart.getContext('2d');
  let heartReady = false;
  let currentView;

  function project(view, x, y) {
    if (!view.rows) return [x, y];
    const rows = view.rows;
    let i = rows.findIndex(row => row[0] > y);
    if (i < 0) i = rows.length - 1;
    i = Math.max(1, i);
    const [fromY, fromX, fromTarget, fromScale] = rows[i - 1];
    const [toY, toX, toTarget, toScale] = rows[i];
    const t = (y - fromY) / (toY - fromY);
    return [fromX + (toX - fromX) * t + (x - 512) * (fromScale + (toScale - fromScale) * t),
      fromTarget + (toTarget - fromTarget) * t];
  }

  function prepareView(index) {
    const view = views[index];
    const [x, y, width, height] = view.crop;
    const ratio = index ? 2 : 1;
    if (!view.source) {
      view.source = index ? sheet : art;
      view.centers = centers.map(([, y]) => project(view, 512, y));
      view.fibers = fiberLayers.map(layer => ({...layer,
        paths: layer.paths.map(path => path.map(point => project(view, ...point)))
      }));
      view.bubbles = index ? bubbles.slice(2).map(([px, py]) => [
        x + width * (.06 + .88 * px / 1024), y + height * (.06 + .88 * py / 1536)
      ]) : bubbles;
      view.scale = Math.min(width / 1024, height / 1536);
      view.highLights = index ? [[view.centers[6][0], Math.max(y + 5, view.centers[6][1] - 14)],
        [view.centers[6][0], Math.max(y + 4, view.centers[6][1] - 27)]] : [[512,85],[512,41]];
    }
    currentView = view;
    display.width = mask.width = width * ratio;
    display.height = mask.height = height * ratio;
    for (const ctx of [context, brush]) ctx.setTransform(ratio, 0, 0, ratio, -x * ratio, -y * ratio);
    display.setAttribute('aria-label', angleNames[index] + ' view of the music-driven LightBody illumination');
    heartReady = false;
    if (view.source.complete && view.source.naturalWidth) prepareHeart(view);
  }

  function prepareHeart(view) {
    heartReady = Boolean(view.heart);
    if (!heartReady) return;
    const [x, y, rx, ry] = view.heart;
    heart.width = Math.ceil(rx * 2);
    heart.height = Math.ceil(ry * 2);
    heartBrush.drawImage(view.source, x - rx, y - ry, rx * 2, ry * 2, 0, 0, heart.width, heart.height);
    const edge = heartBrush.createRadialGradient(0, 0, .53, 0, 0, 1);
    edge.addColorStop(0, '#fff');
    edge.addColorStop(1, 'transparent');
    heartBrush.save();
    heartBrush.globalCompositeOperation = 'destination-in';
    heartBrush.translate(rx, ry);
    heartBrush.scale(rx, ry);
    heartBrush.fillStyle = edge;
    heartBrush.fillRect(-1, -1, 2, 2);
    heartBrush.restore();
    const gx = view.centers[3][0] - x + rx, gy = view.centers[3][1] - y + ry;
    const radius = 32 * view.scale;
    const chakra = heartBrush.createRadialGradient(gx, gy, radius * .53, gx, gy, radius);
    chakra.addColorStop(0, '#fff');
    chakra.addColorStop(1, 'transparent');
    heartBrush.globalCompositeOperation = 'destination-out';
    heartBrush.fillStyle = chakra;
    heartBrush.fillRect(gx - radius, gy - radius, radius * 2, radius * 2);
    heartBrush.globalCompositeOperation = 'source-over';
  }

  function pumpHeart(s, elapsed, view) {
    if (s.step < 3 || reducedMotion.matches) return;
    const phase = (Math.max(0, elapsed - s.lastBeat) / s.interval) % 1;
    const primary = Math.exp(-((phase - .13) ** 2) / .006);
    const recoil = Math.exp(-((phase - .33) ** 2) / .007);
    const contraction = (primary - .36 * recoil) * (.62 + .38 * s.strength);
    if (!heartReady) {
      const [x, y] = view.centers[3];
      spark(y, '#68ff70', (11 + 6 * primary) * view.scale, primary * .62, x);
      return;
    }
    const [x, y, rx, ry] = view.heart;
    context.save();
    context.translate(x, y);
    context.rotate(contraction * .055);
    context.scale(1 - contraction * .14, 1 - contraction * .19);
    context.globalAlpha = Math.max(0, Math.min(1, (elapsed - s.heartBeat) / .18));
    context.drawImage(heart, -rx, -ry);
    context.restore();
  }

  function reveal(x, y, radius, strength = 1) {
    const gradient = brush.createRadialGradient(x, y, radius * .19, x, y, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,' + strength + ')');
    gradient.addColorStop(.55, 'rgba(255,255,255,' + strength * .72 + ')');
    gradient.addColorStop(1, 'transparent');
    brush.fillStyle = gradient;
    brush.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function spark(y, color, radius, intensity, x = 512) {
    const glow = context.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, '#fffdf3');
    glow.addColorStop(.16, color);
    glow.addColorStop(1, color + '00');
    context.globalAlpha = intensity;
    context.fillStyle = glow;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    context.globalAlpha = 1;
  }

  function trace(ctx, points, progress) {
    const extent = (points.length - 1) * Math.max(0, Math.min(1, progress));
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (let i = 0; i < extent; i++) {
      const a = points[Math.max(0, i - 1)], b = points[i];
      const c = points[i + 1], d = points[Math.min(i + 2, points.length - 1)];
      const t = Math.min(1, extent - i);
      const sample = (u, axis) => .5 * ((2 * b[axis])
        + (-a[axis] + c[axis]) * u
        + (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * u * u
        + (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * u * u * u);
      for (let j = 1; j <= 7; j++) {
        const u = t * j / 7;
        ctx.lineTo(sample(u, 0), sample(u, 1));
      }
    }
    ctx.stroke();
  }

  function drawFibers(ctx, view, wave, progress, maskPass, pulse) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = maskPass ? 'source-over' : 'screen';
    view.fibers.forEach(({color, paths}, layer) => {
      if (layer > wave) return;
      const live = layer === wave;
      for (const [index, path] of paths.entries()) {
        const growth = live ? (progress - (index % 7) * .026) * 1.32 : 1;
        if (growth <= 0) continue;
        ctx.strokeStyle = maskPass ? '#fff9' : color;
        ctx.lineWidth = (maskPass ? 16 : live ? 2.4 : 1.2) * view.scale;
        ctx.globalAlpha = maskPass ? .8 : live ? .70 + .30 * pulse : .44;
        if (!maskPass) {
          ctx.shadowBlur = live ? 10 : 3;
          ctx.shadowColor = color;
        }
        trace(ctx, path, growth);
      }
    });
    ctx.restore();
  }

  function paint(s, elapsed) {
    const view = currentView;
    const [left, top, width, height] = view.crop;
    const scale = view.scale;
    context.clearRect(left, top, width, height);
    if (s.step < 0) return;
    if (s.finished) {
      context.drawImage(view.source, left, top, width, height, left, top, width, height);
      pumpHeart(s, elapsed, view);
      return;
    }
    const since = Math.max(0, elapsed - s.lastBeat);
    const pulse = Math.exp(-since * 7);
    const visible = Math.min(s.step + 1, centers.length);
    const moving = visible < centers.length;
    const travel = Math.min(.98, since / s.interval);
    const [x, y] = view.centers[visible - 1];
    const next = moving ? view.centers[visible] : [x, y];
    const tip = [x + (next[0] - x) * travel, y + (next[1] - y) * travel];
    const beam = view.centers.slice(0, visible);
    if (moving) beam.push(tip);

    brush.globalCompositeOperation = 'source-over';
    brush.clearRect(left, top, width, height);
    for (let i = 0; i < visible; i++) reveal(...view.centers[i], (i === 3 ? 86 : 53) * scale, .92);
    if (beam.length > 1) {
      brush.lineCap = 'round';
      brush.strokeStyle = '#fff8';
      brush.lineWidth = 24 * scale;
      trace(brush, beam, 1);
    }
    if (!moving) {
      const crownAge = elapsed - s.crownBeat;
      if (crownAge > .18) reveal(...view.highLights[0], 30 * scale);
      if (crownAge > .39) reveal(...view.highLights[1], 32 * scale);
    }

    const wave = s.step - centers.length;
    const growth = Math.min(1, since / Math.max(.27, s.interval * .84));
    drawFibers(brush, view, wave, growth, true, pulse);
    const outer = view.bubbles;
    const bubbleCount = wave < 3 ? 0 : wave === 3 ? Math.floor(outer.length * growth) : outer.length;
    for (let i = 0; i < bubbleCount; i++) reveal(...outer[i], 31 * scale);
    if (wave >= 4) {
      brush.fillStyle = 'rgba(255,255,255,' + (wave === 4 ? growth * .55 : .55) + ')';
      brush.fillRect(left, top, width, height);
    }
    if (wave >= 5) {
      reveal(left + width / 2, top + height * .94, 260 * scale);
      brush.fillStyle = 'rgba(255,255,255,' + Math.min(1, since / .65) + ')';
      brush.fillRect(left, top, width, height);
    }

    brush.globalCompositeOperation = 'source-in';
    brush.drawImage(view.source, left, top, width, height, left, top, width, height);
    context.drawImage(mask, left, top, width, height);
    drawFibers(context, view, wave, growth, false, pulse * s.strength);
    for (let i = 0; i < bubbleCount; i++) {
      const [bx, by] = outer[i];
      spark(by, '#ffd597', (16 + pulse * 6) * scale, wave === 3 ? .84 : .55, bx);
      context.beginPath();
      context.arc(bx, by, (6 + pulse * 3) * scale, 0, Math.PI * 2);
      context.strokeStyle = '#ffe3ac70';
      context.lineWidth = 1.2 * scale;
      context.stroke();
    }
    pumpHeart(s, elapsed, view);
    for (let i = 0; i < visible; i++) {
      const energized = s.step === i ? pulse * s.strength : 0;
      const [cx, cy] = view.centers[i];
      spark(cy, centers[i][2], (14 + 15 * energized) * scale, .64 + .36 * energized, cx);
    }
    if (moving && since > .025 && (x !== tip[0] || y !== tip[1])) {
      const trail = context.createLinearGradient(x, y, ...tip);
      trail.addColorStop(0, centers[s.step][2] + '50');
      trail.addColorStop(1, '#fff2d7');
      context.strokeStyle = trail;
      context.lineWidth = 2 * scale;
      trace(context, [[x, y], tip], 1);
      spark(tip[1], '#ffe3bd', 10 * scale, .72, tip[0]);
    }
  }

  function bell(s, elapsed) {
    const clock = s.audio.currentTime;
    const frequency = [130.81, 146.83, 164.81, 174.61, 196, 220, 261.63][Math.min(s.step + 1, centers.length - 1)];
    for (const [ratio, volume] of [[1, .16], [2, .038], [3, .018]]) {
      const voice = s.audio.createOscillator();
      const envelope = s.audio.createGain();
      voice.frequency.value = frequency * ratio;
      envelope.gain.setValueAtTime(.001, clock);
      envelope.gain.exponentialRampToValueAtTime(volume, clock + .025);
      envelope.gain.exponentialRampToValueAtTime(.001, clock + Math.min(1.1, s.interval * 2));
      voice.connect(envelope).connect(s.audio.destination);
      voice.start(clock);
      voice.stop(clock + Math.min(1.2, s.interval * 2 + .03));
      voice.onended = () => { voice.disconnect(); envelope.disconnect(); };
    }
    advance(s, elapsed, 1);
  }

  function advance(s, elapsed, strength) {
    s.step++;
    if (s.step === 3) s.heartBeat = elapsed;
    s.lastBeatClock = s.audio.currentTime;
    if (s.step === centers.length - 1) s.crownBeat = elapsed;
    if (s.lastBeat !== null && s.player) {
      s.interval = s.interval * .65 + Math.min(1.5, elapsed - s.lastBeat) * .35;
    }
    s.lastBeat = elapsed;
    s.strength = strength;
    status.textContent = s.step < centers.length ? centers[s.step][0] + ' illuminated.' :
      waves[s.step - centers.length] + ' illuminated.';
  }

  function detectBeat(s, elapsed) {
    s.analyser.getByteFrequencyData(s.bins);
    const binWidth = s.audio.sampleRate / s.analyser.fftSize;
    let bass = 0, mid = 0, energy = 0;
    for (let i = 1; i < s.bins.length; i++) {
      const frequency = i * binWidth;
      const value = s.bins[i] / 255;
      energy = Math.max(energy, value);
      if (frequency < 210) bass += value * binWidth / 210;
      else if (frequency < 1800) mid += value * binWidth / 1590;
    }
    const level = bass * .8 + mid * .2;
    s.baseline += (level - s.baseline) * .045;
    const gap = s.lastBeat === null ? elapsed : elapsed - s.lastBeat;
    const firstSound = s.step < 0 && energy > .33;
    const accent = gap > .27 && level > Math.max(.075, s.baseline * 1.13)
      && level - s.previous > .019;
    const sustained = gap > Math.max(.9, s.fallback * 1.65) && energy > .24;
    if (firstSound || accent || sustained) advance(s, elapsed, Math.min(1, .35 + energy * .65));
    s.previous = level;
  }

  function frame(s) {
    if (s !== session) return;
    let elapsed = s.player ? s.player.currentTime : s.audio.currentTime - s.origin;
    if (s.player?.ended && s.step === total - 1) {
      elapsed = Math.max(elapsed, s.lastBeat + s.audio.currentTime - s.lastBeatClock);
    }
    if (s.step < total - 1) {
      if (s.player && !s.player.ended) detectBeat(s, elapsed);
      else if (!s.player && elapsed >= s.next) {
        bell(s, elapsed);
        s.next = elapsed + s.fallback;
      }
    }
    if (!s.lastPaint || s.audio.currentTime - s.lastPaint >= 1 / 32) {
      paint(s, elapsed);
      s.elapsed = elapsed;
      s.lastPaint = s.audio.currentTime;
    }
    if (s.player?.ended && s.step < total - 1) {
      status.textContent = 'Track ended before the sequence completed.';
      return;
    }
    if (s.step === total - 1 && elapsed - s.lastBeat > .75) {
      if (!s.finished) {
        status.textContent = 'Full LightBody illuminated.';
        s.finished = true;
      }
      if (reducedMotion.matches) return;
    }
    s.frame = requestAnimationFrame(() => frame(s));
  }

  function close() {
    const s = session;
    session = undefined;
    if (s) {
      cancelAnimationFrame(s.frame);
      if (s.player) {
        s.player.pause();
        s.player.removeAttribute('src');
        s.player.load();
        URL.revokeObjectURL(s.url);
      }
      if (s.audio.state !== 'closed') void s.audio.close().catch(() => {});
    }
    stage.classList.remove('music-mode');
    display.hidden = true;
    stop.disabled = true;
    start.disabled = false;
  }

  start.addEventListener('click', async () => {
    close();
    let s;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio is unavailable.');
      const audio = new Audio();
      const interval = 60 / Math.max(45, Math.min(160, Number(bpm.value) || 72));
      s = {audio, interval, fallback: interval, step: -1, next: .44, lastBeat: null,
        baseline: 0, previous: 0, strength: 1};
      session = s;
      const file = input.files[0];
      if (file) {
        s.url = URL.createObjectURL(file);
        s.player = new AudioElement(s.url);
        s.analyser = audio.createAnalyser();
        s.analyser.fftSize = 1024;
        s.analyser.smoothingTimeConstant = .25;
        s.bins = new Uint8Array(s.analyser.frequencyBinCount);
        audio.createMediaElementSource(s.player).connect(s.analyser).connect(audio.destination);
      }
      start.disabled = true;
      stop.disabled = false;
      display.hidden = false;
      stage.classList.add('music-mode');
      prepareView(Math.max(0, angleButtons.findIndex(button => button.getAttribute('aria-pressed') === 'true')));
      status.textContent = 'Waiting for the first accent…';
      await Promise.all([audio.resume(), art.decode(), sheet.decode(), s.player?.play()]);
      if (s !== session) return;
      prepareHeart(currentView);
      s.origin = audio.currentTime;
      stage.scrollIntoView({block: 'start'});
      frame(s);
    } catch (error) {
      if (s && s !== session) return;
      close();
      status.textContent = 'Playback could not start. Check the audio file or try the built-in tone.';
    }
  });

  angleButtons.forEach((button, index) => button.addEventListener('click', () => {
    if (!session) return;
    prepareView(index);
    if (session.elapsed !== undefined) paint(session, session.elapsed);
  }));

  const AudioElement = window.Audio;
  stop.addEventListener('click', () => {
    close();
    status.textContent = 'Sequence stopped.';
  });
  window.addEventListener('pagehide', close);
})();
