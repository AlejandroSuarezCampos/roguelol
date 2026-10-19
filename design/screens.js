/* Pantallas no-combate. Todo texto/números = placeholder de diseño. */
let R={kind:'win',diff:'night'};
const NAV=[['menu','Menú'],['team','Equipo'],['upgrades','Mejoras'],['archive','Archivo'],['prep','Preparación'],['map','Mapa'],['combat','Combate'],['reward','Recompensa'],['rest','Descanso'],['shop','Comerciante'],['event','Evento'],['result','Resultado'],['states','Estados'],['system','Sistema visual']];
$('#proto').innerHTML='<b>PROTOTIPO</b>'+NAV.map(([k,n])=>`<button data-go="${k}">${n}</button>`).join('')+'<span class="ph">Campeones y objetos © Riot Games · resto: arte original</span>';

/* ---- Menú ---- */
SCR.menu=()=>`<div class="screen menu"><div class="menubg" role="img" aria-label="Las Islas de la Sombra de noche, con una ruina bajo la luna"></div>
 <h1 class="logo fd"><small>LEAGUE OF LEGENDS</small>Shattered Runeterra</h1>
 <div class="mainbtns">
  <button class="mbtn" data-go="team">${ic('team')}<b>Equipo</b><span>Campeones, heridas, estrés, gear y mazos</span></button>
  <button class="mbtn" data-go="upgrades">${ic('up')}<b>Mejoras</b><span>Mejoras de cartas y desbloqueos</span></button>
  <button class="mbtn" data-go="archive">${ic('book')}<b>Archivo</b><span>Campeones, cartas, reliquias, enemigos, logros</span></button>
  <button class="mbtn main" data-go="prep">${ic('map')}<b>Expedición</b><span>Región, dificultad y comienzo de run</span></button>
 </div>
 <div class="row small" style="position:relative"><span class="tag">${ic('gold')} 0 oro (se pierde al acabar)</span><span class="tag gold">${ic('relic')} 120 Esquirlas</span><span>Guardado local · v0.1 prototipo</span></div>
 <p class="credit" style="position:relative">Proyecto fan no comercial. Arte de campeones e iconos de objetos © Riot Games (Data Dragon). Enemigos, reliquias y fondos: arte original del prototipo.</p></div>`;

/* ---- Marco común: escena con fondo pintado + HUD como en mapa y combate ---- */
const scene=(o,body)=>`<div class="scn ${o.cls||''}"><div class="scn-bg" style="background-image:url(${o.bg||'assets/menu-bg.jpg'})"></div>
 <header class="hud"><div class="crest">${ic(o.icon||'map')}</div><div class="where"><b class="fd">${o.title}</b><small>${o.sub||''}</small></div>
 <div class="hudr">${o.right||''}${o.back===false?'':`<button class="btn" data-go="${o.back||'menu'}">← Volver</button>`}</div></header>
 <div class="scn-body">${body}</div></div>`;
// campeón de pie sobre el escenario (mismo tratamiento que los sprites de combate)
const hero=(k,o={})=>`<div class="hero ${o.cls||''}" style="--w:${o.w||150}px"><div class="spr"><img src="${loading(CH[k].n)}" alt="${CH[k].n}" onerror="this.remove()"></div><div class="gnd"></div></div>`;
const goldHud=g=>`<span class="goldc">${ic('gold')} ${g}</span>`;
const cmpTable=(a,b,keys)=>`<div class="cmp"><b class="small">Estadística</b><b class="small">${a.n.split(' ')[0]}</b><b></b><b class="small">${b.n.split(' ').slice(0,2).join(' ')}</b>${keys.map(k=>{const x=a.st[k]||0,y=b.st[k]||0,d=y-x;return `<span>${ic(STAT[k][0])} ${STAT[k][1]}</span><span>${x}${STU[k]??''}</span><span>→</span><span class="${d>0?'up':d<0?'dn':'eq'}">${y}${STU[k]??''} ${d>0?'▲ +'+d:d<0?'▼ '+d:'='}</span>`}).join('')}</div>`;

/* ---- Equipo ---- */
let TM={c:'yasuo',cmp:false,card:null};
SCR.team=()=>{const ch=CH[TM.c],g=ch.gear.map(k=>GEAR[k]),st=ch.stats,deck=CARDS.filter(c=>c.o==TM.c);
 return scene({title:'Equipo',sub:'Campeones, gear y mazos · sin iniciar expedición',icon:'team'},`<div class="team-l">
  <nav class="roster" aria-label="Campeones">${ORD.map(k=>`<button class="rost ${k==TM.c?'on':''}" data-act="tmc" data-id="${k}" aria-pressed="${k==TM.c}"><img src="${loading(CH[k].n)}" alt=""><span><b>${CH[k].n}</b><small class="s${sLv(CH[k].stress)}">${ic('stress')} ${CH[k].stress} · ${SN[sLv(CH[k].stress)]}</small>${CH[k].wounds.length?`<small class="wd">${ic('wound')} Herida</small>`:''}</span></button>`).join('')}</nav>
  <section class="stagehero">${hero(TM.c,{w:250})}<h2 class="fd heroname">${ch.n}</h2><span class="herorole">${ch.role}</span>
   <div class="traits">${ch.tr.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
   <div class="herostate">${stressM(ch.stress)}${ch.wounds.map(w=>`<div class="warnbox red">${ic('wound')}<div><b>${w[0]}</b> · ${w[1]}</div></div>`).join('')||'<span class="small">Sin heridas.</span>'}<span class="small">Crisis al 100: pánico, egoísmo, desesperación o ira (siempre visibles).</span></div></section>
  <aside class="col">
   <div class="panel"><h3>${ic('crit')} Estadísticas</h3><dl class="stats">${Object.entries(st).map(([k,v])=>`<dt>${ic(STAT[k][0])} ${STAT[k][1]}</dt><dd>${v}${STU[k]??''}</dd>`).join('')}</dl><p class="small">${ic('ap')} ${ch.scale}</p></div>
   <div class="panel"><h3>${ic('armor')} Gear · 2 espacios</h3><div class="col">${g.map(x=>gearSlot(x,{upg:TM.c=='yasuo'&&x.img==3075})).join('')}</div>
    ${TM.c=='yasuo'?`<button class="btn" style="margin-top:10px" data-act="tmcmp">${ic('swap')} ${TM.cmp?'Ocultar':'Comparar'} con Hoja de Guinsoo</button>${TM.cmp?cmpTable(GEAR.filo,GEAR.guin,['ad','crit','cdmg','as'])+'<p class="small">Guinsoo pierde crítico pero gana velocidad: favorece Tempestad de acero, penaliza Vendaval.</p>':''}`:''}</div>
   <p class="small relnote">${ic('relic')} Las reliquias pertenecen a la expedición, no a ${ch.n}.</p></aside></div>
  <section class="deckrow"><h3 class="fd">${ic('card')} Mazo de ${ch.n} · ${deck.length} cartas</h3><div class="deckgrid">${deck.map(c=>card(c,{mini:1,act:'tmcard'})).join('')}</div></section>`)};
Object.assign(ACT,{tmc:d=>{TM.c=d.id;TM.cmp=false;render()},tmcmp:()=>{TM.cmp=!TM.cmp;render()},tmcard:d=>modal(`<div class="row" style="align-items:flex-start">${card({...CD[d.id]},{act:'closeM'})}<div class="col"><h2 class="fd">${CD[d.id].n}</h2><p>${CD[d.id].tx}</p><p class="small">Propietario: ${CH[CD[d.id].o].n} · Coste ${CD[d.id].c} · ${CD[d.id].r}</p>${CD[d.id].up?'<span class="tag gold">Mejorada</span>':'<span class="tag">Sin mejorar (ver Mejoras)</span>'}<button class="btn pri" data-act="closeM">Cerrar</button></div></div>`)});

/* ---- Mejoras (como la fragua: antes → después) ---- */
let UP={ess:120,done:{}};
const UPS=[['y2','Inflige 14.','Crítico: inflige 18.',60],['x2','+4 por Marca.','Inflige 8 a todos. +6 por Marca consumida.',80],['s1','Cura 10.','Cura 14.',50],['l3','12 de bloqueo.','Gana 15 de bloqueo. Provoca. Cuesta 1.',90]];
SCR.upgrades=()=>scene({title:'Mejoras',sub:'Progresión permanente moderada · Esquirlas de expediciones',icon:'up',right:`<span class="tag gold">${ic('relic')} ${UP.ess} Esquirlas</span>`},`<div class="forge">${UPS.map((u,i)=>{const d=UP.done[i],can=UP.ess>=u[3],c=CD[u[0]];
 return `<div class="fitem ${d?'done':''}"><div class="fcards">${card({...c,up:0},{mini:1,act:'x'})}<span class="farrow" aria-hidden="true">${ic('dash')}</span>${card({...c,up:1,tx:u[2]},{mini:1,act:'x'})}</div>
 <b class="fd">${c.n}</b><button class="btn ${d?'':'pri'}" ${d||!can?'disabled':''} data-act="upbuy" data-id="${i}">${d?ic('check')+' Mejorada':can?'Mejorar · '+u[3]+' Esquirlas':'Faltan '+(u[3]-UP.ess)+' Esquirlas'}</button></div>`}).join('')}</div>`);
ACT.upbuy=d=>{const u=UPS[d.id];UP.ess-=u[3];UP.done[d.id]=1;CD[u[0]].up=1;CD[u[0]].tx=u[2];toast('Mejora aplicada: '+CD[u[0]].n);render()};
ACT.x=()=>{};

/* ---- Archivo ---- */
let AR='cards';
const lockedEntry=t=>`<div class="arlock">${ic('lock')}<b>???</b><small>${t}</small></div>`;
const ARC={cards:()=>CARDS.slice(0,12).map(c=>card(c,{mini:1,act:'x'})).join('')+Array(4).fill(lockedEntry('Desbloquea con logros')).join(''),
 champs:()=>ORD.map(k=>`<div class="arentry">${hero(k,{w:130})}<b class="fd">${CH[k].n}</b><small>${CH[k].role}</small></div>`).join('')+lockedEntry('Próximamente'),
 relics:()=>RELICS.map(r=>`<div style="width:300px">${relicSlot(r)}</div>`).join(''),
 gear:()=>Object.values(GEAR).map(g=>`<div style="width:300px">${gearSlot(g)}</div>`).join(''),
 enemies:()=>ENEMIES.map(e=>`<div class="arentry">${portrait(e.id+e.n,{enemy:1,w:130})}<b>${e.n}</b><small>${e.max} HP · ${e.r=='melee'?'Cuerpo a cuerpo':'Distancia'}</small></div>`).join(''),
 bosses:()=>[['bo','Viego, el Rey Arruinado','Jefe · Islas de la Sombra',1],['he','Heraldo de la Grieta','Élite · Islas de la Sombra',1],['ba','Barón Nashor','Jefe · próximamente',0]].map(b=>`<div class="arentry ${b[3]?'':'off'}">${portrait(b[0],{enemy:1,w:160})}<b class="fd">${b[1]}</b><small>${b[2]}</small></div>`).join(''),
 ach:()=>[['Primera sangre','Gana un combate',1],['Sin un rasguño','Gana sin perder vida',0],['Corazón de piedra','Termina con 0 estrés',0],['Compañía completa','Llega al jefe sin derribos',0]].map(a=>`<div class="gslot ${a[2]?'upg':''}" style="width:300px"><div class="gi">${ic(a[2]?'check':'lock')}</div><div><b>${a[0]}</b><p>${a[1]}</p></div></div>`).join('')};
const ARN={cards:'Cartas',champs:'Campeones',relics:'Reliquias',gear:'Gear',enemies:'Enemigos',bosses:'Jefes',ach:'Logros'};
SCR.archive=()=>scene({title:'Archivo',sub:'Lo no descubierto aparece bloqueado con pista',icon:'book'},`<div class="tabs">${Object.keys(ARN).map(k=>`<button class="${k==AR?'on':''}" data-act="artab" data-id="${k}">${ARN[k]}</button>`).join('')}</div>
 <div class="archgrid">${ARC[AR]()}</div>`);
ACT.artab=d=>{AR=d.id;render()};

/* ---- Preparación ---- */
let PR={diff:'normal'};
SCR.prep=()=>{const n=PR.diff=='night';
 return scene({title:'Preparar expedición',sub:'Región, dificultad y equipo',cls:'prep',icon:'flag'},`<div class="prep-l">
  <aside class="col"><h3 class="sec fd">${ic('map')} Región</h3>
   <button class="opt reg on" style="--img:url(assets/menu-bg.jpg)"><h4>Islas de la Sombra</h4><span class="small">La Niebla Negra ha arrastrado criaturas de la Grieta a las islas. Jefe: Viego. 15 nodos.</span></button>
   ${[['freljord','Freljord'],['shurima','Shurima'],['void','El Vacío'],['noxus','Noxus'],['targon','Monte Targon']].map(([k,r])=>`<button class="opt reg" style="--img:url(assets/regions/${k}.jpg)" disabled><h4>${ic('lock')} ${r}</h4><span class="small">Próximamente</span></button>`).join('')}</aside>
  <section class="prepstage"><h3 class="sec fd">${ic('team')} Equipo · frente a la derecha</h3><div class="lineup">${[...ORD].reverse().map(k=>`<div class="lu">${hero(k,{w:140})}<div class="lubars"><b><span class="pn">${ORD.indexOf(k)+1}</span>${CH[k].n}</b><small>${CH[k].role}</small>${hpBar(CH[k].hp,CH[k].stats.hp)}${stressM(CH[k].stress)}<span class="lugear">${CH[k].gear.map(g=>`<img src="${itemImg(GEAR[g].img)}" alt="${GEAR[g].n}" title="${GEAR[g].n}">`).join('')}${CH[k].wounds.length?woundBadge(1):''}</span></div></div>`).join('')}</div>
   <p class="syn">${ic('mark')} Sinergias: Lux marca → Yasuo remata · Soraka estabiliza el estrés de Lux · Leona protege el frente.</p></section>
  <aside class="col"><h3 class="sec fd">${ic('warn')} Dificultad</h3>
   <button class="opt ${!n?'on':''}" data-act="diff" data-id="normal"><h4>Normal</h4><ul class="small" style="padding-left:16px"><li>Un campeón derribado sobrevive al combate.</li><li>Puede quedar con una <b>herida grave</b>.</li></ul></button>
   <button class="opt ${n?'on':''}" data-act="diff" data-id="night"><h4>${ic('down')} Pesadilla</h4><ul class="small" style="padding-left:16px"><li><b style="color:var(--bad)">Muerte permanente:</b> si terminas un combate con un campeón derribado, muere para siempre.</li><li>Menos descansos y recursos más escasos.</li><li>Enemigos más difíciles.</li></ul></button>
   ${n?`<div class="warnbox red">${ic('warn')}<div>Un campeón muerto desaparece del Equipo y su mazo se pierde. Esto no se puede deshacer.</div></div>`:''}
   <button class="btn pri startbtn" data-act="start">${ic('flag')} Comenzar expedición</button></aside></div>`)};
ACT.diff=d=>{PR.diff=d.id;render()};
ACT.start=()=>PR.diff=='night'?confirmM({title:'Comenzar en Pesadilla',body:'<p>Regla de muerte permanente: un campeón <b>derribado al terminar el combate muere</b>. Menos descansos, menos recursos, enemigos más duros.</p>',irr:'La muerte permanente no puede revertirse.',ok:'Entiendo, comenzar',cb:()=>go('map')}):go('map');

/* ---- Mapa (vertical en pergamino, estilo Slay the Spire) ---- */
// [id, piso (x antiguo 100–920), carril (y antiguo 90–480), tipo] → coordenadas en un lienzo 600×1300, del inicio (abajo) al jefe (arriba)
const ND=[['a',100,280,'combat'],['b1',240,160,'event'],['b2',240,400,'combat'],['c1',380,90,'chest'],['c2',380,250,'combat'],['c3',380,430,'shop'],['d1',520,170,'elite'],['d2',520,340,'shrine'],['d3',520,480,'rest'],['e1',660,110,'shop'],['e2',660,280,'combat'],['e3',660,440,'event'],['f1',790,200,'rest'],['f2',790,380,'elite'],['g',920,290,'boss']];
const ED=[['a','b1'],['a','b2'],['b1','c1'],['b1','c2'],['b2','c3'],['b2','c2'],['c1','d1'],['c2','d1'],['c2','d2'],['c3','d3'],['c3','d2'],['d1','e1'],['d1','e2'],['d2','e2'],['d2','e3'],['d3','e3'],['e1','f1'],['e2','f1'],['e2','f2'],['e3','f2'],['f1','g'],['f2','g']];
const NT={combat:['ad','Combate','Enemigos normales. Desgasta al equipo.'],elite:['elite','Élite','Combate difícil con mejor botín.'],boss:['boss','Jefe','Viego, el Rey Arruinado. Fin de la región.'],rest:['rest','Descanso','Recupera vida, estrés o trata heridas.'],shop:['shop','Comerciante','Compra cartas, gear y servicios.'],event:['event','Evento','Decisión narrativa con riesgo/recompensa.'],chest:['chest','Tesoro','Botín sin combate.'],shrine:['shrine','Santuario','Ofrenda con consecuencias.']};
const NV=['a','b1'],NC='b1',NA=['c1','c2'];let MS=null;
const nst=id=>id==NC?'cur':NV.includes(id)?'vis':NA.includes(id)?'avail':'lock';
const jit=(id,k)=>((id.charCodeAt(0)*31+(id.charCodeAt(1)||7)*17+k*13)%37)-18; // desplazamiento fijo por nodo: aspecto dibujado a mano
const NP=Object.fromEntries(ND.map(([id,f,l])=>[id,id=='g'?[300,150]:[70+(l-90)/390*460+jit(id,1),1180-(f-100)/820*1000+jit(id,2)*.6]]));
// círculo de tinta trazado a mano (nodos visitados / seleccionados)
const RING='<svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><path d="M52 7c25 1 42 18 41 42S73 93 48 93 6 74 7 49 27 5 56 9"/></svg>';
SCR.map=()=>{const sel=MS&&ND.find(n=>n[0]==MS),selOk=sel&&nst(sel[0])=='avail';
 const paths=ED.map(([a,b])=>{const [x1,y1]=NP[a],[x2,y2]=NP[b],d=Math.hypot(x2-x1,y2-y1),ox=(x2-x1)/d,oy=(y2-y1)/d,s=b=='g'?80:30;
  const done=NV.includes(a)&&NV.includes(b),next=a==NC&&NA.includes(b);
  return `<line class="${done?'done':next?'next':''}" x1="${x1+ox*30}" y1="${y1+oy*30}" x2="${x2-ox*s}" y2="${y2-oy*s}"/>`}).join('');
 const nodes=ND.filter(n=>n[0]!='g').map(n=>{const s=nst(n[0]),t=NT[n[3]],[x,y]=NP[n[0]];
  return `<button class="mn ${n[3]} ${s} ${MS==n[0]?'sel':''}" style="left:${x/6}%;top:${y/13}%" data-act="node" data-id="${n[0]}" aria-label="${t[1]}, ${{cur:'posición actual',vis:'visitado',avail:'disponible',lock:'no alcanzable'}[s]}" title="${t[1]}">
   ${s=='vis'||s=='cur'||MS==n[0]?RING:''}${ic(t[0])}${s=='cur'?'<span class="here">Estás aquí</span>':''}${s=='avail'||MS==n[0]?`<span class="mlab">${t[1]}</span>`:''}</button>`}).join('');
 const T=ORD.map(k=>{const c=CH[k];return `<span class="tm" title="${c.n}: ${c.hp}/${c.stats.hp} vida, estrés ${c.stress}"><img src="${loading(c.n)}" alt=""><b>${c.hp}/${c.stats.hp}</b><i class="s${sLv(c.stress)}">${ic('stress')}${c.stress}</i></span>`}).join('');
 return `<div class="mapscr">
 <header class="hud"><div class="crest">${ic('map')}</div><div class="where"><b class="fd">Islas de la Sombra</b><small>Piso 2 de 7 · Normal</small></div>
  <div class="team">${T}</div>
  <div class="hudr"><span class="goldc">${ic('gold')} 214</span><span class="tag">${ic('relic')} 4/6</span><button class="btn" data-go="prep">← Volver</button></div></header>
 <div class="mapbody">
  <div class="mscroll" id="mscroll"><div class="smap">
   <svg class="paths" viewBox="0 0 600 1300" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>
   <button class="mboss ${MS=='g'?'sel':''}" style="left:50%;top:${150/13}%" data-act="node" data-id="g" aria-label="Jefe: Viego, el Rey Arruinado (no alcanzable todavía)">
    <span class="bface"><img src="${EIMG.bo}" alt=""></span><b class="fd">Viego</b><small>El Rey Arruinado</small></button>
   ${nodes}
   <span class="mstart" style="left:${NP.a[0]/6}%;top:${(NP.a[1]+70)/13}%">Inicio</span>
  </div></div>
  <aside class="legend">
   <h3 class="fd">Leyenda</h3>
   <ul>${['combat','elite','rest','shop','event','chest','shrine','boss'].map(k=>`<li>${ic(NT[k][0])}<span>${NT[k][1]}</span></li>`).join('')}</ul>
   <div class="lstates"><span>${RING}<i>Visitado</i></span><span class="lpulse">${ic('ad')}<i>Disponible</i></span><span class="lfade">${ic('ad')}<i>No alcanzable</i></span></div>
   <div class="ldetail">${sel?`<b class="fd">${ic(NT[sel[3]][0])} ${NT[sel[3]][1]}</b><p>${NT[sel[3]][2]}</p>${selOk?`<button class="btn pri" data-act="enter" data-id="${sel[3]}">Entrar</button>`:`<p class="lnote">${{cur:'Ya estás aquí.',vis:'Ya visitado.',lock:'No alcanzable desde tu posición.'}[nst(sel[0])]||''}</p>`}`:'<p>Elige uno de los nodos que laten para avanzar.</p>'}</div>
  </aside>
 </div></div>`};
ACT.node=d=>{MS=d.id;render()};
ACT.enter=d=>{({combat:()=>{newCombat();go('combat')},elite:()=>{newCombat();go('combat')},boss:()=>{newCombat();go('combat')},rest:()=>go('rest'),shop:()=>go('shop'),event:()=>go('event'),shrine:()=>go('event'),chest:()=>go('reward')})[d.id]()};
// al abrir el mapa, desplaza hasta la posición actual (el inicio está abajo, como en Slay the Spire)
let MSY=null;
window.after=()=>{if(CUR!='map'){MSY=null;return}const s=$('#mscroll'),c=document.querySelector('.mn.cur');if(!s||!c)return;
 s.scrollTop=MSY??c.getBoundingClientRect().top-s.getBoundingClientRect().top+s.scrollTop-s.clientHeight*.62;s.onscroll=()=>{MSY=s.scrollTop}};

/* ---- Recompensas (lista de botín y elección de carta, como en Slay the Spire) ---- */
let RW={card:null,opt:{},view:null,skip:false};
const RC=['y2','x3','l3'];
SCR.reward=()=>{const o=RW.opt,gained=[],lost=[];
 if(RW.card)gained.push('Carta: '+CD[RW.card].n);else if(RW.skip)lost.push('Carta (omitida)');
 if(o.gold)gained.push('+45 oro');if(o.pot)gained.push('Poción de vida');
 if(o.relic){gained.push('Fragmento del Vacío');lost.push('+4 estrés por uso')}
 if(o.gear){gained.push('Hoja de Guinsoo (Yasuo)');lost.push('Filo infinito de Yasuo')}
 const row=(id,icon,label,sub,on,act='rwopt')=>`<button class="rrow ${on?'taken':''}" data-act="${act}" data-id="${id}" aria-pressed="${!!on}"><span class="ricon">${icon}</span><span class="rtext"><b>${label}</b><small>${sub}</small></span><span class="rcheck">${on?ic('check'):''}</span></button>`;
 return scene({title:'Recompensas',sub:'Victoria · Islas de la Sombra',back:'map',icon:'chest',right:goldHud(214)},`<div class="loot"><div class="lootpanel">
  <h2 class="fd ltitle">Botín</h2>
  ${row('card',ic('card'),RW.card?'Carta: '+CD[RW.card].n:RW.skip?'Carta omitida':'Añadir una carta a un mazo','Recompensa principal · elige 1 de 3',RW.card,'rwview')}
  ${row('gold',ic('gold'),'45 de oro','Sin coste',o.gold)}
  ${row('pot',itemIcon(2003,'potion'),'Poción de vida','Consumible: cura 20 a un campeón',o.pot)}
  ${row('relic',RART.void,'Fragmento del Vacío','Reliquia (5/6) · efectos extra a cambio de +4 estrés',o.relic)}
  ${row('gear',itemIcon(3124,'ad'),'Hoja de furia de Guinsoo','Gear de Yasuo · reemplaza a Filo infinito',o.gear)}
  <div class="rcmp">${cmpTable(GEAR.filo,GEAR.guin,['ad','crit','cdmg','as'])}</div>
  <div class="lootsum"><span><b class="up">Ganas:</b> ${gained.join(' · ')||'—'}</span><span><b class="dn">Pierdes:</b> ${lost.join(' · ')||'—'}</span></div>
  <button class="btn pri" data-act="rwok">Continuar</button></div></div>
 ${RW.view=='cards'?`<div class="pick" role="dialog" aria-label="Elige una carta"><h2 class="fd">Elige una carta</h2><div class="pickrow">${RC.map(i=>card(CD[i],{sel:RW.card==i,act:'rwcard'})).join('')}</div>
  <div class="row"><button class="btn" data-act="rwskip">${ic('x')} Omitir</button><button class="btn" data-act="rwclose">Volver al botín</button></div><p class="small">Omitir es irreversible: no podrás volver a elegir.</p></div>`:''}`)};
Object.assign(ACT,{rwview:()=>{if(!RW.skip){RW.view='cards';render()}},rwclose:()=>{RW.view=null;render()},rwcard:d=>{RW.card=d.id;RW.view=null;render()},
 rwskip:()=>confirmM({title:'Omitir la carta',body:'<p>No añadirás ninguna carta a ningún mazo.</p>',irr:'No podrás volver a esta elección.',ok:'Omitir',cb:()=>{RW.card=null;RW.skip=true;RW.view=null;toast('Carta omitida');render()}}),
 rwopt:d=>{RW.opt[d.id]=!RW.opt[d.id];render()},
 rwok:()=>(RW.opt.gear?confirmM({title:'Reemplazar Filo infinito',body:'<p>Yasuo equipará Hoja de Guinsoo. Filo infinito se descarta.</p>',irr:'El equipo descartado no se recupera.',ok:'Reemplazar',cb:()=>{RW={card:null,opt:{},view:null,skip:false};go('map')}}):(toast('Recompensas aceptadas'),RW={card:null,opt:{},view:null,skip:false},go('map')))});

/* ---- Descanso (hoguera) ---- */
let RS=null;
const RO=[['hp','Recuperar vida','Cura 30% de vida a todo el equipo.','Equipo','Gasta el descanso.'],['stress','Reducir estrés','−20 estrés a un campeón.','1 campeón','Los demás siguen igual.'],['wound','Tratar una herida','Cura 1 herida (25 oro).','1 campeón','Coste: 25 oro.'],['buff','Mejora temporal','Una carta mejorada hasta fin de expedición.','1 carta','Se pierde al terminar la run.'],['boss','Prepararse para el jefe','+1 energía en el primer turno del jefe.','Jefe','No cura nada ahora.']];
const RI={hp:'heal',stress:'stress',wound:'wound',buff:'up',boss:'boss'};
SCR.rest=()=>{const o=RO.find(x=>x[0]==RS);
 return scene({title:'Campamento',sub:'Un descanso, una decisión'+(PR.diff=='night'?' · Pesadilla: menos opciones':''),bg:'assets/scenes/camp.jpg',cls:'rest',back:'map',icon:'rest'},`
 <div class="restopts" role="group" aria-label="Opciones de descanso">${RO.map(x=>`<button class="ropt ${RS==x[0]?'on':''}" data-act="rest" data-id="${x[0]}" aria-pressed="${RS==x[0]}"><span class="medal">${ic(RI[x[0]])}</span><b class="fd">${x[1]}</b><small>${x[2]}</small><span class="rscope">${ic('mark')} ${x[3]}</span><span class="rcons">${ic('warn')} ${x[4]}</span></button>`).join('')}</div>
 <div class="restgo"><button class="btn pri" ${RS?'':'disabled'} data-act="restok">${RS?'Descansar: '+o[1]:'Elige una opción'}</button></div>
 <div class="campers">${ORD.map((k,i)=>`<div class="camper c${i}">${hero(k,{w:118})}<small><b>${CH[k].n}</b> ${ic('hp')} ${CH[k].hp}/${CH[k].stats.hp} · <span class="s${sLv(CH[k].stress)}">${ic('stress')} ${CH[k].stress}</span></small></div>`).join('')}</div>`)};
ACT.rest=d=>{RS=d.id;render()};ACT.restok=()=>{toast('Descanso aplicado');RS=null;go('map')};

/* ---- Comerciante (mercancía expuesta con etiquetas de precio) ---- */
let SH={gold:214,bought:{}};
const SI={cards:[['x3','Barrera prismática',60],['s2','Calma Serena',55],['y3','Muro de viento',45]],gear:[['guin','Hoja de furia de Guinsoo',140,'Yasuo'],['warm','Armadura de Warmog',160,'Leona']],cons:[[2003,'Poción de vida',35,0,'Cura 20 a un campeón.'],[2031,'Poción reutilizable',40,0,'Cura 8 a un campeón, 2 usos por combate.'],[2138,'Elixir de hierro',50,0,'+15 bloqueo al inicio del próximo combate.']],svc:[['wound','Tratar herida',25,0,'Elimina 1 herida de un campeón.'],['card','Eliminar carta',75,0,'Quita 1 carta de un mazo.']]};
const ware=(tab,i,it,inner)=>{const k=tab+i,b=SH.bought[k],can=SH.gold>=it[2];
 return `<div class="ware ${b?'sold':''}">${inner}<button class="price ${can?'':'cant'}" ${b||!can?'disabled':''} data-act="buy" data-id="${k}" data-p="${it[2]}" aria-label="${b?'Vendido':'Comprar '+it[1]+' por '+it[2]+' de oro'}">${b?'Vendido':ic('gold')+' '+it[2]}</button>${!b&&!can?`<small class="need">Faltan ${it[2]-SH.gold}</small>`:''}</div>`};
SCR.shop=()=>scene({title:'Comerciante errante',sub:'Vender: cuando esté implementado',bg:'assets/scenes/shop.jpg',cls:'shop',back:'map',icon:'shop',right:goldHud(SH.gold)},`<div class="stall">
 <section class="sw"><h3 class="fd">Cartas</h3><div class="wares">${SI.cards.map((it,i)=>ware('cards',i,it,card(CD[it[0]],{mini:1,act:'x'}))).join('')}</div></section>
 <section class="sw"><h3 class="fd">Gear</h3><div class="wares">${SI.gear.map((it,i)=>{const G_=GEAR[it[0]],cur=GEAR[CH[it[3].toLowerCase()].gear[G_.slot=='Arma'?0:1]];return ware('gear',i,it,`<div class="wgear">${itemIcon(G_.img,'ad')}<b>${it[1]}</b><small>${statStr(G_.st)}</small><small class="wfor">Para ${it[3]} · reemplaza ${cur.n}</small></div>`)}).join('')}</div></section>
 <section class="sw"><h3 class="fd">Consumibles</h3><div class="wares">${SI.cons.map((it,i)=>ware('cons',i,it,`<div class="wcons">${itemIcon(it[0],'potion')}<b>${it[1]}</b><small>${it[4]}</small></div>`)).join('')}</div></section>
 <section class="sw"><h3 class="fd">Servicios</h3><div class="wares">${SI.svc.map((it,i)=>ware('svc',i,it,`<div class="wcons"><span class="gi">${ic(it[0])}</span><b>${it[1]}</b><small>${it[4]}</small></div>`)).join('')}</div></section></div>`);
ACT.buy=d=>{SH.gold-=+d.p;SH.bought[d.id]=1;toast('Compra realizada');render()};

/* ---- Evento (ilustración + texto + opciones, como en Slay the Spire) ---- */
let EV=null;
const EVC=[['keep','Conservar la reliquia','Ganas Fragmento del Vacío (reliquia, 5/6).','Cada uso suma +4 estrés al equipo.','warn'],['purify','Purificarla','Gasta 60 oro y 15 estrés de Lux.','Ganas una versión purificada, sin coste de estrés.','ok'],['leave','Abandonarla','No ocurre nada.','Pierdes la oportunidad. Irreversible.','']];
SCR.event=()=>scene({title:'Santuario del Vacío',sub:'Evento · Islas de la Sombra',bg:'assets/regions/void.jpg',cls:'event',back:'map',icon:'shrine'},`<div class="evlayout">
 <figure class="evart"><img src="assets/regions/void.jpg" alt="Un vórtice del Vacío late sobre un altar de coral negro"></figure>
 <section class="evtext"><h2 class="fd">Santuario del Vacío</h2>
  <p>La niebla se abre sobre un altar de coral negro. En su centro late una esquirla que no refleja la luz: la absorbe.</p>
  <p>Lux se estremece. «Me susurra… pero no sé si quiero entenderlo».</p>
  <div class="evopts">${EV?`<p class="evout">${ic('check')} ${EVC.find(c=>c[0]==EV)[2]}</p><button class="evopt" data-go="map"><b>[Continuar]</b></button>`
   :EVC.map(c=>`<button class="evopt" data-act="evt" data-id="${c[0]}"><b>[${c[1]}]</b> <span class="gain">${c[2]}</span> <span class="cost ${c[4]}">${c[3]}</span></button>`).join('')}</div></section></div>`);
ACT.evt=d=>confirmM({title:EVC.find(c=>c[0]==d.id)[1],body:'<p>'+EVC.find(c=>c[0]==d.id)[2]+'</p><p class="small">'+EVC.find(c=>c[0]==d.id)[3]+'</p>',irr:d.id=='leave'?'Perderás la oportunidad para siempre.':null,ok:'Elegir',cb:()=>{EV=d.id;render()}});

/* ---- Resultado ---- */
SCR.result=()=>{const k=R.kind,n=R.diff=='night';const T={win:['Victoria','Has derrotado a Viego, el Rey Arruinado.','ok'],lose:['Derrota','El equipo ha caído en las Islas de la Sombra.','bad'],ret:['Retirada','Abandonaste la expedición a tiempo.','warn']}[k];
 const seg=(arr,cur,act)=>`<span class="seg">${arr.map(([a,b])=>`<button class="${cur==a?'on':''}" data-act="${act}" data-id="${a}">${b}</button>`).join('')}</span>`;
 return scene({title:'Resultado de la expedición',sub:'Islas de la Sombra · vista previa de variantes',cls:'result r-'+k,back:false,icon:'flag',right:seg([['win','Victoria'],['lose','Derrota'],['ret','Retirada']],k,'rk')+seg([['normal','Normal'],['night','Pesadilla']],R.diff,'rd')},`
 <div class="banner ${T[2]}"><h1 class="fd">${T[0]}</h1><p>${T[1]}</p></div>
 ${n&&k!='win'?`<div class="warnbox red">${ic('down')}<div><b>Muerte permanente (Pesadilla):</b> los campeones derribados al terminar el combate han muerto. <b>Lux</b> ha sido eliminada del Equipo.</div></div>`:''}
 <div class="lineup res">${ORD.map(c=>{const dn=c=='lux'&&k!='win';return `<div class="lu ${dn?'dead':''}">${hero(c,{w:120,cls:dn?'down':''})}<div class="lubars"><b>${CH[c].n}</b>${dn?`<span class="tag bad">${ic('down')} ${n?'Muerta':'Derribada · herida grave'}</span>`:`<span class="tag ok">${ic('check')} Superviviente</span>`}<span class="tag">${ic('stress')} ${c=='yasuo'?'52 → 61 ▲':c=='lux'?'81 → 71 ▼':'estable'}</span></div></div>`}).join('')}</div>
 <div class="resgrid">
  <div class="panel"><h3>${ic('wound')} Cambios</h3><ul class="small" style="padding-left:16px;line-height:1.8"><li>Heridas nuevas: ${k=='win'?'Costilla fracturada (Leona)':'Quemadura arcana (Lux)'}</li><li>Estrés: Yasuo +9, Lux −10</li><li>${k=='ret'?'Botín conservado: 214 oro, 4 reliquias':k=='lose'?'Botín conservado: 40% del oro':'Botín conservado: todo'}</li><li style="color:${k=='win'?'inherit':'var(--bad)'}">Recompensas perdidas: ${k=='win'?'ninguna':'carta del jefe, reliquia final'}</li></ul></div>
  <div class="panel"><h3>${ic('book')} Estadísticas y desbloqueos</h3><table class="rt"><tr><td>Combates</td><td>6</td></tr><tr><td>Daño total</td><td>412</td></tr><tr><td>Cartas jugadas</td><td>57</td></tr><tr><td>Esquirlas ganadas</td><td>+${k=='win'?90:30}</td></tr></table>${k=='win'?`<span class="tag gold">${ic('lock')} Desbloqueado: Archivo · Viego, el Rey Arruinado</span>`:''}</div></div>
 <div class="resgo"><button class="btn pri" data-go="menu">Volver a la base</button></div>`)};
ACT.rk=d=>{R.kind=d.id;render()};ACT.rd=d=>{R.diff=d.id;render()};

/* ---- Estados (variantes) ---- */
SCR.states=()=>{newCombat();const g=G;g.al.lux.hp=12;g.al.soraka.hp=0;
 const u=(k,x)=>{const old=G.al[k];Object.assign(G.al[k],x);const h=combatHTML().split(`data-a="${k}"`)[0].split('<div class="unit').pop();return h};
 return `${scene({title:'Variantes de estado',sub:'Componentes reutilizables en todos sus estados',icon:'book'},`<div class="col" style="gap:18px">
 <div class="panel"><h3>ChampionPanel</h3><p class="small">Se muestran en el combate real (ve a Combate). Aquí los estados clave de forma aislada:</p><div class="gal">
  ${[['Normal',{hp:80,stress:18,w:0}],['Herido (<30% HP, pulso)',{hp:15,stress:30,w:0}],['Estrés alto (al límite)',{hp:50,stress:84,w:1}],['Derribado',{hp:0,stress:40,w:0}],['Con herida + bloqueo',{hp:60,stress:10,w:2,block:12}]].map(([t,s])=>{const a={hp:80,block:0,...s},d=a.hp<=0;return `<div class="it"><div class="unit ${d?'down':''} ${a.hp>0&&a.hp/80<.3?'hurt':''}"><span class="pos">1</span>${portrait('leona')}<span class="downlbl">${ic('down')} DERRIBADO</span><div class="nm">Leona</div>${hpBar(a.hp,80)}<div class="blkrow"><span class="chip blk">${ic('block')} ${a.block}</span>${woundBadge(a.w)}</div>${stressM(a.stress)}</div>${t}</div>`}).join('')}</div></div>
 <div class="panel"><h3>Card</h3><div class="gal">
  <div class="it">${card(CD.l1,{act:'x'})}Normal</div><div class="it">${card(CD.y1,{act:'x'})}Mejorada</div><div class="it">${card(CD.x2,{sel:1,act:'x'})}Seleccionada (épica)</div><div class="it">${card(CD.s1,{dis:'Soraka derribada',act:'x'})}Deshabilitada</div><div class="it">${card(CD.y2,{dis:'Energía insuficiente',act:'x'})}Sin energía</div></div></div>
 <div class="panel"><h3>Objetivos legal / ilegal / intención</h3><div class="gal">
  <div class="it"><div class="unit legal"><span class="pos">2</span><div class="tg">${ic('check')} Objetivo válido</div>${portrait('e2',{enemy:1})}<div class="nm">Centinela azul</div>${hpBar(40,40)}</div>Objetivo válido</div>
  <div class="it"><div class="unit illegal"><span class="pos">3</span><div class="tg">${ic('x')} Fuera de alcance</div>${portrait('e3',{enemy:1})}<div class="nm">Gromp</div>${hpBar(22,22)}</div>Objetivo ilegal (+ motivo en la barra)</div>
  <div class="it" style="width:230px"><div class="intent atk"><span class="ii">${ic('ad')}<b>8</b></span><span class="it">Ataque → Leona</span></div>Intención normal</div>
  <div class="it" style="width:230px"><div class="intent atk danger"><span class="ii">${ic('ad')}<b>14</b></span><span class="it">Ataque → Lux</span><em>¡LETAL!</em></div>Intención peligrosa</div></div></div>
 <div class="panel"><h3>Gear mejorable / reliquia activada / estados</h3><div class="gal"><div style="width:300px" class="it">${gearSlot(GEAR.cota,{upg:1})}Gear mejorable</div><div style="width:300px" class="it">${relicSlot(RELICS[1],1)}Reliquia activada</div>
  <div class="it" style="width:260px"><div class="row" style="flex-wrap:wrap;gap:4px">${['mark','burn','charge','stun','taunt'].map(s=>chip(s,2)).join('')}</div>StatusIcon (icono + texto, siempre visible)</div>
  <div class="it" style="width:260px">${[0,24,25,50,75,100].map(v=>stressM(v)).join('')}StressMeter: 0 / 24 / 25 / 50 / 75 / 100</div></div></div></div>`)}`};

/* ---- Sistema visual ---- */
SCR.system=()=>{const sw=(n,c)=>`<div><div class="swatch" style="background:${c}">${n}</div><div class="small">${c}</div></div>`;
 return `${scene({title:'Sistema visual',sub:'Tokens, tipografía, iconos y estados',icon:'book'},`<div class="col" style="gap:18px">
 <div class="panel"><h3>Color</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">${[['Fondo','#090b10'],['Panel','#161a23'],['Panel+','#1e2430'],['Oro / acento','#d6b25e'],['Vida','#e5594f'],['Bloqueo','#6cabee'],['Estrés','#bb8cf5'],['Herida','#e0698e'],['Magia / marca','#4fd8d2'],['Peligro','#ff8c3a'],['Válido','#7ddc92'],['Ilegal','#ff5f5f'],['Selección','#f5d36e'],['Rara','#5b9cf0'],['Épica','#b46bf0']].map(a=>sw(...a)).join('')}</div>
  <p class="small" style="margin-top:8px">Regla: todo color semántico va acompañado de icono, etiqueta o forma (vida = corazón + n/N; bloqueo = escudo; estrés = ojo + estado; derribo = calavera + rayado + etiqueta).</p></div>
 <div class="grid" style="grid-template-columns:1fr 1fr"><div class="panel"><h3>Tipografía</h3><p class="fd" style="font-size:30px">Cinzel — Títulos y nombres</p><p style="font-size:16px">Inter — texto de reglas, números y cartas (≥12.5px en carta, ≥12px en combate)</p><p class="small">Escala: 12 · 14 · 16 · 20 · 26 · 36. Botón «Texto grande» en combate sube base a 16px.</p></div>
 <div class="panel"><h3>Espaciado, radios y sombras</h3><p class="small">Espaciado base 8px (4/8/12/16/24). Radios: 4 chips · 8 paneles · 10 cartas. Bordes 1px metal / 2px interactivo / 3px foco. Sombra panel 0 6 22 #0008; selección = anillo oro + glow.</p></div></div>
 <div class="panel"><h3>Iconografía (trazo 2px, 24px)</h3><div class="row" style="flex-wrap:wrap;gap:14px">${[['ad','AD'],['ap','AP'],['crit','Crítico'],['armor','Armadura'],['mr','Res. mágica'],['pen','Penetración'],['lifesteal','Robo vida'],['as','Vel. ataque'],['haste','Aceleración'],['energy','Energía'],['block','Bloqueo'],['mark','Marca'],['burn','Quemadura'],['charge','Carga'],['dash','Desplaz.'],['hp','Vida'],['stress','Estrés'],['wound','Herida'],['down','Derribo'],['stun','Aturdido'],['taunt','Provocar']].map(([i,n])=>`<div class="it" style="text-align:center;font-size:11px;color:var(--ink2);width:70px"><span style="font-size:26px">${ic(i)}</span><br>${n}</div>`).join('')}</div></div>
 <div class="panel"><h3>Estados interactivos</h3><div class="row" style="flex-wrap:wrap"><button class="btn">Normal</button><button class="btn" style="border-color:var(--gold)">Hover</button><button class="btn" style="outline:3px solid var(--sel);outline-offset:2px">Foco</button><button class="btn" style="box-shadow:var(--sh-glow)">Seleccionado</button><button class="btn" disabled>Deshabilitado</button><span class="tag ok">${ic('check')} Válido</span><span class="tag bad">${ic('x')} Ilegal</span><span class="tag warn">${ic('warn')} Advertencia</span><span class="tag gold">${ic('check')} Confirmación</span></div></div></div>`)}`};

go(location.hash.slice(1)&&SCR[location.hash.slice(1)]?location.hash.slice(1):'menu');
