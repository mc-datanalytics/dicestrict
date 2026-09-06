// Public configuration only. Never put private API keys or long-lived TURN secrets here.
const CONFIG = Object.freeze({
  // null = same-origin /signal, provided by `npm run dev`.
  // On CrazyGames/static hosting set your deployed signaling worker's wss:// URL.
  signalUrl: null,
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  // Optional authenticated endpoint returning short-lived TURN credentials.
  turnCredentialsUrl: null,
  crazyGames: false, // build with `npm run build -- --crazygames` to enable the official SDK
  rewardsApi: null, // optional referee/wallet worker; no client-side reward minting
});

export { CONFIG };
