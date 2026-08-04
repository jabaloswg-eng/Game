// EMBERVEIL — platshop.js
// Pure data. Schema: docs/CONTRACTS.md → PlatItem.
// Zephyr the Wayfarer's catalogue. Every entry is earnable in-game with Platinum.

export const PLAT_ITEMS = [

  // ── Growth ───────────────────────────────────────────────────────────────
  { id: 'plat_exp50', name: 'Tome of the Quick Study', cat: 'growth', plat: 12,
    give: { effect: 'exp50_30m' },
    desc: '+50% EXP for 30 minutes. The margins are crowded with someone else\'s very good notes.', },
  { id: 'plat_exp100', name: 'Tome of the Hungry Mind', cat: 'growth', plat: 25,
    give: { effect: 'exp100_30m' },
    desc: 'Doubles EXP for 30 minutes. Reads you back, which is unsettling but efficient.', },
  { id: 'plat_statreset', name: 'Tonic of Second Thoughts', cat: 'growth', plat: 30,
    give: { effect: 'statReset' },
    desc: 'Refunds every allocated stat point. Tastes like regret, works like forgiveness.', },
  { id: 'plat_skillreset', name: 'Draught of the Blank Page', cat: 'growth', plat: 30,
    give: { effect: 'skillReset' },
    desc: 'Refunds every skill point. Your muscles forget; your pride, eventually.', },
  { id: 'plat_bag6', name: 'Wayfarer\'s Satchel Charm', cat: 'growth', plat: 40,
    give: { effect: 'bag+6' },
    desc: 'Permanently adds 6 bag slots. The satchel simply decides to be bigger inside.', },
  { id: 'plat_bank12', name: 'Vaultwright\'s Writ', cat: 'growth', plat: 35,
    give: { effect: 'bank+12' },
    desc: 'Permanently adds 12 bank slots. Banker Odo signs it without looking up.', },

  // ── Convenience ──────────────────────────────────────────────────────────
  { id: 'plat_sigils5', name: 'Homeward Bundle (5 Scrolls)', cat: 'convenience', plat: 8,
    give: { itemId: 'scroll_return', qty: 5 },
    desc: 'Five Scrolls of Homeward Light, tied with string. Lumenhold is never far.', },
  { id: 'plat_feather1', name: 'Phoenix Feather', cat: 'convenience', plat: 15,
    give: { itemId: 'plat_feather', qty: 1 },
    desc: 'Revives you on the spot with no EXP penalty. Still warm. Politely, do not ask from where.', },
  { id: 'plat_merchant30', name: 'Bella\'s Traveling Bell', cat: 'convenience', plat: 10,
    give: { effect: 'merchant30m' },
    desc: 'Summons a portable merchant stall for 30 minutes, anywhere. Bella sends her regards, and her prices.', },

  // ── Enhance ──────────────────────────────────────────────────────────────
  { id: 'plat_bwstone1', name: 'Blessed Whetstone', cat: 'enhance', plat: 20,
    give: { itemId: 'plat_bwstone', qty: 1 },
    desc: 'A whetstone kissed by Veil-light. Torvald grumbles that it makes his job too easy.', },
  { id: 'plat_grune1', name: 'Guardian Rune', cat: 'enhance', plat: 45,
    give: { itemId: 'plat_grune', qty: 1 },
    desc: 'Socket before a risky enhancement: if the forging fails at +7 or above, the item survives.', },

  // ── Cosmetics ────────────────────────────────────────────────────────────
  { id: 'plat_cos_duelist', name: 'Duelist\'s Regalia', cat: 'cosmetic', plat: 45,
    give: { itemId: 'cos_duelist', qty: 1 },
    desc: 'A costume for those who want their footwork admired before it is feared.', },
  { id: 'plat_cos_scholar', name: 'Scholar\'s Finery', cat: 'cosmetic', plat: 40,
    give: { itemId: 'cos_scholar', qty: 1 },
    desc: 'A costume of Arcanum cut. Ink stains sold separately; you will provide your own.', },
  { id: 'plat_cos_ranger', name: 'Wayfarer\'s Greens', cat: 'cosmetic', plat: 35,
    give: { itemId: 'cos_ranger', qty: 1 },
    desc: 'A costume in Thornwood green. Blends into forests, stands out at parties.', },
  { id: 'plat_cos_shadow', name: 'Gloam Masquerade', cat: 'cosmetic', plat: 60,
    give: { itemId: 'cos_shadow', qty: 1 },
    desc: 'A costume stitched from dusk itself. Dramatic exits included at no extra charge.', },
  { id: 'plat_dye_azure', name: 'Azure Emberdye', cat: 'cosmetic', plat: 10,
    give: { effect: 'dye_azure' },
    desc: 'Re-tints your outfit the blue of the deep Veil. Does not wash out. Ever.', },
  { id: 'plat_dye_crimson', name: 'Crimson Emberdye', cat: 'cosmetic', plat: 10,
    give: { effect: 'dye_crimson' },
    desc: 'Re-tints your outfit the red of the Sundering sky. Bold choice. Zephyr approves.', },

  // ── Pets ─────────────────────────────────────────────────────────────────
  { id: 'plat_egg_emberfox', name: 'Emberfox Egg', cat: 'pet', plat: 60,
    give: { itemId: 'egg_emberfox', qty: 1 },
    desc: 'Warm to the touch and faintly smug. Hatches into a loyal emberfox who loots as it trots.', },
  { id: 'plat_egg_frostowl', name: 'Frostowl Egg', cat: 'pet', plat: 60,
    give: { itemId: 'egg_frostowl', qty: 1 },
    desc: 'Cool as a Frostfell morning. Hatches into a frostowl with judging eyes and a generous heart.', },
  { id: 'plat_egg_stonepup', name: 'Stonepup Egg', cat: 'pet', plat: 60,
    give: { itemId: 'egg_stonepup', qty: 1 },
    desc: 'Heavier than it looks. Hatches into a stonepup who fetches loot and, occasionally, boulders.', },
];

// New inventory items granted by the shop above. The engine merges these into
// the item database. Schema: docs/CONTRACTS.md → Item.
export const PLAT_EXTRA_ITEMS = [
  { id: 'plat_feather', name: 'Phoenix Feather', type: 'scroll', cls: 'any', tier: 3, lvl: 0,
    stats: null, price: 0, stack: 10, use: null,
    desc: 'Consumed on defeat: you rise where you fell, EXP untouched, dignity mostly intact.', },
  { id: 'plat_bwstone', name: 'Blessed Whetstone', type: 'scroll', cls: 'any', tier: 3, lvl: 0,
    stats: null, price: 0, stack: 10, use: null,
    desc: 'A Veil-blessed stone the blacksmith uses in place of a common whetstone for a surer forging.', },
  { id: 'plat_grune', name: 'Guardian Rune', type: 'scroll', cls: 'any', tier: 4, lvl: 0,
    stats: null, price: 0, stack: 10, use: null,
    desc: 'Socketed at the forge; if a high enhancement fails, the rune shatters instead of your gear.', },
];
