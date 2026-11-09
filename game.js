/* Fishing Game – iPad web version of Fishing2.psyexp
 *
 * Coordinates use PsychoPy 'height' units: the screen height is 1 unit,
 * (0, 0) is the centre, +y is up. Every position and size below is copied
 * from the PsychoPy experiment.
 */
'use strict';
// If anything goes wrong while starting, show it instead of a never-ending "Loading…"
window.addEventListener('error', e => {
  const l = document.getElementById('loading');
  if (l && l.style.display !== 'none') l.textContent = 'Could not start the game (' + e.message + '). Close the app and open it again on wifi.';
});

// ---------------------------------------------------------------- settings
const EXP_NAME = 'FishingGame';
const pxToHeight = 1 / 800;
const narrowSD = 50 * pxToHeight;      // prior (ring) spreads, from the MATLAB code
const wideSD = 100 * pxToHeight;
const narrowLikeSD = 0.08;             // splash spreads
const wideLikeSD = 0.20;
const numSplashes = 5;
const minDuration = 0.3;               // a tap only counts after this (s): stops double-taps
const level4Dist = 0.03;               // fish rewards by distance (height units)
const level3Dist = 0.06;
const level2Dist = 0.10;
const fishSize = 2.8;                  // catch screen fish size (all levels)
const sumSize = 2.2;                   // round summary fish size
const nPractice = 9;                   // practice round: one cast at each of the 9 net spots
const roundLength = 12;                // main rounds of 12 casts (3 of each condition)
const nRounds = 9;                     // main rounds (each followed by the round graph)
const nTrials = nPractice + nRounds * roundLength;   // 9 + 108 = 117
// round 0 = practice, rounds 1-9 = main
function roundOf(n) { return n < nPractice ? 0 : 1 + Math.floor((n - nPractice) / roundLength); }
function roundStart(n) { return n === 0 || (n >= nPractice && (n - nPractice) % roundLength === 0); }
function roundEnd(n) { return roundStart(n + 1); }
const maxExtraRounds = 9;              // after round 9 they may play up to 9 extra rounds, one at a time

const fishPics = {
  1: ['1_1', '1_2', '1_3', '1_4'],
  2: ['2_1', '2_2', '2_3'],
  3: ['3_1', '3_2'],
  4: ['4_1'],
};
// points for each fish level (Small, Good, Great, Amazing)
const FISH_POINTS = { 1: 1, 2: 2, 3: 3, 4: 5 };   // Amazing is worth 5
const levelWords = { 4: 'Amazing', 3: 'Great', 2: 'Good', 1: 'Small' };
const playerPics = [1, 2, 3, 4, 5, 6, 7, 8].map(k => 'player_' + k);
const playerNames = ['Mia', 'Zoe', 'Ana', 'Rosa', 'Sam', 'Kofi', 'Leo', 'Jun'];
const basketPics = ['basket_brown', 'basket_orange', 'basket_blue'];   // a random one each round
const basketW = 0.16, basketH = 0.151;
// The basket sits on the very bottom edge of the iPad screen (inside the home-bar margin),
// so the moving nets overlap it less. Worked out from the current screen size.
function basketY() { return -(screenH - cy) / unit + basketH / 2; }

const DARK = 'rgb(26, 57, 89)';        // PsychoPy colour [-0.8, -0.55, -0.3]
const WINDOW_BG = 'rgb(70, 128, 179)'; // PsychoPy window colour [-0.45, 0, 0.4]

// the fish detector at the top of the pond (picture is 629 x 720)
const THROW_NET = 0.1;   // size of the thrown net on the catch screen
const DEVICE_H = 0.13 * 610 / 720, DEVICE_W = DEVICE_H * 629 / 610, DEVICE_Y = 0.497 - DEVICE_H / 2;   // detector (short antenna), at the top edge above the water
const IMAGE_NAMES = [
  'detector_wide', 'detector_narrow', 'detector_device',
  'pond', 'net_narrow', 'splash', 'basket_brown', 'basket_orange', 'basket_blue',
  '1_1', '1_2', '1_3', '1_4', '2_1', '2_2', '2_3', '3_1', '3_2', '4_1',
  'how_step1', 'how_step2', 'how_step3', 'how_step4',
  'lb_panel', 'pick_panel',
  ...playerPics,
];

// ---------------------------------------------------------------- helpers
// Python's round(): halves go to the nearest even number
function pyRound(x) {
  const r = Math.round(x);
  if (Math.abs(x % 1) === 0.5) return (r % 2 === 0) ? r : r - 1;
  return r;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function sum(a) { return a.reduce((s, v) => s + v, 0); }
function dateStr(d = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}h${p(d.getMinutes())}.${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

// ---------------------------------------------------------------- images
const IMG = {};
function loadImages() {
  return Promise.all(IMAGE_NAMES.map(name => new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => { IMG[name] = im; resolve(); };
    im.onerror = () => reject(new Error('Could not load images/' + name + '.png'));
    im.src = 'images/' + name + '.png';
  })));
}

// ---------------------------------------------------------------- sounds
// Short sound effects (sounds/*.wav), played with Web Audio. The iPad only allows sound
// after a tap, so the sound system is switched on by the "Start game" tap.
const SOUND_ON = true;          // set to false to play the game silently
const SOUND_VOLUME = 0.8;
const SOUND_NAMES = ['beep_weak', 'beep_strong', 'splash', 'catch_1', 'catch_2', 'catch_3', 'catch_4', 'basket', 'pop', 'leaderboard', 'fanfare'];
const SND = {};
let audio = null, audioGain = null;
function unlockAudio() {
  if (!SOUND_ON) return;
  try {
    // play even when the iPad is in silent mode (Safari 16.4+)
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio = new AC();
      audioGain = audio.createGain();
      audioGain.gain.value = SOUND_VOLUME;
      audioGain.connect(audio.destination);
      SOUND_NAMES.forEach(name => {
        fetch('sounds/' + name + '.wav')
          .then(r => r.arrayBuffer())
          .then(buf => new Promise((ok, bad) => audio.decodeAudioData(buf, ok, bad)))
          .then(decoded => { SND[name] = decoded; })
          .catch(() => {});   // a missing sound never stops the game
      });
    }
    if (audio.state !== 'running') audio.resume();
    // a silent blip: older iPads need a sound started inside the tap itself
    const b = audio.createBuffer(1, 1, 22050), s = audio.createBufferSource();
    s.buffer = b; s.connect(audio.destination); s.start(0);
  } catch (e) {}
}
function playSound(name, delay = 0) {
  if (!SOUND_ON || !audio || !SND[name]) return;
  try {
    if (audio.state !== 'running') audio.resume();
    const s = audio.createBufferSource();
    s.buffer = SND[name];
    s.connect(audioGain);
    s.start(audio.currentTime + delay);
  } catch (e) {}
}

// ---------------------------------------------------------------- drawing
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let unit = 1, cx = 0, cy = 0;

const APP_VERSION = 'v49';
let screenW = 0, screenH = 0, diagText = '';
// true when opened from the Home Screen icon
const homeScreen = window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const vv = window.visualViewport;
  // safe margins (status bar, home bar, rounded corners)
  const cs = getComputedStyle(document.getElementById('safe'));
  const px = v => parseFloat(v) || 0;
  const st = px(cs.paddingTop), sb = px(cs.paddingBottom), sl = px(cs.paddingLeft), sr = px(cs.paddingRight);
  const lvh = document.getElementById('lvh').getBoundingClientRect().height;
  // The game sits below the iPad's status bar (status-bar style "black"), so the
  // reported size is the real drawable area. (Drawing under the status bar made iPadOS
  // cut off the bottom of the game.)
  const w = Math.round(Math.max(window.innerWidth, vv ? vv.width : 0));
  const h = Math.round(Math.max(window.innerHeight, vv ? vv.height : 0));
  const dev = window.screen;   // (plain 'screen' is the game's current screen)
  screenW = w; screenH = h;
  document.documentElement.style.setProperty('--appH', h + 'px');   // screens on top (start, end) use the same height
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // game area = the screen minus the safe margins
  const sw = w - sl - sr, sh = h - st - sb;
  // 1 unit = safe height, but keep at least x = +/-0.73 visible (the play area is +/-0.6)
  unit = Math.min(sh, sw / 1.46);
  cx = sl + sw / 2;
  cy = st + sh / 2;
  diagText = `${APP_VERSION} | inner ${window.innerWidth}x${window.innerHeight} | vv ${vv ? Math.round(vv.width) + 'x' + Math.round(vv.height) : '-'}` +
    ` | doc ${document.documentElement.clientHeight} | lvh ${Math.round(lvh)} | screen ${dev.width}x${dev.height}` +
    ` | home ${homeScreen} | safe ${st}/${sr}/${sb}/${sl} | used ${w}x${h}`;
  const d = document.getElementById('diag'); if (d) d.textContent = diagText;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

function drawImg(name, x, y, w, h, alpha = 1) {
  const im = IMG[name];
  if (!im || alpha <= 0 || w <= 0 || h <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(im, cx + (x - w / 2) * unit, cy - (y + h / 2) * unit, w * unit, h * unit);
  ctx.globalAlpha = 1;
}
function drawCircle(x, y, r, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(cx + x * unit, cy - y * unit, r * unit, 0, Math.PI * 2);
  ctx.fill();
}
function wrapLines(text, height, bold, wrapWidth) {
  ctx.font = `${bold ? 'bold ' : ''}${height * unit}px Arial, Helvetica, sans-serif`;
  const out = [];
  for (const para of text.split('\n')) {
    if (!wrapWidth) { out.push(para); continue; }
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > wrapWidth * unit && line) { out.push(line); line = word; }
      else line = test;
    }
    out.push(line);
  }
  return out;
}
// text centred on (x, y), like a PsychoPy TextStim
function drawText(text, x, y, height, colour = 'white', bold = false, wrapWidth = null) {
  const lines = wrapLines(text, height, bold, wrapWidth);
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const gap = height * 1.25;
  const top = y + gap * (lines.length - 1) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, cx + x * unit, cy - (top - i * gap) * unit));
}
// a full-screen picture (16:9) scaled to cover the whole screen, edge to edge
function drawCover(name) {
  const im = IMG[name];
  if (!im) return;
  const s = Math.max(screenW / im.width, screenH / im.height);
  const w = im.width * s, h = im.height * s;
  ctx.drawImage(im, (screenW - w) / 2, (screenH - h) / 2, w, h);
}
function drawPond() {
  ctx.fillStyle = WINDOW_BG;
  ctx.fillRect(0, 0, screenW, screenH);
  drawCover('pond');
}

// ---------------------------------------------------------------- screens
let screen = null, screenStart = 0, paused = false, pauseStart = 0;
function setScreen(s) {
  screen = s;
  screenStart = performance.now();
  if (s.begin) s.begin();
}
function screenTime() { return (performance.now() - screenStart) / 1000; }

function frame() {
  if (screen && !paused) {
    ctx.clearRect(0, 0, screenW, screenH);
    screen.draw(screenTime());
  }
  requestAnimationFrame(frame);
}

// researcher pause: 5 quick taps in the top-left corner
let cornerTaps = [], pendingSave = false;
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (e.clientX < 60 && e.clientY < 60) {
    const now = performance.now();
    cornerTaps = cornerTaps.filter(t => now - t < 3000);
    cornerTaps.push(now);
    if (cornerTaps.length >= 5 && screen) {
      cornerTaps = [];
      if (screen.isThanks) finishGame();   // game over: same as the Quit button
      else openPause();
    }
    return;   // corner taps never count as game taps
  }
  if (!screen || paused || !screen.tap) return;
  const x = (e.clientX - cx) / unit;
  const y = (cy - e.clientY) / unit;
  screen.tap(x, y, screenTime());
}, { passive: false });
// The iPad only allows the save sheet to open from a finished tap, so it opens when the finger lifts.
canvas.addEventListener('pointerup', () => {
  if (!pendingSave) return;
  pendingSave = false;
  saveFinishedGame();
});
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

// ---------------------------------------------------------------- experiment state
let S = null;   // everything about the current game

// Main casts in a new random order for each person, dealt so that every round has 3 casts of each
// condition, and the casts with the fish outside the net are spread out: each condition's go into
// different rounds, and no round gets more than 2.
function dealMainRounds(extra = false) {
  const perRound = roundLength / 4;
  for (let attempt = 0; attempt < 1000; attempt++) {
    const rounds = Array.from({ length: nRounds }, () => []);
    const outCount = new Array(nRounds).fill(0);
    let ok = true;
    for (const p of [0, 1]) for (const l of [0, 1]) {
      const cond = TRIAL_SET.filter(r => r.practice === 0 && !!r.extra === extra && r.priorCond === p && r.likeCond === l);
      const outside = shuffle(cond.filter(r => r.inRing === 0)), inside = shuffle(cond.filter(r => r.inRing !== 0));
      const free = shuffle([...Array(nRounds).keys()].filter(k => outCount[k] < 2));
      if (free.length < outside.length) { ok = false; break; }
      const outRounds = free.slice(0, outside.length);
      outRounds.forEach((k, i) => { rounds[k].push(outside[i]); outCount[k]++; });
      for (let k = 0; k < nRounds; k++) while (rounds[k].filter(r => r.priorCond === p && r.likeCond === l).length < perRound) rounds[k].push(inside.pop());
    }
    if (ok) return rounds.flatMap(r => shuffle(r));
  }
  return shuffle(TRIAL_SET.filter(r => r.practice === 0 && !!r.extra === extra));   // (never needed)
}

function newGame(participant) {
  const practice = shuffle(TRIAL_SET.filter(r => r.practice === 1));
  const main = dealMainRounds();
  S = {
    participant,
    date: dateStr(),
    id: participant + '_' + dateStr(),
    trialPlan: practice.concat(main),   // 9 practice first, then 108 main
    extraPlan: dealMainRounds(true),    // casts for the extra rounds, 12 per round, used only if they choose
    endN: nTrials,                      // grows by 12 for each extra round they choose
    thisN: 0,
    rows: [],
    row: null,
    totalPoints: 0,
    blockFish: [], blockLevels: [],
    roundScores: [], graphRounds: [],
    youPic: playerPics[1],
    basket: basketPics[1],
    complete: false,
  };
  saveSession();
}

function baseRow() {
  return {
    participant: S.participant, date: S.date, expName: EXP_NAME,
    screenW, screenH, unitPx: Math.round(unit * 100) / 100,
  };
}

// ---------------------------------------------------------------- flow
function startGame() {
  howPage(0);
}

function howPage(i) {
  setScreen({
    draw() { drawCover('how_step' + (i + 1)); },   // whole page (with its own pond) fills the screen
    tap(x, y, t) {
      if (t < 0.5) return;
      playSound('pop');
      if (i < 3) howPage(i + 1); else nextTrial();
    },
  });
}

function nextTrial() {
  if (S.thisN >= S.endN) { endOfGame(); return; }
  S.row = baseRow();
  if (S.thisN === nPractice) pickPlayer(roundIntroOrTrial);
  else roundIntroOrTrial();
}

function roundIntroOrTrial() {
  const roundNow = roundOf(S.thisN);
  if (roundStart(S.thisN) && roundNow >= 1) pondIntro(roundNow);
  else trial();
}

// ---- pick your player (once, after the practice)
function pickPlayer(then) {
  const pickX = [-0.39, -0.13, 0.13, 0.39], pickY = [0.06, -0.16], pw = 0.114, ph = 0.2;
  setScreen({
    draw() {
      drawPond();
      drawImg('pick_panel', 0, 0, 1.1, 0.8);
      drawText('Practice done!\nPick your player:', 0, 0.28, 0.045, DARK, true);
      for (let k = 0; k < 8; k++) drawImg(playerPics[k], pickX[k % 4], pickY[Math.floor(k / 4)], pw, ph);
      drawText("After each round, you'll see how many points you scored.", 0, -0.32, 0.032, 'black', false, 1.0);
    },
    tap(x, y, t) {
      if (t <= 0.5) return;
      for (let k = 0; k < 8; k++) {
        const px = pickX[k % 4], py = pickY[Math.floor(k / 4)];
        if (Math.abs(x - px) <= pw / 2 && Math.abs(y - py) <= ph / 2) {
          S.youPic = playerPics[k];
          S.row.playerPicked = playerNames[k];
          playSound('pop');
          then();
          return;
        }
      }
    },
  });
}

// ---- round start screen
function pondIntro(roundNow) {
  setScreen({
    draw(t) {
      drawPond();
      drawText(roundNow > nRounds ? 'Extra round ' + (roundNow - nRounds) : 'Round ' + roundNow + ' of ' + nRounds, 0, 0.4, 0.04, DARK, false, 1.2);
      if (t >= 0.5) drawText('Tap to start', 0, -0.42, 0.03, DARK);
    },
    tap(x, y, t) { if (t >= 0.5) { playSound('pop'); trial(); } },
  });
}

// ---- one cast
function trial() {
  const r = S.trialPlan[S.thisN];
  if (roundStart(S.thisN)) S.basket = pick(basketPics);   // new basket each round
  const netImage = r.priorCond === 1 ? 'detector_wide' : 'detector_narrow';   // the fish detector's reading
  const priorSD = r.priorCond === 1 ? wideSD : narrowSD;
  const priorRadius = 2 * priorSD;   // circle radius = 2 SDs: about 86% of fish come up inside it
  // the net moves around: everything in the trial list is relative to the net centre (netX, netY)
  const netX = r.netX || 0, netY = r.netY || 0;
  const r4 = v => Math.round(v * 1e4) / 1e4;
  const realX = r4(r.realX + netX), realY = r4(r.realY + netY);
  const splashX = [], splashY = [];
  for (let i = 1; i <= numSplashes; i++) { splashX.push(r4(r['splash' + i + 'X'] + netX)); splashY.push(r4(r['splash' + i + 'Y'] + netY)); }
  const row = S.row;
  Object.assign(row, {
    trialID: r.trialID,
    roundNum: roundOf(S.thisN),
    practice: S.thisN < nPractice ? 'True' : 'False',
    extraRound: roundOf(S.thisN) > nRounds ? 'True' : 'False',
    trialNum: S.thisN + 1,
    priorCond: r.priorCond, likeCond: r.likeCond, inRing: r.inRing,
    netSpot: r.netSpot, netX, netY,
    basket: S.basket,
  });
  for (let i = 0; i < numSplashes; i++) {
    row['splash' + (i + 1) + 'X'] = splashX[i];
    row['splash' + (i + 1) + 'Y'] = splashY[i];
  }
  row.splashMeanX = sum(splashX) / numSplashes;
  row.splashMeanY = sum(splashY) / numSplashes;
  row.realX = realX;   // screen positions (net position included)
  row.realY = realY;

  // Each cast: the detector sits at the top of the pond. Tap to scan -> it beeps (stronger beep for a
  // small reading), the reading grows in on the water, then the splashes appear and they tap their guess.
  let scanAt = null, splashed = false;
  const scanTime = 0.6;   // seconds for the reading to appear; splashes come after it
  setScreen({
    draw(t) {
      drawPond();
      if (scanAt === null) {
        if (t >= minDuration) drawText('Tap to scan', 0, DEVICE_Y - DEVICE_H / 2 - 0.035, 0.035, DARK, true);
      } else {
        const k = Math.min(1, (t - scanAt) / scanTime), ease = 1 - Math.pow(1 - k, 3);
        ctx.globalAlpha = ease;
        drawImg(netImage, netX, netY, priorRadius * 2 * (0.4 + 0.6 * ease), priorRadius * 2 * (0.4 + 0.6 * ease));
        ctx.globalAlpha = 1;
        if (k < 1) {   // a signal ring pulsing out from the reading
          ctx.strokeStyle = `rgba(239, 61, 100, ${1 - k})`; ctx.lineWidth = unit * 0.006;
          ctx.beginPath(); ctx.arc(cx + netX * unit, cy - netY * unit, priorRadius * unit * (0.5 + 0.8 * k), 0, 7); ctx.stroke();
        }
        if (k >= 1) {
          if (!splashed) { splashed = true; playSound('splash'); }
          for (let i = 0; i < numSplashes; i++) drawImg('splash', splashX[i], splashY[i], 0.06, 0.06);
        }
      }
      drawImg('detector_device', 0, DEVICE_Y, DEVICE_W, DEVICE_H);   // drawn last so a big reading never covers it
      drawImg(S.basket, 0, basketY(), basketW, basketH);
    },
    tap(x, y, t) {
      if (scanAt === null) {   // first tap: scan
        if (t < minDuration) return;
        scanAt = t; row.scanRT = t;
        playSound(r.priorCond === 1 ? 'beep_weak' : 'beep_strong');
        return;
      }
      t = t - scanAt - scanTime;   // time since the splashes appeared
      if (t < minDuration) return;
      const respDist = Math.hypot(x - realX, y - realY);
      let fishLevel;
      if (respDist <= level4Dist) fishLevel = 4;
      else if (respDist <= level3Dist) fishLevel = 3;
      else if (respDist <= level2Dist) fishLevel = 2;
      else fishLevel = 1;
      S.totalPoints += FISH_POINTS[fishLevel];
      Object.assign(row, {
        respX: x, respY: y, rt: t, timedOut: 'False',
        respDist, respDistPx: respDist / pxToHeight,
        fishLevel, totalPoints: S.totalPoints,
      });
      catchFeedback(fishLevel, x, y);
    },
  });
}

// ---- catch screen: fish at the centre for 1 s, then into the bucket
function catchFeedback(fishLevel, respX, respY) {
  const fishImage = pick(fishPics[fishLevel]);
  const catchMsg = levelWords[fishLevel] + ' fish!';
  S.row.fishImage = 'images/' + fishImage + '.png';
  S.blockFish.push(fishImage);
  S.blockLevels.push(fishLevel);
  const holdTime = 1.0, dropTime = 0.8, bucketY = basketY() + 0.02;   // fish drops into the basket
  setScreen({
    begin() {
      playSound('catch_' + fishLevel);
      playSound('basket', holdTime + dropTime);
    },
    draw(t) {
      drawPond();
      let fishY = 0, fishScale = 1, alpha = 1;
      if (t >= holdTime && t < holdTime + dropTime) {
        const frac = (t - holdTime) / dropTime;
        fishY = bucketY * frac;
        fishScale = 1 - 0.6 * frac;
      } else if (t >= holdTime + dropTime) {
        alpha = 0;
      }
      drawImg(fishImage, 0, fishY, 0.3 * fishSize * fishScale, 0.18 * fishSize * fishScale, alpha);
      drawImg(S.basket, 0, basketY(), basketW, basketH);
      drawCircle(respX, respY, 0.01, 'red');   // where they tapped
      drawText(catchMsg, 0, 0.42, 0.05, DARK);
      if (t >= 1.8) drawText('Tap for next cast', 0, 0.32, 0.03, DARK);
    },
    tap(x, y, t) { if (t >= 1.8) { playSound('pop'); afterCatch(); } },
  });
}

function afterCatch() {
  const endOfBlock = roundEnd(S.thisN);
  if (!endOfBlock) { advance(); return; }
  const roundNum = roundOf(S.thisN);
  blockSummary(roundNum, () => {
    // end of round bookkeeping (summaryCode, End Routine)
    S.roundScores.push(sum(S.blockLevels.map(l => FISH_POINTS[l])));
    if (roundNum >= 1) S.graphRounds.push(S.blockLevels.slice());
    S.blockFish = [];
    S.blockLevels = [];
    if (roundNum >= 1) roundGraph(roundNum, advance);   // no graph after the practice
    else advance();
  });
}

function advance() {
  S.rows.push(S.row);
  S.row = null;
  S.thisN += 1;
  saveSession();
  nextTrial();
}

// ---- round summary
function blockSummary(roundNum, then) {
  const title = roundNum === 0 ? 'Practice catch' : 'Round ' + roundNum + ' catch';
  const fish = S.blockFish.slice();
  // 3 rows: 4 fish per row in a main round (12), 3 per row in the practice (9); centred on the screen
  const perRow = Math.ceil(fish.length / 3), ys = [0.2, 0, -0.2];
  const nRow = r => Math.min(perRow, fish.length - r * perRow);
  const xOf = i => (i % perRow - (nRow(Math.floor(i / perRow)) - 1) / 2) * 0.26;
  setScreen({
    draw(t) {
      drawPond();
      drawText(title, 0, 0.4, 0.05, DARK);
      fish.forEach((f, i) => drawImg(f, xOf(i), ys[Math.floor(i / perRow)], 0.15 * sumSize, 0.09 * sumSize));
      if (t >= 1) drawText('Tap to continue', 0, -0.42, 0.03, DARK);
    },
    tap(x, y, t) { if (t >= 1) { playSound('pop'); then(); } },
  });
}

// ---- round graph: points in each round so far (rounds 1-10, not the practice),
// each bar split by fish type. After round 10 a crown marks the best round(s).
const LEVEL_COLOURS = { 1: 'rgb(255, 215, 0)', 2: 'rgb(255, 119, 0)', 3: 'rgb(239, 61, 100)', 4: 'rgb(173, 77, 255)' };   // design palette: yellow, orange, pink, purple
const LEVEL_NAMES = { 1: 'Small fish', 2: 'Good fish', 3: 'Great fish', 4: 'Amazing fish' };
function roundGraph(roundNum, then) {
  const rounds = S.graphRounds;              // fish levels of each finished round (1..roundNum)
  const totals = rounds.map(r => sum(r.map(l => FISH_POINTS[l])));
  const done9 = roundNum >= nRounds;         // from round 9 on: crown, and the extra-round choice
  const canExtra = done9 && roundNum < nRounds + maxExtraRounds;
  const best = Math.max(...totals);
  const nSlots = Math.max(nRounds, roundNum);
  S.row.roundScore = totals[totals.length - 1];
  S.row.bestRound = totals.map((t, i) => (t === best ? i + 1 : null)).filter(Boolean).join(';');
  const title = roundNum < nRounds ? 'Round ' + roundNum + ' of ' + nRounds
    : roundNum === nRounds ? 'All ' + nRounds + ' rounds done!' : 'Extra round ' + (roundNum - nRounds) + ' done!';
  const px = (x, y) => [cx + x * unit, cy - y * unit];
  const rect = (x0, y0, x1, y1) => { const [l, t] = px(x0, y1), [r, b] = px(x1, y0); return [l, t, r - l, b - t]; };
  // buttons below the panel (height units: centre x, centre y, width, height)
  const btnExtra = { x: -0.17, y: -0.435, w: 0.4, h: 0.075, label: 'Keep playing' };
  const btnFinish = { x: 0.2, y: -0.435, w: 0.24, h: 0.075, label: 'Finish' };
  const inBtn = (b, x, y) => Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.h / 2;
  const drawBtn = (b, fill) => {
    const [l, t] = px(b.x - b.w / 2, b.y + b.h / 2);
    ctx.fillStyle = fill; ctx.strokeStyle = 'white'; ctx.lineWidth = unit * 0.004;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(l, t, b.w * unit, b.h * unit, b.h * unit / 2); else ctx.rect(l, t, b.w * unit, b.h * unit);
    ctx.fill(); ctx.stroke();
    drawText(b.label, b.x, b.y, 0.032, 'white', true);
  };
  setScreen({
    begin() { playSound(roundNum === nRounds ? 'fanfare' : 'leaderboard'); },
    draw(t) {
      drawPond();
      drawImg('lb_panel', 0, 0, 0.9, 0.72);
      drawText(title, 0, 0.28, done9 ? 0.045 : 0.05, DARK, true);
      // plot area (height units)
      const x0 = -0.36, x1 = 0.36, y0 = -0.15, y1 = 0.15, maxP = roundLength * FISH_POINTS[4] + 2;   // a round's top score, plus a little room
      const yOf = p => y0 + (y1 - y0) * p / maxP;
      const slot = (x1 - x0) / nSlots, bw = slot * 0.62;
      // no y axis or grid lines: just the line the bars stand on
      ctx.lineWidth = Math.max(1, unit * 0.002); ctx.strokeStyle = DARK;
      { const [l, yy] = px(x0, y0), [r] = px(x1, y0); ctx.beginPath(); ctx.moveTo(l, yy); ctx.lineTo(r, yy); ctx.stroke(); }
      const numSize = nSlots > 12 ? 0.021 : 0.026;
      for (let r = 1; r <= nSlots; r++) {
        const xc = x0 + slot * (r - 0.5);
        drawText(String(r), xc, y0 - 0.03, numSize, DARK, r === roundNum);
        if (r > roundNum) {   // rounds still to come: empty dashed outline
          ctx.setLineDash([unit * 0.006, unit * 0.006]); ctx.strokeStyle = 'rgba(26, 57, 89, 0.25)';
          ctx.strokeRect(...rect(xc - bw / 2, y0, xc + bw / 2, yOf(maxP * 0.12))); ctx.setLineDash([]);
          continue;
        }
        const levels = rounds[r - 1], total = totals[r - 1];
        let p0 = 0;
        for (const lv of [1, 2, 3, 4]) {
          const pts = levels.filter(v => v === lv).length * FISH_POINTS[lv];
          if (!pts) continue;
          const box = rect(xc - bw / 2, yOf(p0), xc + bw / 2, yOf(p0 + pts));
          ctx.fillStyle = LEVEL_COLOURS[lv]; ctx.fillRect(...box);
          ctx.strokeStyle = 'white'; ctx.lineWidth = Math.max(1, unit * 0.002); ctx.strokeRect(...box);
          p0 += pts;
        }
        const isBest = total === best,   // crown on the best round so far, every time
              small = nSlots > 12 ? 0.8 : 1;
        if (r === roundNum) {
          // the player they picked stands on this round's bar (wearing the crown if it is their best)
          const ah = 0.085 * small, aw = ah * 640 / 1120, top = yOf(total);
          drawImg(S.youPic, xc, top + ah / 2, aw, ah);
          if (isBest) drawCrown(xc, top + ah + 0.012 * small, 0.75 * small);
        } else if (isBest) {
          drawCrown(xc, yOf(total) + 0.03 * small, small * (nSlots > 12 ? 0.75 : 1));
        }
        // (no point numbers above the bars)
      }
      drawText('Round', (x0 + x1) / 2, y0 - 0.065, 0.026, DARK, true);
      // key
      [1, 2, 3, 4].forEach((lv, i) => {
        const lx = [-0.34, -0.15, 0.04, 0.22][i], ly = -0.265;
        ctx.fillStyle = LEVEL_COLOURS[lv]; ctx.fillRect(...rect(lx, ly - 0.014, lx + 0.028, ly + 0.014));
        ctx.fillStyle = DARK; ctx.font = `${0.024 * unit}px Arial, Helvetica, sans-serif`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(LEVEL_NAMES[lv], ...px(lx + 0.04, ly));
      });
      if (t < 0.5) return;
      if (canExtra) { drawBtn(btnExtra, 'rgb(40, 150, 90)'); drawBtn(btnFinish, DARK); }
      else drawText(done9 ? 'Tap to finish' : 'Tap to continue', 0, -0.44, 0.035, DARK, true);
    },
    tap(x, y, t) {
      if (t < 0.5) return;
      if (!canExtra) { playSound('pop'); then(); return; }
      if (inBtn(btnExtra, x, y)) {
        playSound('pop');
        S.row.choice = 'extra';
        const k = roundNum - nRounds;   // extra rounds already played
        S.trialPlan.push(...S.extraPlan.slice(k * roundLength, (k + 1) * roundLength));
        S.endN += roundLength;
        then();
      } else if (inBtn(btnFinish, x, y)) {
        playSound('pop');
        S.row.choice = 'finish';
        then();
      }
    },
  });
}

// a gold crown drawn at (x, y), in height units
function drawCrown(x, y, scale = 1) {
  const mx = cx + x * unit, my = cy - y * unit, w = 0.06 * unit * scale, h = 0.042 * unit * scale;
  ctx.beginPath();
  ctx.moveTo(mx - w / 2, my + h / 2); ctx.lineTo(mx - w / 2, my - h / 2 + h * 0.15); ctx.lineTo(mx - w / 4, my);
  ctx.lineTo(mx, my - h / 2); ctx.lineTo(mx + w / 4, my); ctx.lineTo(mx + w / 2, my - h / 2 + h * 0.15);
  ctx.lineTo(mx + w / 2, my + h / 2); ctx.closePath();
  ctx.fillStyle = 'rgb(255, 205, 40)'; ctx.fill();
  ctx.lineWidth = unit * 0.004; ctx.strokeStyle = 'rgb(170, 110, 0)'; ctx.stroke();
  [[-w / 2, -h / 2 + h * 0.15], [0, -h / 2], [w / 2, -h / 2 + h * 0.15]].forEach(([dx, dy]) => {
    ctx.beginPath(); ctx.arc(mx + dx, my + dy, unit * 0.007 * scale, 0, 7); ctx.fillStyle = 'rgb(230, 60, 80)'; ctx.fill();
  });
}

// ---- end of game: the last round graph has been shown, so save and thank them
function endOfGame() {
  S.complete = true;
  saveSession();
  showEnd();
}

// ---------------------------------------------------------------- data storage
const STORE_KEY = 'fishingGame.sessions';
function loadStore() {
  try {
    const store = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    for (const id of Object.keys(store)) if (!store[id].rows || !store[id].rows.length) delete store[id];   // games ended before the first cast
    return store;
  } catch (e) { return {}; }
}
function saveSession() {
  if (!S || !S.rows.length) return;   // nothing to keep until the first cast
  try {
    const store = loadStore();
    const was = store[S.id] || {};
    store[S.id] = { participant: S.participant, date: S.date, complete: S.complete, exported: !!was.exported,
                    nTrials: S.rows.filter(r => r.trialNum).length, rows: S.rows };
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Could not save data', e);
  }
}

const COLUMNS = [
  'participant', 'date', 'expName', 'trialNum', 'roundNum', 'practice', 'trialID',
  'priorCond', 'likeCond', 'inRing', 'netSpot', 'netX', 'netY', 'basket',
  'splash1X', 'splash1Y', 'splash2X', 'splash2Y', 'splash3X', 'splash3Y', 'splash4X', 'splash4Y', 'splash5X', 'splash5Y',
  'splashMeanX', 'splashMeanY', 'realX', 'realY', 'scanRT', 'respX', 'respY', 'rt', 'timedOut', 'respDist', 'respDistPx',
  'fishLevel', 'totalPoints', 'fishImage', 'playerPicked',
  'extraRound', 'roundScore', 'bestRound', 'choice',
  'screenW', 'screenH', 'unitPx',
];
function toCSV(rows) {
  const esc = v => {
    if (v === undefined || v === null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [COLUMNS.join(',')].concat(rows.map(r => COLUMNS.map(c => esc(r[c])).join(','))).join('\n') + '\n';
}
// Returns 'shared' (iPad save sheet used), 'downloaded' (computer browsers),
// 'cancelled' (sheet closed without saving) or 'blocked' (the iPad refused to open the sheet).
async function exportCSV(filename, csvText) {
  const file = new File([csvText], filename, { type: 'text/csv' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });   // no title: iPadOS would save it as an extra text file
      return 'shared';
    } catch (e) {
      return (e && e.name === 'AbortError') ? 'cancelled' : 'blocked';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}
function markExported(id) {
  try {
    const store = loadStore();
    if (store[id]) { store[id].exported = true; localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
  } catch (e) {}
}
// After a game: open the save sheet with this participant's CSV, then go to the start screen.
async function saveFinishedGame() {
  const s = S && loadStore()[S.id];
  if (!s) { showStart(); return; }
  const result = await exportCSV(sessionFilename(s), toCSV(s.rows));
  if (result === 'shared' || result === 'downloaded') { markExported(S.id); showStart(); }
  else showSavePrompt(s);
}
function showSavePrompt(s) {
  $('saveInfo').textContent = `${s.participant}'s data is kept in the game but has not been saved to Files yet.`;
  show('saveScreen');
}
function sessionFilename(s) { return `${s.participant}_${EXP_NAME}_${s.date}.csv`; }

// ---------------------------------------------------------------- researcher screens
// Missing page parts (e.g. an older index.html still cached) must not stop the game from loading
const $ = id => document.getElementById(id) || document.createElement('div');
function show(id) { ['startScreen', 'dataScreen', 'pauseScreen', 'saveScreen'].forEach(o => $(o).classList.toggle('show', o === id)); }
$('saveRetryBtn').addEventListener('click', () => saveFinishedGame());
$('saveNewBtn').addEventListener('click', saveNewData);
$('saveSkipBtn').addEventListener('click', showStart);

function showStart() {
  $('quitWrap').style.display = 'none';
  S = null; screen = null; paused = false;
  ctx.clearRect(0, 0, screenW, screenH);
  drawPond();
  $('pid').value = '';
  $('startErr').textContent = '';
  const store = loadStore();
  const unsaved = Object.values(store).filter(s => !s.exported).length;
  $('saveNewBtn').textContent = unsaved ? `Save data (${unsaved})` : 'All data saved to Files ✓';
  $('saveNewBtn').disabled = !unsaved;
  show('startScreen');
}

// Save every game not yet saved, as separate CSV files, in one save sheet.
// Save data: every game not yet saved, each as its own CSV, in one save sheet.
// Saved games are marked so they aren't offered again (they stay in the game as a backup).
async function saveNewData() {
  const store = loadStore();
  const ids = Object.keys(store).filter(id => !store[id].exported).sort();
  if (!ids.length) return;
  const files = ids.map(id => new File([toCSV(store[id].rows)], sessionFilename(store[id]), { type: 'text/csv' }));
  let ok = false;
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files }); ok = true; }   // no title (see exportCSV)
    catch (e) { ok = false; }                              // sheet closed: nothing marked, try again later
  } else {
    ids.forEach((id, i) => setTimeout(() => downloadCSV(sessionFilename(store[id]), toCSV(store[id].rows)), i * 300));   // computers: one download each
    ok = true;
  }
  if (ok) ids.forEach(markExported);
  showStart();
}

$('startBtn').addEventListener('click', () => {
  const pid = $('pid').value.trim();
  if (!pid) { $('startErr').textContent = 'Please enter a participant ID.'; return; }
  if (!/^[\w.-]+$/.test(pid)) { $('startErr').textContent = 'Use letters, numbers, - or _ only.'; return; }
  $('pid').blur();
  unlockAudio();   // sound can only be switched on by a tap
  newGame(pid);
  show(null);
  try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
  startGame();
});

function renderSessions() {
  const store = loadStore();
  const ids = Object.keys(store).sort((a, b) => (store[b].date > store[a].date ? 1 : -1));
  const list = $('sessionList');
  list.innerHTML = '';
  if (!ids.length) { list.innerHTML = '<li><span class="meta">No games saved yet.</span></li>'; }
  ids.forEach(id => {
    const s = store[id];
    const li = document.createElement('li');
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<b></b><span class="tag ${s.complete ? 'done' : 'part'}">${s.complete ? 'complete' : 'unfinished'}</span>${s.exported ? '<span class="tag done">saved to Files</span>' : ''}<br>
      <span class="small"></span>`;
    meta.querySelector('b').textContent = s.participant;
    meta.querySelector('.small').textContent = `${s.date.replace('_', ' ')} · ${s.nTrials} casts`;
    const btn = document.createElement('button');
    btn.className = 'secondary';
    btn.textContent = 'Export';
    btn.addEventListener('click', async () => {
      const r = await exportCSV(sessionFilename(s), toCSV(s.rows));
      if (r === 'shared' || r === 'downloaded') { markExported(id); renderSessions(); }
    });
    li.append(meta, btn);
    list.appendChild(li);
  });
  $('exportAllBtn').disabled = !ids.length;
  $('deleteAllBtn').disabled = !ids.length;
}
$('dataBtn').addEventListener('click', () => { renderSessions(); show('dataScreen'); });
$('dataBackBtn').addEventListener('click', showStart);
$('exportAllBtn').addEventListener('click', () => {
  const store = loadStore();
  const rows = [].concat(...Object.values(store).map(s => s.rows));
  exportCSV(`all_${EXP_NAME}_${dateStr()}.csv`, toCSV(rows));
});
$('deleteAllBtn').addEventListener('click', () => {
  if (confirm('Delete ALL saved games from this iPad? Export them first – this cannot be undone.')) {
    localStorage.removeItem(STORE_KEY);
    renderSessions();
  }
});

function openPause() {
  paused = true;
  pauseStart = performance.now();
  show('pauseScreen');
}
$('resumeBtn').addEventListener('click', () => {
  screenStart += performance.now() - pauseStart;   // don't count the pause in reaction times
  paused = false;
  show(null);
});
$('quitBtn').addEventListener('click', () => {
  paused = false;
  screen = null;
  saveSession();
  showEnd();
});

// Thank-you screen: no buttons. The data is already saved on the iPad.
// Researcher: tap the top-left corner 5 times to go back to the start screen.
function showEnd() {
  saveSession();
  show(null);
  setScreen({
    isThanks: true,
    draw() {
      drawPond();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.93)';
      ctx.strokeStyle = DARK;
      ctx.lineWidth = Math.max(2, unit * 0.004);
      const w = 0.9 * unit, h = 0.36 * unit;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 0.04 * unit); else ctx.rect(cx - w / 2, cy - h / 2, w, h);
      ctx.fill(); ctx.stroke();
      drawText('Thank you for playing!', 0, 0.06, 0.065, DARK, true);
      drawText('Please hand the iPad back to the researcher.', 0, -0.06, 0.035, DARK);
    },
  });
  // Quit button just below the panel
  const q = $('quitWrap');
  q.style.top = Math.round(cy + 0.24 * unit) + 'px';
  q.style.display = 'flex';
}

// Quit: download this participant's CSV (iPad: Files -> Downloads), then back to the start screen.
function downloadCSV(filename, csvText) {
  const url = URL.createObjectURL(new Blob([csvText], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
// (On the iPad, a plain download from a Home Screen app only opens a preview page, so Quit
//  opens the save sheet instead: Save to Files -> Save. Computers just download the file.)
// Quit: the data is already saved in the game, so go straight back to the start screen.
// (Saving to Files is done in batches from the start screen: "Save new data".)
function finishGame() {
  $('quitWrap').style.display = 'none';
  showStart();
}
$('finishBtn').addEventListener('click', finishGame);

// ---------------------------------------------------------------- start up
resize();
requestAnimationFrame(frame);
loadImages().then(() => {
  $('loading').style.display = 'none';
  showStart();
}).catch(err => {
  $('loading').textContent = err.message;
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const hadOldVersion = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(() => {
    $('offlineNote').textContent = 'Works offline once opened from the Home Screen. Version ' + APP_VERSION;
  }).catch(() => {});
  // A new version has just been downloaded: reload straight away if nobody is playing,
  // so the iPad switches to it without having to close and reopen the app.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadOldVersion && !S) location.reload();
  });
}
