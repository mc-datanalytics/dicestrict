// Round counts are guaranteed; minute estimates require human playtests and timers.
const PRESETS = Object.freeze([
  Object.freeze({ id: 'blitz', name: 'Blitz', rounds: 6, mobility: 2, finishOnBankruptcy: true, detail: '6 manches maximum · fin pour tous dès la première faillite' }),
  Object.freeze({ id: 'standard', name: 'Standard', rounds: 12, mobility: 2, finishOnBankruptcy: false, detail: '12 manches maximum · faillites individuelles' }),
  Object.freeze({ id: 'grand', name: 'Grand District', rounds: 18, mobility: 2, finishOnBankruptcy: false, detail: '18 manches maximum · davantage de développement' }),
]);
const presetById = id => PRESETS.find(p => p.id === id) ?? PRESETS[1];
const matchOptions = id => { const p = presetById(id); return { rounds: p.rounds, mobility: p.mobility, finishOnBankruptcy: p.finishOnBankruptcy, casino: true }; };
export { PRESETS, presetById, matchOptions };
