/* Arte generado para el prototipo (SVG original). Enemigos, jefe, reliquias y fondos. */
const DD='https://ddragon.leagueoflegends.com/cdn/',DDV='16.20.1';
const splash=c=>`${DD}img/champion/splash/${c}_0.jpg`,loading=c=>`${DD}img/champion/loading/${c}_0.jpg`,itemImg=id=>`${DD}${DDV}/img/item/${id}.png`,spellImg=s=>`${DD}${DDV}/img/spell/${s}.png`;
const CDR='https://raw.communitydragon.org/latest/game/assets/characters/';
// Enemigos: iconos oficiales de monstruos de la Grieta (CommunityDragon) y Viego (Data Dragon). El SVG queda de respaldo.
const EIMG={e1:CDR+'sru_murkwolf/hud/greatermurkwolf_square.png',e2:CDR+'sru_blue/hud/bluesentinel_square.png',e3:CDR+'sru_gromp/hud/gromp_square.png',e4:CDR+'sru_razorbeak/hud/razorbeak_square.png',he:CDR+'sru_riftherald/hud/sruriftherald_square.png',ba:CDR+'sru_baron/hud/baron_square.png',bo:`${DD}img/champion/loading/Viego_0.jpg`};

const mist=(id,seed,r,g,b)=>`<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="3" seed="${seed}"/><feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 .9 -.25"/></filter>`;
const glowF=id=>`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const bgE=(k,c,seed)=>`<radialGradient id="bg${k}" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="#03060a"/></radialGradient>${mist('m'+k,seed,.45,.85,.8)}${glowF('gl'+k)}`;
const frame=k=>`<rect width="100" height="105" fill="url(#bg${k})"/><rect width="100" height="105" filter="url(#m${k})" opacity=".55"/>`;
const floor=k=>`<ellipse cx="50" cy="102" rx="44" ry="9" fill="#000" opacity=".55"/><rect y="80" width="100" height="25" filter="url(#m${k})" opacity=".7"/>`;

const ART={
/* respaldo SVG si no carga: Gran lobo sombrío */
e1:()=>`<svg viewBox="0 0 100 105" preserveAspectRatio="xMidYMid slice"><defs>${bgE('e1','#1d4a4a',3)}<linearGradient id="ge1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bff5ea" stop-opacity=".95"/><stop offset=".6" stop-color="#4fb8a8" stop-opacity=".7"/><stop offset="1" stop-color="#4fb8a8" stop-opacity="0"/></linearGradient></defs>${frame('e1')}
<path d="M24 52c-8 4-14 2-18-2 4 8 10 12 18 10zM76 52c8 4 14 2 18-2-4 8-10 12-18 10z" fill="url(#ge1)" opacity=".7"/>
<path d="M50 14c-15 0-23 13-23 27v22c0 10-6 20-13 30 8-2 12-7 16-5 3 7 8 11 12 8 4 5 11 5 15-2 6 3 10-1 14-5 4 2 8 0 13 2-8-9-12-18-12-28V41c0-14-8-27-22-27z" fill="url(#ge1)"/>
<path d="M50 20c-11 0-17 10-17 20 0 6 2 11 5 14h24c3-3 5-8 5-14 0-10-6-20-17-20z" fill="#04100f"/>
<g filter="url(#gle1)" fill="#8ffff0"><ellipse cx="43" cy="40" rx="3.200" ry="2"/><ellipse cx="57" cy="40" rx="3.200" ry="2"/></g>
<path d="M43 49q7 4 14 0" stroke="#8ffff0" stroke-width="1" fill="none" opacity=".6"/>${floor('e1')}</svg>`,
/* respaldo SVG si no carga: Centinela azul */
e2:()=>`<svg viewBox="0 0 100 105" preserveAspectRatio="xMidYMid slice"><defs>${bgE('e2','#20402f',7)}<linearGradient id="ge2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7f9b78"/><stop offset="1" stop-color="#22362a"/></linearGradient></defs>${frame('e2')}
<path d="M18 105V66c0-12 12-22 32-22s32 10 32 22v39z" fill="url(#ge2)" stroke="#0a140e" stroke-width="1.500"/>
<path d="M14 62c0-8 8-14 18-14l4 14-10 8zM86 62c0-8-8-14-18-14l-4 14 10 8z" fill="#5c7a5a" stroke="#0a140e"/>
<path d="M36 22c0-8 6-12 14-12s14 4 14 12v20c0 4-6 8-14 8s-14-4-14-8z" fill="url(#ge2)" stroke="#0a140e" stroke-width="1.500"/>
<rect x="38" y="28" width="24" height="5" rx="2" fill="#020604"/><rect x="40" y="29.300" width="20" height="2.400" rx="1" fill="#5ef2c8" filter="url(#gle2)"/>
<path d="M50 10v-6M50 44v12" stroke="#0a140e" stroke-width="2"/>
<path d="M60 58h26v26c0 10-8 16-13 18-5-2-13-8-13-18z" fill="#3c5747" stroke="#0a140e" stroke-width="1.500"/><path d="M73 64v30M64 76h18" stroke="#5ef2c8" stroke-width="1.500" opacity=".6"/>
<g fill="#c45f6a"><path d="M24 70c-2-5 1-9 3-6s4 2 3-2 4-3 3 3c-1 4-4 6-9 5z"/><path d="M44 88c-1-4 2-6 3-4s3 1 2-2 3-2 2 2-3 5-7 4z"/></g>
<g fill="#d8e3d0" opacity=".8"><circle cx="30" cy="80" r="1.500"/><circle cx="33" cy="83" r="1"/><circle cx="56" cy="70" r="1.300"/><circle cx="40" cy="20" r="1"/><circle cx="60" cy="38" r="1.200"/></g>${floor('e2')}</svg>`,
/* respaldo SVG si no carga: Gromp */
e3:()=>`<svg viewBox="0 0 100 105" preserveAspectRatio="xMidYMid slice"><defs>${bgE('e3','#2a3a52',11)}</defs>${frame('e3')}
<path d="M22 14q-16 40 0 80" stroke="#6b5a3a" stroke-width="3.500" fill="none"/><path d="M22 14L58 54 22 94" stroke="#bff5ea" stroke-width=".8" fill="none" opacity=".8"/>
<path d="M12 54h52" stroke="#d8d0b8" stroke-width="1.500"/><path d="M8 54l6-3v6z" fill="#8ffff0" filter="url(#gle3)"/>
<circle cx="58" cy="30" r="11" fill="#d9d3bf"/><path d="M52 36h12l-2 6h-8z" fill="#d9d3bf"/>
<g fill="#050809"><ellipse cx="54" cy="29" rx="3" ry="3.500"/><ellipse cx="63" cy="29" rx="3" ry="3.500"/><path d="M58 33l-1.500 3h3z"/></g>
<g filter="url(#gle3)" fill="#8ffff0"><circle cx="54" cy="29.500" r="1.200"/><circle cx="63" cy="29.500" r="1.200"/></g>
<path d="M58 42v34M58 50q-10 2-14 4M58 50q10 3 12 14" stroke="#d9d3bf" stroke-width="2.500" fill="none" stroke-linecap="round"/>
<g stroke="#d9d3bf" stroke-width="1.600" fill="none"><path d="M50 52q8 3 16 0M50 58q8 3 16 0M51 64q7 3 14 0"/></g>
<path d="M44 20q14-14 30 2l-4 30q-12 10-26 0z" fill="#16222e" opacity=".75"/>
<path d="M58 76l-10 26M58 76l10 26" stroke="#d9d3bf" stroke-width="2.500" stroke-linecap="round"/>${floor('e3')}</svg>`,
/* respaldo SVG si no carga: Picoaguzado */
e4:()=>`<svg viewBox="0 0 100 105" preserveAspectRatio="xMidYMid slice"><defs>${bgE('e4','#33193a',5)}<radialGradient id="ge4" cx="50%" cy="40%"><stop offset="0" stop-color="#4b2c5c"/><stop offset="1" stop-color="#120a18"/></radialGradient></defs>${frame('e4')}
<path d="M8 98c4-26 14-40 24-46-4-10 2-24 18-26 16 2 22 16 18 26 10 6 20 20 24 46z" fill="url(#ge4)"/>
<g stroke="#120a18" stroke-width="4" stroke-linecap="round"><path d="M20 98l-6-14M30 98l-2-12M70 98l2-12M80 98l6-14"/></g>
<g fill="#e7dcef"><path d="M14 84l-4 6 6-2zM86 84l4 6-6-2z"/></g>
<g filter="url(#gle4)" fill="#ff4d7a"><circle cx="42" cy="40" r="2.600"/><circle cx="58" cy="40" r="2.600"/><circle cx="36" cy="48" r="1.600"/><circle cx="64" cy="48" r="1.600"/><circle cx="50" cy="33" r="1.800"/><circle cx="46" cy="50" r="1"/><circle cx="54" cy="50" r="1"/></g>
<path d="M38 60l3 6 3-6 3 6 3-6 3 6 3-6 3 6 3-6" stroke="#e7dcef" stroke-width="1.200" fill="none"/>
<path d="M30 30q-10-10-18-4M70 30q10-10 18-4" stroke="#4b2c5c" stroke-width="2" fill="none"/>${floor('e4')}</svg>`,
/* respaldo SVG si no carga: Jefe: Viego */
boss:()=>`<svg viewBox="0 0 100 105" preserveAspectRatio="xMidYMid slice"><defs>${bgE('bo','#1f4a40',13)}<linearGradient id="gbo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#59866f"/><stop offset="1" stop-color="#0d1d17"/></linearGradient></defs>${frame('bo')}
<path d="M80 6v96M74 6v10q6 6 12 0V6M80 6v-2" stroke="#b9a15a" stroke-width="2.500" fill="none"/>
<path d="M14 105c2-30 14-48 36-50 22 2 34 20 36 50z" fill="url(#gbo)"/>
<path d="M36 34c0-10 6-16 14-16s14 6 14 16v8c0 6-6 12-14 12s-14-6-14-12z" fill="#2a4a3c"/>
<path d="M34 22l4-12 5 8 7-12 7 12 5-8 4 12z" fill="#d6b25e" stroke="#5c4a1c"/><circle cx="50" cy="13" r="2" fill="#5ef2c8" filter="url(#glbo)"/>
<g filter="url(#glbo)" fill="#5ef2c8"><ellipse cx="44" cy="36" rx="3" ry="1.800"/><ellipse cx="56" cy="36" rx="3" ry="1.800"/></g>
<path d="M40 46q10 10 20 0v14q-10 6-20 0z" fill="#7aa38c" opacity=".7"/><path d="M42 50v12M46 51v14M50 52v14M54 51v14M58 50v12" stroke="#2a4a3c" stroke-width=".8"/>
<path d="M30 70q20 12 40 0" stroke="#d6b25e" stroke-width="1.500" fill="none" opacity=".7"/>${floor('bo')}</svg>`
};

/* Reliquias: marco circular cian para diferenciarlas del gear (cuadrado dorado) */
const RART={
 heart:`<svg viewBox="0 0 64 64"><defs><radialGradient id="rh" cx="50%" cy="45%"><stop offset="0" stop-color="#ffd27a"/><stop offset=".5" stop-color="#ff6a2b"/><stop offset="1" stop-color="#8a1410"/></radialGradient></defs><circle cx="32" cy="32" r="30" fill="#1a0b08"/><path d="M32 52S12 40 12 26a10 10 0 0 1 20-4 10 10 0 0 1 20 4c0 14-20 26-20 26z" fill="url(#rh)"/><path d="M32 44c5 0 7-4 6-8s-4-5-4-9c-4 3-7 6-7 10 0 4 2 7 5 7z" fill="#fff3c2" opacity=".9"/></svg>`,
 emb:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#14100a"/><path d="M32 8l18 6v14c0 12-8 21-18 26-10-5-18-14-18-26V14z" fill="#8c2a22" stroke="#d6b25e" stroke-width="2.500"/><path d="M22 20l20 22M42 20L22 42" stroke="#efe7d2" stroke-width="3.500" stroke-linecap="round"/><path d="M19 39l6 6M45 39l-6 6" stroke="#d6b25e" stroke-width="3" stroke-linecap="round"/></svg>`,
 void:`<svg viewBox="0 0 64 64"><defs><linearGradient id="rv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3b6ff"/><stop offset=".5" stop-color="#8a3ad6"/><stop offset="1" stop-color="#2a0b4a"/></linearGradient></defs><circle cx="32" cy="32" r="30" fill="#0d0616"/><path d="M32 6l12 20-6 30-6 4-6-4-6-30z" fill="url(#rv)" stroke="#e3b6ff" stroke-width="1"/><path d="M24 30q8-8 16 0-8 8-16 0z" fill="#0d0616"/><circle cx="32" cy="30" r="2.600" fill="#ff5fd2"/></svg>`,
 ban:`<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#0a0e18"/><path d="M18 8v50" stroke="#b9a15a" stroke-width="3" stroke-linecap="round"/><path d="M20 10h28l-6 10 6 10H20z" fill="#2c5aa8" stroke="#d6b25e" stroke-width="1.500"/><circle cx="32" cy="20" r="4" fill="#f5d36e"/><path d="M32 12v3M32 25v3M24 20h3M37 20h3" stroke="#f5d36e" stroke-width="1.500"/></svg>`
};

/* Fondos */

/* Escena de combate: Islas de la Sombra (antorcha cálida a la izquierda, niebla fría a la derecha) */
const BG_BATTLE=`<svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
<linearGradient id="bsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04121a"/><stop offset=".55" stop-color="#0b2a2e"/><stop offset="1" stop-color="#020507"/></linearGradient>
<radialGradient id="btorch" cx="18%" cy="62%" r="40%"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".28"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
<radialGradient id="bcold" cx="78%" cy="45%" r="45%"><stop offset="0" stop-color="#3fe0c5" stop-opacity=".22"/><stop offset="1" stop-color="#3fe0c5" stop-opacity="0"/></radialGradient>
<linearGradient id="bgnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1d1c"/><stop offset="1" stop-color="#020404"/></linearGradient>
${mist('bm',21,.35,.8,.75)}<radialGradient id="bvig" cx="50%" cy="45%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient></defs>
<rect width="1600" height="900" fill="url(#bsky)"/>
<circle cx="1180" cy="170" r="70" fill="#cfe9e0" opacity=".18"/><circle cx="1180" cy="170" r="140" fill="#9fd9c9" opacity=".05"/>
<g fill="#051012" opacity=".9"><path d="M0 560L60 420 90 470 140 330 170 380 210 300 250 420 300 360 340 470 420 500 480 430 520 520 0 600z"/>
<path d="M1600 560l-70-170-30 60-50-150-40 90-40-60-50 150-60-40-40 120-80 30 0 70z"/><path d="M700 520l20-90 12 30 16-70 14 70 12-25 20 85z"/></g>
<g fill="#081a1b"><path d="M380 600l30-140h18l30 140zM1150 600l26-120h16l28 120z"/><path d="M398 470h40v-20h-40zM1166 490h36v-18h-36z"/></g>
<path d="M0 600Q400 560 800 590T1600 580V900H0z" fill="url(#bgnd)"/>
<path d="M0 640Q420 610 820 640T1600 630" stroke="#1f3a36" stroke-width="2" fill="none" opacity=".7"/>
<rect width="1600" height="900" fill="url(#btorch)"/><rect width="1600" height="900" fill="url(#bcold)"/>
<rect y="380" width="1600" height="420" filter="url(#bm)" opacity=".35"/>
<rect width="1600" height="900" fill="url(#bvig)"/></svg>`;
