// EMBERVEIL — pets.js
// Pure data. Schema: docs/CONTRACTS.md → Pet.
// Followers hatched from Platinum-shop eggs; they auto-loot and grant a tiny aura.

export const PETS = [

  { id: 'emberfox', egg: 'egg_emberfox', name: 'Emberfox', kind: 'fox',
    aura: { stat: 'atk', amount: 3 },
    tint: '#ff7a3c',
    desc: 'A sliver of the Sundering that decided it would rather be a fox. It trots at your heel with its tail smouldering gently, and swears the singed hem of your cloak was like that when it got here.', },

  { id: 'frostowl', egg: 'egg_frostowl', name: 'Frostowl', kind: 'owl',
    aura: { stat: 'mp', amount: 20 },
    tint: '#a8d8f5',
    desc: 'Hatched from an egg found frozen in Frostfell Pass, patient as winter itself. It perches on your shoulder radiating a cool, thoughtful calm — and judges your spellcasting with enormous, forgiving eyes.', },

  { id: 'stonepup', egg: 'egg_stonepup', name: 'Stonepup', kind: 'pup',
    aura: { stat: 'def', amount: 4 },
    tint: '#b8a690',
    desc: 'A golem-heart that dreamed of being a dog until the dream stuck. Its pebble-hide clicks when it wags, it buries treasure it later loyally returns, and standing near it feels like standing behind a very small wall.', },

];
