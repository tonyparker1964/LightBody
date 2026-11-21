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
  const heartX = 493, heartY = 369;
  let heartReady = false;

  function prepareHeart() {
    if (heartReady) return;
    heartBrush.drawImage(art, heartX, heartY, heart.width, heart.height,
      0, 0, heart.width, heart.height);
    const edge = heartBrush.createRadialGradient(0, 0, .53, 0, 0, 1);
    edge.addColorStop(0, '#fff');
    edge.addColorStop(1, 'transparent');
    heartBrush.save();
    heartBrush.globalCompositeOperation = 'destination-in';
    heartBrush.translate(55, 67);
    heartBrush.scale(51, 61);
    heartBrush.fillStyle = edge;
    heartBrush.fillRect(-1.2, -1.2, 2.4, 2.4);
    heartBrush.restore();
    const chakra = heartBrush.createRadialGradient(19, 101, 17, 19, 101, 33);
    chakra.addColorStop(0, '#fff');
    chakra.addColorStop(1, 'transparent');
    heartBrush.globalCompositeOperation = 'destination-out';
    heartBrush.fillStyle = chakra;
    heartBrush.fillRect(0, 68, 53, 62);
    heartBrush.globalCompositeOperation = 'source-over';
    heartReady = true;
  }

  function pumpHeart(s, elapsed) {
    if (s.step < 3 || reducedMotion.matches || !heartReady) return;
    const phase = (Math.max(0, elapsed - s.lastBeat) / s.interval) % 1;
    const primary = Math.exp(-((phase - .13) ** 2) / .006);
    const recoil = Math.exp(-((phase - .33) ** 2) / .007);
    const contraction = (primary - .36 * recoil) * (.62 + .38 * s.strength);
    context.save();
    context.translate(548, 436);
    context.rotate(contraction * .055);
    context.scale(1 - contraction * .14, 1 - contraction * .19);
    context.globalAlpha = Math.min(1, (elapsed - s.heartBeat) / .18);
    context.drawImage(heart, heartX - 548, heartY - 436);
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

  function drawFibers(ctx, wave, progress, maskPass, pulse) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = maskPass ? 'source-over' : 'screen';
    fiberLayers.forEach(({color, paths}, layer) => {
      if (layer > wave) return;
      const live = layer === wave;
      for (const [index, path] of paths.entries()) {
        const growth = live ? (progress - (index % 7) * .026) * 1.32 : 1;
        if (growth <= 0) continue;
        ctx.strokeStyle = maskPass ? '#fff9' : color;
        ctx.lineWidth = maskPass ? 16 : live ? 2.4 : 1.2;
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
    context.clearRect(0, 0, 1024, 1536);
    if (s.step < 0) return;
    if (s.finished) {
      context.drawImage(art, 0, 0, 1024, 1536);
      pumpHeart(s, elapsed);
      return;
    }
    const since = Math.max(0, elapsed - s.lastBeat);
    const pulse = Math.exp(-since * 7);
    const visible = Math.min(s.step + 1, centers.length);
    const moving = s.step < centers.length - 1;
    // Saturate just before the next beat so the center itself lights on the accent.
    const travel = Math.min(.98, since / s.interval);
    const y = centers[visible - 1][1];
    const tip = moving ? y + (centers[visible][1] - y) * travel : y;

    brush.globalCompositeOperation = 'source-over';
    brush.clearRect(0, 0, 1024, 1536);
    for (let i = 0; i < visible; i++) {
      const radius = i === 3 ? 86 : 53;
      reveal(512, centers[i][1], radius, .92);
    }

    const top = visible === centers.length ? y : tip;
    const beam = brush.createLinearGradient(489, 0, 535, 0);
    beam.addColorStop(0, 'transparent');
    beam.addColorStop(.5, '#fff');
    beam.addColorStop(1, 'transparent');
    brush.fillStyle = beam;
    brush.fillRect(489, top, 46, centers[0][1] - top);
    if (visible === centers.length) {
      const crownAge = elapsed - s.crownBeat;
      if (crownAge > .18) reveal(512, 85, 30);
      if (crownAge > .39) reveal(512, 41, 32);
    }

    const wave = s.step - centers.length;
    const growth = Math.min(1, since / Math.max(.27, s.interval * .84));
    drawFibers(brush, wave, growth, true, pulse);
    const bubbleCount = wave < 3 ? 0 : wave === 3 ? Math.floor(bubbles.length * growth) : bubbles.length;
    for (let i = 0; i < bubbleCount; i++) reveal(...bubbles[i], 31);
    if (wave >= 4) {
      brush.fillStyle = 'rgba(255,255,255,' + (wave === 4 ? growth * .55 : .55) + ')';
      brush.fillRect(0, 0, 1024, 1536);
    }
    if (wave >= 5) reveal(512, 1440, 260);
    if (s.step === total - 1) {
      brush.fillStyle = 'rgba(255,255,255,' + Math.min(1, since / .65) + ')';
      brush.fillRect(0, 0, 1024, 1536);
    }

    brush.globalCompositeOperation = 'source-in';
    brush.drawImage(art, 0, 0, 1024, 1536);
    context.drawImage(mask, 0, 0);
    drawFibers(context, wave, growth, false, pulse * s.strength);
    for (let i = 0; i < bubbleCount; i++) {
      const [x, y] = bubbles[i];
      spark(y, '#ffd597', 16 + pulse * 6, wave === 3 ? .84 : .55, x);
      context.beginPath();
      context.arc(x, y, 6 + pulse * 3, 0, Math.PI * 2);
      context.strokeStyle = '#ffe3ac70';
      context.lineWidth = 1.2;
      context.stroke();
    }
    pumpHeart(s, elapsed);
    for (let i = 0; i < visible; i++) {
      const energized = s.step === i ? pulse * s.strength : 0;
      spark(centers[i][1], centers[i][2], 14 + 15 * energized, .64 + .36 * energized);
    }
    if (moving && since > .025) {
      const trail = context.createLinearGradient(0, y, 0, tip);
      trail.addColorStop(0, centers[s.step][2] + '50');
      trail.addColorStop(1, '#fff2d7');
      context.strokeStyle = trail;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(512, y);
      context.lineTo(512, tip);
      context.stroke();
      spark(tip, '#ffe3bd', 10, .72);
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
      context.clearRect(0, 0, 1024, 1536);
      status.textContent = 'Waiting for the first accent…';
      await Promise.all([audio.resume(), art.decode(), s.player?.play()]);
      if (s !== session) return;
      prepareHeart();
      s.origin = audio.currentTime;
      stage.scrollIntoView({block: 'start'});
      frame(s);
    } catch (error) {
      if (s && s !== session) return;
      close();
      status.textContent = 'Playback could not start. Check the audio file or try the built-in tone.';
    }
  });

  const AudioElement = window.Audio;
  stop.addEventListener('click', () => {
    close();
    status.textContent = 'Sequence stopped.';
  });
  window.addEventListener('pagehide', close);
})();
