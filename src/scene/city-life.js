/** Local visual simulation. Never reads the game RNG, writes a save, or sends a packet. */
import { cityBudget } from './city-state.js';

const CAR_LIMIT = 18, WALKER_LIMIT = 48, WALKERS_PER_PARCEL = 8;
const mod = (n, d) => ((n % d) + d) % d;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const approach = (value, target, delta) => value < target ? Math.min(target, value + delta) : Math.max(target, value - delta);

/** Distance in world units, with continuous position AND tangent through rounded corners. */
function roundedRoute(distance, radius = 4.48, corner = .34) {
  if (!Number.isFinite(distance) || !Number.isFinite(radius) || !Number.isFinite(corner) || radius <= 0 || corner <= 0 || corner >= radius) throw Error('Invalid city route');
  const straight = 2 * (radius - corner), arc = Math.PI * corner / 2, segment = straight + arc;
  const d = mod(distance, 4 * segment), side = Math.floor(d / segment), u = d - side * segment;
  let x, z, dx, dz;
  if (u < straight) { x = radius - corner - u; z = radius; dx = -1; dz = 0; }
  else {
    const angle = Math.PI / 2 + (u - straight) / corner;
    x = -radius + corner + corner * Math.cos(angle); z = radius - corner + corner * Math.sin(angle);
    dx = -Math.sin(angle); dz = Math.cos(angle);
  }
  const c = Math.cos(side * Math.PI / 2), s = Math.sin(side * Math.PI / 2);
  return { x: c * x - s * z, z: s * x + c * z, yaw: Math.atan2(c * dx - s * dz, s * dx + c * dz) };
}
function routeLength(radius = 4.48, corner = .34) { return 8 * (radius - corner) + 2 * Math.PI * corner; }

/** Weighted fair allocation, with stable per-parcel identities and a fixed global cap. */
function pedestrianAllocation(city, limit) {
  const counts = new Map(city.parcels.map(p => [p.id, 0]));
  const active = city.parcels.filter(p => p.activity > 0).slice().sort((a, b) => a.id - b.id);
  for (let n = 0; n < Math.min(WALKER_LIMIT, Math.max(0, limit)); n++) {
    let best = null, score = -1;
    for (const p of active) {
      const count = counts.get(p.id), priority = p.activity / (count + 1);
      if (count < WALKERS_PER_PARCEL && priority > score) { best = p; score = priority; }
    }
    if (!best) break;
    counts.set(best.id, counts.get(best.id) + 1);
  }
  return counts;
}

/** Stable slots keep existing vehicles/people in place when ownership or budgets change. */
class CityLife {
  constructor() {
    this.quality = 'high'; this.reduced = false; this.living = true; this.running = true; this.lastTime = null; this.elapsed = 0;
    this.cars = []; this.walkers = []; this.buses = []; this.city = null;
  }
  configure({ quality = this.quality, reduced = this.reduced, living = this.living } = {}) {
    const running = living && !reduced;
    if (running !== this.running) this.lastTime = null; // Never catch up time spent paused.
    this.running = running; this.quality = quality; this.reduced = reduced; this.living = living;
    if (this.city) this.retarget();
  }
  setCity(city, reset = false) {
    this.city = city;
    if (reset || !this.cars.length) {
      this.lastTime = null; this.elapsed = 0;
      this.cars = Array.from({ length: CAR_LIMIT }, (_, i) => ({ id: `car-${i}`, slot: i, distance: mod(i * .61803398875, 1) * routeLength(), speed: .7, scale: 0, target: false }));
      this.walkers = city.parcels.flatMap(p => Array.from({ length: WALKERS_PER_PARCEL }, (_, j) => ({ id: `walker-${p.id}-${j}`, parcelId: p.id, slot: j, distance: mod(p.id * .37 + j * .61803398875, 1) * routeLength(.55, .12), scale: 0, target: false })));
      this.buses = [0, 1].map(i => ({ id: `bus-${i}`, distance: i * routeLength(6.98, .34) / 2, wait: 0 }));
    }
    this.retarget();
    if (reset) { for (const a of [...this.cars, ...this.walkers]) a.scale = a.target ? 1 : 0; }
  }
  retarget() {
    const budget = cityBudget(this.city, this.quality); // Simulation population, not account data.
    this.carCap = this.quality === 'low' ? 6 : CAR_LIMIT;
    this.walkerCap = this.quality === 'low' ? 12 : WALKER_LIMIT;
    this.parcels = new Map(this.city.parcels.map(p => [p.id, p]));
    const counts = pedestrianAllocation(this.city, budget.pedestrians);
    for (const a of this.cars) { a.target = a.slot < budget.cars; if (a.slot >= this.carCap) a.scale = 0; }
    for (const a of this.walkers) a.target = a.slot < counts.get(a.parcelId);
    // Lowering quality may remove detail immediately, but never repositions survivors.
    const visible = this.walkers.filter(a => a.scale > 0).sort((a, b) => Number(b.target) - Number(a.target));
    for (const a of visible.slice(this.walkerCap)) a.scale = 0;
  }
  updatePopulation(agents, cap, dt) {
    for (const a of agents) if (!a.target) a.scale = approach(a.scale, 0, dt * 1.5);
    let occupied = agents.filter(a => a.scale > 0).length;
    for (const a of agents) if (a.target) {
      if (a.scale === 0) { if (occupied >= cap) continue; occupied++; }
      a.scale = approach(a.scale, 1, dt * 1.5);
    }
  }
  localActivity(position) {
    let activity = 0;
    // Soft distance weighting avoids an abrupt speed change at parcel boundaries.
    for (const p of this.city.parcels) {
      const dx = position.x - p.x * (4.48 / 3.64), dz = position.z - p.z * (4.48 / 3.64);
      activity = Math.max(activity, p.activity / (1 + (dx * dx + dz * dz) * 2));
    }
    return activity;
  }
  step(seconds) {
    if (!Number.isFinite(seconds)) throw Error('Invalid city animation time');
    if (!this.city || !this.running) { this.lastTime = null; return { cars: [], pedestrians: [], buses: [] }; }
    const dt = this.lastTime === null ? 0 : clamp(seconds - this.lastTime, 0, .1);
    this.lastTime = seconds; this.elapsed += dt;
    this.updatePopulation(this.cars, this.carCap, dt);
    this.updatePopulation(this.walkers, this.walkerCap, dt);
    const cars = [], pedestrians = [], buses = [];
    for (const a of this.cars) if (a.scale > 0) {
      const target = .85 / (1 + .15 * this.localActivity(roundedRoute(a.distance)));
      a.speed += (target - a.speed) * (1 - Math.exp(-dt * 3));
      a.distance = mod(a.distance + a.speed * dt, routeLength());
      cars.push({ id: a.id, slot: a.slot, scale: a.scale, speed: a.speed, ...roundedRoute(a.distance) });
    }
    for (const a of this.walkers) if (a.scale > 0) {
      const p = this.parcels.get(a.parcelId);
      // A brief café pause on developed parcels. Local decor only; no extra income.
      const visiting = p.active && p.level > 0 && mod(this.elapsed + a.slot * 3.7 + p.id, 19) < 2.3;
      a.distance = mod(a.distance + (visiting ? 0 : .105 + (a.slot % 3) * .012) * dt, routeLength(.55, .12));
      const q = roundedRoute(a.distance, .55, .12);
      pedestrians.push({ id: a.id, parcelId: p.id, slot: a.slot, scale: a.scale, visiting, x: p.x + q.x, z: p.z + q.z, yaw: q.yaw });
    }
    const r = 6.98, segment = routeLength(r) / 4;
    const stops = [segment + r - .34 - 1.2, 3 * segment + r - .34 + 1.2];
    for (const a of this.buses) {
      if (a.wait > 0) a.wait = Math.max(0, a.wait - dt);
      else {
        const travel = .95 * dt, length = routeLength(r);
        const ahead = stops.map(stop => ({ stop, gap: mod(stop - a.distance, length) })).filter(p => p.gap > 1e-7 && p.gap <= travel).sort((a, b) => a.gap - b.gap)[0];
        if (ahead) { a.distance = ahead.stop; a.wait = 2.5; }
        else a.distance = mod(a.distance + travel, length);
      }
      buses.push({ id: a.id, waiting: a.wait > 0, ...roundedRoute(a.distance, r) });
    }
    return { cars, pedestrians, buses };
  }
}
export { CityLife, roundedRoute, routeLength, pedestrianAllocation, CAR_LIMIT, WALKER_LIMIT };
