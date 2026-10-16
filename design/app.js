/* Shattered Runeterra — prototipo de interfaz. Datos y números = PLACEHOLDER de diseño, no reglas finales. */
const $=s=>document.querySelector(s);
const ic=(n,c='')=>`<svg class="ic ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const SCR={};let CUR='menu';
const SN=['Sereno','Inquieto','Agobiado','Al límite','Crisis'];
const sLv=v=>v>=100?4:v>=75?3:v>=50?2:v>=25?1:0;
const STAT={ad:['ad','AD'],ap:['ap','AP'],as:['as','Vel. ataque'],crit:['crit','Prob. crítico'],cdmg:['crit','Daño crítico'],pen:['pen','Penetración'],hp:['hp','Vida máx.'],arm:['armor','Armadura'],mr:['mr','Res. mágica'],ls:['lifesteal','Robo de vida'],haste:['haste','Aceleración']};
const STU={as:'%',crit:'%',cdmg:'%',ls:'%',haste:''};
const COL={leona:['#f0b64e','#6b3a12'],yasuo:['#6fd0c4','#16414a'],lux:['#f4e58a','#4a3a9c'],soraka:['#c9a3ff','#2c2a6e']};
const STATUS={mark:['mark','Marca','mark','Marcado: Chispa final lo consume para +daño'],burn:['burn','Quemadura','burn','Recibe daño al final del turno'],charge:['charge','Carga','charge','Recurso de Yasuo para combos'],stun:['stun','Aturdido','stun','No actúa su próximo turno'],taunt:['taunt','Provoca','charge','Atrae los ataques enemigos']};

/* ---------- datos ---------- */
const GEAR={
 filo:{n:'Filo infinito',img:3031,slot:'Arma',st:{ad:70,crit:20,cdmg:40},pas:'Los críticos infligen daño adicional.'},
 guin:{n:'Hoja de furia de Guinsoo',img:3124,slot:'Arma',st:{ad:35,as:30},pas:'Al golpear: +2 daño por golpe en el turno.'},
 rab:{n:'Sombrero mortal de Rabadon',img:3089,slot:'Arma',st:{ap:90},pas:'Aumenta tu AP total un 25%.'},
 warm:{n:'Armadura de Warmog',img:3083,slot:'Armadura',st:{hp:250,arm:20},pas:'El bloqueo ganado escala con vida máx.'},
 cota:{n:'Malla de espinas',img:3075,slot:'Armadura',st:{arm:45,hp:60},pas:'Devuelve 2 de daño al ser golpeado.'},
 sol:{n:'Hidra titánica',img:3748,slot:'Arma',st:{ad:30,hp:80},pas:'Los ataques aplican +1 bloqueo.'},
 manto:{n:'Velo del hada de la muerte',img:3102,slot:'Armadura',st:{mr:35,haste:10},pas:'Bloquea el primer efecto negativo del combate.'},
 baston:{n:'Redención',img:3107,slot:'Arma',st:{ap:45,haste:15},pas:'La curación aumenta un 10%.'},
 tun:{n:'Medallón de los Solari de Hierro',img:3190,slot:'Armadura',st:{hp:120,mr:30},pas:'Al inicio del combate, 4 de bloqueo a los aliados.'}
};
const CH={
 leona:{n:'Leona',role:'Tanque / Control',tr:['Protección','Provocación','Aturdimientos'],stats:{hp:80,arm:40,mr:30,ad:20,haste:10},scale:'Bloqueo escala con Armadura y Vida máx.',gear:['sol','warm'],hp:62,stress:18,wounds:[['Costilla fracturada','−10 Vida máx. hasta tratarla']]},
 yasuo:{n:'Yasuo',role:'Daño / Combos',tr:['Cargas','Crítico','Desplazamiento'],stats:{hp:60,ad:70,crit:25,cdmg:175,as:100,arm:20},scale:'Ataques escalan con AD; Tempestad usa Crítico.',gear:['filo','cota'],hp:54,stress:52,wounds:[]},
 lux:{n:'Lux',role:'Daño mágico / Control',tr:['Marcas','Área','Control'],stats:{hp:50,ap:80,mr:25,haste:20,pen:10},scale:'Habilidades escalan con AP; Chispa final consume Marcas.',gear:['rab','manto'],hp:12,stress:81,wounds:[['Quemadura arcana','−1 energía si estrés ≥ 75']]},
 soraka:{n:'Soraka',role:'Curación / Apoyo',tr:['Curación','Estrés','Apoyo'],stats:{hp:55,ap:40,mr:30,haste:15,ls:0},scale:'Curación escala con AP; Calma reduce estrés.',gear:['baston','tun'],hp:33,stress:30,wounds:[]}
};
const ORD=['leona','yasuo','lux','soraka'];
const mk=(id,o,n,c,t,r,tx,rar,fx={},tg='none',x={})=>({id,o,n,c,t,r,tx,rar,fx,tg,...x});
const CARDS=[
 mk('l1','leona','Escudo del amanecer',1,'Ataque','Cuerpo a cuerpo','Inflige 6. Aplica Aturdido.','',{dmg:6,stun:1},'enemy',{sp:'LeonaShieldOfDaybreak',k:'Q'}),
 mk('l2','leona','Escudo del Sol',1,'Defensa','Aliado','Otorga 8 de bloqueo.','',{block:8},'ally'),
 mk('l3','leona','Eclipse',2,'Habilidad','Propio','Gana 12 de bloqueo. Provoca.','rare',{block:12,taunt:1,self:1},'none',{sp:'LeonaSolarBarrier',k:'W'}),
 mk('l4','leona','Hoja del cénit',2,'Ataque','Cuerpo a cuerpo','Inflige 9 y avanza a la posición 1.','rare',{},'none',{sp:'LeonaZenithBlade',k:'E'}),
 mk('l5','leona','Aura Solar',1,'Apoyo','Todos los aliados','Otorga 4 de bloqueo a todos.',''),
 mk('l6','leona','Baluarte',1,'Defensa','Propio','Gana 7 de bloqueo.',''),
 mk('l7','leona','Embate Radiante',2,'Ataque','Cuerpo a cuerpo','Inflige 12 al frente.',''),
 mk('l8','leona','Llamarada solar',3,'Habilidad','Todos los enemigos','Inflige 10 y aturde a todos.','epic',{},'none',{sp:'LeonaSolarFlare',k:'R'}),
 mk('y1','yasuo','Tempestad de acero',1,'Ataque','Cuerpo a cuerpo','Inflige 9. Gana 1 Carga.','',{dmg:9,charge:1,atk:1},'enemy',{up:1,sp:'YasuoQ1Wrapper',k:'Q'}),
 mk('y2','yasuo','Vendaval',2,'Ataque','Distancia','Crítico: inflige 14.','rare',{dmg:14,crit:1,atk:1},'enemy'),
 mk('y3','yasuo','Muro de viento',1,'Defensa','Propio','Gana 7 de bloqueo.','',{block:7,self:1},'none',{sp:'YasuoW',k:'W'}),
 mk('y4','yasuo','Hoja cortante',0,'Habilidad','Cuerpo a cuerpo','Inflige 4. Desplaza al objetivo.','',{},'none',{sp:'YasuoE',k:'E'}),
 mk('y5','yasuo','Filo del Viento',1,'Ataque','Cuerpo a cuerpo','Inflige 5 ×2.',''),
 mk('y6','yasuo','Ráfaga Cortante',1,'Ataque','Distancia','Inflige 4 y gana Carga.',''),
 mk('y7','yasuo','Último aliento',2,'Ataque','Cuerpo a cuerpo','Inflige 8 por Carga.','rare',{},'none',{sp:'YasuoR',k:'R'}),
 mk('y8','yasuo','Camino del Errante',2,'Habilidad','Propio','Convierte Cargas en bloqueo.',''),
 mk('x1','lux','Enlace de luz',1,'Habilidad','Distancia','Inflige 5. Aplica 1 Marca.','',{dmg:5,mark:1},'enemy',{sp:'LuxLightBinding',k:'Q'}),
 mk('x2','lux','Chispa final',2,'Habilidad','Todos los enemigos','Inflige 8 a todos. +4 por Marca consumida.','epic',{dmg:8,aoe:1,consume:4},'none',{sp:'LuxR',k:'R'}),
 mk('x3','lux','Barrera prismática',1,'Defensa','Aliado','Otorga 6 de bloqueo.','',{block:6},'ally',{sp:'LuxPrismaticWave',k:'W'}),
 mk('x4','lux','Singularidad brillante',1,'Habilidad','Distancia','Inflige 4 en área.','',{},'none',{sp:'LuxLightStrikeKugel',k:'E'}),
 mk('x5','lux','Rayo Prismático',1,'Ataque','Distancia','Inflige 7.',''),
 mk('x6','lux','Destello',0,'Habilidad','Propio','Roba 1 carta.','rare'),
 mk('x7','lux','Fulgor Final',3,'Habilidad','Todos los enemigos','Inflige 16 a marcados.','epic'),
 mk('x8','lux','Luz Contenida',1,'Apoyo','Aliado','Cura 5 y 3 de bloqueo.',''),
 mk('s1','soraka','Toque celestial',1,'Apoyo','Aliado','Cura 10.','rare',{heal:10},'ally'),
 mk('s2','soraka','Calma Serena',1,'Apoyo','Aliado','Reduce 12 de estrés.','',{calm:12},'ally'),
 mk('s3','soraka','Plegaria',2,'Apoyo','Todos los aliados','Cura 6 a todos.','',{heal:6,all:1},'none',{sp:'SorakaR',k:'R'}),
 mk('s4','soraka','Invocación estelar',1,'Ataque','Distancia','Inflige 5.','',{},'none',{sp:'SorakaQ',k:'Q'}),
 mk('s5','soraka','Equinoccio',2,'Control','Todos los enemigos','Aplica 1 turno de silencio.','rare',{},'none',{sp:'SorakaE',k:'E'}),
 mk('s6','soraka','Inyección astral',1,'Apoyo','Aliado','Cura 6 y 4 de bloqueo.','',{},'none',{sp:'SorakaW',k:'W'}),
 mk('s7','soraka','Sacrificio',0,'Apoyo','Propio','Pierde 4 vida. Roba 2.',''),
 mk('s8','soraka','Renacer',3,'Apoyo','Aliado derribado','Reanima a 20 de vida.','epic')
];
const CD=Object.fromEntries(CARDS.map(c=>[c.id,c]));
const POOL=CARDS.filter(c=>c.fx.dmg||c.fx.block||c.fx.heal||c.fx.calm).map(c=>c.id);
const RELICS=[
 {n:'Corazón incandescente',tx:'Al ganar un combate, recuperas 6 de vida.',k:'heart'},
 {n:'Emblema del asalto',tx:'Jugar 3 ataques en un turno: el 3.º inflige +4.',k:'emb'},
 {n:'Fragmento del Vacío',tx:'Consumir Marcas/Cargas: efecto extra, a cambio de +4 estrés.',k:'void'},
 {n:'Estandarte de la compañía',tx:'Cartas de 3 campeones distintos en un turno: el último gana 6 de bloqueo.',k:'ban'}
];

/* ---------- piezas visuales ---------- */
function portrait(key,{enemy,w}={}){
 const sz=w?`style="width:${w}px;height:${w}px"`:'';
 if(enemy){const k=key.slice(0,2),src=EIMG[k]||EIMG.bo;return `<div class="port ${k=='bo'||!EIMG[k]?'':'mon'}" ${sz}>${(ART[k]||ART.boss)()}<img src="${src}" alt="" onerror="this.remove()"></div>`}
 // arte base (skin 0) de Data Dragon; si falla la carga queda el monograma con el color del campeón
 const [a,b]=COL[key];
 return `<div class="port" ${sz} style="background:linear-gradient(135deg,${b},#05060a)"><span class="mono" style="color:${a}">${CH[key].n[0]}</span><img src="${loading(CH[key].n)}" alt="${CH[key].n}" onerror="this.remove()"></div>`;
}
function stressM(v){const l=sLv(v);return `<div class="stress s${l}"><div class="bar"><i style="width:${Math.min(v,100)}%"></i><b style="left:25%"></b><b style="left:50%"></b><b style="left:75%"></b></div><div class="lbl">${ic('stress')} <b>${v}</b> · ${SN[l]}${l==4?' ⚠':''}</div></div>`}
const hpBar=(h,m)=>`<div class="hpbar"><i style="width:${Math.max(0,h/m*100)}%"></i><span>${ic('hp')} ${Math.max(0,h)}/${m}</span></div>`;
const chip=(k,n)=>{const s=STATUS[k];return `<span class="chip ${s[2]}" title="${s[1]}: ${s[3]}">${ic(s[0])}${s[1]}${n>1?' '+n:n==1&&k!='stun'&&k!='taunt'?' 1':''}</span>`};
const woundBadge=n=>n?`<span class="chip wound" title="Heridas persistentes">${ic('wound')} Herida${n>1?'s '+n:''}</span>`:'';
const rarL={'':'Común',rare:'Rara',epic:'Épica'};
function card(c,o={}){
 const cc=COL[c.o][0],nm=CH[c.o].n;
 return `<button class="card t-${c.t} ${c.rar} ${c.up?'up':''} ${o.sel?'sel':''} ${o.dis?'dis':''} ${o.mini?'mini':''}" data-act="${o.act||'card'}" data-id="${c.id}" ${o.h!=null?`data-h="${o.h}"`:''} ${o.dis?`data-why="${o.dis}" aria-disabled="true"`:''} aria-pressed="${!!o.sel}" aria-label="${c.n}, coste ${c.c}, ${c.t}, ${c.r}, de ${nm}, ${rarL[c.rar]}. ${c.tx}">
 <div class="art" style="background-image:url(${splash(nm)})"></div>
 ${c.sp?`<span class="spell" title="Habilidad ${c.k} original"><img src="${spellImg(c.sp)}" alt="" onerror="this.remove()"><b>${c.k}</b></span>`:''}
 <div class="ban"><span>${c.n}${c.up?'+':''}</span></div>${c.up?'<span class="upb">+ Mejorada</span>':''}
 <span class="cost"><b>${c.c}</b></span>
 <span class="type">${c.t}</span>
 <div class="tx"><small>${ic(c.tg=='enemy'?'crit':c.tg=='ally'?'heal':'mark')}${c.r}</small>${c.tx}</div>
 <div class="ft"><span class="own"><i style="background-image:url(${loading(nm)});border-color:${cc}"></i>${nm}</span><span class="rar">${ic('relic')}${rarL[c.rar]}</span></div></button>`;
}
const itemIcon=(id,fb)=>`<div class="gi">${ic(fb)}<img src="${itemImg(id)}" alt="" onerror="this.remove()"></div>`;
function gearSlot(g,{upg}={}){return `<div class="gslot ${upg?'upg':''}">${itemIcon(g.img,g.slot=='Arma'?'ad':'armor')}<div class="grow"><b>${g.n}</b> <span class="tag">${g.slot}</span>${upg?'<span class="tag ok">'+ic('up')+' Mejorable</span>':''}<p>${statStr(g.st)}</p><p>${g.pas}</p></div></div>`}
const statStr=s=>Object.entries(s).map(([k,v])=>`${ic(STAT[k][0])}+${v}${STU[k]??''} ${STAT[k][1]}`).join(' · ');
const relicSlot=(r,act)=>`<div class="gslot ${act?'active':''}" data-relic="${r.k}"><div class="gi rel">${RART[r.k]}</div><div class="grow"><b>${r.n}</b>${act?' <span class="tag gold">Activada</span>':''}<p>${r.tx}</p></div></div>`;
function modal(html){const m=$('#modal');m.innerHTML=`<div class="box panel gold">${html}</div>`;m.classList.add('on');m.onclick=e=>{if(e.target===m)closeM()}}
const closeM=()=>$('#modal').classList.remove('on');
function toast(t){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2200)}
function confirmM({title,body,irr,ok='Confirmar',cb}){
 window._cb=()=>{closeM();cb&&cb()};
 modal(`<h2 class="fd" style="margin-bottom:10px">${title}</h2><div class="col">${body}${irr?`<div class="warnbox red">${ic('warn')}<div><b>Irreversible.</b> ${irr}</div></div>`:''}</div><div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn" data-act="closeM">Cancelar</button><button class="btn ${irr?'dng':'pri'}" data-act="cbok">${ok}</button></div>`);
}
function go(n){CUR=n;location.hash=n;render()}
function render(){const f=SCR[CUR];if(!f)return;$('#app').innerHTML=f();$('#app').scrollTop=0;
 document.querySelectorAll('#proto button').forEach(b=>b.classList.toggle('on',b.dataset.go==CUR));if(window.after)after()}
const head=(t,s,back='menu')=>`<div class="ttl"><div><h1 class="fd">${t}</h1><div class="sub">${s||''}</div></div><button class="btn" data-go="${back}">← Volver</button></div>`;

/* ---------- COMBATE ---------- */
let G,SELC='leona';
const ENEMIES=[
 {id:'e1',n:'Gran lobo sombrío',pos:1,max:28,hp:28,st:{mark:1},r:'melee',script:[{k:'atk',v:8,t:'leona'},{k:'atk',v:10,t:'yasuo'}]},
 {id:'e2',n:'Centinela azul',pos:2,max:40,hp:40,st:{},r:'melee',script:[{k:'def',v:10},{k:'atk',v:7,t:'leona'}]},
 {id:'e3',n:'Gromp',pos:3,max:22,hp:22,st:{},r:'ranged',script:[{k:'atk',v:14,t:'lux'},{k:'atk',v:9,t:'soraka'}]},
 {id:'e4',n:'Picoaguzado',pos:4,max:30,hp:30,st:{},r:'ranged',script:[{k:'burn',v:3,t:'yasuo'},{k:'atk',v:6,t:'lux'}]}
];
function newCombat(){
 G={turn:1,en:3,sel:null,hand:['l1','y1','x1','s1','x2'],pile:[...POOL].sort(()=>.5-Math.random()),played:[],atk:0,owners:[],msg:null,over:null,
  al:Object.fromEntries(ORD.map(k=>[k,{hp:CH[k].hp,max:CH[k].stats.hp,block:0,stress:CH[k].stress,st:k=='yasuo'?{charge:2}:{},w:CH[k].wounds.length}])),
  en_:JSON.parse(JSON.stringify(ENEMIES)).map(e=>({...e,i:0,block:0,intent:null})),act:null};
 G.en_.forEach(e=>e.intent={...e.script[0]});
}
const alive=()=>ORD.filter(k=>G.al[k].hp>0);
function legal(c,tgt){ // devuelve null si legal, o texto con la razón
 if(c.tg=='enemy'){ if(tgt.hp<=0)return 'Ya derribado'; if(c.r=='Cuerpo a cuerpo'&&tgt.pos>2)return 'Fuera de alcance: cuerpo a cuerpo solo alcanza posiciones 1–2'; return null}
 if(c.tg=='ally'){const a=G.al[tgt];if(a.hp<=0&&(c.fx.heal||c.fx.calm))return 'Derribado: no recibe curación normal'; if(a.hp<=0)return 'Derribado: no puede ser objetivo';
   if(c.fx.heal&&a.hp>=a.max)return 'Vida al máximo'; return null}
 return null;
}
function whyDis(c){const o=G.al[c.o];if(o.hp<=0)return CH[c.o].n+' derribad'+(c.o=='soraka'?'a':'o');if(G.en<c.c)return 'Energía insuficiente';return null}
function combatHTML(){
 const sel=G.sel?CD[G.sel]:null;
 const intentFor=e=>{const i=e.intent;const tg=i.t?CH[i.t].n:'';let lethal=false;
  if(i.k=='atk'){const a=G.al[i.t];lethal=a.hp>0&&i.v>a.hp+a.block}
  const danger=lethal||i.v>=12;
  const map={atk:['ad','→ '+tg,'atk','Ataque'],def:['block','a sí mismo','def','Bloqueo'],burn:['burn','→ '+tg,'deb','Quemadura']}[i.k];
  return `<div class="intent ${map[2]} ${danger?'danger':''}" role="note" aria-label="Intención: ${map[3]} ${i.v} ${map[1]}${lethal?', letal':''}">
   <span class="ii">${ic(map[0])}<b>${i.v}</b></span><span class="it">${map[3]} ${map[1]}</span>${lethal?'<em>¡LETAL!</em>':danger?'<em class="dg">Peligro</em>':''}</div>`};
 const sts=o=>Object.entries(o).filter(([,n])=>n).map(([s,n])=>{const S=STATUS[s];return `<span class="st ${S[2]}" title="${S[1]}: ${S[3]}">${ic(S[0])}<b>${s=='stun'||s=='taunt'?'':n}</b><i>${S[1]}</i></span>`}).join('');
 const bars=(h,m,b)=>`<div class="hpl"><span class="shd ${b?'on':''}" title="Bloqueo">${ic('block')}<b>${b}</b></span><div class="hpbar"><i style="width:${Math.max(0,h/m*100)}%"></i><span>${Math.max(0,h)}/${m}</span></div></div>`;
 const unitA=k=>{const a=G.al[k],d=a.hp<=0;let cls='',tg='';
  if(sel&&sel.tg=='ally'){const r=legal(sel,k);cls=r?'illegal':'legal';tg=r?ic('x')+' '+r:ic('check')+' Objetivo válido'}
  return `<div class="ftr ally ${d?'down':''} ${a.hp>0&&a.hp/a.max<.3?'hurt':''} ${SELC==k&&!sel?'csel':''} ${cls}" data-act="ally" data-id="${k}" data-a="${k}" role="button" tabindex="0" aria-label="${CH[k].n}, posición ${ORD.indexOf(k)+1}, vida ${a.hp} de ${a.max}, bloqueo ${a.block}, estrés ${a.stress} ${SN[sLv(a.stress)]}${d?', derribado':''}">
  <div class="tg">${tg}</div><div class="spr"><img src="${loading(CH[k].n)}" alt="" onerror="this.remove()"></div><div class="gnd"></div>
  ${d?`<span class="downlbl">${ic('down')} DERRIBADO</span>`:''}
  <div class="bars"><div class="nml"><span class="pn">${ORD.indexOf(k)+1}</span>${CH[k].n}${a.w?`<span class="wd" title="Heridas">${ic('wound')}${a.w}</span>`:''}</div>${bars(a.hp,a.max,a.block)}${stressM(a.stress)}<div class="sts">${sts(a.st)}</div></div></div>`};
 const unitE=e=>{const d=e.hp<=0;let cls='',tg='';
  if(sel&&sel.tg=='enemy'){const r=legal(sel,e);cls=r?'illegal':'legal';tg=r?ic('x')+' '+(r.startsWith('Fuera')?'Fuera de alcance':r):ic('check')+' Objetivo válido'}
  return `<div class="ftr foe ${d?'down':''} ${cls}" data-act="enemy" data-id="${e.id}" data-e="${e.id}" role="button" tabindex="0" aria-label="${e.n}, posición ${e.pos}, vida ${e.hp} de ${e.max}">
  ${d?'':intentFor(e)}<div class="tg">${tg}</div><div class="spr mon"><img src="${EIMG[e.id]}" alt="" onerror="this.remove()"></div><div class="gnd"></div>
  ${d?`<span class="downlbl">${ic('down')} VENCIDO</span>`:''}
  <div class="bars"><div class="nml"><span class="pn">${e.pos}</span>${e.n}</div>${bars(e.hp,e.max,e.block)}<div class="rng">${e.r=='melee'?'Cuerpo a cuerpo':'Distancia'}</div><div class="sts">${sts(e.st)}</div></div></div>`};
 const ch=CH[SELC];
 const hint=G.msg?`<div class="hint ${G.msg[1]}" role="status">${G.msg[0]}</div>`:sel?`<div class="hint ok" role="status">${ic('mark')} <b>${sel.n}</b>: ${sel.tg=='none'?'pulsa «Jugar carta» o elige otra':'elige un objetivo ('+sel.r+')'} · Esc cancela</div>`:`<div class="hint">Elige una carta de la mano compartida</div>`;
 const n=G.hand.length,ro=G.ro&&RELICS.find(x=>x.k==G.ro);
 return `<div class="cb">${BG_BATTLE}
 <header class="hud"><div class="crest">${ic('map')}</div><div class="where"><b class="fd">Islas de la Sombra</b><small>Piso 3 · Combate normal</small></div>
  <div class="turnb fd">Turno <b>${G.turn}</b></div>
  <div class="hudr"><span class="goldc">${ic('gold')} 214</span>
  <button class="ib" data-act="a11y" data-k="big" title="Texto grande" aria-label="Texto grande">${ic('text')}</button><button class="ib" data-act="a11y" data-k="hc" title="Alto contraste" aria-label="Alto contraste">${ic('contrast')}</button><button class="ib" data-act="a11y" data-k="calm" title="Reducir movimiento" aria-label="Reducir movimiento">${ic('motion')}</button>
  <button class="btn" data-act="help">${ic('help')} Ayuda</button><button class="btn dng" data-act="retreat">${ic('flag')} Retirada</button></div></header>
 <div class="relbar" aria-label="Reliquias de expedición">${RELICS.map(r=>`<button class="rel ${G.act==r.k?'active':''} ${G.ro==r.k?'open':''}" data-act="relic" data-id="${r.k}" data-relic="${r.k}" aria-label="${r.n}: ${r.tx}" title="${r.n}">${RART[r.k]}</button>`).join('')}<span class="rel empty"></span><span class="rel empty"></span><span class="rc">${RELICS.length}/6</span>
  ${ro?`<div class="relpop"><b class="fd">${ro.n}</b><p>${ro.tx}</p><small>Reliquia de expedición · afecta a todo el equipo</small></div>`:''}</div>
 <div class="gearbar" aria-label="Gear de ${ch.n}"><img class="gface" src="${loading(ch.n)}" alt=""><div class="gwho"><b>${ch.n}</b><small>${ch.wounds.length?ic('wound')+' '+ch.wounds[0][0]+': '+ch.wounds[0][1]:ch.scale}</small></div>
  ${ch.gear.map(g=>{const X=GEAR[g];return `<span class="gitem ${SELC=='yasuo'&&g=='cota'?'upg':''}" title="${X.n}: ${X.pas}">${itemIcon(X.img,'ad')}<span><b>${X.n}</b><small>${statStr(X.st)}</small></span></span>`}).join('')}
  <button class="ib" data-go="team" title="Ver ficha completa" aria-label="Ver ficha completa">${ic('book')}</button></div>
 <section class="stage" aria-label="Campo de batalla"><div class="team allies" aria-label="Aliados, frente a la derecha">${[...ORD].reverse().map(unitA).join('')}</div><div class="vs"></div><div class="team foes" aria-label="Enemigos, frente a la izquierda">${G.en_.map(unitE).join('')}</div></section>
 <div class="cbb">${hint}
  <div class="pile draw" title="Mazo de robo">${ic('card')}<b>${G.pile.length}</b><small>Mazo</small></div>
  <div class="orb" aria-label="Energía ${G.en} de 3"><b>${G.en}/3</b><small>Energía</small></div>
  <div class="hand" role="group" aria-label="Mano compartida">${G.hand.map((id,i)=>{const c=CD[id];const d=whyDis(c);const o=i-(n-1)/2;return `<div class="slot" style="--r:${o*4}deg;--y:${Math.abs(o)*Math.abs(o)*5}px">${card(c,{sel:G.si===i,dis:d,h:i})}</div>`}).join('')}</div>
  <div class="endw">${sel&&sel.tg=='none'?`<button class="btn pri" data-act="playnow">Jugar carta</button>`:''}<button class="endt fd" data-act="end">Terminar turno</button><small>Se resuelven las intenciones enemigas</small></div>
  <div class="pile disc" title="Descarte">${ic('swap')}<b>${G.played.length}</b><small>Descarte</small></div></div>
 ${G.over?`<div class="over"><div class="panel gold col" style="max-width:480px;text-align:center"><h1 class="fd" style="font-size:34px">${G.over=='win'?'Victoria':'Derrota'}</h1>${G.over=='win'?`<p>${ic('relic')} <b>Corazón incandescente</b> activada: +6 de vida a cada superviviente.</p>`:'<p>Todos los campeones han sido derribados.</p>'}<button class="btn pri" data-go="${G.over=='win'?'reward':'result'}">${G.over=='win'?'Ver recompensas':'Ver resultado'}</button></div></div>`:''}</div>`;
}
SCR.combat=()=>{if(!G)newCombat();return combatHTML()};
function fl(sel,t,cls){const el=document.querySelector(sel);if(!el)return;const s=document.createElement('span');s.className='float '+cls;s.innerHTML=t;el.appendChild(s);setTimeout(()=>s.remove(),1100)}
function msg(t,k){G.msg=[t,k||''];}
function relicFx(k,sel,t){G.act=k;setTimeout(()=>{fl(sel,ic('relic')+' '+t,'relic');},50);}
function playCard(c,tgt){
 const f=c.fx,fls=[];let dmg=f.dmg||0;G.act=null;
 G.owners.includes(c.o)||G.owners.push(c.o);if(f.atk)G.atk++;
 if(f.atk&&G.atk==3){dmg+=4;fls.push(['emb',`[data-e="${tgt?.id}"]`,'Emblema del asalto +4'])}
 if(f.dmg){
  const targets=f.aoe?G.en_.filter(e=>e.hp>0):[tgt];
  targets.forEach(e=>{let d=dmg;if(f.consume&&e.st.mark){d+=f.consume*e.st.mark;fls.push(['void',`[data-e="${e.id}"]`,'Marcas consumidas'])}
   const ab=Math.min(e.block,d);e.block-=ab;e.hp=Math.max(0,e.hp-(d-ab));if(f.consume)delete e.st.mark;if(f.mark)e.st.mark=(e.st.mark||0)+f.mark;if(f.stun)e.st.stun=1;
   fls.push([null,`[data-e="${e.id}"]`,'−'+d,f.crit?'crit':'dmg'],f.mark?[null,`[data-e="${e.id}"]`,ic('mark')+' Marca','mk']:0);});
  if(f.charge){G.al[c.o].st.charge=(G.al[c.o].st.charge||0)+f.charge;fls.push([null,`[data-a="${c.o}"]`,ic('charge')+' +1 Carga','mk'])}
 }
 if(f.block){const t=f.self?c.o:tgt;G.al[t].block+=f.block;fls.push([null,`[data-a="${t}"]`,'+'+f.block+' '+ic('block'),'blk']);if(f.taunt)G.al[t].st.taunt=1}
 if(f.heal){(f.all?alive():[tgt]).forEach(t=>{const a=G.al[t];a.hp=Math.min(a.max,a.hp+f.heal);fls.push([null,`[data-a="${t}"]`,'+'+f.heal,'heal'])})}
 if(f.calm){G.al[tgt].stress=Math.max(0,G.al[tgt].stress-f.calm);fls.push([null,`[data-a="${tgt}"]`,'−'+f.calm+' estrés','heal'])}
 G.en-=c.c;G.hand.splice(G.si,1);G.played.push(c.id);G.sel=G.si=null; // por posición: dos copias iguales son cartas distintas
 let rel=null;
 if(f.atk&&G.atk==3)rel='emb';
 if(G.owners.length==3&&!G.bannerDone){G.bannerDone=1;G.al[c.o].block+=6;rel='ban';fls.push([null,`[data-a="${c.o}"]`,'+6 '+ic('block')+' Estandarte','blk'])}
 msg(`${c.n} jugada (${CH[c.o].n}).`,'ok');
 if(G.en_.every(e=>e.hp<=0))G.over='win';
 render();if(rel)G.act=rel,render();
 fls.filter(Boolean).forEach(([k,s,t,cls],i)=>setTimeout(()=>{fl(s,t,cls||'relic');if(k)document.querySelector(`[data-relic="${k=='emb'?'emb':'void'}"]`)?.classList.add('active')},i*120));
 if(rel)setTimeout(()=>document.querySelector(`[data-relic="${rel}"]`)?.classList.add('active'),30);
}
function endTurn(){
 G.sel=G.si=null;let delay=0;const log=[];
 G.en_.filter(e=>e.hp>0).forEach(e=>{const i=e.intent;
  if(e.st.stun){e.st.stun=0;log.push(e.n+' aturdido: pierde su turno');return}
  if(i.k=='def'){e.block+=i.v;return}
  let t=i.t;if(G.al[t].hp<=0)t=alive()[0];if(!t)return;const a=G.al[t];
  if(i.k=='atk'){const ab=Math.min(a.block,i.v);a.block-=ab;a.hp=Math.max(0,a.hp-(i.v-ab));const tt=t,v=i.v-ab;setTimeout(()=>{fl(`[data-a="${tt}"]`,'−'+v,'dmg');document.querySelector(`[data-a="${tt}"]`)?.classList.add('hitf')},delay+=250);log.push(`${e.n} hiere a ${CH[t].n} (${v})`)}
  if(i.k=='burn'){a.st.burn=(a.st.burn||0)+1;a.hp=Math.max(0,a.hp-i.v);}
 });
 G.en_.forEach(e=>{if(e.st.burn){e.hp=Math.max(0,e.hp-e.st.burn*3)}});
 if(alive().length==0)G.over='lose';
 else if(G.en_.every(e=>e.hp<=0))G.over='win';
 G.turn++;G.en=3;G.atk=0;G.owners=[];G.bannerDone=0;G.act=null;
 ORD.forEach(k=>G.al[k].block=0); // el bloqueo se reinicia al comienzo del turno aliado
 G.en_.forEach(e=>{if(e.hp>0){e.i=(e.i+1)%e.script.length;e.intent={...e.script[e.i]};if(e.intent.t&&G.al[e.intent.t].hp<=0)e.intent.t=alive()[0]}});
 while(G.hand.length<5){if(!G.pile.length){G.pile=[...G.played].sort(()=>.5-Math.random());G.played=[]}G.hand.push(G.pile.shift())}
 msg('Turno enemigo resuelto. Bloqueo reiniciado. '+(log[0]||''),'');render();
}
const ACT={
 card:d=>{const c=CD[d.id];const w=whyDis(c);if(w){msg(w+': no se puede jugar','err');return render()}
  const h=+d.h;if(G.si===h)G.sel=G.si=null;else{G.si=h;G.sel=d.id;SELC=c.o}G.msg=null;render()},
 enemy:d=>{if(!G.sel)return;const c=CD[G.sel];if(c.tg!='enemy')return;const e=G.en_.find(x=>x.id==d.id);const r=legal(c,e);
  if(r){msg(r,'err');render();document.querySelector(`[data-e="${d.id}"]`)?.classList.add('shake');return}playCard(c,e)},
 ally:d=>{if(G.sel){const c=CD[G.sel];if(c.tg!='ally')return;const r=legal(c,d.id);if(r){msg(r,'err');render();document.querySelector(`[data-a="${d.id}"]`)?.classList.add('shake');return}playCard(c,d.id)}else{SELC=d.id;render()}},
 playnow:()=>{const c=CD[G.sel];playCard(c,null)},
 end:()=>endTurn(),
 a11y:d=>{document.body.classList.toggle(d.k);toast('Ajuste de accesibilidad: '+({big:'texto grande',hc:'alto contraste',calm:'movimiento reducido'})[d.k])},
 help:()=>modal(`<h2 class="fd">Ayuda de combate</h2><ol style="padding-left:20px;line-height:1.7"><li>Comparte <b>3 de energía</b> y una <b>mano de 5 cartas</b> entre los cuatro campeones.</li><li>Pulsa una carta y luego un objetivo. Verde = válido, borde rojo discontinuo = ilegal (se explica el motivo).</li><li>La <b>intención</b> sobre cada enemigo es lo que hará al terminar tu turno. <span class="tag warn">${ic('warn')} Naranja</span> = peligroso, <span class="tag bad">¡LETAL!</span> = derribaría a su objetivo.</li><li>El bloqueo se reinicia al comienzo de tu siguiente turno.</li><li>Un campeón a 0 vida queda <b>derribado</b>: no actúa y no recibe curación normal.</li></ol><div class="row" style="justify-content:flex-end"><button class="btn pri" data-act="closeM">Entendido</button></div>`),
 retreat:()=>confirmM({title:'¿Retirarse de la expedición?',body:'<p>Conservas el botín ya obtenido, pero pierdes las recompensas pendientes de este combate.</p><p class="small">En Pesadilla, los campeones derribados morirían.</p>',irr:'No puedes volver a este combate.',ok:'Retirarse',cb:()=>{R.kind='ret';go('result')}}),
 relic:d=>{G.ro=G.ro==d.id?null:d.id;render()},
 closeM:()=>closeM(),cbok:()=>window._cb&&window._cb()
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-act],[data-go]');if(!t)return;
 if(t.dataset.go){if(t.dataset.go=='combat'&&CUR!='combat')newCombat();return go(t.dataset.go)}
 (ACT[t.dataset.act]||(()=>{}))(t.dataset,t)});
document.addEventListener('keydown',e=>{
 if(e.key=='Escape'){closeM();if(G&&G.sel){G.sel=G.si=null;G.msg=null;if(CUR=='combat')render()}}
 if((e.key=='Enter'||e.key==' ')&&e.target.matches('[role=button]')){e.preventDefault();e.target.click()}
 if(CUR=='combat'&&G&&/^[1-5]$/.test(e.key)&&G.hand[e.key-1])ACT.card({id:G.hand[e.key-1],h:e.key-1});
});
window.after=()=>{};
