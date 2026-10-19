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
  viego: loadingArt('Viego'),
};

export const ENEMY_COLOR: Record<string, string> = {
  wolf: '#4fb8a8', sentinel: '#7f9b78', gromp: '#8aa0c0', scuttler: '#c9709a', herald: '#a98ae0', viego: '#5ef2c8',
};
