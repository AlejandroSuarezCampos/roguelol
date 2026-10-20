/** Arte de Riot: solo enlazado (hotlink), nunca incluido en el repo. © Riot Games, uso fan no comercial. */
const DD = 'https://ddragon.leagueoflegends.com/cdn/';
const CDR = 'https://raw.communitydragon.org/latest/game/assets/characters/';

export const splashArt = (ddragon: string) => `${DD}img/champion/splash/${ddragon}_0.jpg`;
export const loadingArt = (ddragon: string) => `${DD}img/champion/loading/${ddragon}_0.jpg`;

export const ENEMY_ART: Record<string, string> = {
  wolf: `${CDR}sru_murkwolf/hud/greatermurkwolf_square.png`,
  sentinel: `${CDR}sru_blue/hud/bluesentinel_square.png`,
  gromp: `${CDR}sru_gromp/hud/gromp_square.png`,
  scuttler: `${CDR}sru_razorbeak/hud/razorbeak_square.png`,
  herald: `${CDR}sru_riftherald/hud/sruriftherald_square.png`,
  drake_fire: `${CDR}sru_dragon_fire/hud/dragon_square_fire.png`,
  drake_water: `${CDR}sru_dragon_water/hud/dragon_square_water.png`,
  drake_earth: `${CDR}sru_dragon_earth/hud/dragon_square_earth.png`,
  drake_air: `${CDR}sru_dragon_air/hud/dragon_air_square.png`,
  elder: `${CDR}sru_dragon_elder/hud/dragon_square_elder.png`,
  baron: `${CDR}sru_baron/hud/baron_square.png`,
  viego: loadingArt('Viego'),
};

export const ENEMY_COLOR: Record<string, string> = {
  wolf: '#4fb8a8', sentinel: '#7f9b78', gromp: '#8aa0c0', scuttler: '#c9709a', herald: '#a98ae0', viego: '#5ef2c8',
  drake_fire: '#ff7a3d', drake_water: '#4fa8e0', drake_earth: '#b08a5a', drake_air: '#cfe8f0', elder: '#c9b8ff', baron: '#a05ad0',
};
