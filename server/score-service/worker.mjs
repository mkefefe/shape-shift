import { isPlaygamaGameOrigin } from './playgama-origins.mjs';
import {isReportPath,reportService} from './reports.mjs';
import {aggregate} from './crazygames-aggregate.mjs';
import {publicRankings,personalRank} from './leaderboard-ranks.mjs';
import * as flatScoreRules from './flat-score-engine.js';
import * as timeRules from './time-engine.js';
import * as cosmicRules from './cosmic-engine.js';
import * as blossomRules from './blossom-engine.js';
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// peer-protocol.js
var enc = new TextEncoder();

// run-security.mjs
var PROTOCOL = 2;
var MAX_BATCH = 24;
var MAX_ACTIONS = 1e4;
var digest = async (text) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), (x) => x.toString(16).padStart(2, "0")).join("");
function validateActions(actions) {
  if (!Array.isArray(actions) || !actions.length || actions.length > MAX_ACTIONS) throw Error("Invalid actions");
  for (const a of actions) {
    if (!a || typeof a !== "object" || Array.isArray(a)) throw Error("Invalid action");
    const fields = { loadout: ["type", "frame", "map", "upgrade"], choose: ["type", "index"], expire: ["type"], ability: ["type", "name"], stopAbility: ["type", "name"], revive: ["type"] }[a.type];
    if (!fields || Object.keys(a).sort().join() !== fields.slice().sort().join()) throw Error("Invalid action fields");
    if (a.type === "choose" && (!Number.isInteger(a.index) || a.index < 0 || a.index > 63)) throw Error("Invalid choice");
    if (["ability", "stopAbility"].includes(a.type) && !["boost", "freeze", "shield"].includes(a.name)) throw Error("Invalid ability");
    if (a.type === "loadout" && (!["none", "gold", "ice", "blossom", "cosmic"].includes(a.frame) || !["garden", "moon", "sunset"].includes(a.map) || !Number.isInteger(a.upgrade) || a.upgrade < 0 || a.upgrade > (a.frame === "gold" ? 1 : a.frame === "ice" ? 2 : 0))) throw Error("Invalid loadout");
  }
}
async function verifyCommitments(proof, actions) {
  validateActions(actions);
  if (actions.length !== proof.count) throw Error("Uncommitted actions");
  let at = 0;
  for (const part of JSON.parse(proof.checkpoints)) {
    if (await digest(JSON.stringify(actions.slice(at, at + part.count))) !== part.hash) throw Error("Altered history");
    at += part.count;
  }
  if (at !== actions.length) throw Error("Incomplete history");
  if (actions[0].type !== "loadout" || actions.slice(1).some((a) => a.type === "loadout")) throw Error("Invalid loadout position");
}

// replay/engine-v2.js
var engine_v2_exports = {};
__export(engine_v2_exports, {
  COLORS: () => COLORS,
  SHAPES: () => SHAPES,
  advanceBoard: () => advanceBoard2,
  boardSize: () => boardSize,
  choose: () => choose2,
  createRun: () => createRun2,
  duration: () => duration,
  elapsedBoardTime: () => elapsedBoardTime,
  expire: () => expire2,
  hasMatch: () => hasMatch,
  levelFor: () => levelFor,
  makeBoard: () => makeBoard2,
  matches: () => matches2,
  randomTile: () => randomTile,
  revive: () => revive2,
  seededRandom: () => seededRandom2,
  spendAbility: () => spendAbility2,
  streakBonus: () => streakBonus
});
var SHAPES = ["circle", "triangle", "square", "star"];
var COLORS = ["red", "blue", "green", "yellow"];
var matches2 = (a, b) => a.shape === b.shape || a.color === b.color;
var levelFor = (score) => 1 + Math.floor(score / 4);
var boardSize = (state) => [2, 4, 4, 6, 6, 9][Math.min(5, state.picks)];
var duration = (state) => Math.max(1050, 2100 - state.picks * 25);
var randomTile = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun2 = (rng = Math.random) => ({ current: randomTile(rng), score: 0, picks: 0, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom2(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard2(state, rng = Math.random) {
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) }));
  const valid = shuffled(all.filter((t) => matches2(state.current, t)), rng);
  const invalid = shuffled(all.filter((t) => !matches2(state.current, t)), rng);
  const size = boardSize(state);
  if (rng() < 0.13) return invalid.slice(0, size);
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  return shuffled([...valid.slice(0, matchCount), ...invalid.slice(0, size - matchCount)], rng);
}
var hasMatch = (state, board) => board.some((tile) => matches2(state.current, tile));
function mistake(state, outcome) {
  state = { ...state, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) return { ...state, protected: false, outcome: "protected" };
  const strikes = Math.min(3, state.strikes + 1);
  return { ...state, strikes, over: strikes === 3, outcome };
}
function choose2(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (!matches2(state.current, tile)) return mistake(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const bonus = streakBonus(colorStreak) + streakBonus(shapeStreak);
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, strikes: state.strikes, level: levelFor(picks), protected: state.protected, outcome: "correct" };
}
function expire2(state, board) {
  if (state.over) return state;
  return hasMatch(state, board) ? mistake(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility2(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard2(state) {
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive2(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, outcome: "revived" };
}
var elapsedBoardTime = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);

// replay/engine-v3.js
var engine_v3_exports = {};
__export(engine_v3_exports, {
  COLORS: () => COLORS2,
  SHAPES: () => SHAPES2,
  SPECIALS: () => SPECIALS,
  advanceBoard: () => advanceBoard3,
  boardSize: () => boardSize2,
  choose: () => choose3,
  createRun: () => createRun3,
  duration: () => duration2,
  elapsedBoardTime: () => elapsedBoardTime2,
  expire: () => expire3,
  hasMatch: () => hasMatch2,
  levelFor: () => levelFor2,
  makeBoard: () => makeBoard3,
  matches: () => matches3,
  randomTile: () => randomTile2,
  revive: () => revive3,
  seededRandom: () => seededRandom3,
  spendAbility: () => spendAbility3,
  streakBonus: () => streakBonus2
});
var SHAPES2 = ["circle", "triangle", "square", "star"];
var COLORS2 = ["red", "blue", "green", "yellow"];
var SPECIALS = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches3 = (a, b) => SPECIALS.includes(b.special) || a.shape === b.shape || a.color === b.color;
var levelFor2 = (score) => 1 + Math.floor(score / 4);
var boardSize2 = (state) => [1, 1, 2, 3, 4, 4, 6, 6, 9, 12, 12, 16][Math.min(11, state.stage ?? state.picks)];
var duration2 = (state) => Math.max(1050, 2100 - state.picks * 25);
var randomTile2 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun3 = (rng = Math.random) => ({ current: randomTile2(rng), score: 0, picks: 0, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus2 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom3(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled2(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard3(state, rng = Math.random) {
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) }));
  const valid = shuffled2(all.filter((t) => matches3(state.current, t)), rng);
  const invalid = shuffled2(all.filter((t) => !matches3(state.current, t)), rng);
  const size = boardSize2(state);
  const noMatch = rng() < 0.13;
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const normal = shuffled2([...valid.slice(0, noMatch ? 0 : matchCount), ...Array.from({ length: size - (noMatch ? 0 : matchCount) }, (_, i) => invalid[i % invalid.length])], rng);
  const pending = state.pendingSpecials || [];
  for (const [slot, entry] of pending.slice(0, size).entries()) normal[slot] = { special: entry.special };
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && rng() < 0.09) {
    const available = normal.map((t, i) => t.special ? -1 : i).filter((i) => i >= 0);
    const slot = pending.length;
    normal[slot] = { special: SPECIALS[Math.floor(rng() * SPECIALS.length)] };
  }
  return normal;
}
var retained = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch2 = (state, board) => board.some((tile) => matches3(state.current, tile));
function mistake2(state, outcome) {
  state = { ...state, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) return { ...state, protected: false, outcome: "protected" };
  const strikes = Math.min(3, state.strikes + 1);
  return { ...state, strikes, over: strikes === 3, outcome };
}
function choose3(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  state = { ...state, pendingSpecials: [...retained(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier;
    return {
      ...state,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + 1,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(4, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches3(state.current, tile)) return mistake2(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const bonus = streakBonus2(colorStreak) + streakBonus2(shapeStreak);
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor2(picks), protected: state.protected, outcome: "correct" };
}
function expire3(state, board) {
  if (state.over) return state;
  state = { ...state, pendingSpecials: [...retained(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return hasMatch2(state, board) ? mistake2(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility3(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard3(state) {
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive3(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, outcome: "revived" };
}
var elapsedBoardTime2 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);

// replay/engine-v4.js
var engine_v4_exports = {};
__export(engine_v4_exports, {
  COLORS: () => COLORS3,
  SHAPES: () => SHAPES3,
  SPECIALS: () => SPECIALS2,
  advanceBoard: () => advanceBoard4,
  boardSize: () => boardSize3,
  choose: () => choose4,
  createRun: () => createRun4,
  duration: () => duration3,
  elapsedBoardTime: () => elapsedBoardTime3,
  expire: () => expire4,
  frameDelta: () => frameDelta,
  hasMatch: () => hasMatch3,
  levelFor: () => levelFor3,
  makeBoard: () => makeBoard4,
  matches: () => matches4,
  randomTile: () => randomTile3,
  revive: () => revive4,
  seededRandom: () => seededRandom4,
  spendAbility: () => spendAbility4,
  streakBonus: () => streakBonus3
});
var SHAPES3 = ["circle", "triangle", "square", "star"];
var COLORS3 = ["red", "blue", "green", "yellow"];
var SPECIALS2 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches4 = (a, b) => SPECIALS2.includes(b.special) || a.shape === b.shape || a.color === b.color;
var levelFor3 = (score) => 1 + Math.floor(score / 4);
var boardSize3 = (state) => {
  const progress = state.stage ?? state.picks;
  return progress < 2 ? 1 : progress < 8 ? 2 : progress < 14 ? 3 : progress < 24 ? 4 : progress < 39 ? 6 : progress < 59 ? 9 : progress < 84 ? 12 : 16;
};
var duration3 = (state) => Math.max(1800, 2800 - state.picks * 5);
var randomTile3 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun4 = (rng = Math.random) => ({ current: randomTile3(rng), score: 0, picks: 0, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus3 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom4(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled3(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard4(state, rng = Math.random) {
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) }));
  const valid = shuffled3(all.filter((t) => matches4(state.current, t)), rng);
  const invalid = shuffled3(all.filter((t) => !matches4(state.current, t)), rng);
  const size = boardSize3(state);
  const noMatch = rng() < 0.13;
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const normal = shuffled3([...valid.slice(0, noMatch ? 0 : matchCount), ...Array.from({ length: size - (noMatch ? 0 : matchCount) }, (_, i) => invalid[i % invalid.length])], rng);
  const pending = state.pendingSpecials || [];
  for (const [slot, entry] of pending.slice(0, size).entries()) normal[slot] = { special: entry.special };
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && rng() < 0.09) {
    const available = normal.map((t, i) => t.special ? -1 : i).filter((i) => i >= 0);
    const slot = pending.length;
    normal[slot] = { special: SPECIALS2[Math.floor(rng() * SPECIALS2.length)] };
  }
  return normal;
}
var retained2 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch3 = (state, board) => board.some((tile) => matches4(state.current, tile));
function mistake3(state, outcome) {
  state = { ...state, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) return { ...state, protected: false, outcome: "protected" };
  const strikes = Math.min(3, state.strikes + 1);
  return { ...state, strikes, over: strikes === 3, outcome };
}
function choose4(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  state = { ...state, pendingSpecials: [...retained2(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier;
    return {
      ...state,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + 1,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(4, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches4(state.current, tile)) return mistake3(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const bonus = streakBonus3(colorStreak) + streakBonus3(shapeStreak);
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor3(picks), protected: state.protected, outcome: "correct" };
}
function expire4(state, board) {
  if (state.over) return state;
  state = { ...state, pendingSpecials: [...retained2(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return hasMatch3(state, board) ? mistake3(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility4(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard4(state) {
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive4(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, outcome: "revived" };
}
var elapsedBoardTime3 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta = (now, last) => Math.min(100, Math.max(0, now - last));

// replay/engine-v5.js
var engine_v5_exports = {};
__export(engine_v5_exports, {
  COLORS: () => COLORS4,
  SHAPES: () => SHAPES4,
  SPECIALS: () => SPECIALS3,
  advanceBoard: () => advanceBoard5,
  boardSize: () => boardSize4,
  choose: () => choose5,
  createRun: () => createRun5,
  duration: () => duration4,
  elapsedBoardTime: () => elapsedBoardTime4,
  expire: () => expire5,
  frameDelta: () => frameDelta2,
  hasMatch: () => hasMatch4,
  levelFor: () => levelFor4,
  makeBoard: () => makeBoard5,
  matches: () => matches5,
  randomTile: () => randomTile4,
  revive: () => revive5,
  seededRandom: () => seededRandom5,
  spendAbility: () => spendAbility5,
  streakBonus: () => streakBonus4
});
var SHAPES4 = ["circle", "triangle", "square", "star"];
var COLORS4 = ["red", "blue", "green", "yellow"];
var SPECIALS3 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches5 = (a, b) => SPECIALS3.includes(b.special) || a.shape === b.shape || a.color === b.color;
var levelFor4 = (score) => 1 + Math.floor(score / 4);
var boardSize4 = (state) => {
  const progress = state.stage ?? state.picks;
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var duration4 = (state) => Math.max(1800, 2800 - state.picks * 5);
var randomTile4 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun5 = (rng = Math.random) => ({ current: randomTile4(rng), score: 0, picks: 0, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus4 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom5(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled4(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard5(state, rng = Math.random) {
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) }));
  const valid = shuffled4(all.filter((t) => matches5(state.current, t)), rng);
  const invalid = shuffled4(all.filter((t) => !matches5(state.current, t)), rng);
  const size = boardSize4(state);
  const noMatch = rng() < 0.13;
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const normal = shuffled4([...valid.slice(0, noMatch ? 0 : matchCount), ...Array.from({ length: size - (noMatch ? 0 : matchCount) }, (_, i) => invalid[i % invalid.length])], rng);
  const pending = state.pendingSpecials || [];
  for (const [slot, entry] of pending.slice(0, size).entries()) normal[slot] = { special: entry.special };
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && rng() < 0.09) {
    const available = normal.map((t, i) => t.special ? -1 : i).filter((i) => i >= 0);
    const slot = pending.length;
    normal[slot] = { special: SPECIALS3[Math.floor(rng() * SPECIALS3.length)] };
  }
  return normal;
}
var retained3 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch4 = (state, board) => board.some((tile) => matches5(state.current, tile));
function mistake4(state, outcome) {
  state = { ...state, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) return { ...state, protected: false, outcome: "protected" };
  const strikes = Math.min(3, state.strikes + 1);
  return { ...state, strikes, over: strikes === 3, outcome };
}
function choose5(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  state = { ...state, pendingSpecials: [...retained3(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier;
    return {
      ...state,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + 1,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(4, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches5(state.current, tile)) return mistake4(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const bonus = streakBonus4(colorStreak) + streakBonus4(shapeStreak);
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor4(picks), protected: state.protected, outcome: "correct" };
}
function expire5(state, board) {
  if (state.over) return state;
  state = { ...state, pendingSpecials: [...retained3(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return hasMatch4(state, board) ? mistake4(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility5(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard5(state) {
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive5(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, outcome: "revived" };
}
var elapsedBoardTime4 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta2 = (now, last) => Math.min(100, Math.max(0, now - last));

// replay/engine-v6.js
var engine_v6_exports = {};
__export(engine_v6_exports, {
  COLORS: () => COLORS5,
  SHAPES: () => SHAPES5,
  SPECIALS: () => SPECIALS4,
  abilityActive: () => abilityActive,
  advanceBoard: () => advanceBoard6,
  applyLoadout: () => applyLoadout2,
  boardSize: () => boardSize5,
  choose: () => choose6,
  createRun: () => createRun6,
  duration: () => duration5,
  elapsedBoardTime: () => elapsedBoardTime5,
  expire: () => expire6,
  frameDelta: () => frameDelta3,
  hasMatch: () => hasMatch5,
  levelFor: () => levelFor5,
  makeBoard: () => makeBoard6,
  matches: () => matches6,
  randomTile: () => randomTile5,
  revive: () => revive6,
  seededRandom: () => seededRandom6,
  spendAbility: () => spendAbility6,
  stopAbility: () => stopAbility2,
  streakBonus: () => streakBonus5
});
var SHAPES5 = ["circle", "triangle", "square", "star"];
var COLORS5 = ["red", "blue", "green", "yellow"];
var SPECIALS4 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches6 = (a, b) => SPECIALS4.includes(b.special) || a.shape === b.shape || a.color === b.color;
var levelFor5 = (score) => 1 + Math.floor(score / 4);
var boardSize5 = (state) => {
  const progress = state.stage ?? state.picks;
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var duration5 = (state) => Math.round((Math.max(1800, 2800 - state.picks * 5) + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
var randomTile5 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun6 = (rng = Math.random) => ({ current: randomTile5(rng), score: 0, picks: 0, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus5 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom6(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled5(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard6(state, rng = Math.random) {
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) }));
  const valid = shuffled5(all.filter((t) => matches6(state.current, t)), rng);
  const invalid = shuffled5(all.filter((t) => !matches6(state.current, t)), rng);
  const size = boardSize5(state);
  const noMatch = rng() < 0.13;
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const normal = shuffled5([...valid.slice(0, noMatch ? 0 : matchCount), ...Array.from({ length: size - (noMatch ? 0 : matchCount) }, (_, i) => invalid[i % invalid.length])], rng);
  const pending = state.pendingSpecials || [];
  for (const [slot, entry] of pending.slice(0, size).entries()) normal[slot] = { special: entry.special };
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && rng() < 0.09) {
    const available = normal.map((t, i) => t.special ? -1 : i).filter((i) => i >= 0);
    const slot = pending.length;
    normal[slot] = { special: SPECIALS4[Math.floor(rng() * SPECIALS4.length)] };
  }
  return normal;
}
var retained4 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch5 = (state, board) => board.some((tile) => matches6(state.current, tile));
function mistake5(state, outcome) {
  state = { ...state, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) return { ...state, protected: false, outcome: "protected" };
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function choose6(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  state = { ...state, pendingSpecials: [...retained4(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier + (tile.special === "starburst" && state.frame === "cosmic" ? 2 : 0);
    return {
      ...state,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + 1,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || tile.special === "heart" && state.frame === "blossom" || state.protected,
      shieldEnabled: tile.special === "crystal" || tile.special === "heart" && state.frame === "blossom" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(4, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches6(state.current, tile)) return mistake5(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus5(colorStreak) + streakBonus5(shapeStreak);
  const bonus = streak + (streak && state.map === "sunset" ? 2 : 0);
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor5(picks), protected: state.protected, outcome: "correct" };
}
function expire6(state, board) {
  if (state.over) return state;
  state = { ...state, pendingSpecials: [...retained4(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return hasMatch5(state, board) ? mistake5(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility6(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard6(state) {
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive6(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, outcome: "revived" };
}
var elapsedBoardTime5 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta3 = (now, last) => Math.min(100, Math.max(0, now - last));
function applyLoadout2(state, frame = "none", map = "garden") {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  return { ...state, frame, map, maxLives: frame === "gold" ? 4 : 3, timeFactor: (frame === "ice" ? 1.1 : 1) * (map === "moon" ? 1.08 : 1) };
}
var abilityActive = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility2(state, name) {
  if (!abilityActive(state, name)) return state;
  if (name === "shield") return { ...state, protected: false };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}

// replay/engine-v7.js
var engine_v7_exports = {};
__export(engine_v7_exports, {
  COLORS: () => COLORS6,
  SHAPES: () => SHAPES6,
  SPECIALS: () => SPECIALS5,
  abilityActive: () => abilityActive2,
  advanceBoard: () => advanceBoard7,
  applyLoadout: () => applyLoadout3,
  boardSize: () => boardSize6,
  choose: () => choose7,
  createRun: () => createRun7,
  duration: () => duration6,
  elapsedBoardTime: () => elapsedBoardTime6,
  expire: () => expire7,
  frameDelta: () => frameDelta4,
  hasMatch: () => hasMatch6,
  levelFor: () => levelFor6,
  makeBoard: () => makeBoard7,
  matches: () => matches7,
  randomTile: () => randomTile6,
  revive: () => revive7,
  seededRandom: () => seededRandom7,
  spendAbility: () => spendAbility7,
  stopAbility: () => stopAbility3,
  streakBonus: () => streakBonus6
});
var SHAPES6 = ["circle", "triangle", "square", "star"];
var COLORS6 = ["red", "blue", "green", "yellow"];
var SPECIALS5 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches7 = (a, b) => !b.collected && (SPECIALS5.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor6 = (score) => 1 + Math.floor(score / 4);
var boardSize6 = (state) => {
  const progress = state.stage ?? state.picks;
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var duration6 = (state) => Math.round((Math.max(1800, 2800 - state.picks * 5) + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
var randomTile6 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun7 = (rng = Math.random) => ({ current: randomTile6(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus6 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom7(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled6(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard7(state, rng = Math.random) {
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize6(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) }));
  const valid = shuffled6(all.filter((t) => matches7(state.current, t)), rng);
  const invalid = shuffled6(all.filter((t) => !matches7(state.current, t)), rng);
  const size = boardSize6(state);
  const noMatch = rng() < 0.13;
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const normal = shuffled6([...valid.slice(0, noMatch ? 0 : matchCount), ...Array.from({ length: size - (noMatch ? 0 : matchCount) }, (_, i) => invalid[i % invalid.length])], rng);
  const pending = state.pendingSpecials || [];
  for (const [slot, entry] of pending.slice(0, size).entries()) normal[slot] = { special: entry.special };
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && rng() < (state.map === "sunset" ? 0.2 : 0.09)) {
    const available = normal.map((t, i) => t.special ? -1 : i).filter((i) => i >= 0);
    const slot = pending.length;
    normal[slot] = { special: SPECIALS5[Math.floor(rng() * SPECIALS5.length)] };
  }
  return normal;
}
var retained5 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch6 = (state, board) => board.some((tile) => matches7(state.current, tile));
function mistake6(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) return { ...state, protected: false, outcome: "protected" };
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function choose7(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected) return state;
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + state.multiplier, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: state.multiplier, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, pendingSpecials: [...retained5(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier;
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + 1,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || tile.special === "heart" && state.frame === "blossom" || state.protected,
      shieldEnabled: tile.special === "crystal" || tile.special === "heart" && state.frame === "blossom" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(4, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches7(state.current, tile)) return mistake6(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus6(colorStreak) + streakBonus6(shapeStreak);
  const bonus = streak;
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor6(picks), protected: state.protected, outcome: "correct" };
}
function expire7(state, board) {
  if (state.over) return state;
  if (board.some((t) => t.bonusTile)) return mistake6({ ...state, sweepPending: false, sweepStarted: false, sweepBoard: board.map((t) => ({ ...t })), specialEffect: null, earned: 0 }, "miss");
  state = { ...state, pendingSpecials: [...retained5(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return hasMatch6(state, board) ? mistake6(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility7(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard7(state) {
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive7(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, outcome: "revived" };
}
var elapsedBoardTime6 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta4 = (now, last) => Math.min(100, Math.max(0, now - last));
function applyLoadout3(state, frame = "none", map = "garden") {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  return { ...state, frame, map, maxLives: frame === "gold" ? 4 : 3, timeFactor: (frame === "ice" ? 1.1 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive2 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility3(state, name) {
  if (!abilityActive2(state, name)) return state;
  if (name === "shield") return { ...state, protected: false };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}

// replay/engine-v8.js
var engine_v8_exports = {};
__export(engine_v8_exports, {
  COLORS: () => COLORS7,
  SHAPES: () => SHAPES7,
  SPECIALS: () => SPECIALS6,
  abilityActive: () => abilityActive3,
  advanceBoard: () => advanceBoard8,
  applyLoadout: () => applyLoadout4,
  boardSize: () => boardSize7,
  choose: () => choose8,
  createRun: () => createRun8,
  duration: () => duration7,
  elapsedBoardTime: () => elapsedBoardTime7,
  expire: () => expire8,
  frameDelta: () => frameDelta5,
  hasMatch: () => hasMatch7,
  levelFor: () => levelFor7,
  makeBoard: () => makeBoard8,
  matches: () => matches8,
  randomTile: () => randomTile7,
  revive: () => revive8,
  seededRandom: () => seededRandom8,
  spendAbility: () => spendAbility8,
  stopAbility: () => stopAbility4,
  streakBonus: () => streakBonus7
});
var SHAPES7 = ["circle", "triangle", "square", "star"];
var COLORS7 = ["red", "blue", "green", "yellow"];
var SPECIALS6 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches8 = (a, b) => !b.collected && (SPECIALS6.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor7 = (score) => 1 + Math.floor(score / 4);
var boardSize7 = (state) => {
  const progress = state.stage ?? state.picks;
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var duration7 = (state) => Math.round((Math.max(1800, 2800 - state.picks * 5) + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
var randomTile7 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun8 = (rng = Math.random) => ({ current: randomTile7(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, protectionHits: 0, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus7 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom8(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled7(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard8(state, rng = Math.random) {
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize7(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) }));
  const valid = shuffled7(all.filter((t) => matches8(state.current, t)), rng);
  const invalid = shuffled7(all.filter((t) => !matches8(state.current, t)), rng);
  const size = boardSize7(state);
  const noMatch = rng() < 0.13;
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const normal = shuffled7([...valid.slice(0, noMatch ? 0 : matchCount), ...Array.from({ length: size - (noMatch ? 0 : matchCount) }, (_, i) => invalid[i % invalid.length])], rng);
  const pending = state.pendingSpecials || [];
  for (const [slot, entry] of pending.slice(0, size).entries()) normal[slot] = { special: entry.special };
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && rng() < (state.map === "sunset" ? 0.2 : 0.09)) {
    const available = normal.map((t, i) => t.special ? -1 : i).filter((i) => i >= 0);
    const slot = pending.length;
    normal[slot] = { special: SPECIALS6[Math.floor(rng() * SPECIALS6.length)] };
  }
  return normal;
}
var retained6 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch7 = (state, board) => board.some((tile) => matches8(state.current, tile));
function mistake7(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) {
    const protectionHits = Math.max(0, (state.protectionHits || 1) - 1);
    return { ...state, protectionHits, protected: protectionHits > 0, outcome: "protected" };
  }
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function choose8(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected) return state;
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + state.multiplier, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: state.multiplier, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, pendingSpecials: [...retained6(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier * (tile.special === "starburst" && state.frame === "blossom" ? 2 : 1);
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + 1,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      protectionHits: tile.special === "crystal" ? Math.max(state.protectionHits || 0, state.frame === "blossom" ? 2 : 1) : state.protectionHits,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(state.frame === "blossom" ? 7 : 4, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches8(state.current, tile)) return mistake7(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus7(colorStreak) + streakBonus7(shapeStreak);
  const bonus = streak;
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor7(picks), protected: state.protected, outcome: "correct" };
}
function expire8(state, board) {
  if (state.over) return state;
  if (board.some((t) => t.bonusTile)) return mistake7({ ...state, sweepPending: false, sweepStarted: false, sweepBoard: board.map((t) => ({ ...t })), specialEffect: null, earned: 0 }, "miss");
  state = { ...state, pendingSpecials: [...retained6(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return hasMatch7(state, board) ? mistake7(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility8(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, protectionHits: ability === "shield" ? 1 : state.protectionHits, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard8(state) {
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive8(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, outcome: "revived" };
}
var elapsedBoardTime7 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta5 = (now, last) => Math.min(100, Math.max(0, now - last));
function applyLoadout4(state, frame = "none", map = "garden") {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  return { ...state, frame, map, maxLives: frame === "gold" ? 4 : 3, timeFactor: (frame === "ice" ? 1.1 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive3 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility4(state, name) {
  if (!abilityActive3(state, name)) return state;
  if (name === "shield") return { ...state, protected: false, protectionHits: 0 };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}

// replay/engine-v9.js
var engine_v9_exports = {};
__export(engine_v9_exports, {
  COLORS: () => COLORS8,
  SHAPES: () => SHAPES8,
  SPECIALS: () => SPECIALS7,
  abilityActive: () => abilityActive4,
  advanceBoard: () => advanceBoard9,
  applyLoadout: () => applyLoadout5,
  boardSize: () => boardSize8,
  choose: () => choose9,
  createRun: () => createRun9,
  duration: () => duration8,
  elapsedBoardTime: () => elapsedBoardTime8,
  expire: () => expire9,
  frameDelta: () => frameDelta6,
  hasMatch: () => hasMatch8,
  levelFor: () => levelFor8,
  makeBoard: () => makeBoard9,
  matches: () => matches9,
  randomTile: () => randomTile8,
  revive: () => revive9,
  seededRandom: () => seededRandom9,
  spendAbility: () => spendAbility9,
  stopAbility: () => stopAbility5,
  streakBonus: () => streakBonus8
});
var SHAPES8 = ["circle", "triangle", "square", "star"];
var COLORS8 = ["red", "blue", "green", "yellow"];
var SPECIALS7 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches9 = (a, b) => !b.collected && (SPECIALS7.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor8 = (score) => 1 + Math.floor(score / 4);
var boardSize8 = (state) => {
  const progress = state.stage ?? state.picks;
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var duration8 = (state) => Math.round((Math.max(1800, 2800 - state.picks * 5) + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
var randomTile8 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun9 = (rng = Math.random) => ({ current: randomTile8(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, protectionHits: 0, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus8 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom9(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled8(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard9(state, rng = Math.random) {
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize8(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) })).filter((t) => t.shape !== state.excludedShape);
  const valid = shuffled8(all.filter((t) => matches9(state.current, t)), rng);
  const invalid = shuffled8(all.filter((t) => !matches9(state.current, t)), rng);
  const size = boardSize8(state);
  const noMatch = rng() < 0.13;
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const normal = shuffled8([...valid.slice(0, noMatch ? 0 : matchCount), ...Array.from({ length: size - (noMatch ? 0 : matchCount) }, (_, i) => invalid[i % invalid.length])], rng);
  const pending = state.pendingSpecials || [];
  for (const [slot, entry] of pending.slice(0, size).entries()) normal[slot] = { special: entry.special };
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && rng() < (state.map === "sunset" ? 0.2 : 0.09)) {
    const available = normal.map((t, i) => t.special ? -1 : i).filter((i) => i >= 0);
    const slot = pending.length;
    normal[slot] = { special: SPECIALS7[Math.floor(rng() * SPECIALS7.length)] };
  }
  return normal;
}
var retained7 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch8 = (state, board) => board.some((tile) => matches9(state.current, tile));
function mistake8(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) {
    const protectionHits = Math.max(0, (state.protectionHits || 1) - 1);
    return { ...state, protectionHits, protected: protectionHits > 0, outcome: "protected" };
  }
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function choose9(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected) return state;
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + state.multiplier, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: state.multiplier, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, pendingSpecials: [...retained7(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier;
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + 1,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      protectionHits: tile.special === "crystal" ? Math.max(state.protectionHits || 0, 1) : state.protectionHits,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(4, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches9(state.current, tile)) return mistake8(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus8(colorStreak) + streakBonus8(shapeStreak);
  const bonus = streak;
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor8(picks), protected: state.protected, outcome: "correct" };
}
function expire9(state, board) {
  if (state.over) return state;
  if (board.some((t) => t.bonusTile)) return mistake8({ ...state, sweepPending: false, sweepStarted: false, sweepBoard: board.map((t) => ({ ...t })), specialEffect: null, earned: 0 }, "miss");
  state = { ...state, pendingSpecials: [...retained7(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return hasMatch8(state, board) ? mistake8(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility9(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, protectionHits: ability === "shield" ? 1 : state.protectionHits, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard9(state) {
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive9(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, outcome: "revived" };
}
var elapsedBoardTime8 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta6 = (now, last) => Math.min(100, Math.max(0, now - last));
function applyLoadout5(state, frame = "none", map = "garden", rng = Math.random) {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  const excludedShape = frame === "blossom" ? Math.min(3, Math.floor(rng() * 4)) : null;
  const allowed = [0, 1, 2, 3].filter((shape) => shape !== excludedShape);
  const current = state.current.shape === excludedShape ? { ...state.current, shape: allowed[Math.min(2, Math.floor(rng() * 3))] } : state.current;
  return { ...state, current, excludedShape, frame, map, maxLives: frame === "gold" ? 4 : 3, timeFactor: (frame === "ice" ? 1.1 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive4 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility5(state, name) {
  if (!abilityActive4(state, name)) return state;
  if (name === "shield") return { ...state, protected: false, protectionHits: 0 };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}

// replay/engine-v10.js
var engine_v10_exports = {};
__export(engine_v10_exports, {
  COLORS: () => COLORS9,
  SHAPES: () => SHAPES9,
  SPECIALS: () => SPECIALS8,
  abilityActive: () => abilityActive5,
  advanceBoard: () => advanceBoard10,
  applyLoadout: () => applyLoadout6,
  boardSize: () => boardSize9,
  choose: () => choose10,
  createRun: () => createRun10,
  duration: () => duration9,
  elapsedBoardTime: () => elapsedBoardTime9,
  expire: () => expire10,
  frameDelta: () => frameDelta7,
  hasMatch: () => hasMatch9,
  levelFor: () => levelFor9,
  makeBoard: () => makeBoard10,
  matches: () => matches10,
  randomTile: () => randomTile9,
  revive: () => revive10,
  seededRandom: () => seededRandom10,
  spendAbility: () => spendAbility10,
  stopAbility: () => stopAbility6,
  streakBonus: () => streakBonus9
});
var SHAPES9 = ["circle", "triangle", "square", "star"];
var COLORS9 = ["red", "blue", "green", "yellow"];
var SPECIALS8 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches10 = (a, b) => !b.collected && (SPECIALS8.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor9 = (score) => 1 + Math.floor(score / 4);
var boardSize9 = (state) => {
  const progress = state.stage ?? state.picks;
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var duration9 = (state) => Math.round((Math.max(1800, 2800 - state.picks * 5) + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
var randomTile9 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun10 = (rng = Math.random) => ({ current: randomTile9(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, protectionHits: 0, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus9 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom10(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled9(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard10(state, rng = Math.random) {
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize9(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) })).filter((t) => t.shape !== state.excludedShape);
  const valid = shuffled9(all.filter((t) => matches10(state.current, t)), rng);
  const invalid = shuffled9(all.filter((t) => !matches10(state.current, t)), rng);
  const size = boardSize9(state);
  const noMatch = rng() < 0.13;
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const normal = shuffled9([...valid.slice(0, noMatch ? 0 : matchCount), ...Array.from({ length: size - (noMatch ? 0 : matchCount) }, (_, i) => invalid[i % invalid.length])], rng);
  const pending = state.pendingSpecials || [];
  for (const [slot, entry] of pending.slice(0, size).entries()) normal[slot] = { special: entry.special };
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && rng() < (state.map === "sunset" ? 0.2 : 0.09)) {
    const available = normal.map((t, i) => t.special ? -1 : i).filter((i) => i >= 0);
    const slot = pending.length;
    normal[slot] = { special: SPECIALS8[Math.floor(rng() * SPECIALS8.length)] };
  }
  return normal;
}
var retained8 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch9 = (state, board) => board.some((tile) => matches10(state.current, tile));
function mistake9(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) {
    const protectionHits = Math.max(0, (state.protectionHits || 1) - 1);
    return { ...state, protectionHits, protected: protectionHits > 0, outcome: "protected" };
  }
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function choose10(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected) return state;
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + state.multiplier, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: state.multiplier, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, pendingSpecials: [...retained8(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier;
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + 1,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      protectionHits: tile.special === "crystal" ? Math.max(state.protectionHits || 0, 1) : state.protectionHits,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(4, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches10(state.current, tile)) return mistake9(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus9(colorStreak) + streakBonus9(shapeStreak);
  const bonus = streak;
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor9(picks), protected: state.protected, outcome: "correct" };
}
function expire10(state, board) {
  if (state.over) return state;
  if (board.some((t) => t.bonusTile)) return mistake9({ ...state, sweepPending: false, sweepStarted: false, sweepBoard: board.map((t) => ({ ...t })), specialEffect: null, earned: 0 }, "miss");
  state = { ...state, pendingSpecials: [...retained8(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return hasMatch9(state, board) ? mistake9(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility10(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, protectionHits: ability === "shield" ? 1 : state.protectionHits, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard10(state) {
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive10(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, outcome: "revived" };
}
var elapsedBoardTime9 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta7 = (now, last) => Math.min(100, Math.max(0, now - last));
function applyLoadout6(state, frame = "none", map = "garden", rng = Math.random, upgrade = 0) {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  if (!Number.isInteger(upgrade) || upgrade < 0 || upgrade > (frame === "gold" ? 1 : frame === "ice" ? 2 : 0)) throw Error("Invalid frame upgrade");
  const excludedShape = frame === "blossom" ? Math.min(3, Math.floor(rng() * 4)) : null;
  const allowed = [0, 1, 2, 3].filter((shape) => shape !== excludedShape);
  const current = state.current.shape === excludedShape ? { ...state.current, shape: allowed[Math.min(2, Math.floor(rng() * 3))] } : state.current;
  return { ...state, current, excludedShape, frame, map, upgrade, maxLives: frame === "gold" ? 4 + upgrade : 3, timeFactor: (frame === "ice" ? 1.1 + upgrade * 0.05 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive5 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility6(state, name) {
  if (!abilityActive5(state, name)) return state;
  if (name === "shield") return { ...state, protected: false, protectionHits: 0 };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}

// replay/engine-v11.js
var engine_v11_exports = {};
__export(engine_v11_exports, {
  COLORS: () => COLORS10,
  SHAPES: () => SHAPES10,
  SPECIALS: () => SPECIALS9,
  abilityActive: () => abilityActive6,
  advanceBoard: () => advanceBoard11,
  applyLoadout: () => applyLoadout7,
  boardSize: () => boardSize10,
  choose: () => choose11,
  createRun: () => createRun11,
  duration: () => duration10,
  elapsedBoardTime: () => elapsedBoardTime10,
  expire: () => expire11,
  frameDelta: () => frameDelta8,
  hasMatch: () => hasMatch10,
  levelFor: () => levelFor10,
  makeBoard: () => makeBoard11,
  matches: () => matches11,
  randomTile: () => randomTile10,
  revive: () => revive11,
  seededRandom: () => seededRandom11,
  spendAbility: () => spendAbility11,
  stopAbility: () => stopAbility7,
  streakBonus: () => streakBonus10
});
var SHAPES10 = ["circle", "triangle", "square", "star"];
var COLORS10 = ["red", "blue", "green", "yellow"];
var SPECIALS9 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches11 = (a, b) => !b.collected && (SPECIALS9.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor10 = (score) => 1 + Math.floor(score / 4);
var boardSize10 = (state) => {
  const progress = state.stage ?? state.picks;
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var duration10 = (state) => Math.round((Math.max(1800, 2800 - state.picks * 5) + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
var randomTile10 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun11 = (rng = Math.random) => ({ current: randomTile10(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, protectionHits: 0, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus10 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom11(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled10(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard11(state, rng = Math.random) {
  if (state.heldBoard) {
    const allowed = [0, 1, 2, 3].filter((s) => s !== state.excludedShape);
    return state.heldBoard.map((t, i) => i === state.replacedIndex ? { shape: allowed[Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))], color: Math.min(3, Math.floor(rng() * 4)) } : { ...t });
  }
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize10(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) })).filter((t) => t.shape !== state.excludedShape);
  const valid = shuffled10(all.filter((t) => matches11(state.current, t)), rng);
  const invalid = shuffled10(all.filter((t) => !matches11(state.current, t)), rng);
  const size = boardSize10(state);
  const noMatch = rng() < 0.13;
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const normal = shuffled10([...valid.slice(0, noMatch ? 0 : matchCount), ...Array.from({ length: size - (noMatch ? 0 : matchCount) }, (_, i) => invalid[i % invalid.length])], rng);
  const pending = state.pendingSpecials || [];
  for (const [slot, entry] of pending.slice(0, size).entries()) normal[slot] = { special: entry.special };
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && rng() < (state.map === "sunset" ? 0.2 : 0.09)) {
    const available = normal.map((t, i) => t.special ? -1 : i).filter((i) => i >= 0);
    const slot = pending.length;
    normal[slot] = { special: SPECIALS9[Math.floor(rng() * SPECIALS9.length)] };
  }
  return normal;
}
var retained9 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch10 = (state, board) => board.some((tile) => matches11(state.current, tile));
function mistake10(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) {
    const protectionHits = Math.max(0, (state.protectionHits || 1) - 1);
    return { ...state, protectionHits, protected: protectionHits > 0, outcome: "protected" };
  }
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function choose11(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected) return state;
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + state.multiplier, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: state.multiplier, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.sweepPending || state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained9(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const local = ["heart", "hourglass", "crystal"].includes(tile.special);
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier;
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + (local ? 0 : 1),
      heldBoard: local ? board.map((t) => ({ ...t })) : null,
      replacedIndex: local ? index : null,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      protectionHits: tile.special === "crystal" ? Math.max(state.protectionHits || 0, 1) : state.protectionHits,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(3, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches11(state.current, tile)) return mistake10(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus10(colorStreak) + streakBonus10(shapeStreak);
  const bonus = streak;
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor10(picks), protected: state.protected, outcome: "correct" };
}
function expire11(state, board) {
  if (state.over) return state;
  if (board.some((t) => t.bonusTile)) return mistake10({ ...state, sweepPending: false, sweepStarted: false, sweepBoard: board.map((t) => ({ ...t })), specialEffect: null, earned: 0 }, "miss");
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained9(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return hasMatch10(state, board) ? mistake10(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility11(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, protectionHits: ability === "shield" ? 1 : state.protectionHits, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard11(state) {
  if (state.heldBoard) return { ...state, outcome: "ready" };
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive11(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, heldBoard: null, replacedIndex: null, outcome: "revived" };
}
var elapsedBoardTime10 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta8 = (now, last) => Math.min(100, Math.max(0, now - last));
function applyLoadout7(state, frame = "none", map = "garden", rng = Math.random, upgrade = 0) {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  if (!Number.isInteger(upgrade) || upgrade < 0 || upgrade > (frame === "gold" ? 1 : frame === "ice" ? 2 : 0)) throw Error("Invalid frame upgrade");
  const excludedShape = frame === "blossom" ? Math.min(3, Math.floor(rng() * 4)) : null;
  const allowed = [0, 1, 2, 3].filter((shape) => shape !== excludedShape);
  const current = state.current.shape === excludedShape ? { ...state.current, shape: allowed[Math.min(2, Math.floor(rng() * 3))] } : state.current;
  return { ...state, current, excludedShape, frame, map, upgrade, maxLives: frame === "gold" ? 4 + upgrade : 3, timeFactor: (frame === "ice" ? 1.1 + upgrade * 0.05 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive6 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility7(state, name) {
  if (!abilityActive6(state, name)) return state;
  if (name === "shield") return { ...state, protected: false, protectionHits: 0 };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}

// replay/engine-v12.js
var engine_v12_exports = {};
__export(engine_v12_exports, {
  COLORS: () => COLORS11,
  SHAPES: () => SHAPES11,
  SPECIALS: () => SPECIALS10,
  abilityActive: () => abilityActive7,
  advanceBoard: () => advanceBoard12,
  applyLoadout: () => applyLoadout8,
  boardSize: () => boardSize11,
  choose: () => choose12,
  createRun: () => createRun12,
  duration: () => duration11,
  elapsedBoardTime: () => elapsedBoardTime11,
  expire: () => expire12,
  frameDelta: () => frameDelta9,
  hasMatch: () => hasMatch11,
  levelFor: () => levelFor11,
  makeBoard: () => makeBoard12,
  matches: () => matches12,
  randomTile: () => randomTile11,
  revive: () => revive12,
  seededRandom: () => seededRandom12,
  spendAbility: () => spendAbility12,
  stopAbility: () => stopAbility8,
  streakBonus: () => streakBonus11
});
var SHAPES11 = ["circle", "triangle", "square", "star"];
var COLORS11 = ["red", "blue", "green", "yellow"];
var SPECIALS10 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches12 = (a, b) => !b.collected && (SPECIALS10.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor11 = (score) => 1 + Math.floor(score / 4);
var boardSize11 = (state) => {
  const progress = state.stage ?? state.picks;
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var duration11 = (state) => Math.round((Math.max(1800, 2800 - state.picks * 5) + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
var randomTile11 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun12 = (rng = Math.random) => ({ current: randomTile11(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, protectionHits: 0, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus11 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom12(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled11(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard12(state, rng = Math.random) {
  if (state.heldBoard) {
    const allowed = [0, 1, 2, 3].filter((s) => s !== state.excludedShape);
    return state.heldBoard.map((t, i) => i === state.replacedIndex ? { shape: allowed[Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))], color: Math.min(3, Math.floor(rng() * 4)) } : { ...t });
  }
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize11(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) })).filter((t) => t.shape !== state.excludedShape);
  const valid = shuffled11(all.filter((t) => matches12(state.current, t)), rng);
  const invalid = shuffled11(all.filter((t) => !matches12(state.current, t)), rng);
  const size = boardSize11(state);
  const noMatch = rng() < 0.13;
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const normal = shuffled11([...valid.slice(0, noMatch ? 0 : matchCount), ...Array.from({ length: size - (noMatch ? 0 : matchCount) }, (_, i) => invalid[i % invalid.length])], rng);
  const pending = state.pendingSpecials || [];
  for (const [slot, entry] of pending.slice(0, size).entries()) normal[slot] = { special: entry.special };
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && rng() < (state.map === "sunset" ? 0.2 : 0.09)) {
    const available = normal.map((t, i) => t.special ? -1 : i).filter((i) => i >= 0);
    const slot = pending.length;
    normal[slot] = { special: SPECIALS10[Math.floor(rng() * SPECIALS10.length)] };
  }
  return normal;
}
var retained10 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch11 = (state, board) => board.some((tile) => matches12(state.current, tile));
function mistake11(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) {
    const protectionHits = Math.max(0, (state.protectionHits || 1) - 1);
    return { ...state, protectionHits, protected: protectionHits > 0, outcome: "protected" };
  }
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function choose12(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected) return state;
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + state.multiplier, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: state.multiplier, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.sweepPending || state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained10(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const local = ["heart", "hourglass", "crystal"].includes(tile.special);
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier;
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + (local ? 0 : 1),
      heldBoard: local ? board.map((t) => ({ ...t })) : null,
      replacedIndex: local ? index : null,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      protectionHits: tile.special === "crystal" ? Math.max(state.protectionHits || 0, 1) : state.protectionHits,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(3, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches12(state.current, tile)) return mistake11(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus11(colorStreak) + streakBonus11(shapeStreak);
  const bonus = streak;
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor11(picks), protected: state.protected, outcome: "correct" };
}
function expire12(state, board) {
  if (state.over) return state;
  if (board.some((t) => t.bonusTile)) return mistake11({ ...state, sweepPending: false, sweepStarted: false, sweepBoard: board.map((t) => ({ ...t })), specialEffect: null, earned: 0 }, "miss");
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained10(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return board.some((tile) => !tile.special && matches12(state.current, tile)) ? mistake11(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility12(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, protectionHits: ability === "shield" ? 1 : state.protectionHits, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard12(state) {
  if (state.heldBoard) return { ...state, outcome: "ready" };
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive12(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, heldBoard: null, replacedIndex: null, outcome: "revived" };
}
var elapsedBoardTime11 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta9 = (now, last) => Math.min(100, Math.max(0, now - last));
function applyLoadout8(state, frame = "none", map = "garden", rng = Math.random, upgrade = 0) {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  if (!Number.isInteger(upgrade) || upgrade < 0 || upgrade > (frame === "gold" ? 1 : frame === "ice" ? 2 : 0)) throw Error("Invalid frame upgrade");
  const excludedShape = frame === "blossom" ? Math.min(3, Math.floor(rng() * 4)) : null;
  const allowed = [0, 1, 2, 3].filter((shape) => shape !== excludedShape);
  const current = state.current.shape === excludedShape ? { ...state.current, shape: allowed[Math.min(2, Math.floor(rng() * 3))] } : state.current;
  return { ...state, current, excludedShape, frame, map, upgrade, maxLives: frame === "gold" ? 4 + upgrade : 3, timeFactor: (frame === "ice" ? 1.1 + upgrade * 0.05 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive7 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility8(state, name) {
  if (!abilityActive7(state, name)) return state;
  if (name === "shield") return { ...state, protected: false, protectionHits: 0 };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}

// replay/engine-v13.js
var engine_v13_exports = {};
__export(engine_v13_exports, {
  COLORS: () => COLORS12,
  SHAPES: () => SHAPES12,
  SPECIALS: () => SPECIALS11,
  abilityActive: () => abilityActive8,
  advanceBoard: () => advanceBoard13,
  applyLoadout: () => applyLoadout9,
  boardSize: () => boardSize12,
  choose: () => choose13,
  createRun: () => createRun13,
  duration: () => duration12,
  elapsedBoardTime: () => elapsedBoardTime12,
  expire: () => expire13,
  frameDelta: () => frameDelta10,
  hasMatch: () => hasMatch12,
  levelFor: () => levelFor12,
  makeBoard: () => makeBoard13,
  matches: () => matches13,
  randomTile: () => randomTile12,
  revive: () => revive13,
  seededRandom: () => seededRandom13,
  spendAbility: () => spendAbility13,
  stopAbility: () => stopAbility9,
  streakBonus: () => streakBonus12
});
var SHAPES12 = ["circle", "triangle", "square", "star"];
var COLORS12 = ["red", "blue", "green", "yellow"];
var SPECIALS11 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches13 = (a, b) => !b.collected && (SPECIALS11.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor12 = (score) => 1 + Math.floor(score / 4);
var boardSize12 = (state) => {
  const progress = state.stage ?? state.picks;
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var duration12 = (state) => Math.round((Math.max(1800, 2800 - state.picks * 5) + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
var randomTile12 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun13 = (rng = Math.random) => ({ current: randomTile12(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, protectionHits: 0, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus12 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom13(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled12(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard13(state, rng = Math.random) {
  if (state.heldBoard) {
    const allowed = [0, 1, 2, 3].filter((s) => s !== state.excludedShape);
    return state.heldBoard.map((t, i) => i === state.replacedIndex ? { shape: allowed[Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))], color: Math.min(3, Math.floor(rng() * 4)) } : { ...t });
  }
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize12(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) })).filter((t) => t.shape !== state.excludedShape);
  const valid = shuffled12(all.filter((t) => matches13(state.current, t)), rng);
  const invalid = shuffled12(all.filter((t) => !matches13(state.current, t)), rng);
  const size = boardSize12(state);
  const noMatch = rng() < 0.13;
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const normal = shuffled12([...valid.slice(0, noMatch ? 0 : matchCount), ...Array.from({ length: size - (noMatch ? 0 : matchCount) }, (_, i) => invalid[i % invalid.length])], rng);
  const pending = state.pendingSpecials || [];
  const available = Array.from({ length: size }, (_, i) => i);
  const randomSlot = () => available[Math.min(available.length - 1, Math.floor(rng() * available.length))];
  const place = (slot, special) => {
    normal[slot] = { special };
    available.splice(available.indexOf(slot), 1);
  };
  const relocated = [];
  for (const entry of pending.slice(0, size)) {
    if (Number.isInteger(entry.slot) && available.includes(entry.slot)) place(entry.slot, entry.special);
    else relocated.push(entry);
  }
  for (const entry of relocated) place(randomSlot(), entry.special);
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && available.length && rng() < (state.map === "sunset" ? 0.2 : 0.09)) {
    const slot = randomSlot();
    place(slot, SPECIALS11[Math.floor(rng() * SPECIALS11.length)]);
  }
  return normal;
}
var retained11 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch12 = (state, board) => board.some((tile) => matches13(state.current, tile));
function mistake12(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) {
    const protectionHits = Math.max(0, (state.protectionHits || 1) - 1);
    return { ...state, protectionHits, protected: protectionHits > 0, outcome: "protected" };
  }
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function choose13(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected) return state;
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + state.multiplier, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: state.multiplier, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.sweepPending || state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained11(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const local = ["heart", "hourglass", "crystal"].includes(tile.special);
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier;
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + (local ? 0 : 1),
      heldBoard: local ? board.map((t) => ({ ...t })) : null,
      replacedIndex: local ? index : null,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      protectionHits: tile.special === "crystal" ? Math.max(state.protectionHits || 0, 1) : state.protectionHits,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(3, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches13(state.current, tile)) return mistake12(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus12(colorStreak) + streakBonus12(shapeStreak);
  const bonus = streak;
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor12(picks), protected: state.protected, outcome: "correct" };
}
function expire13(state, board) {
  if (state.over) return state;
  if (board.some((t) => t.bonusTile)) return mistake12({ ...state, sweepPending: false, sweepStarted: false, sweepBoard: board.map((t) => ({ ...t })), specialEffect: null, earned: 0 }, "miss");
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained11(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return board.some((tile) => !tile.special && matches13(state.current, tile)) ? mistake12(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility13(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, protectionHits: ability === "shield" ? 1 : state.protectionHits, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard13(state) {
  if (state.heldBoard) return { ...state, outcome: "ready" };
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  return { ...state, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive13(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, heldBoard: null, replacedIndex: null, outcome: "revived" };
}
var elapsedBoardTime12 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta10 = (now, last) => Math.min(100, Math.max(0, now - last));
function applyLoadout9(state, frame = "none", map = "garden", rng = Math.random, upgrade = 0) {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  if (!Number.isInteger(upgrade) || upgrade < 0 || upgrade > (frame === "gold" ? 1 : frame === "ice" ? 2 : 0)) throw Error("Invalid frame upgrade");
  const excludedShape = frame === "blossom" ? Math.min(3, Math.floor(rng() * 4)) : null;
  const allowed = [0, 1, 2, 3].filter((shape) => shape !== excludedShape);
  const current = state.current.shape === excludedShape ? { ...state.current, shape: allowed[Math.min(2, Math.floor(rng() * 3))] } : state.current;
  return { ...state, current, excludedShape, frame, map, upgrade, maxLives: frame === "gold" ? 4 + upgrade : 3, timeFactor: (frame === "ice" ? 1.1 + upgrade * 0.05 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive8 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility9(state, name) {
  if (!abilityActive8(state, name)) return state;
  if (name === "shield") return { ...state, protected: false, protectionHits: 0 };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}

// replay/engine-v14.js
var engine_v14_exports = {};
__export(engine_v14_exports, {
  COLORS: () => COLORS13,
  DIFFICULTIES: () => DIFFICULTIES,
  SHAPES: () => SHAPES13,
  SPECIALS: () => SPECIALS12,
  abilityActive: () => abilityActive9,
  advanceBoard: () => advanceBoard14,
  applyLoadout: () => applyLoadout10,
  boardSize: () => boardSize13,
  choose: () => choose14,
  createRun: () => createRun14,
  difficultyFor: () => difficultyFor,
  duration: () => duration13,
  elapsedBoardTime: () => elapsedBoardTime13,
  expire: () => expire14,
  frameDelta: () => frameDelta11,
  hasMatch: () => hasMatch13,
  levelFor: () => levelFor13,
  makeBoard: () => makeBoard14,
  matches: () => matches14,
  randomTile: () => randomTile13,
  revive: () => revive14,
  seededRandom: () => seededRandom14,
  specialSpawnChance: () => specialSpawnChance,
  specialsForMode: () => specialsForMode,
  spendAbility: () => spendAbility14,
  stopAbility: () => stopAbility10,
  streakBonus: () => streakBonus13
});
var SHAPES13 = ["circle", "triangle", "square", "star"];
var COLORS13 = ["red", "blue", "green", "yellow"];
var SPECIALS12 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches14 = (a, b) => !b.collected && (SPECIALS12.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor13 = (score) => 1 + Math.floor(score / 4);
var boardSize13 = (state) => {
  const progress = state.stage ?? state.picks;
  if (state.mode === "endless" && ["hard", "extreme"].includes(state.difficulty)) {
    const round = Math.max(0, state.difficultyRound ?? progress);
    const sizes = [1, 2, 3, 4, 6, 9, 12, 16];
    if (state.difficulty === "extreme" && round >= sizes.length) return 20;
    if (state.difficulty === "hard" && round >= 100) return 20;
    return sizes[Math.min(sizes.length - 1, round)];
  }
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var DIFFICULTIES = { easy: { name: "Easy", start: 3600, floor: 2400, points: 1 }, normal: { name: "Normal", start: 2800, floor: 1800, points: 1 }, hard: { name: "Hard", start: 2400, floor: 1450, points: 2 }, extreme: { name: "Extreme", start: 2e3, floor: 1150, points: 3 } };
var difficultyFor = (state) => DIFFICULTIES[state.mode === "endless" ? state.difficulty : "normal"] || DIFFICULTIES.normal;
var duration13 = (state) => {
  const d = difficultyFor(state);
  return Math.round((Math.max(d.floor, d.start - state.picks * 5) + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
};
var randomTile13 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun14 = (rng = Math.random) => ({ current: randomTile13(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, difficultyRound: 0, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, protectionHits: 0, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus13 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom14(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled13(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
var specialsForMode = (mode) => mode === "adventure" ? SPECIALS12.filter((s) => s !== "reset") : SPECIALS12;
var specialSpawnChance = (state) => (state.map === "sunset" ? 0.2 : 0.09) * (state.mode === "adventure" ? 0.5 : 1);
var sparseDifficulty = (state) => state.mode === "endless" && ["hard", "extreme"].includes(state.difficulty);
function sparseMatch(state, all, rng) {
  const colorOnly = all.filter((t) => t.color === state.current.color && t.shape !== state.current.shape);
  const shapeOnly = all.filter((t) => t.shape === state.current.shape && t.color !== state.current.color);
  const preferColor = rng() < (state.difficulty === "extreme" ? 0.15 : 0.25);
  const preferred = preferColor ? colorOnly : shapeOnly;
  const pool = preferred.length ? preferred : preferColor ? shapeOnly : colorOnly;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
function makeBoard14(state, rng = Math.random, capacity = boardSize13(state)) {
  if (state.heldBoard) {
    const allowed = [0, 1, 2, 3].filter((s) => s !== state.excludedShape);
    let replacement;
    if (sparseDifficulty(state)) {
      const all2 = allowed.flatMap((shape) => [0, 1, 2, 3].map((color) => ({ shape, color })));
      const existing = state.heldBoard.filter((t, i) => i !== state.replacedIndex && !t.special && matches14(state.current, t)).length;
      const cap = state.difficulty === "extreme" ? 1 : 2;
      const invalid2 = all2.filter((t) => !matches14(state.current, t));
      replacement = existing < cap && rng() < 1 / state.heldBoard.length ? sparseMatch(state, all2, rng) : invalid2[Math.min(invalid2.length - 1, Math.floor(rng() * invalid2.length))];
    } else replacement = { shape: allowed[Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))], color: Math.min(3, Math.floor(rng() * 4)) };
    return state.heldBoard.map((t, i) => i === state.replacedIndex ? replacement : { ...t });
  }
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize13(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) })).filter((t) => t.shape !== state.excludedShape);
  const valid = shuffled13(all.filter((t) => matches14(state.current, t)), rng);
  const invalid = shuffled13(all.filter((t) => !matches14(state.current, t)), rng);
  const size = capacity;
  const noMatch = rng() < 0.13;
  const sparse = sparseDifficulty(state);
  const candidateCount = sparse ? Math.min(size, state.difficulty === "hard" && rng() < 0.25 ? 2 : 1) : Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const matchCount = noMatch ? 0 : candidateCount;
  const correct = sparse ? Array.from({ length: matchCount }, () => sparseMatch(state, all, rng)) : valid.slice(0, matchCount);
  const normal = shuffled13([...correct, ...Array.from({ length: size - matchCount }, (_, i) => invalid[i % invalid.length])], rng);
  const allowedSpecials = specialsForMode(state.mode);
  const pending = (state.pendingSpecials || []).filter((entry) => allowedSpecials.includes(entry.special));
  const available = Array.from({ length: size }, (_, i) => i);
  const randomSlot = () => available[Math.min(available.length - 1, Math.floor(rng() * available.length))];
  const place = (slot, special) => {
    normal[slot] = { special };
    available.splice(available.indexOf(slot), 1);
  };
  const relocated = [];
  for (const entry of pending.slice(0, size)) {
    if (Number.isInteger(entry.slot) && available.includes(entry.slot)) place(entry.slot, entry.special);
    else relocated.push(entry);
  }
  for (const entry of relocated) place(randomSlot(), entry.special);
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && available.length && rng() < specialSpawnChance(state)) {
    const slot = randomSlot();
    place(slot, allowedSpecials[Math.floor(rng() * allowedSpecials.length)]);
  }
  return normal;
}
var retained12 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var hasMatch13 = (state, board) => board.some((tile) => matches14(state.current, tile));
function mistake13(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) {
    const protectionHits = Math.max(0, (state.protectionHits || 1) - 1);
    return { ...state, protectionHits, protected: protectionHits > 0, outcome: "protected" };
  }
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function choose14(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected || state.mode === "adventure" && tile.special === "reset") return state;
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + 2 * state.multiplier * difficultyFor(state).points, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: 2 * state.multiplier * difficultyFor(state).points, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.sweepPending || state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained12(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const local = ["heart", "hourglass", "crystal"].includes(tile.special);
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special).length : 1) * state.multiplier * difficultyFor(state).points;
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + (local ? 0 : 1),
      heldBoard: local ? board.map((t) => ({ ...t })) : null,
      replacedIndex: local ? index : null,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      protectionHits: tile.special === "crystal" ? Math.max(state.protectionHits || 0, 1) : state.protectionHits,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(3, state.slowRounds) : state.slowRounds
    };
  }
  if (!matches14(state.current, tile)) return mistake13(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus13(colorStreak) + streakBonus13(shapeStreak);
  const bonus = streak;
  const score = state.score + (state.multiplier + bonus) * difficultyFor(state).points;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor13(picks), protected: state.protected, outcome: "correct" };
}
function expire14(state, board) {
  if (state.over) return state;
  if (board.some((t) => t.bonusTile)) return { ...state, sweepPending: false, sweepStarted: false, sweepBoard: null, specialEffect: null, earned: 0, bonus: 0, outcome: "pass" };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained12(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return board.some((tile) => !tile.special && matches14(state.current, tile)) ? mistake13(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility14(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, protectionHits: ability === "shield" ? 1 : state.protectionHits, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard14(state) {
  if (state.heldBoard || state.sweepBoard) return { ...state, outcome: "ready" };
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  const difficultyRound = state.specialEffect === "reset" ? 0 : (state.difficultyRound ?? state.stage ?? state.picks) + (state.sweepBoard || state.outcome !== "correct" ? 0 : 1);
  return { ...state, difficultyRound, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive14(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, heldBoard: null, replacedIndex: null, outcome: "revived" };
}
var elapsedBoardTime13 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta11 = (now, last) => Math.min(100, Math.max(0, now - last));
function applyLoadout10(state, frame = "none", map = "garden", rng = Math.random, upgrade = 0) {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  if (!Number.isInteger(upgrade) || upgrade < 0 || upgrade > (frame === "gold" ? 1 : frame === "ice" ? 2 : 0)) throw Error("Invalid frame upgrade");
  const excludedShape = frame === "blossom" ? Math.min(3, Math.floor(rng() * 4)) : null;
  const allowed = [0, 1, 2, 3].filter((shape) => shape !== excludedShape);
  const current = state.current.shape === excludedShape ? { ...state.current, shape: allowed[Math.min(2, Math.floor(rng() * 3))] } : state.current;
  return { ...state, current, excludedShape, frame, map, upgrade, maxLives: frame === "gold" ? 4 + upgrade : 3, timeFactor: (frame === "ice" ? 1.1 + upgrade * 0.05 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive9 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility10(state, name) {
  if (!abilityActive9(state, name)) return state;
  if (name === "shield") return { ...state, protected: false, protectionHits: 0 };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}

// replay/engine-v18.js
var engine_v18_exports = {};
__export(engine_v18_exports, {
  COLORS: () => COLORS14,
  DIFFICULTIES: () => DIFFICULTIES2,
  SHAPES: () => SHAPES14,
  SPECIALS: () => SPECIALS13,
  abilityActive: () => abilityActive10,
  advanceBoard: () => advanceBoard15,
  applyLoadout: () => applyLoadout11,
  boardSize: () => boardSize14,
  choose: () => choose15,
  createRun: () => createRun15,
  difficultyFor: () => difficultyFor2,
  duration: () => duration14,
  elapsedBoardTime: () => elapsedBoardTime14,
  expire: () => expire15,
  frameDelta: () => frameDelta12,
  hasMatch: () => hasMatch14,
  levelFor: () => levelFor14,
  makeBoard: () => makeBoard15,
  matches: () => matches15,
  randomTile: () => randomTile14,
  revive: () => revive15,
  ruleMatches: () => ruleMatches,
  seededRandom: () => seededRandom15,
  specialSpawnChance: () => specialSpawnChance2,
  specialsForMode: () => specialsForMode2,
  spendAbility: () => spendAbility15,
  stopAbility: () => stopAbility11,
  streakBonus: () => streakBonus14
});
var SHAPES14 = ["circle", "triangle", "square", "star"];
var COLORS14 = ["red", "blue", "green", "yellow"];
var SPECIALS13 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches15 = (a, b) => !b.collected && (SPECIALS13.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor14 = (score) => 1 + Math.floor(score / 4);
var boardSize14 = (state) => {
  const progress = state.stage ?? state.picks;
  if (state.mode === "endless" && ["hard", "extreme"].includes(state.difficulty)) {
    const round = Math.max(0, state.difficultyRound ?? progress);
    const sizes = [1, 2, 3, 4, 6, 9, 12, 16];
    if (state.difficulty === "extreme" && round >= sizes.length) return 20;
    if (state.difficulty === "hard" && round >= 100) return 20;
    return sizes[Math.min(sizes.length - 1, round)];
  }
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var DIFFICULTIES2 = { easy: { name: "Easy", start: 3600, floor: 2400, points: 1 }, normal: { name: "Normal", start: 2800, floor: 1800, points: 1 }, hard: { name: "Hard", start: 2400, floor: 1450, points: 2 }, extreme: { name: "Extreme", start: 2e3, floor: 1150, points: 3 } };
var difficultyFor2 = (state) => DIFFICULTIES2[state.mode === "endless" ? state.difficulty : "normal"] || DIFFICULTIES2.normal;
var duration14 = (state) => {
  const d = difficultyFor2(state);
  return Math.round((Math.max(d.floor, d.start - state.picks * 5) + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
};
var randomTile14 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun15 = (rng = Math.random) => ({ current: randomTile14(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, difficultyRound: 0, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, protectionHits: 0, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus14 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom15(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled14(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
var specialsForMode2 = (mode) => mode === "adventure" ? SPECIALS13.filter((s) => s !== "reset") : SPECIALS13;
var specialSpawnChance2 = (state) => (state.map === "sunset" ? 0.2 : 0.09) * (state.mode === "adventure" ? 0.5 : 1);
var sparseDifficulty2 = (state) => state.mode === "endless" && ["hard", "extreme"].includes(state.difficulty);
function sparseMatch2(state, all, rng) {
  const colorOnly = all.filter((t) => t.color === state.current.color && t.shape !== state.current.shape);
  const shapeOnly = all.filter((t) => t.shape === state.current.shape && t.color !== state.current.color);
  const preferColor = rng() < (state.difficulty === "extreme" ? 0.15 : 0.25);
  const preferred = preferColor ? colorOnly : shapeOnly;
  const pool = preferred.length ? preferred : preferColor ? shapeOnly : colorOnly;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
function makeBoard15(state, rng = Math.random, capacity = boardSize14(state)) {
  if (state.heldBoard) {
    const allowed = [0, 1, 2, 3].filter((s) => s !== state.excludedShape);
    let replacement;
    if (sparseDifficulty2(state)) {
      const all2 = allowed.flatMap((shape) => [0, 1, 2, 3].map((color) => ({ shape, color })));
      const existing = state.heldBoard.filter((t, i) => i !== state.replacedIndex && !t.special && matches15(state.current, t)).length;
      const cap = state.difficulty === "extreme" ? 1 : 2;
      const invalid2 = all2.filter((t) => !matches15(state.current, t));
      replacement = existing < cap && rng() < 1 / state.heldBoard.length ? sparseMatch2(state, all2, rng) : invalid2[Math.min(invalid2.length - 1, Math.floor(rng() * invalid2.length))];
    } else replacement = { shape: allowed[Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))], color: Math.min(3, Math.floor(rng() * 4)) };
    return state.heldBoard.map((t, i) => i === state.replacedIndex ? replacement : { ...t });
  }
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize14(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) })).filter((t) => t.shape !== state.excludedShape);
  const valid = shuffled14(all.filter((t) => matches15(state.current, t)), rng);
  const invalid = shuffled14(all.filter((t) => !matches15(state.current, t)), rng);
  const size = capacity;
  const noMatch = rng() < 0.13;
  const sparse = sparseDifficulty2(state);
  const candidateCount = sparse ? Math.min(size, state.difficulty === "hard" && rng() < 0.25 ? 2 : 1) : Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const matchCount = noMatch ? 0 : candidateCount;
  const correct = sparse ? Array.from({ length: matchCount }, () => sparseMatch2(state, all, rng)) : valid.slice(0, matchCount);
  const normal = shuffled14([...correct, ...Array.from({ length: size - matchCount }, (_, i) => invalid[i % invalid.length])], rng);
  const allowedSpecials = specialsForMode2(state.mode);
  const pending = (state.pendingSpecials || []).filter((entry) => allowedSpecials.includes(entry.special));
  const available = Array.from({ length: size }, (_, i) => i);
  const randomSlot = () => available[Math.min(available.length - 1, Math.floor(rng() * available.length))];
  const place = (slot, special) => {
    normal[slot] = { special };
    available.splice(available.indexOf(slot), 1);
  };
  const relocated = [];
  for (const entry of pending.slice(0, size)) {
    if (Number.isInteger(entry.slot) && available.includes(entry.slot)) place(entry.slot, entry.special);
    else relocated.push(entry);
  }
  for (const entry of relocated) place(randomSlot(), entry.special);
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && available.length && rng() < specialSpawnChance2(state)) {
    const slot = randomSlot();
    place(slot, allowedSpecials[Math.floor(rng() * allowedSpecials.length)]);
  }
  return normal;
}
var retained13 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var ruleMatches = (state, tile) => !tile.collected && (!!tile.special || (!tile.memory || !tile.hidden) && (state.mode !== "adventure" || !state.matchRule ? matches15(state.current, tile) : state.current[state.matchRule] === tile[state.matchRule]));
var hasMatch14 = (state, board) => board.some((tile) => ruleMatches(state, tile));
function mistake14(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) {
    const protectionHits = Math.max(0, (state.protectionHits || 1) - 1);
    return { ...state, protectionHits, protected: protectionHits > 0, outcome: "protected" };
  }
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function choose15(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected || state.mode === "adventure" && tile.special === "reset") return state;
  if (state.mode === "adventure" && state.matchRule && !tile.special && !tile.bonusTile && matches15(state.current, tile) && state.current[state.matchRule] !== tile[state.matchRule]) return state;
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + 2 * state.multiplier * difficultyFor2(state).points, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: 2 * state.multiplier * difficultyFor2(state).points, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.sweepPending || state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained13(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const local = ["heart", "hourglass", "crystal"].includes(tile.special);
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special && !t.collected && !t.memory).length : 1) * state.multiplier * difficultyFor2(state).points;
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + (local ? 0 : 1),
      heldBoard: null,
      replacedIndex: null,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      protectionHits: tile.special === "crystal" ? Math.max(state.protectionHits || 0, 1) : state.protectionHits,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(3, state.slowRounds) : state.slowRounds
    };
  }
  if (!(state.mode === "adventure" && state.matchRule ? state.current[state.matchRule] === tile[state.matchRule] : matches15(state.current, tile))) return mistake14(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus14(colorStreak) + streakBonus14(shapeStreak);
  const bonus = streak;
  const score = state.score + (state.multiplier + bonus) * difficultyFor2(state).points;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor14(picks), protected: state.protected, outcome: "correct" };
}
function expire15(state, board) {
  if (state.over) return state;
  if (board.some((t) => t.bonusTile)) return { ...state, sweepPending: false, sweepStarted: false, sweepBoard: null, specialEffect: null, earned: 0, bonus: 0, outcome: "pass" };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained13(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return board.some((tile) => !tile.special && ruleMatches(state, tile)) ? mistake14(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility15(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, protectionHits: ability === "shield" ? 1 : state.protectionHits, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard15(state) {
  if (state.heldBoard || state.sweepBoard || ["heart", "hourglass", "crystal"].includes(state.specialEffect)) return { ...state, outcome: "ready" };
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  const difficultyRound = state.specialEffect === "reset" ? 0 : (state.difficultyRound ?? state.stage ?? state.picks) + (state.sweepBoard || state.outcome !== "correct" ? 0 : 1);
  return { ...state, difficultyRound, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive15(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, heldBoard: null, replacedIndex: null, outcome: "revived" };
}
var elapsedBoardTime14 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta12 = (now, last) => Math.min(100, Math.max(0, now - last));
function applyLoadout11(state, frame = "none", map = "garden", rng = Math.random, upgrade = 0) {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  if (!Number.isInteger(upgrade) || upgrade < 0 || upgrade > (frame === "gold" ? 1 : frame === "ice" ? 2 : 0)) throw Error("Invalid frame upgrade");
  const excludedShape = frame === "blossom" ? Math.min(3, Math.floor(rng() * 4)) : null;
  const allowed = [0, 1, 2, 3].filter((shape) => shape !== excludedShape);
  const current = state.current.shape === excludedShape ? { ...state.current, shape: allowed[Math.min(2, Math.floor(rng() * 3))] } : state.current;
  return { ...state, current, excludedShape, frame, map, upgrade, maxLives: frame === "gold" ? 4 + upgrade : 3, timeFactor: (frame === "ice" ? 1.1 + upgrade * 0.05 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive10 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility11(state, name) {
  if (!abilityActive10(state, name)) return state;
  if (name === "shield") return { ...state, protected: false, protectionHits: 0 };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}

// replay/engine-v22.js
var engine_v22_exports = {};
__export(engine_v22_exports, {
  COLORS: () => COLORS15,
  DIFFICULTIES: () => DIFFICULTIES3,
  ENDLESS_MIN_TIME: () => ENDLESS_MIN_TIME,
  SHAPES: () => SHAPES15,
  SPECIALS: () => SPECIALS14,
  abilityActive: () => abilityActive11,
  advanceBoard: () => advanceBoard16,
  applyLoadout: () => applyLoadout12,
  boardSize: () => boardSize15,
  choose: () => choose16,
  createRun: () => createRun16,
  difficultyFor: () => difficultyFor3,
  duration: () => duration15,
  elapsedBoardTime: () => elapsedBoardTime15,
  endlessIntensity: () => endlessIntensity,
  expire: () => expire16,
  frameDelta: () => frameDelta13,
  hasMatch: () => hasMatch15,
  levelFor: () => levelFor15,
  makeBoard: () => makeBoard16,
  matches: () => matches16,
  maxLivesForFrame: () => maxLivesForFrame,
  randomTile: () => randomTile15,
  revive: () => revive16,
  ruleMatches: () => ruleMatches2,
  seededRandom: () => seededRandom16,
  specialSpawnChance: () => specialSpawnChance3,
  specialsForMode: () => specialsForMode3,
  spendAbility: () => spendAbility16,
  stopAbility: () => stopAbility12,
  streakBonus: () => streakBonus15
});
var SHAPES15 = ["circle", "triangle", "square", "star"];
var COLORS15 = ["red", "blue", "green", "yellow"];
var SPECIALS14 = ["starburst", "hourglass", "crystal", "reset", "heart"];
var matches16 = (a, b) => !b.collected && (SPECIALS14.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor15 = (score) => 1 + Math.floor(score / 4);
var boardSize15 = (state) => {
  const progress = state.stage ?? state.picks;
  if (state.mode === "endless" && ["hard", "extreme"].includes(state.difficulty)) {
    const round = Math.max(0, state.difficultyRound ?? progress);
    const sizes = [1, 2, 3, 4, 6, 9, 12, 16];
    if (state.difficulty === "extreme" && round >= sizes.length) return 20;
    if (state.difficulty === "hard" && round >= 100) return 20;
    return sizes[Math.min(sizes.length - 1, round)];
  }
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var ENDLESS_MIN_TIME = 750;
var DIFFICULTIES3 = {
  easy: { name: "Easy", start: 3600, floor: ENDLESS_MIN_TIME, ramp: 6, pickups: 0.09, points: 1 },
  normal: { name: "Normal", start: 2800, floor: ENDLESS_MIN_TIME, ramp: 9, pickups: 0.07, points: 1 },
  hard: { name: "Hard", start: 2400, floor: ENDLESS_MIN_TIME, ramp: 15, pickups: 0.05, points: 2 },
  extreme: { name: "Extreme", start: 2e3, floor: ENDLESS_MIN_TIME, ramp: 22, pickups: 0.03, points: 3 }
};
var endlessPressure = (state) => Math.max(0, state.picks || 0, (state.score || 0) / 2);
var endlessIntensity = (state) => {
  const d = difficultyFor3(state);
  return Math.min(1, endlessPressure(state) * d.ramp / (d.start - d.floor));
};
var difficultyFor3 = (state) => DIFFICULTIES3[state.mode === "endless" ? state.difficulty : "normal"] || DIFFICULTIES3.normal;
var duration15 = (state) => {
  const d = difficultyFor3(state);
  const base = state.mode === "endless" ? Math.max(d.floor, d.start - endlessPressure(state) * d.ramp) : Math.max(1800, 2800 - state.picks * 5);
  return Math.round((base + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
};
var randomTile15 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun16 = (rng = Math.random) => ({ current: randomTile15(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, difficultyRound: 0, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, protectionHits: 0, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus15 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom16(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled15(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
var specialsForMode3 = (mode) => mode === "adventure" ? SPECIALS14.filter((s) => s !== "reset") : SPECIALS14;
var specialSpawnChance3 = (state) => {
  if (state.mode !== "endless") return (state.map === "sunset" ? 0.2 : 0.09) * (state.mode === "adventure" ? 0.5 : 1);
  return difficultyFor3(state).pickups * (1 - 0.6 * endlessIntensity(state)) * (state.map === "sunset" ? 20 / 9 : 1);
};
var sparseDifficulty3 = (state) => state.mode === "endless" && ["hard", "extreme"].includes(state.difficulty);
function sparseMatch3(state, all, rng) {
  const colorOnly = all.filter((t) => t.color === state.current.color && t.shape !== state.current.shape);
  const shapeOnly = all.filter((t) => t.shape === state.current.shape && t.color !== state.current.color);
  const preferColor = rng() < (state.difficulty === "extreme" ? 0.15 : 0.25);
  const preferred = preferColor ? colorOnly : shapeOnly;
  const pool = preferred.length ? preferred : preferColor ? shapeOnly : colorOnly;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
function makeBoard16(state, rng = Math.random, capacity = boardSize15(state)) {
  if (state.heldBoard) {
    const allowed = [0, 1, 2, 3].filter((s) => s !== state.excludedShape);
    let replacement;
    if (sparseDifficulty3(state)) {
      const all2 = allowed.flatMap((shape) => [0, 1, 2, 3].map((color) => ({ shape, color })));
      const existing = state.heldBoard.filter((t, i) => i !== state.replacedIndex && !t.special && matches16(state.current, t)).length;
      const cap = state.difficulty === "extreme" ? 1 : 2;
      const invalid2 = all2.filter((t) => !matches16(state.current, t));
      replacement = existing < cap && rng() < 1 / state.heldBoard.length ? sparseMatch3(state, all2, rng) : invalid2[Math.min(invalid2.length - 1, Math.floor(rng() * invalid2.length))];
    } else replacement = { shape: allowed[Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))], color: Math.min(3, Math.floor(rng() * 4)) };
    return state.heldBoard.map((t, i) => i === state.replacedIndex ? replacement : { ...t });
  }
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize15(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) })).filter((t) => t.shape !== state.excludedShape);
  const valid = shuffled15(all.filter((t) => matches16(state.current, t)), rng);
  const invalid = shuffled15(all.filter((t) => !matches16(state.current, t)), rng);
  const size = capacity;
  const noMatch = rng() < 0.13;
  const sparse = sparseDifficulty3(state);
  const candidateCount = sparse ? Math.min(size, state.difficulty === "hard" && rng() < 0.25 ? 2 : 1) : Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const matchCount = noMatch ? 0 : candidateCount;
  const correct = sparse ? Array.from({ length: matchCount }, () => sparseMatch3(state, all, rng)) : valid.slice(0, matchCount);
  const normal = shuffled15([...correct, ...Array.from({ length: size - matchCount }, (_, i) => invalid[i % invalid.length])], rng);
  const allowedSpecials = specialsForMode3(state.mode);
  const pending = (state.pendingSpecials || []).filter((entry) => allowedSpecials.includes(entry.special));
  const available = Array.from({ length: size }, (_, i) => i);
  const randomSlot = () => available[Math.min(available.length - 1, Math.floor(rng() * available.length))];
  const place = (slot, special) => {
    normal[slot] = { special };
    available.splice(available.indexOf(slot), 1);
  };
  const relocated = [];
  for (const entry of pending.slice(0, size)) {
    if (Number.isInteger(entry.slot) && available.includes(entry.slot)) place(entry.slot, entry.special);
    else relocated.push(entry);
  }
  for (const entry of relocated) place(randomSlot(), entry.special);
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && available.length && rng() < specialSpawnChance3(state)) {
    const slot = randomSlot();
    place(slot, allowedSpecials[Math.floor(rng() * allowedSpecials.length)]);
  }
  return normal;
}
var retained14 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var ruleMatches2 = (state, tile) => !tile.collected && (!!tile.special || (!tile.memory || !tile.hidden) && (state.mode !== "adventure" || !state.matchRule ? matches16(state.current, tile) : state.current[state.matchRule] === tile[state.matchRule]));
var hasMatch15 = (state, board) => board.some((tile) => ruleMatches2(state, tile));
function mistake15(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) {
    const protectionHits = Math.max(0, (state.protectionHits || 1) - 1);
    return { ...state, protectionHits, protected: protectionHits > 0, outcome: "protected" };
  }
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function choose16(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected || state.mode === "adventure" && tile.special === "reset") return state;
  if (state.mode === "adventure" && state.matchRule && !tile.special && !tile.bonusTile && matches16(state.current, tile) && state.current[state.matchRule] !== tile[state.matchRule]) return state;
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + 2 * state.multiplier * difficultyFor3(state).points, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: 2 * state.multiplier * difficultyFor3(state).points, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.sweepPending || state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained14(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const local = ["heart", "hourglass", "crystal"].includes(tile.special);
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special && !t.collected && !t.memory).length : 1) * state.multiplier * difficultyFor3(state).points;
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + (local ? 0 : 1),
      heldBoard: null,
      replacedIndex: null,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      protectionHits: tile.special === "crystal" ? Math.max(state.protectionHits || 0, 1) : state.protectionHits,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(3, state.slowRounds) : state.slowRounds
    };
  }
  if (!(state.mode === "adventure" && state.matchRule ? state.current[state.matchRule] === tile[state.matchRule] : matches16(state.current, tile))) return mistake15(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus15(colorStreak) + streakBonus15(shapeStreak);
  const bonus = streak;
  const score = state.score + (state.multiplier + bonus) * difficultyFor3(state).points;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor15(picks), protected: state.protected, outcome: "correct" };
}
function expire16(state, board) {
  if (state.over) return state;
  if (board.some((t) => t.bonusTile)) return { ...state, sweepPending: false, sweepStarted: false, sweepBoard: null, specialEffect: null, earned: 0, bonus: 0, outcome: "pass" };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained14(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return board.some((tile) => !tile.special && ruleMatches2(state, tile)) ? mistake15(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility16(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, protectionHits: ability === "shield" ? 1 : state.protectionHits, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard16(state) {
  if (state.heldBoard || state.sweepBoard || ["heart", "hourglass", "crystal"].includes(state.specialEffect)) return { ...state, outcome: "ready" };
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  const difficultyRound = state.specialEffect === "reset" ? 0 : (state.difficultyRound ?? state.stage ?? state.picks) + (state.sweepBoard || state.outcome !== "correct" ? 0 : 1);
  return { ...state, difficultyRound, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive16(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, heldBoard: null, replacedIndex: null, outcome: "revived" };
}
var elapsedBoardTime15 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta13 = (now, last) => Math.min(100, Math.max(0, now - last));
var maxLivesForFrame = (frame = "none", upgrade = 0) => frame === "gold" ? 4 + (upgrade === 1 ? 1 : 0) : 3;
function applyLoadout12(state, frame = "none", map = "garden", rng = Math.random, upgrade = 0) {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  if (!Number.isInteger(upgrade) || upgrade < 0 || upgrade > (frame === "gold" ? 1 : frame === "ice" ? 2 : 0)) throw Error("Invalid frame upgrade");
  const excludedShape = frame === "blossom" ? Math.min(3, Math.floor(rng() * 4)) : null;
  const allowed = [0, 1, 2, 3].filter((shape) => shape !== excludedShape);
  const current = state.current.shape === excludedShape ? { ...state.current, shape: allowed[Math.min(2, Math.floor(rng() * 3))] } : state.current;
  return { ...state, current, excludedShape, frame, map, upgrade, maxLives: maxLivesForFrame(frame, upgrade), timeFactor: (frame === "ice" ? 1.1 + upgrade * 0.05 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive11 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility12(state, name) {
  if (!abilityActive11(state, name)) return state;
  if (name === "shield") return { ...state, protected: false, protectionHits: 0 };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}

// replay/engine-v26.js
var engine_v26_exports = {};
__export(engine_v26_exports, {
  COLORS: () => COLORS16,
  DIFFICULTIES: () => DIFFICULTIES4,
  ENDLESS_MIN_TIME: () => ENDLESS_MIN_TIME2,
  SHAPES: () => SHAPES16,
  SPECIALS: () => SPECIALS15,
  abilityActive: () => abilityActive12,
  advanceBoard: () => advanceBoard17,
  applyLoadout: () => applyLoadout13,
  awardVictoryBoard: () => awardVictoryBoard,
  boardSize: () => boardSize16,
  bombTargets: () => bombTargets,
  choose: () => choose17,
  correctChoiceIndices: () => correctChoiceIndices,
  createRun: () => createRun17,
  difficultyFor: () => difficultyFor4,
  duration: () => duration16,
  elapsedBoardTime: () => elapsedBoardTime16,
  endlessIntensity: () => endlessIntensity2,
  expire: () => expire17,
  frameDelta: () => frameDelta14,
  hasMatch: () => hasMatch16,
  levelFor: () => levelFor16,
  makeBoard: () => makeBoard17,
  matches: () => matches17,
  maxLivesForFrame: () => maxLivesForFrame2,
  randomTile: () => randomTile16,
  revive: () => revive17,
  ruleMatches: () => ruleMatches3,
  seededRandom: () => seededRandom17,
  specialSpawnChance: () => specialSpawnChance4,
  specialsForMode: () => specialsForMode4,
  spendAbility: () => spendAbility17,
  stopAbility: () => stopAbility13,
  streakBonus: () => streakBonus16
});
var SHAPES16 = ["circle", "triangle", "square", "star"];
var COLORS16 = ["red", "blue", "green", "yellow"];
var SPECIALS15 = ["starburst", "hourglass", "crystal", "reset", "heart", "bomb"];
var matches17 = (a, b) => !b.collected && (SPECIALS15.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor16 = (score) => 1 + Math.floor(score / 4);
var boardSize16 = (state) => {
  const progress = state.stage ?? state.picks;
  if (state.mode === "endless" && ["hard", "extreme"].includes(state.difficulty)) {
    const round = Math.max(0, state.difficultyRound ?? progress);
    const sizes = [1, 2, 3, 4, 6, 9, 12, 16];
    if (state.difficulty === "extreme" && round >= sizes.length) return 20;
    if (state.difficulty === "hard" && round >= 100) return 20;
    return sizes[Math.min(sizes.length - 1, round)];
  }
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var ENDLESS_MIN_TIME2 = 750;
var DIFFICULTIES4 = {
  easy: { name: "Easy", start: 3600, floor: ENDLESS_MIN_TIME2, ramp: 6, pickups: 0.09, points: 1 },
  normal: { name: "Normal", start: 2800, floor: ENDLESS_MIN_TIME2, ramp: 9, pickups: 0.07, points: 1 },
  hard: { name: "Hard", start: 2400, floor: ENDLESS_MIN_TIME2, ramp: 15, pickups: 0.05, points: 2 },
  extreme: { name: "Extreme", start: 2e3, floor: ENDLESS_MIN_TIME2, ramp: 22, pickups: 0.03, points: 3 }
};
var endlessPressure2 = (state) => Math.max(0, state.picks || 0, (state.score || 0) / 2);
var endlessIntensity2 = (state) => {
  const d = difficultyFor4(state);
  return Math.min(1, endlessPressure2(state) * d.ramp / (d.start - d.floor));
};
var difficultyFor4 = (state) => DIFFICULTIES4[state.mode === "endless" ? state.difficulty : "normal"] || DIFFICULTIES4.normal;
var duration16 = (state) => {
  const d = difficultyFor4(state);
  const base = state.mode === "endless" ? Math.max(d.floor, d.start - endlessPressure2(state) * d.ramp) : Math.max(1800, 2800 - state.picks * 5);
  return Math.round((base + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
};
var randomTile16 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun17 = (rng = Math.random) => ({ current: randomTile16(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, difficultyRound: 0, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, protectionHits: 0, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus16 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom17(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled16(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
var specialsForMode4 = (mode) => mode === "adventure" ? SPECIALS15.filter((s) => s !== "reset") : SPECIALS15;
var specialSpawnChance4 = (state) => {
  if (state.mode !== "endless") return (state.map === "sunset" ? 0.2 : 0.09) * (state.mode === "adventure" ? 0.5 : 1);
  return difficultyFor4(state).pickups * (1 - 0.6 * endlessIntensity2(state)) * (state.map === "sunset" ? 20 / 9 : 1);
};
var sparseDifficulty4 = (state) => state.mode === "endless" && ["hard", "extreme"].includes(state.difficulty);
function sparseMatch4(state, all, rng) {
  const colorOnly = all.filter((t) => t.color === state.current.color && t.shape !== state.current.shape);
  const shapeOnly = all.filter((t) => t.shape === state.current.shape && t.color !== state.current.color);
  const preferColor = rng() < (state.difficulty === "extreme" ? 0.15 : 0.25);
  const preferred = preferColor ? colorOnly : shapeOnly;
  const pool = preferred.length ? preferred : preferColor ? shapeOnly : colorOnly;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
function makeBoard17(state, rng = Math.random, capacity = boardSize16(state)) {
  if (state.heldBoard) {
    const allowed = [0, 1, 2, 3].filter((s) => s !== state.excludedShape);
    let replacement;
    if (sparseDifficulty4(state)) {
      const all2 = allowed.flatMap((shape) => [0, 1, 2, 3].map((color) => ({ shape, color })));
      const existing = state.heldBoard.filter((t, i) => i !== state.replacedIndex && !t.special && matches17(state.current, t)).length;
      const cap = state.difficulty === "extreme" ? 1 : 2;
      const invalid2 = all2.filter((t) => !matches17(state.current, t));
      replacement = existing < cap && rng() < 1 / state.heldBoard.length ? sparseMatch4(state, all2, rng) : invalid2[Math.min(invalid2.length - 1, Math.floor(rng() * invalid2.length))];
    } else replacement = { shape: allowed[Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))], color: Math.min(3, Math.floor(rng() * 4)) };
    return state.heldBoard.map((t, i) => i === state.replacedIndex ? replacement : { ...t });
  }
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize16(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) })).filter((t) => t.shape !== state.excludedShape);
  const valid = shuffled16(all.filter((t) => matches17(state.current, t)), rng);
  const invalid = shuffled16(all.filter((t) => !matches17(state.current, t)), rng);
  const size = capacity;
  const noMatch = rng() < 0.13;
  const sparse = sparseDifficulty4(state);
  const candidateCount = sparse ? Math.min(size, state.difficulty === "hard" && rng() < 0.25 ? 2 : 1) : Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const matchCount = noMatch ? 0 : candidateCount;
  const correct = sparse ? Array.from({ length: matchCount }, () => sparseMatch4(state, all, rng)) : valid.slice(0, matchCount);
  const normal = shuffled16([...correct, ...Array.from({ length: size - matchCount }, (_, i) => invalid[i % invalid.length])], rng);
  const allowedSpecials = specialsForMode4(state.mode);
  const pending = (state.pendingSpecials || []).filter((entry) => allowedSpecials.includes(entry.special));
  const available = Array.from({ length: size }, (_, i) => i);
  const randomSlot = () => available[Math.min(available.length - 1, Math.floor(rng() * available.length))];
  const place = (slot, special) => {
    normal[slot] = { special };
    available.splice(available.indexOf(slot), 1);
  };
  const relocated = [];
  for (const entry of pending.slice(0, size)) {
    if (Number.isInteger(entry.slot) && available.includes(entry.slot)) place(entry.slot, entry.special);
    else relocated.push(entry);
  }
  for (const entry of relocated) place(randomSlot(), entry.special);
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && available.length && rng() < specialSpawnChance4(state)) {
    const slot = randomSlot();
    place(slot, allowedSpecials[Math.floor(rng() * allowedSpecials.length)]);
  }
  return normal;
}
var retained15 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && slot !== remove ? [{ special: tile.special, slot }] : []);
var ruleMatches3 = (state, tile) => !tile.collected && (!!tile.special || (!tile.memory || !tile.hidden) && (state.mode !== "adventure" || !state.matchRule ? matches17(state.current, tile) : state.current[state.matchRule] === tile[state.matchRule]));
var correctChoiceIndices = (state, board) => board.flatMap((tile, index) => !tile.collected && !(state.mode === "adventure" && tile.special === "reset") && (tile.bonusTile || ruleMatches3(state, tile)) ? [index] : []);
var hasMatch16 = (state, board) => board.some((tile) => ruleMatches3(state, tile));
function mistake16(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) {
    const protectionHits = Math.max(0, (state.protectionHits || 1) - 1);
    return { ...state, protectionHits, protected: protectionHits > 0, outcome: "protected" };
  }
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function bombTargets(board, index, columns = board.length === 3 ? 3 : Math.ceil(Math.sqrt(board.length))) {
  const row = Math.floor(index / columns), col = index % columns;
  return [index, ...board.map((_, i) => i).filter((i) => i !== index && !board[i].collected && !board[i].memory && Math.abs(Math.floor(i / columns) - row) + Math.abs(i % columns - col) === 1).slice(0, 2)];
}
function choose17(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected || state.mode === "adventure" && tile.special === "reset") return state;
  if (state.mode === "adventure" && state.matchRule && !tile.special && !tile.bonusTile && matches17(state.current, tile) && state.current[state.matchRule] !== tile[state.matchRule]) return state;
  if (tile.special === "bomb") {
    const blast = bombTargets(board, index, state.boardColumns), remaining = board.map((t, i) => ({ ...t, collected: t.collected || blast.includes(i) }));
    const earned = blast.length * state.multiplier * difficultyFor4(state).points;
    return { ...state, score: state.score + earned, picks: state.picks + 1, earned, bonus: 0, specialEffect: "bomb", blastTargets: blast, heldBoard: null, replacedIndex: null, bombBoard: true, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, pendingSpecials: retained15(remaining).filter((e) => !blast.includes(e.slot)), outcome: "correct" };
  }
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + 2 * state.multiplier * difficultyFor4(state).points, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: 2 * state.multiplier * difficultyFor4(state).points, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  if (state.bombBoard) state = { ...state, bombBoard: false, sweepBoard: null };
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.sweepPending || state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained15(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const local = ["heart", "hourglass", "crystal"].includes(tile.special);
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special && !t.collected && !t.memory).length : 1) * state.multiplier * difficultyFor4(state).points;
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + (local ? 0 : 1),
      heldBoard: null,
      replacedIndex: null,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      protectionHits: tile.special === "crystal" ? Math.max(state.protectionHits || 0, 1) : state.protectionHits,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(3, state.slowRounds) : state.slowRounds
    };
  }
  if (!(state.mode === "adventure" && state.matchRule ? state.current[state.matchRule] === tile[state.matchRule] : matches17(state.current, tile))) return mistake16(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus16(colorStreak) + streakBonus16(shapeStreak);
  const bonus = streak;
  const score = state.score + (state.multiplier + bonus) * difficultyFor4(state).points;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor16(picks), protected: state.protected, outcome: "correct" };
}
function expire17(state, board) {
  if (state.over) return state;
  if (state.bombBoard) state = { ...state, bombBoard: false, sweepBoard: null };
  if (board.some((t) => t.bonusTile)) return { ...state, sweepPending: false, sweepStarted: false, sweepBoard: null, specialEffect: null, earned: 0, bonus: 0, outcome: "pass" };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained15(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return board.some((tile) => !tile.special && ruleMatches3(state, tile)) ? mistake16(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility17(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, protectionHits: ability === "shield" ? 1 : state.protectionHits, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard17(state) {
  if (state.heldBoard || state.sweepBoard || ["heart", "hourglass", "crystal"].includes(state.specialEffect)) return { ...state, outcome: "ready" };
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  const difficultyRound = state.specialEffect === "reset" ? 0 : (state.difficultyRound ?? state.stage ?? state.picks) + (state.sweepBoard || state.outcome !== "correct" ? 0 : 1);
  return { ...state, difficultyRound, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive17(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, heldBoard: null, replacedIndex: null, outcome: "revived" };
}
var elapsedBoardTime16 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta14 = (now, last) => Math.min(100, Math.max(0, now - last));
var maxLivesForFrame2 = (frame = "none", upgrade = 0) => frame === "gold" ? 4 + (upgrade === 1 ? 1 : 0) : 3;
function applyLoadout13(state, frame = "none", map = "garden", rng = Math.random, upgrade = 0) {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  if (!Number.isInteger(upgrade) || upgrade < 0 || upgrade > (frame === "gold" ? 1 : frame === "ice" ? 2 : 0)) throw Error("Invalid frame upgrade");
  const excludedShape = frame === "blossom" ? Math.min(3, Math.floor(rng() * 4)) : null;
  const allowed = [0, 1, 2, 3].filter((shape) => shape !== excludedShape);
  const current = state.current.shape === excludedShape ? { ...state.current, shape: allowed[Math.min(2, Math.floor(rng() * 3))] } : state.current;
  return { ...state, current, excludedShape, frame, map, upgrade, maxLives: maxLivesForFrame2(frame, upgrade), timeFactor: (frame === "ice" ? 1.1 + upgrade * 0.05 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive12 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility13(state, name) {
  if (!abilityActive12(state, name)) return state;
  if (name === "shield") return { ...state, protected: false, protectionHits: 0 };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}
function awardVictoryBoard(state, board, won) {
  if (state.mode !== "adventure" || !won || state.over || state.victoryBoardAwarded) return state;
  const value = state.multiplier * difficultyFor4(state).points;
  const victoryPoints = board.map((tile) => tile && !tile.collected ? value : 0);
  const victoryBonus = victoryPoints.reduce((sum, n) => sum + n, 0);
  return { ...state, score: state.score + victoryBonus, victoryBoardAwarded: true, victoryBonus, victoryPoints };
}

// replay/engine.js
var engine_exports2 = {};
__export(engine_exports2, {
  BOMB_PICKUP_GAP: () => BOMB_PICKUP_GAP,
  COLORS: () => COLORS17,
  DIFFICULTIES: () => DIFFICULTIES5,
  ENDLESS_MIN_TIME: () => ENDLESS_MIN_TIME3,
  SHAPES: () => SHAPES17,
  SPECIALS: () => SPECIALS16,
  abilityActive: () => abilityActive13,
  advanceBoard: () => advanceBoard18,
  applyLoadout: () => applyLoadout14,
  awardVictoryBoard: () => awardVictoryBoard2,
  boardSize: () => boardSize17,
  bombTargets: () => bombTargets2,
  choose: () => choose18,
  correctChoiceIndices: () => correctChoiceIndices2,
  createRun: () => createRun18,
  difficultyFor: () => difficultyFor5,
  duration: () => duration17,
  elapsedBoardTime: () => elapsedBoardTime17,
  endlessIntensity: () => endlessIntensity3,
  expire: () => expire18,
  frameDelta: () => frameDelta15,
  hasMatch: () => hasMatch17,
  levelFor: () => levelFor17,
  makeBoard: () => makeBoard18,
  matches: () => matches18,
  maxLivesForFrame: () => maxLivesForFrame3,
  randomTile: () => randomTile17,
  revive: () => revive18,
  ruleMatches: () => ruleMatches4,
  seededRandom: () => seededRandom18,
  specialSpawnChance: () => specialSpawnChance5,
  specialsForMode: () => specialsForMode5,
  spendAbility: () => spendAbility18,
  stopAbility: () => stopAbility14,
  streakBonus: () => streakBonus17
});
var SHAPES17 = ["circle", "triangle", "square", "star"];
var COLORS17 = ["red", "blue", "green", "yellow"];
var SPECIALS16 = ["starburst", "hourglass", "crystal", "reset", "heart", "bomb"];
var matches18 = (a, b) => !b.collected && (SPECIALS16.includes(b.special) || a.shape === b.shape || a.color === b.color);
var levelFor17 = (score) => 1 + Math.floor(score / 4);
var boardSize17 = (state) => {
  const progress = state.stage ?? state.picks;
  if (state.mode === "endless" && ["hard", "extreme"].includes(state.difficulty)) {
    const round = Math.max(0, state.difficultyRound ?? progress);
    const sizes = [1, 2, 3, 4, 6, 9, 12, 16];
    if (state.difficulty === "extreme" && round >= sizes.length) return 20;
    if (state.difficulty === "hard" && round >= 100) return 20;
    return sizes[Math.min(sizes.length - 1, round)];
  }
  return progress < 1 ? 1 : progress < 2 ? 2 : progress < 3 ? 3 : progress < 4 ? 4 : progress < 7 ? 6 : progress < 12 ? 9 : progress < 17 ? 12 : 16;
};
var ENDLESS_MIN_TIME3 = 750;
var BOMB_PICKUP_GAP = 30;
var DIFFICULTIES5 = {
  easy: { name: "Easy", start: 3600, floor: ENDLESS_MIN_TIME3, ramp: 6, pickups: 0.09, points: 1 },
  normal: { name: "Normal", start: 2800, floor: ENDLESS_MIN_TIME3, ramp: 9, pickups: 0.07, points: 1 },
  hard: { name: "Hard", start: 2400, floor: ENDLESS_MIN_TIME3, ramp: 15, pickups: 0.05, points: 2 },
  extreme: { name: "Extreme", start: 2e3, floor: ENDLESS_MIN_TIME3, ramp: 22, pickups: 0.03, points: 3 }
};
var endlessPressure3 = (state) => Math.max(0, state.picks || 0, (state.score || 0) / 2);
var endlessIntensity3 = (state) => {
  const d = difficultyFor5(state);
  return Math.min(1, endlessPressure3(state) * d.ramp / (d.start - d.floor));
};
var difficultyFor5 = (state) => DIFFICULTIES5[state.mode === "endless" ? state.difficulty : "normal"] || DIFFICULTIES5.normal;
var duration17 = (state) => {
  const d = difficultyFor5(state);
  const lateFloor = Math.max(450, ENDLESS_MIN_TIME3 / (1 + Math.max(0, endlessPressure3(state) - 500) / 1500));
  const base = state.mode === "endless" ? Math.max(lateFloor, d.start - endlessPressure3(state) * d.ramp) : Math.max(1800, 2800 - state.picks * 5);
  return Math.round((base + (state.map === "garden" && state.picks < 5 ? 200 : 0)) * (state.timeFactor || 1));
};
var randomTile17 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun18 = (rng = Math.random) => ({ current: randomTile17(rng), score: 0, picks: 0, chainProgress: 0, chainTarget: 10, difficultyRound: 0, sweepPending: false, sweepBoard: null, maxLives: 3, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, protectionHits: 0, multiplier: 1, slow: false, slowRounds: 0, boostRounds: 0, continued: false, over: false, outcome: "ready" });
var streakBonus17 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom18(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled17(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
var specialsForMode5 = (mode) => mode === "adventure" ? SPECIALS16.filter((s) => s !== "reset") : SPECIALS16;
var specialSpawnChance5 = (state) => {
  if (state.mode !== "endless") return (state.map === "sunset" ? 0.2 : 0.09) * (state.mode === "adventure" ? 0.5 : 1);
  return difficultyFor5(state).pickups * (1 - 0.6 * endlessIntensity3(state)) * (state.map === "sunset" ? 20 / 9 : 1);
};
var sparseDifficulty5 = (state) => state.mode === "endless" && ["hard", "extreme"].includes(state.difficulty);
function sparseMatch5(state, all, rng) {
  const colorOnly = all.filter((t) => t.color === state.current.color && t.shape !== state.current.shape);
  const shapeOnly = all.filter((t) => t.shape === state.current.shape && t.color !== state.current.color);
  const preferColor = rng() < (state.difficulty === "extreme" ? 0.15 : 0.25);
  const preferred = preferColor ? colorOnly : shapeOnly;
  const pool = preferred.length ? preferred : preferColor ? shapeOnly : colorOnly;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
function makeBoard18(state, rng = Math.random, capacity = boardSize17(state)) {
  if (state.bombRefillBoard) {
    const allowed = [0, 1, 2, 3].filter((shape) => shape !== state.excludedShape), blast = new Set(state.blastTargets);
    return state.bombRefillBoard.map((tile, i) => blast.has(i) ? { shape: allowed[Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))], color: Math.min(3, Math.floor(rng() * 4)) } : { ...tile });
  }
  if (state.heldBoard) {
    const allowed = [0, 1, 2, 3].filter((s) => s !== state.excludedShape);
    let replacement;
    if (sparseDifficulty5(state)) {
      const all2 = allowed.flatMap((shape) => [0, 1, 2, 3].map((color) => ({ shape, color })));
      const existing = state.heldBoard.filter((t, i) => i !== state.replacedIndex && !t.special && matches18(state.current, t)).length;
      const cap = state.difficulty === "extreme" ? 1 : 2;
      const invalid2 = all2.filter((t) => !matches18(state.current, t));
      replacement = existing < cap && rng() < 1 / state.heldBoard.length ? sparseMatch5(state, all2, rng) : invalid2[Math.min(invalid2.length - 1, Math.floor(rng() * invalid2.length))];
    } else replacement = { shape: allowed[Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))], color: Math.min(3, Math.floor(rng() * 4)) };
    return state.heldBoard.map((t, i) => i === state.replacedIndex ? replacement : { ...t });
  }
  if (state.sweepBoard) return state.sweepBoard.map((tile) => ({ ...tile }));
  if (state.sweepPending) return Array.from({ length: boardSize17(state) }, (_, i) => ({ shape: i % 4, color: state.current.color, bonusTile: true }));
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) })).filter((t) => t.shape !== state.excludedShape);
  const valid = shuffled17(all.filter((t) => matches18(state.current, t)), rng);
  const invalid = shuffled17(all.filter((t) => !matches18(state.current, t)), rng);
  const size = capacity;
  const noMatch = rng() < 0.13;
  const sparse = sparseDifficulty5(state);
  const candidateCount = sparse ? Math.min(size, state.difficulty === "hard" && rng() < 0.25 ? 2 : 1) : Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  const matchCount = noMatch ? 0 : candidateCount;
  const correct = sparse ? Array.from({ length: matchCount }, () => sparseMatch5(state, all, rng)) : valid.slice(0, matchCount);
  const normal = shuffled17([...correct, ...Array.from({ length: size - matchCount }, (_, i) => invalid[i % invalid.length])], rng);
  const allowedSpecials = specialsForMode5(state.mode);
  const pending = (state.pendingSpecials || []).filter((entry) => allowedSpecials.includes(entry.special) && !entry.collected && (entry.special !== "bomb" || state.picks >= (state.nextBombPick || 0)));
  const spawnSpecials = allowedSpecials.filter((s) => s !== "bomb" || state.picks >= Math.max(15, state.nextBombPick || 0) && !pending.some((e) => e.special === "bomb"));
  const available = Array.from({ length: size }, (_, i) => i);
  const randomSlot = () => available[Math.min(available.length - 1, Math.floor(rng() * available.length))];
  const place = (slot, special) => {
    normal[slot] = { special };
    available.splice(available.indexOf(slot), 1);
  };
  const relocated = [];
  for (const entry of pending.slice(0, size)) {
    if (Number.isInteger(entry.slot) && available.includes(entry.slot)) place(entry.slot, entry.special);
    else relocated.push(entry);
  }
  for (const entry of relocated) place(randomSlot(), entry.special);
  if (state.picks >= 5 && (state.stage ?? state.picks) > 0 && pending.length < Math.min(2, size) && available.length && rng() < specialSpawnChance5(state)) {
    let slot = randomSlot();
    const special = spawnSpecials[Math.min(spawnSpecials.length - 1, Math.floor(rng() * spawnSpecials.length))];
    if (special === "bomb" && slot === state.lastBombSlot && available.length > 1) slot = available[(available.indexOf(slot) + 1) % available.length];
    place(slot, special);
  }
  return normal;
}
var retained16 = (board, remove = -1) => board.flatMap((tile, slot) => tile.special && !tile.collected && slot !== remove ? [{ special: tile.special, slot }] : []);
var ruleMatches4 = (state, tile) => !tile.collected && (!!tile.special || (!tile.memory || !tile.hidden) && (state.mode !== "adventure" || !state.matchRule ? matches18(state.current, tile) : state.current[state.matchRule] === tile[state.matchRule]));
var correctChoiceIndices2 = (state, board) => board.flatMap((tile, index) => !tile.collected && !(state.mode === "adventure" && tile.special === "reset") && (tile.bonusTile || ruleMatches4(state, tile)) ? [index] : []);
var hasMatch17 = (state, board) => board.some((tile) => ruleMatches4(state, tile));
function mistake17(state, outcome) {
  state = { ...state, chainProgress: 0, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) {
    const protectionHits = Math.max(0, (state.protectionHits || 1) - 1);
    return { ...state, protectionHits, protected: protectionHits > 0, outcome: "protected" };
  }
  const strikes = Math.min(state.maxLives || 3, state.strikes + 1);
  return { ...state, strikes, over: strikes === (state.maxLives || 3), outcome };
}
function bombTargets2(board, index, columns = board.length === 3 ? 3 : Math.ceil(Math.sqrt(board.length)), cells) {
  const position = (i) => (cells?.[i] ?? i + 1) - 1, origin = position(index), row = Math.floor(origin / columns), col = origin % columns;
  return board.flatMap((tile, i) => !tile.collected && Math.abs(Math.floor(position(i) / columns) - row) <= 1 && Math.abs(position(i) % columns - col) <= 1 ? [i] : []);
}
function choose18(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (tile.collected || state.mode === "adventure" && tile.special === "reset") return state;
  if (state.mode === "adventure" && state.matchRule && !tile.special && !tile.bonusTile && matches18(state.current, tile) && state.current[state.matchRule] !== tile[state.matchRule]) return state;
  if (tile.special === "bomb") {
    const blast = bombTargets2(board, index, state.boardColumns, state.boardCells), remaining = board.map((t, i) => ({ ...t, collected: t.collected || blast.includes(i) }));
    const earned = blast.length * state.multiplier * difficultyFor5(state).points;
    return { ...state, score: state.score + earned, picks: state.picks + 1, earned, bonus: 0, specialEffect: "bomb", nextBombPick: state.picks + 1 + BOMB_PICKUP_GAP, lastBombSlot: index, blastTargets: blast, heldBoard: null, replacedIndex: null, bombBoard: true, bombRefillBoard: board.map((t) => ({ ...t })), sweepBoard: null, pendingSpecials: retained16(remaining).filter((e) => !blast.includes(e.slot)), outcome: "correct" };
  }
  if (tile.bonusTile) {
    const remaining = board.map((t, i) => ({ ...t, collected: t.collected || i === index }));
    return { ...state, current: { shape: tile.shape, color: tile.color }, score: state.score + 2 * state.multiplier * difficultyFor5(state).points, picks: state.picks + 1, stage: state.stage ?? state.picks, earned: 2 * state.multiplier * difficultyFor5(state).points, bonus: 0, specialEffect: null, sweepPending: false, sweepBoard: remaining.some((t) => !t.collected) ? remaining : null, sweepStarted: false, outcome: "correct" };
  }
  if (state.bombBoard) state = { ...state, bombBoard: false, bombRefillBoard: null, sweepBoard: null };
  const progress = (state.chainProgress || 0) + 1, target = state.chainTarget || 10;
  const chain = { chainProgress: progress >= target ? 0 : progress, chainTarget: progress >= target ? target + 10 : target, sweepPending: state.sweepPending || state.frame === "cosmic" && progress >= target, sweepStarted: state.frame === "cosmic" && progress >= target };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained16(board, index), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  if (tile.special) {
    const local = ["heart", "hourglass", "crystal"].includes(tile.special);
    const earned = (tile.special === "starburst" ? board.filter((t) => !t.special && !t.collected && !t.memory).length : 1) * state.multiplier * difficultyFor5(state).points;
    return {
      ...state,
      ...chain,
      score: state.score + earned,
      picks: state.picks + 1,
      stage: tile.special === "reset" ? 0 : (state.stage ?? state.picks) + (local ? 0 : 1),
      heldBoard: null,
      replacedIndex: null,
      earned,
      specialEffect: tile.special,
      bonus: 0,
      colorStreak: 0,
      shapeStreak: 0,
      lastPick: null,
      outcome: "correct",
      pendingSpecials: tile.special === "reset" ? [] : state.pendingSpecials,
      strikes: tile.special === "heart" ? 0 : state.strikes,
      protected: tile.special === "crystal" || state.protected,
      protectionHits: tile.special === "crystal" ? Math.max(state.protectionHits || 0, 1) : state.protectionHits,
      shieldEnabled: tile.special === "crystal" || state.shieldEnabled,
      slow: tile.special === "hourglass" || state.slow,
      slowRounds: tile.special === "hourglass" ? Math.max(3, state.slowRounds) : state.slowRounds
    };
  }
  if (!(state.mode === "adventure" && state.matchRule ? state.current[state.matchRule] === tile[state.matchRule] : matches18(state.current, tile))) return mistake17(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const streak = streakBonus17(colorStreak) + streakBonus17(shapeStreak);
  const bonus = streak;
  const score = state.score + (state.multiplier + bonus) * difficultyFor5(state).points;
  const picks = state.picks + 1;
  return { ...state, ...chain, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, stage: (state.stage ?? state.picks) + 1, earned: score - state.score, strikes: state.strikes, level: levelFor17(picks), protected: state.protected, outcome: "correct" };
}
function expire18(state, board) {
  if (state.over) return state;
  if (state.bombBoard) state = { ...state, bombBoard: false, bombRefillBoard: null, sweepBoard: null };
  if (board.some((t) => t.bonusTile)) return { ...state, sweepPending: false, sweepStarted: false, sweepBoard: null, specialEffect: null, earned: 0, bonus: 0, outcome: "pass" };
  state = { ...state, heldBoard: null, replacedIndex: null, pendingSpecials: [...retained16(board), ...(state.pendingSpecials || []).slice(board.length)], specialEffect: null, earned: 0 };
  return board.some((tile) => !tile.special && ruleMatches4(state, tile)) ? mistake17(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility18(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || (ability === "shield" ? state.protected : ability === "freeze" ? state.slowRounds > 0 : state.boostRounds > 0)) return state;
  return { ...state, [ability]: Math.max(0, state[ability] - 1), protected: ability === "shield" || state.protected, protectionHits: ability === "shield" ? 1 : state.protectionHits, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, slowRounds: ability === "freeze" ? 5 : state.slowRounds, boostRounds: ability === "boost" ? 5 : state.boostRounds, multiplier: ability === "boost" ? 5 : state.multiplier };
}
function advanceBoard18(state) {
  if (state.bombRefillBoard || state.heldBoard || state.sweepBoard || ["heart", "hourglass", "crystal"].includes(state.specialEffect)) return { ...state, outcome: "ready" };
  if (!["correct", "wrong", "miss", "protected", "pass"].includes(state.outcome)) return state;
  const slowRounds = Math.max(0, (state.slowRounds || 0) - 1), boostRounds = Math.max(0, (state.boostRounds || 0) - 1);
  const difficultyRound = state.specialEffect === "reset" ? 0 : (state.difficultyRound ?? state.stage ?? state.picks) + (state.sweepBoard || state.outcome !== "correct" ? 0 : 1);
  return { ...state, difficultyRound, slowRounds, boostRounds, slow: slowRounds > 0, multiplier: boostRounds > 0 ? 5 : 1, outcome: "ready" };
}
function revive18(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.protected, heldBoard: null, replacedIndex: null, outcome: "revived" };
}
var elapsedBoardTime17 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);
var frameDelta15 = (now, last) => Math.min(100, Math.max(0, now - last));
var maxLivesForFrame3 = (frame = "none", upgrade = 0) => frame === "gold" ? 4 + (upgrade === 1 ? 1 : 0) : 3;
function applyLoadout14(state, frame = "none", map = "garden", rng = Math.random, upgrade = 0) {
  if (!["none", "gold", "ice", "blossom", "cosmic"].includes(frame) || !["garden", "moon", "sunset"].includes(map)) throw Error("Invalid loadout");
  if (!Number.isInteger(upgrade) || upgrade < 0 || upgrade > (frame === "gold" ? 1 : frame === "ice" ? 2 : 0)) throw Error("Invalid frame upgrade");
  const excludedShape = frame === "blossom" ? Math.min(3, Math.floor(rng() * 4)) : null;
  const allowed = [0, 1, 2, 3].filter((shape) => shape !== excludedShape);
  const current = state.current.shape === excludedShape ? { ...state.current, shape: allowed[Math.min(2, Math.floor(rng() * 3))] } : state.current;
  return { ...state, current, excludedShape, frame, map, upgrade, maxLives: maxLivesForFrame3(frame, upgrade), timeFactor: (frame === "ice" ? 1.1 + upgrade * 0.05 : 1) * (map === "moon" ? 1.1 : 1) };
}
var abilityActive13 = (state, name) => name === "shield" ? state.protected : name === "freeze" ? state.slowRounds > 0 : name === "boost" ? state.boostRounds > 0 : false;
function stopAbility14(state, name) {
  if (!abilityActive13(state, name)) return state;
  if (name === "shield") return { ...state, protected: false, protectionHits: 0 };
  if (name === "freeze") return { ...state, slow: false, slowRounds: 0 };
  return { ...state, multiplier: 1, boostRounds: 0 };
}
function awardVictoryBoard2(state, board, won) {
  if (state.mode !== "adventure" || !won || state.over || state.victoryBoardAwarded) return state;
  const value = state.multiplier * difficultyFor5(state).points;
  const victoryPoints = board.map((tile) => tile && !tile.collected ? value : 0);
  const victoryBonus = victoryPoints.reduce((sum, n) => sum + n, 0);
  return { ...state, score: state.score + victoryBonus, victoryBoardAwarded: true, victoryBonus, victoryPoints };
}

// replay/engine-legacy.js
var engine_legacy_exports = {};
__export(engine_legacy_exports, {
  COLORS: () => COLORS18,
  SHAPES: () => SHAPES18,
  boardSize: () => boardSize18,
  choose: () => choose19,
  createRun: () => createRun19,
  duration: () => duration18,
  elapsedBoardTime: () => elapsedBoardTime18,
  expire: () => expire19,
  hasMatch: () => hasMatch18,
  levelFor: () => levelFor18,
  makeBoard: () => makeBoard19,
  matches: () => matches19,
  randomTile: () => randomTile18,
  revive: () => revive19,
  seededRandom: () => seededRandom19,
  spendAbility: () => spendAbility19,
  streakBonus: () => streakBonus18
});
var SHAPES18 = ["circle", "triangle", "square", "star"];
var COLORS18 = ["red", "blue", "green", "yellow"];
var matches19 = (a, b) => a.shape === b.shape || a.color === b.color;
var levelFor18 = (score) => 1 + Math.floor(score / 4);
var boardSize18 = (state) => [2, 4, 4, 6, 6, 9][Math.min(5, state.picks)];
var duration18 = (state) => Math.max(1050, 2100 - state.picks * 25);
var randomTile18 = (rng = Math.random) => ({ shape: Math.min(3, Math.floor(rng() * 4)), color: Math.min(3, Math.floor(rng() * 4)) });
var createRun19 = (rng = Math.random) => ({ current: randomTile18(rng), score: 0, picks: 0, strikes: 0, level: 1, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0, freeze: 1, boost: 1, shield: 1, shieldEnabled: false, protected: false, multiplier: 1, slow: false, continued: false, over: false, outcome: "ready" });
var streakBonus18 = (n) => n === 3 || n === 5 || n >= 10 && n % 5 === 0 ? n : 0;
function seededRandom19(seed) {
  let n = seed >>> 0;
  return () => {
    n = Math.imul(1664525, n) + 1013904223 >>> 0;
    return n / 4294967296;
  };
}
function shuffled18(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeBoard19(state, rng = Math.random) {
  const all = Array.from({ length: 16 }, (_, i) => ({ shape: i % 4, color: Math.floor(i / 4) }));
  const valid = shuffled18(all.filter((t) => matches19(state.current, t)), rng);
  const invalid = shuffled18(all.filter((t) => !matches19(state.current, t)), rng);
  const size = boardSize18(state);
  if (rng() < 0.13) return invalid.slice(0, size);
  const matchCount = Math.min(size, 1 + Math.floor(rng() * Math.min(3, Math.ceil(size / 3))));
  return shuffled18([...valid.slice(0, matchCount), ...invalid.slice(0, size - matchCount)], rng);
}
var hasMatch18 = (state, board) => board.some((tile) => matches19(state.current, tile));
function mistake18(state, outcome) {
  state = { ...state, colorStreak: 0, shapeStreak: 0, lastPick: null, bonus: 0 };
  if (state.protected) return { ...state, protected: false, outcome: "protected" };
  const strikes = Math.min(3, state.strikes + 1);
  return { ...state, strikes, over: strikes === 3, outcome };
}
function choose19(state, board, index) {
  if (state.over || !Number.isInteger(index) || index < 0 || index >= board.length) return state;
  const tile = board[index];
  if (!matches19(state.current, tile)) return mistake18(state, "wrong");
  const colorStreak = state.lastPick?.color === tile.color ? state.colorStreak + 1 : 1;
  const shapeStreak = state.lastPick?.shape === tile.shape ? state.shapeStreak + 1 : 1;
  const bonus = streakBonus18(colorStreak) + streakBonus18(shapeStreak);
  const score = state.score + state.multiplier + bonus;
  const picks = state.picks + 1;
  return { ...state, current: { ...tile }, lastPick: { ...tile }, colorStreak, shapeStreak, bonus, score, picks, strikes: 0, level: levelFor18(picks), protected: state.shieldEnabled, outcome: "correct" };
}
function expire19(state, board) {
  if (state.over) return state;
  return hasMatch18(state, board) ? mistake18(state, "miss") : { ...state, bonus: 0, outcome: "pass" };
}
function spendAbility19(state, ability) {
  if (state.over || !["freeze", "boost", "shield"].includes(ability) || state[ability] <= 0 || ability === "shield" && state.protected) return state;
  return { ...state, [ability]: state[ability] - 1, protected: ability === "shield" || state.protected, shieldEnabled: ability === "shield" || state.shieldEnabled, slow: ability === "freeze" || state.slow, multiplier: ability === "boost" ? 5 : state.multiplier, outcome: ability };
}
function revive19(state) {
  if (!state.over || state.continued) return state;
  return { ...state, strikes: 0, over: false, continued: true, protected: state.shieldEnabled, outcome: "revived" };
}
var elapsedBoardTime18 = (delta, slow) => Math.max(0, delta) * (slow ? 0.5 : 1);

// replay/replay.js
function replay(seed, actions, rules = 14) {
  const { createRun: createRun20, seededRandom: seededRandom20, makeBoard: makeBoard20, choose: choose20, expire: expire20, spendAbility: spendAbility20, revive: revive20, advanceBoard: advanceBoard19, applyLoadout: applyLoadout15, stopAbility: stopAbility15 } = rules >= 43 && rules <= 46 ? flatScoreRules : rules >= 39 && rules <= 42 ? timeRules : rules >= 35 && rules <= 38 ? cosmicRules : rules >= 31 && rules <= 34 ? blossomRules : rules >= 27 && rules <= 30 ? engine_exports2 : rules >= 23 && rules <= 26 ? engine_v26_exports : rules >= 19 && rules <= 22 ? engine_v22_exports : rules >= 15 && rules <= 18 ? engine_v18_exports : rules === 14 ? engine_v14_exports : rules === 13 ? engine_v13_exports : rules === 12 ? engine_v12_exports : rules === 11 ? engine_v11_exports : rules === 10 ? engine_v10_exports : rules === 9 ? engine_v9_exports : rules === 8 ? engine_v8_exports : rules === 7 ? engine_v7_exports : rules === 6 ? engine_v6_exports : rules === 5 ? engine_v5_exports : rules === 4 ? engine_v4_exports : rules === 3 ? engine_v3_exports : rules === 2 ? engine_v2_exports : engine_legacy_exports;
  if (!Array.isArray(actions) || actions.length > 1e4) throw Error("Invalid run");
  const rng = seededRandom20(seed);
  let state = createRun20(rng);
  if (rules >= 6 && actions[0]?.type === "loadout") {
    state = applyLoadout15(state, actions[0].frame, actions[0].map, rng, actions[0].upgrade ?? 0);
    actions = actions.slice(1);
  }
  if (rules >= 15 && rules <= 46) {
    state.mode = "endless";
    state.difficulty = ["easy", "normal", "hard", "extreme"][(rules - 15) % 4];
  }
  let board = makeBoard20(state, rng);
  for (const action of actions) {
    if (!action || typeof action !== "object") throw Error("Invalid action");
    if (action.type === "stopAbility") {
      if (!stopAbility15) throw Error("Unsupported action");
      const next = stopAbility15(state, action.name);
      if (next === state) throw Error("Inactive ability");
      state = next;
      continue;
    }
    if (action.type === "ability") {
      const next = spendAbility20(state, action.name);
      if (next === state) throw Error("Invalid ability");
      state = next;
      continue;
    }
    if (action.type === "revive") {
      const next = revive20(state);
      if (next === state) throw Error("Invalid continue");
      state = next;
      board = makeBoard20(state, rng);
      continue;
    }
    if (state.over) throw Error("Run has ended");
    if (action.type === "choose") {
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= board.length) throw Error("Invalid choice");
      const next = choose20(state, board, action.index);
      if (next === state) throw Error("Invalid choice");
      state = next;
    } else if (action.type === "expire") state = expire20(state, board);
    else throw Error("Unknown action");
    if (!state.over) {
      if (advanceBoard19) state = advanceBoard19(state);
      board = makeBoard20(state, rng);
      if (state.bombRefillBoard) state = { ...state, bombRefillBoard: null, bombBoard: false, specialEffect: null, blastTargets: null };
    }
  }
  return { score: state.score, picks: state.picks };
}

// main-service.mjs
var oldHost = "https://shape-shift-scores.fluffy-stone-5231.chatgpt.site";
var frames = /* @__PURE__ */ new Set(["none", "gold", "ice", "blossom", "cosmic"]);
function fault(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
async function readBody(request, limit) {
  const reader = request.body?.getReader();
  if (!reader) throw fault(400, "Missing body");
  const chunks = [];
  let size = 0;
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw fault(413, "Request too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw fault(400, "Invalid JSON");
  }
}
async function actor(request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") || "";
  if (!/^[a-f0-9-]{72}$/.test(token)) throw fault(401, "Unauthorized");
  const digest2 = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest2), (x) => x.toString(16).padStart(2, "0")).join("");
}
var defaultName = (id) => "Player " + id.slice(0, 6).toUpperCase();
async function mainService(request, env, reply) {
  const path = new URL(request.url).pathname;
  try {
    if (path === "/api/leaderboard" && request.method === "GET") return reply(200, await publicRankings(env.DB));
    if (!["/api/run", "/api/finish", "/api/profile", "/api/delete", "/api/checkpoint", "/api/owner", "/api/admin", "/api/personal-rank"].includes(path)) return reply(404, { error: "Not found" });
    if (request.method !== "POST") return reply(405, { error: "Method not allowed" });
    const id = await actor(request);
    if (env.SUBMISSIONS && !(await env.SUBMISSIONS.limit({ key: "main:" + id })).success) return reply(429, { error: "Please try again shortly" });
    const body = await readBody(request, path === "/api/finish" ? 1e6 : 2e3);
    if (path === "/api/personal-rank") return reply(200, await personalRank(env.DB, id));
    const now = Date.now();
    const owner = await env.DB.prepare("SELECT admin_active FROM owners WHERE player_id=?").bind(id).first();
    if (path === "/api/owner") return reply(200, { owner: !!owner, adminActive: !!owner?.admin_active });
    if (path === "/api/admin") {
      if (!owner) return reply(403, { error: "Owner access required" });
      if (typeof body.enabled !== "boolean") return reply(400, { error: "Invalid admin request" });
      await env.DB.batch([
        env.DB.prepare("UPDATE owners SET admin_active=? WHERE player_id=?").bind(body.enabled ? 1 : 0, id),
        env.DB.prepare("UPDATE run_proofs SET closed=1 WHERE player_id=? AND closed=0").bind(id)
      ]);
      return reply(200, { owner: true, adminActive: body.enabled });
    }
    if (["/api/run", "/api/finish", "/api/checkpoint"].includes(path) && owner?.admin_active) return reply(403, { error: "Admin mode cannot submit ranked scores" });
    if (path === "/api/checkpoint") {
      if (typeof body.id !== "string" || typeof body.nonce !== "string" || !Number.isSafeInteger(body.offset)) return reply(400, { error: "Invalid checkpoint" });
      const proof = await env.DB.prepare("SELECT * FROM run_proofs WHERE run_id=? AND player_id=?").bind(body.id, id).first();
      if (!proof || proof.closed) return reply(422, { error: "Run is not open" });
      try {
        validateActions(body.actions);
      } catch {
        return reply(422, { error: "Invalid actions" });
      }
      if (body.actions.length > MAX_BATCH) return reply(422, { error: "Checkpoint too large" });
      const hash = await digest(JSON.stringify(body.actions));
      if (body.nonce === proof.previous_nonce && body.offset + body.actions.length === proof.count && hash === proof.previous_hash) return reply(200, { nonce: proof.nonce, count: proof.count });
      if (body.nonce !== proof.nonce || body.offset !== proof.count || proof.count + body.actions.length > MAX_ACTIONS) return reply(422, { error: "Checkpoint sequence mismatch" });
      const moves = body.actions.filter((a) => a.type === "choose" || a.type === "expire").length;
      const paceAt = Math.max(proof.pace_at, now - 2e3) + moves * 65;
      if (now - proof.last_at + 250 < moves * 65 || paceAt > now + 250) return reply(422, { error: "Run advanced too quickly" });
      const checkpoints = JSON.parse(proof.checkpoints);
      checkpoints.push({ count: body.actions.length, hash });
      const nonce = crypto.randomUUID();
      const changed = await env.DB.prepare("UPDATE run_proofs SET nonce=?,count=?,checkpoints=?,last_at=?,pace_at=?,previous_nonce=?,previous_hash=? WHERE run_id=? AND player_id=? AND nonce=? AND count=? AND closed=0").bind(nonce, proof.count + body.actions.length, JSON.stringify(checkpoints), now, paceAt, proof.nonce, hash, body.id, id, proof.nonce, proof.count).run();
      if (changed.meta.changes !== 1) return reply(409, { error: "Checkpoint changed; retry" });
      return reply(200, { nonce, count: proof.count + body.actions.length });
    }
    if (path === "/api/run") {
      if (env.CREATIONS && !(await env.CREATIONS.limit({ key: request.headers.get("CF-Connecting-IP") || "unknown" })).success) return reply(429, { error: "Please wait before starting another run" });
      if (body.protocol !== PROTOCOL) return reply(426, { error: "Update the game to submit new scores" });
      if (![28,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46].includes(body.rules)) return reply(400, { error: "Unsupported rules" });
      const rate = await env.DB.prepare("SELECT COUNT(*) AS n FROM main_runs WHERE player_id=? AND created_at>?").bind(id, now - 6e4).first();
      if (rate.n >= 12) return reply(429, { error: "Please wait before starting another run" });
      const run = { id: crypto.randomUUID(), seed: crypto.getRandomValues(new Uint32Array(1))[0], rules: body.rules, protocol: PROTOCOL, nonce: crypto.randomUUID() };
      await env.DB.batch([
        env.DB.prepare("DELETE FROM main_runs WHERE created_at<?").bind(now - 14 * 864e5),
        env.DB.prepare("INSERT OR IGNORE INTO main_scores(id,name) VALUES(?,?)").bind(id, defaultName(id)),
        env.DB.prepare("DELETE FROM run_proofs WHERE run_id NOT IN (SELECT id FROM main_runs)").bind(),
        env.DB.prepare("INSERT INTO run_proofs(run_id,player_id,nonce,last_at,pace_at) VALUES(?,?,?,?,?)").bind(run.id, id, run.nonce, now, now),
        env.DB.prepare("INSERT INTO main_runs(id,player_id,seed,rules,created_at) VALUES(?,?,?,?,?)").bind(run.id, id, run.seed, run.rules, now)
      ]);
      return reply(200, run);
    }
    if (path === "/api/finish") {
      if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/.test(body.id)) return reply(400, { error: "Invalid run ID" });
      const row = await env.DB.prepare("SELECT seed,rules,submitted,score FROM main_runs WHERE id=? AND player_id=?").bind(body.id, id).first();
      const proof = await env.DB.prepare("SELECT * FROM run_proofs WHERE run_id=? AND player_id=?").bind(body.id, id).first();
      if (!row || !proof) return reply(422, { error: "Run requires the updated online verification" });
      try {
        await verifyCommitments(proof, body.actions);
      } catch {
        return reply(422, { error: "Gameplay history verification failed" });
      }
      if (proof.closed) {
        if (!proof.result) return reply(422, { error: "Run was invalidated" });
        const result2 = JSON.parse(proof.result);
        return body.expectedScore === result2.score ? reply(200, result2) : reply(422, { error: "Score verification mismatch" });
      }
      let result;
      try {
        result = replay(row.seed, body.actions, row.rules);
      } catch {
        return reply(422, { error: "Invalid gameplay replay" });
      }
      if (!Number.isSafeInteger(body.expectedScore) || body.expectedScore !== result.score) return reply(422, { error: "Score verification mismatch" });
      const finalResult = { saved: true, ...result };
      const committed = await env.DB.batch([
        env.DB.prepare("UPDATE run_proofs SET closed=1,result=? WHERE run_id=? AND player_id=? AND nonce=? AND count=? AND closed=0").bind(JSON.stringify(finalResult), body.id, id, proof.nonce, proof.count),
        env.DB.prepare("UPDATE main_scores SET score=MAX(score,?),runs=runs+(SELECT 1-submitted FROM main_runs WHERE id=?),updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM run_proofs WHERE run_id=? AND closed=1 AND result=?)").bind(result.score, body.id, now, id, body.id, JSON.stringify(finalResult)),
        env.DB.prepare("UPDATE main_runs SET submitted=1,score=MAX(score,?) WHERE id=? AND EXISTS(SELECT 1 FROM run_proofs WHERE run_id=? AND closed=1 AND result=?)").bind(result.score, body.id, body.id, JSON.stringify(finalResult))
      ]);
      if (committed[0].meta.changes !== 1) return reply(409, { error: "Run changed; retry submission" });
      return reply(200, finalResult);
    }
    if (path === "/api/profile") {
      const name = String(body.name || "").normalize("NFKC").replace(/[<>\u0000-\u001f\u007f-\u009f]/g, "").trim().slice(0, 20) || defaultName(id);
      const avatar = Number.isInteger(body.avatar) && body.avatar >= 0 && body.avatar < 6 ? String(body.avatar) : "0";
      const frame = frames.has(body.frame) ? body.frame : "none";
      await env.DB.prepare("INSERT INTO main_scores(id,name,avatar,frame,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,avatar=excluded.avatar,frame=excluded.frame,updated_at=excluded.updated_at").bind(id, name, avatar, frame, now).run();
      return reply(200, { saved: true, name, avatar });
    }
    const old = await fetch(oldHost + "/api/delete", { method: "POST", headers: { "Content-Type": "application/json", Authorization: request.headers.get("Authorization") }, body: "{}", signal: AbortSignal.timeout(8e3) });
    if (!old.ok) return reply(503, { error: "Previous profile deletion unavailable; please retry" });
    await env.DB.batch([env.DB.prepare("DELETE FROM run_proofs WHERE player_id=?").bind(id), env.DB.prepare("DELETE FROM main_runs WHERE player_id=?").bind(id), env.DB.prepare("DELETE FROM main_scores WHERE id=?").bind(id),env.DB.prepare("DELETE FROM bug_reports WHERE reporter_id=?").bind(id)]);
    return reply(200, { deleted: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "main_leaderboard_failed", type: error.name }));
    return reply(error.status || 503, { error: error.status ? error.message : "Rankings temporarily unavailable" });
  }
}

// worker.mjs
var origins = /* @__PURE__ */ new Set(["https://shape-shift-rsq.game-files.crazygames.com", "https://games.crazygames.com", "https://mkefefe.github.io", "https://appassets.androidplatform.net", "http://localhost:4173", "http://127.0.0.1:4173", "http://localhost:4421", "http://127.0.0.1:4421", "http://127.0.0.1:8898", "http://localhost:8898"]);
var worker_default = { async fetch(request, env) {
  const origin = request.headers.get("Origin");
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin" };
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
  const publicGameArterRead = ["https://www.gamearter.com", "https://gamearter.com"].includes(origin) && request.method === "GET" && new URL(request.url).pathname === "/api/leaderboard";
  if (origin && !origins.has(origin) && !isPlaygamaGameOrigin(origin) && !publicGameArterRead) return reply(403, { error: "Origin not allowed" });
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
  headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  const path = new URL(request.url).pathname;
  if (path === "/api/crazygames-aggregate") return aggregate(request,env,reply);
  if (isReportPath(path)) return reportService(request,env,reply,{actor,readBody});
  if (path.startsWith("/api/")) return mainService(request, env, reply);
  try {
    if (path === "/health" && request.method === "GET") return reply(200, { ready: true });
    if (path !== "/scores") return reply(404, { error: "Not found" });
    if (request.method === "GET") {
      const rows = await env.DB.prepare("SELECT record FROM scores ORDER BY score DESC, player ASC LIMIT 100").all();
      return reply(200, { records: rows.results.map((r) => JSON.parse(r.record)) });
    }
    return reply(410, { error: "Prototype submissions retired; use the updated main game" });
  } catch (error) {
    console.error(JSON.stringify({ event: "leaderboard_request_failed", type: error.name }));
    return reply(503, { error: "Leaderboard unavailable; saved scores can retry" });
  }
} };
export {
  worker_default as default
};
