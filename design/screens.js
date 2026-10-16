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

/* ---- Equipo ---- */
let TM={c:'yasuo',cmp:false,card:null};
SCR.team=()=>{const ch=CH[TM.c],g=ch.gear.map(k=>GEAR[k]),st=ch.stats,deck=CARDS.filter(c=>c.o==TM.c);
 const alt=GEAR.guin,cur=GEAR.filo;
 return `<div class="screen">${head('Equipo','Inspecciona campeones, cartas y gear sin iniciar una expedición.')}
 <div class="tabs">${ORD.map(k=>`<button class="${k==TM.c?'on':''}" data-act="tmc" data-id="${k}">${CH[k].n}</button>`).join('')}</div>
 <div class="ficha">
  <div class="panel col">${portrait(TM.c,{w:228})}<h2 class="fd">${ch.n}</h2><span class="tag gold">${ch.role}</span>
   <div class="small"><b>Rasgos</b></div><div class="row" style="flex-wrap:wrap;gap:6px">${ch.tr.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
   <div class="small"><b>Estrés</b></div>${stressM(ch.stress)}
   <div class="small"><b>Heridas</b></div>${ch.wounds.length?ch.wounds.map(w=>`<div class="warnbox red">${ic('wound')}<div><b>${w[0]}</b><br><span class="small">${w[1]}</span></div></div>`).join(''):'<span class="small">Sin heridas.</span>'}
   <div class="small">Crisis posibles al 100: pánico, egoísmo, desesperación o ira (siempre visibles).</div></div>
  <div class="col">
   <div class="panel"><h3>${ic('crit')} Estadísticas</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${Object.entries(st).map(([k,v])=>`<div class="chip" style="padding:6px 8px;justify-content:space-between;font-size:14px"><span>${ic(STAT[k][0])} ${STAT[k][1]}</span><b>${v}${STU[k]??''}</b></div>`).join('')}</div>
    <p class="small" style="margin-top:8px">${ic('ap')} ${ch.scale} Solo se muestran las estadísticas que este campeón usa.</p></div>
   <div class="panel"><h3>${ic('armor')} Gear individual (2 espacios MVP)</h3><div class="col">${g.map(x=>gearSlot(x,{upg:TM.c=='yasuo'&&x.n=='Cota de espinas'})).join('')}</div>
    ${TM.c=='yasuo'?`<button class="btn" style="margin-top:10px" data-act="tmcmp">${ic('swap')} ${TM.cmp?'Ocultar':'Comparar'} build alternativa (Guinsoo)</button>
    ${TM.cmp?`<div class="cmp" style="margin-top:10px"><b>Estadística</b><b>Filo</b><b></b><b>Guinsoo</b>${['ad','crit','cdmg','as'].map(k=>{const a=cur.st[k]||0,b=alt.st[k]||0,d=b-a;return `<span>${ic(STAT[k][0])} ${STAT[k][1]}</span><span>${a}${STU[k]??''}</span><span>→</span><span class="${d>0?'up':d<0?'dn':'eq'}">${b}${STU[k]??''} (${d>0?'▲ +':d<0?'▼ ':'= '}${d})</span>`}).join('')}</div><p class="small" style="margin-top:6px">Guinsoo pierde crítico pero gana velocidad: favorece Tajo de Acero, penaliza Tempestad.</p>`:''}`:''}</div>
   <div class="panel gold"><h3>${ic('relic')} Reliquias</h3><p class="small">Las reliquias pertenecen a la <b>expedición</b>, no a ${ch.n}. Se ven en combate y en el mapa (máx. 6).</p></div></div>
  <div class="panel"><h3>${ic('card')} Mazo inicial (${deck.length})</h3><div class="grid" style="grid-template-columns:repeat(2,1fr)">${deck.map(c=>card(c,{mini:1,act:'tmcard'})).join('')}</div></div>
 </div></div>`};
Object.assign(ACT,{tmc:d=>{TM.c=d.id;TM.cmp=false;render()},tmcmp:()=>{TM.cmp=!TM.cmp;render()},tmcard:d=>modal(`<div class="row" style="align-items:flex-start">${card({...CD[d.id]},{act:'closeM'}).replace('--cw','')}<div class="col"><h2 class="fd">${CD[d.id].n}</h2><p>${CD[d.id].tx}</p><p class="small">Propietario: ${CH[CD[d.id].o].n} · Coste ${CD[d.id].c} · ${CD[d.id].r}</p>${CD[d.id].up?'<span class="tag gold">Mejorada</span>':'<span class="tag">Sin mejorar (ver Mejoras)</span>'}<button class="btn pri" data-act="closeM">Cerrar</button></div></div>`)});

/* ---- Mejoras ---- */
let UP={ess:120,done:{}};
const UPS=[['y2','Tempestad de Acero','Inflige 14.','Inflige 18.',60],['x2','Chispa final','+4 por Marca.','+6 por Marca.',80],['s1','Plegaria Estelar','Cura 10.','Cura 14.',50],['l3','Eclipse','12 de bloqueo.','15 de bloqueo. Cuesta 1.',90]];
SCR.upgrades=()=>`<div class="screen">${head('Mejoras','Progresión permanente moderada. Esquirlas ganadas en expediciones.')}
 <div class="row"><span class="tag gold">${ic('relic')} ${UP.ess} Esquirlas</span></div>
 <div class="tabs"><button class="on">Mejoras de carta</button><button disabled>Desbloqueos (Archivo)</button></div>
 <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(380px,1fr))">${UPS.map((u,i)=>{const d=UP.done[i],can=UP.ess>=u[4];return `<div class="panel row">${card(CD[u[0]],{mini:1,act:'x'})}<div class="grow col"><b class="fd">${u[1]}</b><div class="cmp" style="grid-template-columns:auto 1fr"><span class="small">Ahora</span><span>${u[2]}</span><span class="small">Mejora</span><span class="up">▲ ${u[3]}</span></div>
  <button class="btn ${d?'':'pri'}" ${d||!can?'disabled':''} data-act="upbuy" data-id="${i}">${d?ic('check')+' Mejorada':can?'Mejorar · '+u[4]+' Esquirlas':'Faltan '+(u[4]-UP.ess)+' Esquirlas'}</button></div></div>`}).join('')}</div></div>`;
ACT.upbuy=d=>{const u=UPS[d.id];UP.ess-=u[4];UP.done[d.id]=1;CD[u[0]].up=1;toast('Mejora aplicada: '+u[1]);render()};
ACT.x=()=>{};

/* ---- Archivo ---- */
let AR='cards';
const ARC={cards:()=>CARDS.slice(0,12).map(c=>card(c,{mini:1,act:'x'})).join('')+Array(4).fill('<div class="panel small" style="width:112px;text-align:center">'+ic('lock')+'<br>???<br>Desbloquea con logros</div>').join(''),
 champs:()=>ORD.map(k=>`<div class="panel col" style="width:170px">${portrait(k,{w:140})}<b class="fd">${CH[k].n}</b><span class="small">${CH[k].role}</span></div>`).join('')+'<div class="panel small" style="width:170px;text-align:center">'+ic('lock')+'<br>Próximamente</div>',
 relics:()=>RELICS.map(r=>`<div style="width:300px">${relicSlot(r)}</div>`).join(''),
 gear:()=>Object.values(GEAR).map(g=>`<div style="width:300px">${gearSlot(g)}</div>`).join(''),
 enemies:()=>ENEMIES.map(e=>`<div class="panel col" style="width:170px">${portrait(e.id+e.n,{enemy:1,w:140})}<b>${e.n}</b><span class="small">${e.max} HP · ${e.r=='melee'?'CaC':'Distancia'}</span></div>`).join(''),
 bosses:()=>[['bo','Viego, el Rey Arruinado','Jefe · Islas de la Sombra',1],['he','Heraldo de la Grieta','Élite · Islas de la Sombra',1],['ba','Barón Nashor','Jefe · próximamente',0]].map(b=>`<div class="panel col" style="width:220px;${b[3]?'':'opacity:.55'}">${portrait(b[0],{enemy:1,w:180})}<b class="fd">${b[1]}</b><span class="small">${b[2]}</span></div>`).join(''),
 ach:()=>[['Primera sangre','Gana un combate',1],['Sin un rasguño','Gana sin perder vida',0],['Corazón de piedra','Termina con 0 estrés',0],['Compañía completa','Llega al jefe sin derribos',0]].map(a=>`<div class="gslot ${a[2]?'upg':''}" style="width:300px"><div class="gi">${ic(a[2]?'check':'lock')}</div><div><b>${a[0]}</b><p>${a[1]}</p></div></div>`).join('')};
const ARN={cards:'Cartas',champs:'Campeones',relics:'Reliquias',gear:'Gear',enemies:'Enemigos',bosses:'Jefes',ach:'Logros'};
SCR.archive=()=>`<div class="screen">${head('Archivo','Todo lo que has descubierto. Lo no descubierto aparece bloqueado con pista.')}
 <div class="tabs">${Object.keys(ARN).map(k=>`<button class="${k==AR?'on':''}" data-act="artab" data-id="${k}">${ARN[k]}</button>`).join('')}</div>
 <div class="row" style="flex-wrap:wrap;align-items:flex-start;gap:14px">${ARC[AR]()}</div></div>`;
ACT.artab=d=>{AR=d.id;render()};

/* ---- Preparación ---- */
let PR={diff:'normal'};
SCR.prep=()=>{const n=PR.diff=='night';return `<div class="screen">${head('Preparar expedición','Elige región, dificultad y revisa a tu equipo.')}
 <div class="grid" style="grid-template-columns:1fr 1fr 1.2fr">
  <div class="col"><div class="panel gold"><h3>${ic('map')} Región</h3><div class="col">
   <button class="opt reg on" style="--img:url(assets/menu-bg.jpg)"><h4>Islas de la Sombra</h4><span class="small">La Niebla Negra ha arrastrado criaturas de la Grieta a las islas. Jefe: Viego, el Rey Arruinado. 15 nodos.</span></button>
   ${[['freljord','Freljord'],['shurima','Shurima'],['void','El Vacío'],['noxus','Noxus'],['targon','Monte Targon']].map(([k,r])=>`<button class="opt reg" style="--img:url(assets/regions/${k}.jpg)" disabled><h4>${ic('lock')} ${r}</h4><span class="small">Próximamente</span></button>`).join('')}</div></div></div>
  <div class="col"><div class="panel gold"><h3>${ic('warn')} Dificultad</h3><div class="col">
   <button class="opt ${!n?'on':''}" data-act="diff" data-id="normal"><h4>Normal</h4><ul class="small" style="padding-left:16px"><li>Un campeón derribado sobrevive al combate.</li><li>Puede quedar con una <b>herida grave</b>.</li></ul></button>
   <button class="opt ${n?'on':''}" data-act="diff" data-id="night"><h4>${ic('down')} Pesadilla</h4><ul class="small" style="padding-left:16px"><li><b style="color:var(--bad)">Muerte permanente:</b> si terminas un combate con un campeón derribado, muere para siempre.</li><li>Menos descansos y recursos más escasos.</li><li>Enemigos más difíciles.</li></ul></button></div>
   ${n?`<div class="warnbox red" style="margin-top:10px">${ic('warn')}<div>Un campeón muerto desaparece del Equipo y su mazo se pierde. Esto no se puede deshacer.</div></div>`:''}</div></div>
  <div class="col"><div class="panel"><h3>${ic('team')} Equipo (4/4)</h3><div class="col">${ORD.map((k,i)=>`<div class="row"><span class="pos tag gold">${i+1}</span>${portrait(k,{w:46})}<div class="grow"><b>${CH[k].n}</b> <span class="small">${CH[k].role}</span>${stressM(CH[k].stress)}</div>${CH[k].wounds.length?woundBadge(1):''}<span class="tag">${CH[k].gear.map(g=>GEAR[g].n.split(' ')[0]).join(' + ')}</span></div>`).join('')}</div></div>
   <div class="panel"><h3>${ic('mark')} Roles y sinergias</h3><div class="row" style="flex-wrap:wrap;gap:6px"><span class="tag ok">${ic('block')} Frontal: Leona</span><span class="tag ok">${ic('ad')} Daño: Yasuo</span><span class="tag ok">${ic('mark')} Control: Lux</span><span class="tag ok">${ic('heal')} Apoyo: Soraka</span></div><p class="small" style="margin-top:6px">Sinergias: Lux marca → Yasuo remata · Soraka estabiliza el estrés de Lux.</p></div>
   <button class="btn pri" data-act="start">${ic('flag')} Comenzar expedición</button></div></div></div>`};
ACT.diff=d=>{PR.diff=d.id;render()};
ACT.start=()=>PR.diff=='night'?confirmM({title:'Comenzar en Pesadilla',body:'<p>Regla de muerte permanente: un campeón <b>derribado al terminar el combate muere</b>. Menos descansos, menos recursos, enemigos más duros.</p>',irr:'La muerte permanente no puede revertirse.',ok:'Entiendo, comenzar',cb:()=>go('map')}):go('map');

/* ---- Mapa ---- */
const ND=[['a',100,280,'combat'],['b1',240,160,'event'],['b2',240,400,'combat'],['c1',380,90,'chest'],['c2',380,250,'combat'],['c3',380,430,'shop'],['d1',520,170,'elite'],['d2',520,340,'shrine'],['d3',520,480,'rest'],['e1',660,110,'shop'],['e2',660,280,'combat'],['e3',660,440,'event'],['f1',790,200,'rest'],['f2',790,380,'elite'],['g',920,290,'boss']];
const ED=[['a','b1'],['a','b2'],['b1','c1'],['b1','c2'],['b2','c3'],['b2','c2'],['c1','d1'],['c2','d1'],['c2','d2'],['c3','d3'],['c3','d2'],['d1','e1'],['d1','e2'],['d2','e2'],['d2','e3'],['d3','e3'],['e1','f1'],['e2','f1'],['e2','f2'],['e3','f2'],['f1','g'],['f2','g']];
const NT={combat:['ad','Combate','Enemigos normales. Desgasta al equipo.'],elite:['elite','Élite','Combate difícil con mejor botín.'],boss:['boss','Jefe','Viego, el Rey Arruinado. Fin de la región.'],rest:['rest','Descanso','Recupera vida, estrés o trata heridas.'],shop:['shop','Comerciante','Compra cartas, gear y servicios.'],event:['event','Evento','Decisión narrativa con riesgo/recompensa.'],chest:['chest','Tesoro','Botín sin combate.'],shrine:['shrine','Santuario','Ofrenda con consecuencias.']};
const NV=['a','b1'],NC='b1',NA=['c1','c2'];let MS=null;
const nst=id=>id==NC?'cur':NV.includes(id)?'vis':NA.includes(id)?'avail':'lock';
SCR.map=()=>{const sel=MS&&ND.find(n=>n[0]==MS);
 return `<div class="screen">${head('Islas de la Sombra','Piso 2 de 7 · avanza hasta el Viego, el Rey Arruinado','prep')}
 <div class="row"><div class="grow"><div class="hpbar" style="background:#1d1a0c;border-color:var(--gold2)"><i style="width:28%;background:var(--gold2)"></i><span>${ic('flag')} Avance hacia el jefe: 28%</span></div></div><span class="tag">${ic('gold')} 214</span><span class="tag">${ic('relic')} 4/6</span></div>
 <div class="mapwrap">${BG_MAP}<svg class="lines" viewBox="0 0 1000 560" preserveAspectRatio="none">${ED.map(([a,b])=>{const A=ND.find(n=>n[0]==a),B=ND.find(n=>n[0]==b);const on=NV.includes(a)&&(NV.includes(b)||NA.includes(b));return `<line x1="${A[1]}" y1="${A[2]}" x2="${B[1]}" y2="${B[2]}" stroke="${on?'#d6b25e':'#4b5366'}" stroke-width="${on?4:2.500}" ${on?'':'stroke-dasharray="6 6"'}/>`}).join('')}</svg>
 ${ND.map(n=>{const s=nst(n[0]),t=NT[n[3]];return `<button class="nd ${n[3]=='elite'?'elite':''} ${n[3]=='boss'?'boss':''} ${s} ${MS==n[0]?'sel':''}" style="left:${n[1]/10}%;top:${n[2]/5.6}%" data-act="node" data-id="${n[0]}" aria-label="${t[1]} — ${{cur:'actual',vis:'visitado',avail:'disponible',lock:'bloqueado'}[s]}">${ic(t[0])}${s!='avail'?`<span class="st">${ic({cur:'flag',vis:'check',lock:'lock'}[s])}</span>`:''}</button><span class="nlab" style="left:${n[1]/10}%;top:${n[2]/5.6}%">${t[1]}</span>`}).join('')}</div>
 <div class="row" style="flex-wrap:wrap;gap:8px"><span class="tag">${ic('flag')} Actual</span><span class="tag gold">${ic('check')} Visitado</span><span class="tag warn" style="color:var(--sel);border-color:var(--sel)">Disponible (brillo)</span><span class="tag">${ic('lock')} Bloqueado (discontinuo)</span><span class="small">Forma: círculo = normal · rombo = élite · cuadrado grande = jefe</span></div>
 ${sel&&nst(sel[0])=='avail'?`<div class="panel gold row">${ic(NT[sel[3]][0])}<div class="grow"><b class="fd">${NT[sel[3]][1]}</b><div class="small">${NT[sel[3]][2]}</div></div><button class="btn pri" data-act="enter" data-id="${sel[3]}">Entrar</button></div>`:'<div class="small">Selecciona un nodo disponible para ver su detalle.</div>'}</div>`};
ACT.node=d=>{MS=d.id;render()};
ACT.enter=d=>{({combat:()=>{newCombat();go('combat')},elite:()=>{newCombat();go('combat')},boss:()=>{newCombat();go('combat')},rest:()=>go('rest'),shop:()=>go('shop'),event:()=>go('event'),shrine:()=>go('event'),chest:()=>go('reward')})[d.id]()};

/* ---- Recompensas ---- */
let RW={card:null,opt:{}};
const RC=['y2','x3','l3'];
SCR.reward=()=>{const o=RW.opt,gained=[],lost=[];
 if(RW.card)gained.push('Carta: '+CD[RW.card].n);else lost.push('Carta principal (omitida)');
 if(o.gold)gained.push('+45 oro');if(o.pot)gained.push('Poción de vida');
 if(o.relic){gained.push('Fragmento del Vacío');lost.push('Con +4 estrés por uso')}
 if(o.gear){gained.push('Hoja de Guinsoo (Yasuo)');lost.push('Filo infinito de Yasuo (se descarta)')}
 return `<div class="screen">${head('Recompensas','Victoria en Islas de la Sombra. Elige tu recompensa principal; las opcionales son independientes.','map')}
 <div class="grid" style="grid-template-columns:1.1fr 1fr">
  <div class="panel gold"><h3>${ic('card')} Recompensa principal · elige 1 carta</h3><div class="row" style="flex-wrap:wrap;gap:16px;padding-top:8px">${RC.map(i=>card(CD[i],{sel:RW.card==i,act:'rwcard'})).join('')}</div>
   <div class="row" style="margin-top:14px"><button class="btn" data-act="rwskip">${ic('x')} Omitir carta</button><span class="small">Omitir es irreversible: no podrás volver a elegir.</span></div></div>
  <div class="col"><div class="panel"><h3>${ic('gold')} Recompensas opcionales</h3><div class="col">
   <button class="opt ${o.gold?'on':''}" data-act="rwopt" data-id="gold"><h4>${ic('gold')} 45 de oro</h4><span class="small">Sin coste.</span></button>
   <button class="opt ${o.pot?'on':''}" data-act="rwopt" data-id="pot"><h4><span style="width:28px;height:28px;display:inline-block">${itemIcon(2003,'potion')}</span> Poción de vida</h4><span class="small">Consumible: cura 20 a un campeón.</span></button>
   <button class="opt ${o.relic?'on':''}" data-act="rwopt" data-id="relic"><h4><span style="width:28px;height:28px;display:inline-block">${RART.void}</span> Fragmento del Vacío <span class="tag warn">Reliquia · 5/6</span></h4><span class="small">Efectos extra al consumir marcas/cargas a cambio de estrés.</span></button>
   <button class="opt ${o.gear?'on':''}" data-act="rwopt" data-id="gear"><h4><span style="width:28px;height:28px;display:inline-block">${itemIcon(3124,'ad')}</span> Hoja de furia de Guinsoo <span class="tag">Gear · Yasuo</span></h4>
    <div class="cmp"><b class="small">Estadística</b><b class="small">Actual</b><b></b><b class="small">Nuevo</b>${['ad','crit','cdmg','as'].map(k=>{const a=GEAR.filo.st[k]||0,b=GEAR.guin.st[k]||0,d=b-a;return `<span>${ic(STAT[k][0])} ${STAT[k][1]}</span><span>${a}</span><span>→</span><span class="${d>0?'up':d<0?'dn':'eq'}">${b} ${d>0?'▲ +'+d:d<0?'▼ '+d:'='}</span>`}).join('')}</div><span class="small">${ic('warn')} Reemplaza a Filo infinito (se descarta).</span></button></div></div>
  <div class="panel gold"><h3>${ic('check')} Resumen de la decisión</h3><div class="small"><b style="color:var(--ok)">Ganas:</b> ${gained.join(' · ')||'—'}</div><div class="small" style="margin-top:4px"><b style="color:var(--bad)">Pierdes:</b> ${lost.join(' · ')||'—'}</div>
   <button class="btn pri" style="margin-top:10px;width:100%" data-act="rwok">Confirmar y continuar</button></div></div></div></div>`};
Object.assign(ACT,{rwcard:d=>{RW.card=d.id;render()},rwskip:()=>confirmM({title:'Omitir la carta',body:'<p>No añadirás ninguna carta a ningún mazo.</p>',irr:'No podrás volver a esta elección.',ok:'Omitir',cb:()=>{RW.card=null;toast('Carta omitida');render()}}),rwopt:d=>{RW.opt[d.id]=!RW.opt[d.id];render()},
 rwok:()=>(RW.opt.gear?confirmM({title:'Reemplazar Filo infinito',body:'<p>Yasuo equipará Hoja de Guinsoo. Filo infinito se descarta.</p>',irr:'El equipo descartado no se recupera.',ok:'Reemplazar',cb:()=>{RW={card:null,opt:{}};go('map')}}):(toast('Recompensas aceptadas'),RW={card:null,opt:{}},go('map')))});

/* ---- Descanso ---- */
let RS=null;
const RO=[['hp','Recuperar vida','Cura 30% de vida a todo el equipo.','Equipo','Gasta el descanso.'],['stress','Reducir estrés','−20 estrés a un campeón.','1 campeón','Los demás siguen igual.'],['wound','Tratar una herida','Cura 1 herida (25 oro).','1 campeón','Coste: 25 oro.'],['buff','Mejora temporal','Una carta mejorada hasta fin de expedición.','1 carta','Se pierde al terminar la run.'],['boss','Prepararse para el jefe','+1 energía en el primer turno del jefe.','Jefe','No cura nada ahora.']];
const RI={hp:'heal',stress:'stress',wound:'wound',buff:'up',boss:'boss'};
SCR.rest=()=>`<div class="screen">${head('Campamento','Un descanso, una decisión. ('+(PR.diff=='night'?'Pesadilla: menos opciones':'Normal')+')','map')}
 <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${RO.map(o=>`<button class="opt ${RS==o[0]?'on':''}" data-act="rest" data-id="${o[0]}"><h4>${ic(RI[o[0]])} ${o[1]}</h4><p>${o[2]}</p><div class="row" style="flex-wrap:wrap;gap:4px"><span class="tag">${ic('mark')} ${o[3]}</span></div><span class="small">${ic('warn')} ${o[4]}</span></button>`).join('')}</div>
 <button class="btn pri" ${RS?'':'disabled'} data-act="restok" style="align-self:flex-end">Descansar</button></div>`;
ACT.rest=d=>{RS=d.id;render()};ACT.restok=()=>{toast('Descanso aplicado');RS=null;go('map')};

/* ---- Comerciante ---- */
let SH={tab:'cards',gold:214,bought:{}};
const SI={cards:[['x3','Barrera prismática',60],['s2','Calma Serena',55],['y3','Muro de viento',45]],gear:[['guin','Hoja de furia de Guinsoo',140,'Yasuo'],['warm','Armadura de Warmog',160,'Leona']],cons:[[2003,'Poción de vida',35,0,'Cura 20 a un campeón.'],[2031,'Poción reutilizable',40,0,'Cura 8 a un campeón, 2 usos por combate.'],[2138,'Elixir de hierro',50,0,'+15 bloqueo al inicio del próximo combate.']],svc:[['wound','Tratar herida',25,0,'Elimina 1 herida de un campeón.'],['card','Eliminar carta',75,0,'Quita 1 carta de un mazo.']]};
SCR.shop=()=>`<div class="screen">${head('Comerciante errante','Vender: disponible cuando esté implementado.','map')}
 <div class="row"><span class="tag gold">${ic('gold')} ${SH.gold} oro</span><button class="btn" disabled>Vender (próximamente)</button></div>
 <div class="tabs">${[['cards','Cartas'],['gear','Gear'],['cons','Consumibles'],['svc','Servicios']].map(([k,n])=>`<button class="${SH.tab==k?'on':''}" data-act="shtab" data-id="${k}">${n}</button>`).join('')}</div>
 <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${SI[SH.tab].map((it,i)=>{const k=SH.tab+i,b=SH.bought[k],can=SH.gold>=it[2];return `<div class="panel col">${SH.tab=='cards'?card(CD[it[0]],{mini:1,act:'x'}):SH.tab=='gear'?`${gearSlot(GEAR[it[0]])}<span class="tag">Para ${it[3]} · reemplaza ${GEAR[CH[it[3].toLowerCase()].gear[GEAR[it[0]].slot=='Arma'?0:1]].n}</span>`:`<div class="gslot">${SH.tab=='cons'?itemIcon(it[0],'potion'):`<div class="gi">${ic(it[0])}</div>`}<div><b>${it[1]}</b><p>${it[4]}</p></div></div>`}
  <button class="btn ${b?'':'pri'}" ${b||!can?'disabled':''} data-act="buy" data-id="${k}" data-p="${it[2]}">${b?ic('check')+' Comprado':can?ic('gold')+' '+it[2]:'Faltan '+(it[2]-SH.gold)+' oro'}</button></div>`}).join('')}</div></div>`;
ACT.shtab=d=>{SH.tab=d.id;render()};ACT.buy=d=>{SH.gold-=+d.p;SH.bought[d.id]=1;toast('Compra realizada');render()};

/* ---- Evento ---- */
let EV=null;
const EVC=[['keep','Conservar la reliquia','Ganas Fragmento del Vacío (reliquia, 5/6).','Cada uso suma +4 estrés al equipo.','warn'],['purify','Purificarla','Gasta 60 oro y 15 estrés de Lux.','Ganas una versión purificada, sin coste de estrés.','ok'],['leave','Abandonarla','No ocurre nada.','Pierdes la oportunidad. Irreversible.','']];
SCR.event=()=>`<div class="screen">${head('Santuario del Vacío','Evento','map')}
 <div class="grid" style="grid-template-columns:1fr 1fr"><div class="panel gold col" style="font-size:16px;line-height:1.6;font-style:italic">${ic('void')}<p>La niebla se abre sobre un altar de coral negro. En su centro late una esquirla que no refleja la luz: la absorbe.</p><p>Lux se estremece. «Me susurra… pero no sé si quiero entenderlo».</p></div>
 <div class="col">${EV?`<div class="panel gold col"><h3>${ic('check')} Decisión tomada</h3><p>${EVC.find(c=>c[0]==EV)[2]}</p><button class="btn pri" data-go="map">Continuar</button></div>`:EVC.map(c=>`<button class="opt" data-act="evt" data-id="${c[0]}"><h4>${c[1]}</h4><span>${c[2]}</span><span class="tag ${c[4]}">${ic('warn')} ${c[3]}</span></button>`).join('')}</div></div></div>`;
ACT.evt=d=>confirmM({title:EVC.find(c=>c[0]==d.id)[1],body:'<p>'+EVC.find(c=>c[0]==d.id)[2]+'</p><p class="small">'+EVC.find(c=>c[0]==d.id)[3]+'</p>',irr:d.id=='leave'?'Perderás la oportunidad para siempre.':null,ok:'Elegir',cb:()=>{EV=d.id;render()}});

/* ---- Resultado ---- */
SCR.result=()=>{const k=R.kind,n=R.diff=='night';const T={win:['Victoria','Has derrotado al Viego, el Rey Arruinado.','ok'],lose:['Derrota','El equipo ha caído en las Islas de la Sombra.','bad'],ret:['Retirada','Abandonaste la expedición a tiempo.','warn']}[k];
 return `<div class="screen">${head('Resultado de la expedición','Vista previa de variantes:')}
 <div class="row" style="flex-wrap:wrap"><div class="tabs">${[['win','Victoria'],['lose','Derrota'],['ret','Retirada']].map(([a,b])=>`<button class="${k==a?'on':''}" data-act="rk" data-id="${a}">${b}</button>`).join('')}</div><div class="tabs">${[['normal','Normal'],['night','Pesadilla']].map(([a,b])=>`<button class="${R.diff==a?'on':''}" data-act="rd" data-id="${a}">${b}</button>`).join('')}</div></div>
 <div class="panel gold" style="text-align:center"><h1 class="fd tag ${T[2]}" style="font-size:40px;border:0">${T[0]}</h1><p>${T[1]}</p></div>
 ${n&&k!='win'?`<div class="warnbox red">${ic('down')}<div><b>Muerte permanente (Pesadilla):</b> los campeones derribados al terminar el combate han muerto. <b>Lux</b> ha sido eliminada del Equipo.</div></div>`:''}
 <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
  <div class="panel"><h3>${ic('team')} Equipo</h3><div class="col">${ORD.map(c=>{const dn=c=='lux'&&k!='win';return `<div class="row">${portrait(c,{w:40})}<b class="grow">${CH[c].n}</b>${dn?`<span class="tag bad">${ic('down')} ${n?'Muerta':'Derribada · herida grave'}</span>`:'<span class="tag ok">'+ic('check')+' Superviviente</span>'}<span class="tag">${ic('stress')} ${c=='yasuo'?'52 → 61 ▲':'estable'}</span></div>`}).join('')}</div></div>
  <div class="panel"><h3>${ic('wound')} Cambios</h3><ul class="small" style="padding-left:16px;line-height:1.8"><li>Heridas nuevas: ${k=='win'?'Costilla fracturada (Leona)':'Quemadura arcana (Lux)'}</li><li>Estrés: Yasuo +9, Lux −10</li><li>${k=='ret'?'Botín conservado: 214 oro, 4 reliquias':k=='lose'?'Botín conservado: 40% del oro':'Botín conservado: todo'}</li><li class="${k=='win'?'':'dn'}" style="color:${k=='win'?'inherit':'var(--bad)'}">Recompensas perdidas: ${k=='win'?'ninguna':'carta del jefe, reliquia final'}</li></ul></div>
  <div class="panel"><h3>${ic('book')} Estadísticas y desbloqueos</h3><table class="rt"><tr><td>Combates</td><td>6</td></tr><tr><td>Daño total</td><td>412</td></tr><tr><td>Cartas jugadas</td><td>57</td></tr><tr><td>Esquirlas ganadas</td><td>+${k=='win'?90:30}</td></tr></table>${k=='win'?`<span class="tag gold">${ic('lock')} Desbloqueado: Archivo · Viego, el Rey Arruinado</span>`:''}</div></div>
 <button class="btn pri" data-go="menu" style="align-self:center">Volver a la base</button></div>`};
ACT.rk=d=>{R.kind=d.id;render()};ACT.rd=d=>{R.diff=d.id;render()};

/* ---- Estados (variantes) ---- */
SCR.states=()=>{newCombat();const g=G;g.al.lux.hp=12;g.al.soraka.hp=0;
 const u=(k,x)=>{const old=G.al[k];Object.assign(G.al[k],x);const h=combatHTML().split(`data-a="${k}"`)[0].split('<div class="unit').pop();return h};
 return `<div class="screen">${head('Variantes de estado','Componentes reutilizables en todos sus estados.')}
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
  <div class="it" style="width:260px">${[0,24,25,50,75,100].map(v=>stressM(v)).join('')}StressMeter: 0 / 24 / 25 / 50 / 75 / 100</div></div></div></div>`};

/* ---- Sistema visual ---- */
SCR.system=()=>{const sw=(n,c)=>`<div><div class="swatch" style="background:${c}">${n}</div><div class="small">${c}</div></div>`;
 return `<div class="screen">${head('Sistema visual','Tokens, tipografía, iconos y estados.')}
 <div class="panel"><h3>Color</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">${[['Fondo','#090b10'],['Panel','#161a23'],['Panel+','#1e2430'],['Oro / acento','#d6b25e'],['Vida','#e5594f'],['Bloqueo','#6cabee'],['Estrés','#bb8cf5'],['Herida','#e0698e'],['Magia / marca','#4fd8d2'],['Peligro','#ff8c3a'],['Válido','#7ddc92'],['Ilegal','#ff5f5f'],['Selección','#f5d36e'],['Rara','#5b9cf0'],['Épica','#b46bf0']].map(a=>sw(...a)).join('')}</div>
  <p class="small" style="margin-top:8px">Regla: todo color semántico va acompañado de icono, etiqueta o forma (vida = corazón + n/N; bloqueo = escudo; estrés = ojo + estado; derribo = calavera + rayado + etiqueta).</p></div>
 <div class="grid" style="grid-template-columns:1fr 1fr"><div class="panel"><h3>Tipografía</h3><p class="fd" style="font-size:30px">Cinzel — Títulos y nombres</p><p style="font-size:16px">Inter — texto de reglas, números y cartas (≥12.5px en carta, ≥12px en combate)</p><p class="small">Escala: 12 · 14 · 16 · 20 · 26 · 36. Botón «Texto grande» en combate sube base a 16px.</p></div>
 <div class="panel"><h3>Espaciado, radios y sombras</h3><p class="small">Espaciado base 8px (4/8/12/16/24). Radios: 4 chips · 8 paneles · 10 cartas. Bordes 1px metal / 2px interactivo / 3px foco. Sombra panel 0 6 22 #0008; selección = anillo oro + glow.</p></div></div>
 <div class="panel"><h3>Iconografía (trazo 2px, 24px)</h3><div class="row" style="flex-wrap:wrap;gap:14px">${[['ad','AD'],['ap','AP'],['crit','Crítico'],['armor','Armadura'],['mr','Res. mágica'],['pen','Penetración'],['lifesteal','Robo vida'],['as','Vel. ataque'],['haste','Aceleración'],['energy','Energía'],['block','Bloqueo'],['mark','Marca'],['burn','Quemadura'],['charge','Carga'],['dash','Desplaz.'],['hp','Vida'],['stress','Estrés'],['wound','Herida'],['down','Derribo'],['stun','Aturdido'],['taunt','Provocar']].map(([i,n])=>`<div class="it" style="text-align:center;font-size:11px;color:var(--ink2);width:70px"><span style="font-size:26px">${ic(i)}</span><br>${n}</div>`).join('')}</div></div>
 <div class="panel"><h3>Estados interactivos</h3><div class="row" style="flex-wrap:wrap"><button class="btn">Normal</button><button class="btn" style="border-color:var(--gold)">Hover</button><button class="btn" style="outline:3px solid var(--sel);outline-offset:2px">Foco</button><button class="btn" style="box-shadow:var(--sh-glow)">Seleccionado</button><button class="btn" disabled>Deshabilitado</button><span class="tag ok">${ic('check')} Válido</span><span class="tag bad">${ic('x')} Ilegal</span><span class="tag warn">${ic('warn')} Advertencia</span><span class="tag gold">${ic('check')} Confirmación</span></div></div></div>`};

go(location.hash.slice(1)&&SCR[location.hash.slice(1)]?location.hash.slice(1):'menu');
