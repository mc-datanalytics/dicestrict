const paths={
 dice:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>',
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/><circle cx="9" cy="7" r="4"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.4 9a2.6 2.6 0 1 1 4.5 1.8c-1.1.6-1.9 1.2-1.9 2.7m0 3v.1"/>',
 settings:'<path d="M4 7h16M4 17h16"/><rect x="7" y="4" width="4" height="6" rx="2"/><rect x="14" y="14" width="4" height="6" rx="2"/>',
 sound:'<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',mute:'<path d="m11 4-6 5H2v6h3l6 5zM16 9l5 6m0-6-5 6"/>',
 building:'<rect x="4" y="3" width="12" height="18" rx="2"/><path d="M16 9h4v12M8 7h4M8 11h4M8 15h4M9 21v-3h3v3"/>',
 crown:'<path d="m3 6 4 4 5-6 5 6 4-4-2 13H5zM7 22h10"/>',
 layers:'<path d="m12 3 10 6-10 6L2 9zm-10 11 10 6 10-6m-20 5 10 6 10-6"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
 rotate:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18"/>',
 check:'<path d="m5 12 5 5L20 6"/>', shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
 leaf:'<path d="M20 3C10 3 3 6 4 13c1 8 13 9 16-10zM4 21l10-10"/>',
 star:'<path d="m12 3 2.8 5.8 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.7l6.2-.9z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 coin:'<circle cx="12" cy="12" r="9"/><path d="M15 8a5 5 0 1 0 0 8M7 10h7m-7 4h7"/>',
};
const icon=(name,size=20)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]??paths.dice}</svg>`;
function avatar(index,size=36){const cs=['#377d72','#dc9178','#9184bb','#c0a259'],c=cs[index%4];return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="16" fill="${c}" opacity=".15"/><path d="M13 36c0-9 22-9 22 0" fill="${c}"/><circle cx="24" cy="23" r="10" fill="${c}"/><circle cx="20" cy="23" r="1.4" fill="#fff9dd"/><circle cx="28" cy="23" r="1.4" fill="#fff9dd"/><path d="M21 28q3 2 6 0" fill="none" stroke="#fff9dd" stroke-linecap="round"/><path d="m18 13-1-6 5 3 3-5 3 5 4-3-1 6z" fill="#d8b663"/></svg>`;}
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export { icon,avatar,escapeHTML };
