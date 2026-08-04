// EMBERVEIL — npcs.js
// Pure data. Schema: docs/CONTRACTS.md → Npc.
// Every shop entry references a canonical item id from items.js.

export const NPCS = [

  // ── Lumenhold ────────────────────────────────────────────────────────────

  { id: 'elder_maren', name: 'Maren', title: 'Elder of Lumenhold',
    zone: 'lumenhold', role: 'story', cls: null, shop: null,
    look: { robe: '#6b5e8c', hair: '#cfd2dd', skin: '#e8c49a', accent: '#f2b644' },
    lines: [
      'I was your age when the sky burned. You get used to the colour. You never get used to the quiet after.',
      'The lanterns on the wall are fed a drop of my blood each solstice. Do not tell the council; they think it is oil.',
      'You carry the Veil-mark like it weighs nothing. Give it time, child. Give it time.',
    ], },

  { id: 'captain_aldric', name: 'Captain Aldric', title: 'Captain of the Bastion Oath',
    zone: 'lumenhold', role: 'trainer', cls: 'warrior', shop: null,
    look: { robe: '#8c2f2a', hair: '#4a3323', skin: '#d9a06b', accent: '#c9cfd8' },
    lines: [
      'A shield is a promise you make to the person standing behind you. Try not to make promises you drop.',
      'I have broken four hundred practice swords on recruits. The recruits, I am pleased to say, mostly held.',
      'Footwork, breakfast, and a paid-off blacksmith. In that order. That is the whole secret of swordsmanship.',
    ], },

  { id: 'sylvie', name: 'Sylvie', title: 'Huntmistress of the Thornwood Wardens',
    zone: 'lumenhold', role: 'trainer', cls: 'archer', shop: null,
    look: { robe: '#3f6b3a', hair: '#b5502e', skin: '#f0c9a0', accent: '#8a5a2b' },
    lines: [
      'A Warden never misses twice. The first miss is scouting. Write that down, it took me years.',
      'City folk think the forest is quiet. The forest thinks city folk are loud. The forest is right.',
      'Breathe out, loose between heartbeats, and never name an arrow. You will only miss the ones you love.',
    ], },

  { id: 'magister_orin', name: 'Magister Orin', title: 'Magister of the Azure Arcanum',
    zone: 'lumenhold', role: 'trainer', cls: 'mage', shop: null,
    look: { robe: '#2b4a8c', hair: '#efe9dc', skin: '#caa27b', accent: '#64d8e8' },
    lines: [
      'Magic is simply asking the world a question so politely that it cannot refuse. Mind your grammar.',
      'My eyebrows, since you are staring, will grow back. The third law of emberflame is "eventually."',
      'Morwyn was my finest student. I tell you this so you understand why I now grade so very harshly.',
    ], },

  { id: 'merchant_bella', name: 'Bella', title: 'Provisioner of Lumenhold',
    zone: 'lumenhold', role: 'merchant', cls: null,
    shop: [
      'p_hp_1', 'p_hp_2', 'p_hp_3',
      'p_mp_1', 'p_mp_2', 'p_mp_3',
      'food_1', 'food_2', 'food_3',
      'scroll_return',
    ],
    look: { robe: '#8c4f7d', hair: '#3a2a20', skin: '#f2cba6', accent: '#f2d24a' },
    lines: [
      'Potions in front, pies in back, gossip is free with any purchase. Sometimes without one.',
      'A hero who buys one potion is an optimist. I stock my shelves for realists, dear.',
      'That return scroll has saved more lives than the whole Bastion Oath. Do not tell Aldric — he sulks beautifully.',
    ], },

  { id: 'torvald', name: 'Torvald', title: 'Master of the Emberforge',
    zone: 'lumenhold', role: 'blacksmith', cls: null,
    shop: [
      // Weapons, levels 1–25
      'w_war_1', 'w_arc_1', 'w_mag_1',
      'w_war_2', 'w_arc_2', 'w_mag_2',
      'w_war_3', 'w_arc_3', 'w_mag_3',
      'w_war_4', 'w_arc_4', 'w_mag_4',
      'w_war_5', 'w_arc_5', 'w_mag_5',
      'w_war_6', 'w_arc_6', 'w_mag_6',
      // Chestpieces, levels 1–22
      'c_war_1', 'c_war_2', 'c_war_3', 'c_war_4',
      'c_arc_1', 'c_arc_2', 'c_arc_3', 'c_arc_4',
      'c_mag_1', 'c_mag_2', 'c_mag_3', 'c_mag_4',
      // Helms
      'h_war_1', 'h_war_2', 'h_war_3', 'h_war_4',
      'h_arc_1', 'h_arc_2', 'h_arc_3', 'h_arc_4',
      'h_mag_1', 'h_mag_2', 'h_mag_3', 'h_mag_4',
      // Boots
      'b_war_1', 'b_war_2', 'b_war_3', 'b_war_4',
      'b_arc_1', 'b_arc_2', 'b_arc_3', 'b_arc_4',
      'b_mag_1', 'b_mag_2', 'b_mag_3', 'b_mag_4',
      // Shields (warrior), levels 5–25
      's_war_1', 's_war_2', 's_war_3',
      // Jewelry, levels 5–20
      'r_1', 'r_2', 'r_3',
      'am_1', 'am_2', 'am_3',
      // Enhancement stones
      'wstone_1', 'astone_1',
    ],
    look: { robe: '#5a4a3c', hair: '#b0492c', skin: '#c98a5c', accent: '#ff8c3a' },
    lines: [
      'Steel remembers every hammer-blow. So do I, which is why I shout at the apprentices in advance.',
      'You want it enhanced? Fine. But when the sparks turn green, we both take one respectful step back.',
      'My grandmother forged the hinges on the Lantern Gate. My hinges are better. She agrees, loudly, from the rafters.',
    ], },

  { id: 'banker_odo', name: 'Odo', title: 'Keeper of the Deep Vault',
    zone: 'lumenhold', role: 'banker', cls: null, shop: null,
    look: { robe: '#2e3d33', hair: '#7d7466', skin: '#e0b184', accent: '#d4af37' },
    lines: [
      'Your gold is safer with me than on your person. I have seen how you fight, and I mean that kindly.',
      'The vault door weighs nine tons and holds one grudge. It remembers everyone who has ever knocked rudely.',
      'Interest? No, no. The privilege of counting your coins each evening is payment enough. It soothes me.',
    ], },

  { id: 'zephyr', name: 'Zephyr', title: 'The Wayfarer',
    zone: 'lumenhold', role: 'platinum', cls: null, shop: null,
    look: { robe: '#3d3357', hair: '#e8e3f5', skin: '#b98a6a', accent: '#b9e8ff' },
    lines: [
      'I have walked beyond the Veil and back, and all I ask for my wonders is platinum. Gold jingles; platinum sings.',
      'Every trinket on this cart has a story. Some of the stories are even true, which I consider a bonus.',
      'The wind brought me to Lumenhold. It will take me away again someday, so browse with appropriate urgency.',
    ], },

  // ── Field NPCs ───────────────────────────────────────────────────────────

  { id: 'scout_finn', name: 'Finn', title: 'Scout of the Dawnmeadow',
    zone: 'dawnmeadow', role: 'field', cls: null, shop: null,
    look: { robe: '#7da84a', hair: '#e8b64a', skin: '#f5d2ad', accent: '#4a90d9' },
    lines: [
      'First posting out of the city and it is slimes. Do you know how hard it is to write home proudly about slimes?',
      'The boars charge anything red. Also anything blue. In truth the boars simply enjoy charging.',
      'Sunrise over the meadow is the best in Emberveil. The monsters agree — that is when they wake up hungry.',
    ], },

  { id: 'hermit_gale', name: 'Gale', title: 'Hermit of the Thornwood',
    zone: 'thornwood', role: 'field', cls: null, shop: null,
    look: { robe: '#4a4a38', hair: '#8f8a7a', skin: '#d8b590', accent: '#7db06a' },
    lines: [
      'I did not move to the deep woods to make friends. The woods, contrary creatures, sent me you instead.',
      'The trees here whisper. Mostly complaints about the bandits. Occasionally about my cooking.',
      'Forty years among the thorns and I have learned one thing: the forest forgives everything except haste.',
    ], },

  { id: 'caravaneer_rasha', name: 'Rasha', title: 'Mistress of the Ash Caravan',
    zone: 'cinderdunes', role: 'field', cls: null, shop: null,
    look: { robe: '#c9803a', hair: '#241c18', skin: '#a86a3f', accent: '#3fb8a8' },
    lines: [
      'Three rules of the dunes: drink before you thirst, camp before you tire, and never haggle with a scorpion.',
      'This caravan has crossed the Cinderdunes forty-one times. The forty-second is the one I worry about. Always the next one.',
      'Sand in my boots, ash in my tea, profit on the horizon. It is a living, and a fine one.',
    ], },

  { id: 'ranger_eydis', name: 'Eydis', title: 'Ranger of Frostfell Pass',
    zone: 'frostfell', role: 'field', cls: null, shop: null,
    look: { robe: '#5c7d99', hair: '#e8d9a8', skin: '#eecfae', accent: '#a8d8f0' },
    lines: [
      'Cold is honest. It tells you exactly what it intends to do to you, then does it. I respect that in weather.',
      'I named the pale drake Borealis before I knew it could hear me. It seemed... flattered. That worries me.',
      'Keep moving and the pass loves you. Stand still admiring the view and it starts planning your funeral.',
    ], },

  { id: 'lysander', name: 'Lysander', title: 'Court Poet of the Sundered Halls',
    zone: 'hollowdepths', role: 'field', cls: null, shop: null,
    look: { robe: '#4f6d7d', hair: '#bfe6e0', skin: '#a8c4c9', accent: '#7df2d8' },
    lines: [
      'Being dead is not so terrible. The hours are flexible and nobody asks me to recite at parties anymore.',
      'I wrote Morwyn a flattering ode once. He made me part of the decor. Critics — what can one do?',
      'You are warm. Forgive my staring; it has been forty years since anyone down here had a pulse worth envying.',
    ], },

];
