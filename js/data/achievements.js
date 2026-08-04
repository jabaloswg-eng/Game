// EMBERVEIL — achievements.js
// Pure data. Schema: docs/CONTRACTS.md → Ach.
// Most award Platinum; a handful grant wearable Titles shown under the name.

export const ACHIEVEMENTS = [

  // ── Slaying ──────────────────────────────────────────────────────────────
  { id: 'ach_kill_1', name: 'First Spark', desc: 'Defeat your first monster. Everyone starts with one very surprised slime.',
    check: { type: 'kills', n: 1 }, rewardPlat: 5, title: null, },
  { id: 'ach_kill_100', name: 'Meadow Menace', desc: 'Defeat 100 monsters. The boars have started warning each other.',
    check: { type: 'kills', n: 100 }, rewardPlat: 8, title: null, },
  { id: 'ach_kill_500', name: 'Storm of Steel', desc: 'Defeat 500 monsters. Somewhere, a bandit recruiter quietly resigns.',
    check: { type: 'kills', n: 500 }, rewardPlat: 12, title: null, },
  { id: 'ach_kill_2000', name: 'Legion of One', desc: 'Defeat 2,000 monsters. The Umbral Legion has a file on you now.',
    check: { type: 'kills', n: 2000 }, rewardPlat: 20, title: 'Legion of One', },

  // ── Level milestones ─────────────────────────────────────────────────────
  { id: 'ach_lvl_5', name: 'Finding Your Feet', desc: 'Reach level 5. The training yard dummies breathe a sigh of relief.',
    check: { type: 'level', n: 5 }, rewardPlat: 10, title: null, },
  { id: 'ach_lvl_10', name: 'No Longer Green', desc: 'Reach level 10. Captain Aldric almost smiles. Almost.',
    check: { type: 'level', n: 10 }, rewardPlat: 10, title: null, },
  { id: 'ach_lvl_15', name: 'Walker of Ways', desc: 'Reach level 15. The roads out of Lumenhold know your boots.',
    check: { type: 'level', n: 15 }, rewardPlat: 12, title: null, },
  { id: 'ach_lvl_20', name: 'Veilwalker Proper', desc: 'Reach level 20. The spark in you is a steady flame now.',
    check: { type: 'level', n: 20 }, rewardPlat: 15, title: 'Veilwalker Proper', },
  { id: 'ach_lvl_25', name: 'Duneworn', desc: 'Reach level 25. You have sand in places you will not discuss.',
    check: { type: 'level', n: 25 }, rewardPlat: 15, title: null, },
  { id: 'ach_lvl_30', name: 'Stormtempered', desc: 'Reach level 30. Mana-storms part around you, mostly out of respect.',
    check: { type: 'level', n: 30 }, rewardPlat: 20, title: null, },
  { id: 'ach_lvl_35', name: 'Deepward', desc: 'Reach level 35. Even the dark of the Hollow Depths thinks twice.',
    check: { type: 'level', n: 35 }, rewardPlat: 20, title: null, },
  { id: 'ach_lvl_40', name: 'Lantern of Lumenhold', desc: 'Reach level 40. Elder Maren says the city sleeps easier with you in it.',
    check: { type: 'level', n: 40 }, rewardPlat: 25, title: 'Lantern of Lumenhold', },

  // ── Boss first-kills ─────────────────────────────────────────────────────
  { id: 'ach_boss_bramblehide', name: 'Sowking, Reaped', desc: 'Defeat Bramblehide the Sowking. Dawnmeadow\'s crops send their thanks.',
    check: { type: 'killMonster', key: 'bramblehide', n: 1 }, rewardPlat: 10, title: null, },
  { id: 'ach_boss_oakenheart', name: 'Heartwood Felled', desc: 'Defeat Oakenheart. The Thornwood grows a little kinder where it fell.',
    check: { type: 'killMonster', key: 'oakenheart', n: 1 }, rewardPlat: 12, title: 'Thornfeller', },
  { id: 'ach_boss_sirocco', name: 'The Brood Unmothered', desc: 'Defeat Sirocco, Broodmother of Ash. The dunes go quiet — the good kind of quiet.',
    check: { type: 'killMonster', key: 'sirocco', n: 1 }, rewardPlat: 15, title: 'Ashtamer', },
  { id: 'ach_boss_borealis', name: 'Pale No More', desc: 'Defeat Borealis the Pale Drake. Frostfell Pass thaws by exactly one degree.',
    check: { type: 'killMonster', key: 'borealis', n: 1 }, rewardPlat: 18, title: 'Palebane', },
  { id: 'ach_boss_hollow_king', name: 'The Veil Made Whole', desc: 'Defeat the Hollow King. What Morwyn tore, you have mended.',
    check: { type: 'killMonster', key: 'hollow_king', n: 1 }, rewardPlat: 25, title: 'Veilmender', },

  // ── Wealth ───────────────────────────────────────────────────────────────
  { id: 'ach_gold_10k', name: 'Comfortable', desc: 'Hold 10,000 gold. Banker Odo learns your name.',
    check: { type: 'gold', n: 10000 }, rewardPlat: 8, title: null, },
  { id: 'ach_gold_100k', name: 'Gilded', desc: 'Hold 100,000 gold. Banker Odo learns your favorite chair.',
    check: { type: 'gold', n: 100000 }, rewardPlat: 15, title: null, },

  // ── The forge ────────────────────────────────────────────────────────────
  { id: 'ach_enh_5', name: 'A Keener Edge', desc: 'Enhance any item to +5. Torvald nods, which from Torvald is a parade.',
    check: { type: 'enhance', n: 5 }, rewardPlat: 10, title: null, },
  { id: 'ach_enh_7', name: 'Forged Under Stars', desc: 'Enhance any item to +7. The anvil rang like a bell and nothing shattered.',
    check: { type: 'enhance', n: 7 }, rewardPlat: 20, title: 'Starforged', },

  // ── Exploration ──────────────────────────────────────────────────────────
  { id: 'ach_zones_all', name: 'Every Road Taken', desc: 'Set foot in all six regions of Emberveil, from lantern-walls to the deep dark.',
    check: { type: 'zones', n: 6 }, rewardPlat: 12, title: null, },

  // ── Story and deeds ──────────────────────────────────────────────────────
  { id: 'ach_quests_5', name: 'Helping Hand', desc: 'Complete 5 quests. Word gets around that you actually come back.',
    check: { type: 'quests', n: 5 }, rewardPlat: 5, title: null, },
  { id: 'ach_quests_15', name: 'Errand Legend', desc: 'Complete 15 quests. Half of Lumenhold owes you a favor; the other half owes you two.',
    check: { type: 'quests', n: 15 }, rewardPlat: 10, title: null, },
  { id: 'ach_quests_main', name: 'The Five Shards', desc: 'Complete the main story. Five Veilshards sealed, one sky made quiet.',
    check: { type: 'quests', key: 'main', n: 10 }, rewardPlat: 25, title: 'Shardbearer', },

  // ── Companions and coin ──────────────────────────────────────────────────
  { id: 'ach_pet_hatch', name: 'Small Wonder', desc: 'Hatch your first pet egg. It imprinted on you immediately. No refunds.',
    check: { type: 'petHatch', n: 1 }, rewardPlat: 8, title: null, },
  { id: 'ach_plat_500', name: 'Zephyr\'s Favorite', desc: 'Spend 500 Platinum. Zephyr starts unpacking the good shelf when you approach.',
    check: { type: 'platSpent', n: 500 }, rewardPlat: 20, title: null, },
];
