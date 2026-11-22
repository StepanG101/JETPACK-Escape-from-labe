(() => {
  const SoundEngine = {
    enabled: true,
    ctx: null,

    ensure() {
      if (!this.enabled) return null;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    },

    tone(freq, endFreq, duration, type = 'square', gainVal = 0.05) {
      const ac = this.ensure();
      if (!ac) return;
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq && endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + duration);
    },

    shot(skin) {
      if (skin === 'laser') this.tone(720, 320, 0.04, 'sawtooth', 0.025);
      else if (skin === 'plasma') this.tone(360, 140, 0.055, 'triangle', 0.035);
      else if (skin === 'rainbow') this.tone(540, 820, 0.04, 'square', 0.022);
      else this.tone(140, 70, 0.038, 'triangle', 0.025);
    },

    coin() {
      this.tone(920, 1260, 0.055, 'square', 0.035);
    },

    combo() {
      this.tone(660, 1320, 0.12, 'square', 0.055);
      setTimeout(() => this.tone(990, 1580, 0.14, 'square', 0.055), 75);
    },

    powerup() {
      this.tone(420, 880, 0.15, 'square', 0.055);
    },

    token() {
      this.tone(587, 1174, 0.2, 'square', 0.065);
    },

    wallBreak() {
      this.tone(160, 42, 0.24, 'sawtooth', 0.075);
    },

    shieldSave() {
      this.tone(320, 680, 0.16, 'square', 0.065);
    },

    crash() {
      this.tone(190, 38, 0.34, 'sawtooth', 0.085);
    },

    rocketLaunch() {
      this.tone(260, 760, 0.13, 'sawtooth', 0.035);
    },

    laserFire() {
      this.tone(680, 210, 0.18, 'sawtooth', 0.045);
    },

    missionDone() {
      this.tone(587, 987, 0.18, 'square', 0.055);
    },

    rouletteSpin() {
      this.tone(280, 920, 0.28, 'triangle', 0.055);
    },

    rouletteWin() {
      this.tone(520, 1040, 0.22, 'square', 0.06);
    },

    uiClick() {
      this.tone(500, 720, 0.06, 'square', 0.035);
    }
  };

  window.SoundEngine = SoundEngine;
})();
