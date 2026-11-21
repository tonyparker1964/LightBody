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
  const waves = [
    ['Shoulders and upper arms', [[374,362,95],[650,362,95],[355,487,85],[669,487,85]]],
    ['Elbows, wrists, and fingertips', [[331,577,95],[693,577,95],[255,748,125],[769,748,125],[212,849,100],[812,849,100]]],
    ['Torso and hips', [[438,434,122],[586,434,122],[444,614,115],[580,614,115],[408,785,115],[616,785,115]]],
    ['Thighs and knees', [[424,890,104],[600,890,104],[455,1028,102],[569,1028,102]]],
    ['Calves, ankles, and toes', [[448,1181,115],[576,1181,115],[474,1322,108],[550,1322,108],[470,1415,90],[554,1415,90]]],
    ['Lotus and golden field', [[512,1441,300]]]
  ];
  const total = centers.length + waves.length;

  const mask = document.createElement('canvas');
  mask.width = 1024;
  mask.height = 1536;
  const brush = mask.getContext('2d');
  let session;

  function reveal(x, y, radius, strength = 1) {
    const gradient = brush.createRadialGradient(x, y, radius * .19, x, y, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,' + strength + ')');
    gradient.addColorStop(.55, 'rgba(255,255,255,' + strength * .72 + ')');
    gradient.addColorStop(1, 'transparent');
    brush.fillStyle = gradient;
    brush.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function spark(y, color, radius, intensity) {
    const glow = context.createRadialGradient(512, y, 0, 512, y, radius);
    glow.addColorStop(0, '#fffdf3');
    glow.addColorStop(.16, color);
    glow.addColorStop(1, color + '00');
    context.globalAlpha = intensity;
    context.fillStyle = glow;
    context.fillRect(512 - radius, y - radius, radius * 2, radius * 2);
    context.globalAlpha = 1;
  }

  function paint(s, elapsed) {
    context.clearRect(0, 0, 1024, 1536);
    if (s.step < 0) return;
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

    const waveCount = s.step - centers.length + 1;
    for (let i = 0; i < waveCount; i++) {
      waves[i][1].forEach(([x, y, radius], index) => {
        const local = since - Math.floor(index / 2) * .058;
        if (i === waveCount - 1 && local < 0) return;
        const spread = i === waveCount - 1 ? .28 + .72 * Math.min(1, local / .24) : 1;
        reveal(x, y, radius * spread, i === waveCount - 1 ? .84 + .16 * pulse * s.strength : .92);
      });
    }
    if (s.step === total - 1) {
      brush.fillStyle = 'rgba(255,255,255,' + Math.min(1, since / .65) + ')';
      brush.fillRect(0, 0, 1024, 1536);
    }

    brush.globalCompositeOperation = 'source-in';
    brush.drawImage(art, 0, 0, 1024, 1536);
    context.drawImage(mask, 0, 0);
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
    if (waveCount > 0 && pulse > .025) {
      context.globalCompositeOperation = 'screen';
      for (const [x, y, radius] of waves[waveCount - 1][1]) {
        const glow = context.createRadialGradient(x, y, 0, x, y, radius * .57);
        glow.addColorStop(0, '#ffd071');
        glow.addColorStop(1, '#ffd07100');
        context.fillStyle = glow;
        context.globalAlpha = pulse * s.strength * .26;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
    }
  }

  function bell(s, elapsed) {
    const clock = s.audio.currentTime;
    const frequency = [130.81, 146.83, 164.81, 174.61, 196, 220, 261.63][Math.min(s.step, 6)];
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
    if (s.step === centers.length - 1) s.crownBeat = elapsed;
    if (s.lastBeat !== null && s.player) {
      s.interval = s.interval * .65 + Math.min(1.5, elapsed - s.lastBeat) * .35;
    }
    s.lastBeat = elapsed;
    s.strength = strength;
    status.textContent = s.step < centers.length ? centers[s.step][0] + ' illuminated.' :
      waves[s.step - centers.length][0] + ' illuminated.';
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
    const elapsed = s.player ? s.player.currentTime : s.audio.currentTime - s.origin;
    if (s.step < total - 1) {
      if (s.player && !s.player.ended) detectBeat(s, elapsed);
      else if (!s.player && elapsed >= s.next) {
        bell(s, elapsed);
        s.next = elapsed + s.fallback;
      }
    }
    paint(s, elapsed);
    if (s.player?.ended && s.step < total - 1) {
      status.textContent = 'Track ended before the sequence completed.';
      return;
    }
    if (s.step === total - 1 && elapsed - s.lastBeat > .75) {
      status.textContent = 'Full LightBody illuminated.';
      return;
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
