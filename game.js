/* Fishing Game – iPad web version of Fishing2.psyexp
 *
 * Coordinates use PsychoPy 'height' units: the screen height is 1 unit,
 * (0, 0) is the centre, +y is up. Every position and size below is copied
 * from the PsychoPy experiment.
 */
'use strict';

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
const roundLength = 10;
const nTrials = 110;                   // 10 practice + 100 main

// leaderboard players (from your own casts so far)
const bestShare = 0.9;                 // best player = average of your top 90% of casts x 10
const avgDrop = 0.5;                   // average player = your average round - 0.5 SD
const worstShare = 0.5;                // worst player = average of your bottom 50% of casts x 10

const fishPics = {
  1: ['1_1', '1_2', '1_3', '1_4'],
  2: ['2_1', '2_2', '2_3'],
  3: ['3_1', '3_2'],
  4: ['4_1'],
};
const levelWords = { 4: 'Amazing', 3: 'Great', 2: 'Good', 1: 'Small' };
const playerPics = [1, 2, 3, 4, 5, 6, 7, 8].map(k => 'player_' + k);
const playerNames = ['Mia', 'Zoe', 'Ana', 'Rosa', 'Sam', 'Kofi', 'Leo', 'Jun'];
const opponentOrder = [2, 4, 0, 6, 3, 5, 7, 1];
const rowY = [0.14, 0.01, -0.12, -0.25];   // panel centred on the screen
const basketPics = ['basket_brown', 'basket_orange', 'basket_blue'];   // a random one each round
const basketW = 0.16, basketH = 0.151;
const avatarW = 0.063, avatarH = 0.11;    // player pictures are full figures (640 x 1120)

const DARK = 'rgb(26, 57, 89)';        // PsychoPy colour [-0.8, -0.55, -0.3]
const WINDOW_BG = 'rgb(70, 128, 179)'; // PsychoPy window colour [-0.45, 0, 0.4]

const IMAGE_NAMES = [
  'pond', 'net_narrow', 'net_wide', 'splash', 'basket_brown', 'basket_orange', 'basket_blue',
  '1_1', '1_2', '1_3', '1_4', '2_1', '2_2', '2_3', '3_1', '3_2', '4_1',
  'how_step1', 'how_step2', 'how_step3', 'how_step4',
  'lb_panel', 'lb_ranks', 'row_highlight', 'pick_panel', 'player_you',
  ...playerPics,
  'stars_h2', 'stars_h3', 'stars_h4', 'stars_h5', 'stars_h6', 'stars_h7', 'stars_h8', 'stars_h9', 'stars_h10',
  'medal_1', 'medal_2', 'medal_3', 'medal_4',
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
function toHalfStars(score) {
  // round score 15-35 -> 2-10 half stars (1 to 5 stars in steps of 0.5)
  const h = 2 + pyRound((score - 15) / 20 * 8);
  return Math.max(2, Math.min(10, h));
}
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

// ---------------------------------------------------------------- drawing
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let unit = 1, cx = 0, cy = 0;

const APP_VERSION = 'v13';
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
let cornerTaps = [];
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (e.clientX < 60 && e.clientY < 60) {
    const now = performance.now();
    cornerTaps = cornerTaps.filter(t => now - t < 3000);
    cornerTaps.push(now);
    if (cornerTaps.length >= 5 && screen) { cornerTaps = []; openPause(); }
    return;   // corner taps never count as game taps
  }
  if (!screen || paused || !screen.tap) return;
  const x = (e.clientX - cx) / unit;
  const y = (cy - e.clientY) / unit;
  screen.tap(x, y, screenTime());
}, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

// ---------------------------------------------------------------- experiment state
let S = null;   // everything about the current game

function newGame(participant, session) {
  const practice = shuffle(TRIAL_SET.filter(r => r.practice === 1));
  const main = shuffle(TRIAL_SET.filter(r => r.practice === 0));
  S = {
    participant, session,
    date: dateStr(),
    id: participant + '_' + dateStr(),
    trialPlan: practice.concat(main),   // 10 practice first, then 100 main
    thisN: 0,
    rows: [],
    row: null,
    totalPoints: 0,
    blockFish: [], blockLevels: [],
    castHistory: [], roundScores: [], lastRoundScore: 0,
    totals: { You: 0, best: 0, avg: 0, worst: 0 },
    yourPlaces: [],
    youPic: playerPics[1], bestPic: playerPics[2], avgPic: playerPics[4], worstPic: playerPics[0],
    basket: basketPics[1],
    complete: false,
  };
  saveSession();
}

function baseRow() {
  return {
    participant: S.participant, session: S.session, date: S.date, expName: EXP_NAME,
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
      if (i < 3) howPage(i + 1); else nextTrial();
    },
  });
}

function nextTrial() {
  if (S.thisN >= nTrials) { finalRanking(); return; }
  S.row = baseRow();
  if (S.thisN === roundLength) pickPlayer(roundIntroOrTrial);
  else roundIntroOrTrial();
}

function roundIntroOrTrial() {
  const roundNow = Math.floor(S.thisN / roundLength);
  if (S.thisN % roundLength === 0 && roundNow >= 1) pondIntro(roundNow);
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
      drawText("After each round, you'll see how you rank against other players.", 0, -0.32, 0.032, 'black', false, 1.0);
    },
    tap(x, y, t) {
      if (t <= 0.5) return;
      for (let k = 0; k < 8; k++) {
        const px = pickX[k % 4], py = pickY[Math.floor(k / 4)];
        if (Math.abs(x - px) <= pw / 2 && Math.abs(y - py) <= ph / 2) {
          S.youPic = playerPics[k];
          const others = opponentOrder.filter(o => o !== k).slice(0, 3);
          S.bestPic = playerPics[others[0]];
          S.avgPic = playerPics[others[1]];
          S.worstPic = playerPics[others[2]];
          S.row.playerPicked = playerNames[k];
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
      drawText('Round ' + roundNow + ' of 10', 0, 0.4, 0.04, DARK, false, 1.2);
      if (t >= 0.5) drawText('Tap to start', 0, -0.42, 0.03, DARK);
    },
    tap(x, y, t) { if (t >= 0.5) trial(); },
  });
}

// ---- one cast
function trial() {
  const r = S.trialPlan[S.thisN];
  if (S.thisN % roundLength === 0) S.basket = pick(basketPics);   // new basket each round
  const netImage = r.priorCond === 1 ? 'net_wide' : 'net_narrow';
  const priorSD = r.priorCond === 1 ? wideSD : narrowSD;
  const priorRadius = 2 * priorSD;   // circle radius = 2 SDs: about 86% of fish come up inside it
  const splashX = [], splashY = [];
  for (let i = 1; i <= numSplashes; i++) { splashX.push(r['splash' + i + 'X']); splashY.push(r['splash' + i + 'Y']); }
  const row = S.row;
  Object.assign(row, {
    trialID: r.trialID,
    roundNum: Math.floor(S.thisN / roundLength),
    practice: S.thisN < roundLength ? 'True' : 'False',
    trialNum: S.thisN + 1,
    priorCond: r.priorCond, likeCond: r.likeCond, inRing: r.inRing,
    basket: S.basket,
  });
  for (let i = 0; i < numSplashes; i++) {
    row['splash' + (i + 1) + 'X'] = splashX[i];
    row['splash' + (i + 1) + 'Y'] = splashY[i];
  }
  row.splashMeanX = sum(splashX) / numSplashes;
  row.splashMeanY = sum(splashY) / numSplashes;
  row.realX = r.realX;
  row.realY = r.realY;

  setScreen({
    draw() {
      drawPond();
      drawImg(netImage, 0, 0, priorRadius * 2, priorRadius * 2);   // whole net, faded edge included = 2 SD
      for (let i = 0; i < numSplashes; i++) drawImg('splash', splashX[i], splashY[i], 0.06, 0.06);
      drawImg(S.basket, 0, -0.4, basketW, basketH);
    },
    tap(x, y, t) {
      if (t < minDuration) return;
      const respDist = Math.hypot(x - r.realX, y - r.realY);
      let fishLevel;
      if (respDist <= level4Dist) fishLevel = 4;
      else if (respDist <= level3Dist) fishLevel = 3;
      else if (respDist <= level2Dist) fishLevel = 2;
      else fishLevel = 1;
      S.totalPoints += fishLevel;
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
  const holdTime = 1.0, dropTime = 0.8, bucketY = -0.38;
  setScreen({
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
      drawImg(S.basket, 0, -0.4, basketW, basketH);
      drawCircle(respX, respY, 0.01, 'red');
      drawText(catchMsg, 0, 0.42, 0.05, DARK);
      if (t >= 1.8) drawText('Tap for next cast', 0, 0.32, 0.03, DARK);
    },
    tap(x, y, t) { if (t >= 1.8) afterCatch(); },
  });
}

function afterCatch() {
  const endOfBlock = (S.thisN + 1) % roundLength === 0;
  if (!endOfBlock) { advance(); return; }
  const roundNum = Math.floor((S.thisN + 1) / roundLength) - 1;
  blockSummary(roundNum, () => {
    // end of round bookkeeping (summaryCode, End Routine)
    S.lastRoundScore = sum(S.blockLevels);
    S.castHistory = S.castHistory.concat(S.blockLevels);
    S.roundScores.push(S.lastRoundScore);
    S.blockFish = [];
    S.blockLevels = [];
    if (roundNum >= 1) leaderboard(roundNum, advance);
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
  const xs = [-0.4, -0.2, 0, 0.2, 0.4], ys = [0.115, -0.115];   // centred on the screen
  setScreen({
    draw(t) {
      drawPond();
      drawText(title, 0, 0.4, 0.05, DARK);
      fish.forEach((f, i) => drawImg(f, xs[i % 5], ys[Math.floor(i / 5)], 0.15 * sumSize, 0.09 * sumSize));
      if (t >= 1) drawText('Tap to continue', 0, -0.42, 0.03, DARK);
    },
    tap(x, y, t) { if (t >= 1) then(); },
  });
}

// ---- round leaderboard
function leaderboard(roundNum, then) {
  const ranked = S.castHistory.slice().sort((a, b) => a - b);
  const n = ranked.length;
  const kBest = Math.max(1, pyRound(bestShare * n));
  const kWorst = Math.max(1, pyRound(worstShare * n));
  const meanCast = sum(ranked) / n;
  const castSD = Math.sqrt(sum(ranked.map(c => (c - meanCast) ** 2)) / n);
  const roundSD = castSD * Math.sqrt(10);    // how much your round scores usually vary
  const bestScore = sum(ranked.slice(n - kBest)) / kBest * 10;
  const avgScore = meanCast * 10 - avgDrop * roundSD;
  let worstScore = sum(ranked.slice(0, kWorst)) / kWorst * 10;
  // last round: the worst player must end behind you overall
  if (roundNum === 10) {
    const maxWorst = S.totals.You + S.lastRoundScore - S.totals.worst - 1;
    worstScore = Math.max(10, Math.min(worstScore, maxWorst));
  }
  S.totals.You += S.lastRoundScore;
  S.totals.best += bestScore;
  S.totals.avg += avgScore;
  S.totals.worst += worstScore;

  const players = [
    ['You', S.youPic, S.lastRoundScore],
    ['best', S.bestPic, bestScore],
    ['avg', S.avgPic, avgScore],
    ['worst', S.worstPic, worstScore],
  ];
  // highest score first; on a tie the participant goes above
  players.sort((a, b) => (b[2] - a[2]) || ((a[0] === 'You' ? 0 : 1) - (b[0] === 'You' ? 0 : 1)));
  const youRow = players.findIndex(p => p[0] === 'You');
  S.yourPlaces.push(youRow + 1);
  Object.assign(S.row, {
    lbRank: youRow + 1, lbYouScore: S.lastRoundScore,
    lbBest: bestScore, lbAverage: avgScore, lbWorst: worstScore,
  });
  const stars = players.map(p => 'stars_h' + toHalfStars(p[2]));

  setScreen({
    draw(t) {
      drawPond();
      drawImg('lb_panel', 0, 0, 0.9, 0.72);
      drawImg('row_highlight', 0, rowY[youRow], 0.86, 0.115);
      drawImg('lb_ranks', 0, 0, 0.9, 0.72);
      drawText('Round ' + roundNum + ' leaderboard', 0, 0.28, 0.05, DARK, true);
      for (let i = 0; i < 4; i++) {
        drawImg(players[i][1], -0.2, rowY[i], avatarW, avatarH);
        drawImg(stars[i], 0.12, rowY[i], 0.34, 0.065);
      }
      drawText('Tap to continue', 0, -0.42, 0.035, DARK, true);
    },
    tap(x, y, t) { if (t >= 0.5) then(); },
  });
}

// ---- end of game
function finalRanking() {
  const T = S.totals;
  const fp = [
    ['You', S.youPic, T.You],
    ['best', S.bestPic, T.best],
    ['avg', S.avgPic, T.avg],
    ['worst', S.worstPic, T.worst],
  ];
  fp.sort((a, b) => (b[2] - a[2]) || ((a[0] === 'You' ? 0 : 1) - (b[0] === 'You' ? 0 : 1)));
  if (fp[3][0] === 'You') [fp[2], fp[3]] = [fp[3], fp[2]];   // safety: never last
  const nRounds = Math.max(1, S.yourPlaces.length);
  const youRow = fp.findIndex(p => p[0] === 'You');
  const stars = fp.map(p => 'stars_h' + toHalfStars(p[2] / nRounds));
  const finalRow = Object.assign(baseRow(), {
    finalRank: youRow + 1,
    finalTotalYou: T.You, finalTotalBest: T.best, finalTotalAvg: T.avg, finalTotalWorst: T.worst,
  });
  S.rows.push(finalRow);
  S.complete = true;
  saveSession();

  setScreen({
    draw(t) {
      drawPond();
      drawImg('lb_panel', 0, 0, 0.9, 0.72);
      drawImg('row_highlight', 0, rowY[youRow], 0.86, 0.115);
      drawImg('lb_ranks', 0, 0, 0.9, 0.72);
      drawText('Final ranking', 0, 0.28, 0.05, DARK, true);
      for (let i = 0; i < 4; i++) {
        drawImg(fp[i][1], -0.22, rowY[i], avatarW, avatarH);
        drawImg(stars[i], 0.04, rowY[i], 0.3, 0.057);
        drawImg('medal_' + (i + 1), 0.32, rowY[i], 0.085, 0.085);
      }
      drawText('Thanks for playing!  Tap to finish', 0, -0.42, 0.035, DARK, true);
    },
    tap(x, y, t) { if (t >= 1) showEnd(); },
  });
}

// ---------------------------------------------------------------- data storage
const STORE_KEY = 'fishingGame.sessions';
function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
}
function saveSession() {
  if (!S) return;
  try {
    const store = loadStore();
    store[S.id] = { participant: S.participant, session: S.session, date: S.date, complete: S.complete,
                    nTrials: S.rows.filter(r => r.trialNum).length, rows: S.rows };
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Could not save data', e);
  }
}

const COLUMNS = [
  'participant', 'session', 'date', 'expName', 'trialNum', 'roundNum', 'practice', 'trialID',
  'priorCond', 'likeCond', 'inRing', 'basket',
  'splash1X', 'splash1Y', 'splash2X', 'splash2Y', 'splash3X', 'splash3Y', 'splash4X', 'splash4Y', 'splash5X', 'splash5Y',
  'splashMeanX', 'splashMeanY', 'realX', 'realY', 'respX', 'respY', 'rt', 'timedOut', 'respDist', 'respDistPx',
  'fishLevel', 'totalPoints', 'fishImage', 'playerPicked',
  'lbRank', 'lbYouScore', 'lbBest', 'lbAverage', 'lbWorst',
  'finalRank', 'finalTotalYou', 'finalTotalBest', 'finalTotalAvg', 'finalTotalWorst',
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
async function exportCSV(filename, csvText) {
  const file = new File([csvText], filename, { type: 'text/csv' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;   // the researcher closed the share sheet
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function sessionFilename(s) { return `${s.participant}_${EXP_NAME}_${s.date}.csv`; }

// ---------------------------------------------------------------- researcher screens
const $ = id => document.getElementById(id);
function show(id) { ['startScreen', 'dataScreen', 'pauseScreen', 'endScreen'].forEach(o => $(o).classList.toggle('show', o === id)); }

function showStart() {
  S = null; screen = null; paused = false;
  ctx.clearRect(0, 0, screenW, screenH);
  drawPond();
  $('pid').value = '';
  $('startErr').textContent = '';
  const n = Object.keys(loadStore()).length;
  $('dataBtn').textContent = 'Saved data (' + n + ')';
  show('startScreen');
}

$('startBtn').addEventListener('click', () => {
  const pid = $('pid').value.trim();
  if (!pid) { $('startErr').textContent = 'Please enter a participant ID.'; return; }
  if (!/^[\w.-]+$/.test(pid)) { $('startErr').textContent = 'Use letters, numbers, - or _ only.'; return; }
  $('pid').blur();
  newGame(pid, $('session').value.trim() || '001');
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
    meta.innerHTML = `<b></b><span class="tag ${s.complete ? 'done' : 'part'}">${s.complete ? 'complete' : 'unfinished'}</span><br>
      <span class="small"></span>`;
    meta.querySelector('b').textContent = s.participant;
    meta.querySelector('.small').textContent = `${s.date.replace('_', ' ')} · session ${s.session} · ${s.nTrials} casts`;
    const btn = document.createElement('button');
    btn.className = 'secondary';
    btn.textContent = 'Export';
    btn.addEventListener('click', () => exportCSV(sessionFilename(s), toCSV(s.rows)));
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
  if (!confirm('End this game now? The data so far stays saved.')) return;
  paused = false;
  screen = null;
  saveSession();
  showEnd();
});

function showEnd() {
  screen = null;
  ctx.clearRect(0, 0, screenW, screenH);
  drawPond();
  const s = loadStore()[S.id];
  $('endInfo').textContent = `Participant ${S.participant} · ${s ? s.nTrials : 0} casts saved${S.complete ? '' : ' (game ended early)'}.`;
  show('endScreen');
}
$('endExportBtn').addEventListener('click', () => {
  const s = loadStore()[S.id];
  if (s) exportCSV(sessionFilename(s), toCSV(s.rows));
});
$('newBtn').addEventListener('click', showStart);

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
  navigator.serviceWorker.register('sw.js').then(() => {
    $('offlineNote').textContent = 'Works offline once opened from the Home Screen.';
  }).catch(() => {});
}
