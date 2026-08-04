// The three Orders of Emberveil. Base stats, growth, and look parameters
// consumed by stats.js and the character painter.
export const CLASSES = {
  warrior: {
    id: 'warrior', name: 'Warrior', order: 'The Bastion Oath',
    tag: 'Shieldbearer of Lumenhold',
    blurb: 'Sworn to stand where others break. Warriors trade subtlety for steel: '
      + 'towering health, crushing blows, and the only Order trained to carry a shield.',
    base: { str: 8, dex: 4, int_: 3, vit: 7, agi: 4 },
    grow: { str: 1.2, dex: 0.4, int_: 0.1, vit: 1.0, agi: 0.3 }, // auto per level (fractional accumulates)
    hpMult: 1.25, mpMult: 0.7,
    weapon: 'blade', usesShield: true,
    look: { outfit: '#8a2f2a', trim: '#e8c268', hairDefault: '#5a3520' },
  },
  archer: {
    id: 'archer', name: 'Archer', order: 'The Thornwood Wardens',
    tag: 'Warden of the deep woods',
    blurb: 'The Wardens say a second arrow is an apology. Archers strike from range '
      + 'with wicked speed, stacking poisons and critical shots before danger closes in.',
    base: { str: 4, dex: 8, int_: 3, vit: 5, agi: 6 },
    grow: { str: 0.4, dex: 1.2, int_: 0.1, vit: 0.6, agi: 0.7 },
    hpMult: 1.0, mpMult: 0.9,
    weapon: 'bow', usesShield: false,
    look: { outfit: '#2f6b3a', trim: '#cfe8a0', hairDefault: '#c9a35a' },
  },
  mage: {
    id: 'mage', name: 'Mage', order: 'The Azure Arcanum',
    tag: 'Keeper of the ember-flame',
    blurb: 'Arcanum scholars pull fire from the torn edge of the Veil itself. Mages are '
      + 'glass and lightning — frail in the body, apocalyptic at a distance, and the only '
      + 'Order that can mend its own wounds.',
    base: { str: 3, dex: 4, int_: 9, vit: 4, agi: 4 },
    grow: { str: 0.1, dex: 0.3, int_: 1.4, vit: 0.5, agi: 0.3 },
    hpMult: 0.85, mpMult: 1.35,
    weapon: 'staff', usesShield: false,
    look: { outfit: '#2c3f8a', trim: '#8fd8ff', hairDefault: '#7a6bd8' },
  },
};

export const HAIR_COLORS = ['#5a3520', '#c9a35a', '#2b2b33', '#a8352f', '#7a6bd8', '#e8e2d0'];

export const LEVEL_CAP = 40;
export const STAT_POINTS_PER_LEVEL = 3;
export const SKILL_POINTS_PER_LEVEL = 1;

export function expNeed(level) { // exp required to go from `level` to `level+1`
  return Math.round(24 * Math.pow(level, 2.15) + 26 * level);
}

// Platinum granted at level milestones (single-player economy).
export const LEVEL_PLAT = { 5: 10, 10: 15, 15: 15, 20: 20, 25: 20, 30: 25, 35: 25, 40: 40 };
