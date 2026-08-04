// bag.js — the inventory panel: gold, potions, and using items.
// Open with B, or the bag button in the corner.

export function createBag(progression, { onUsePotion }) {
  const panel = document.getElementById('bag');
  const goldEl = document.getElementById('bag-gold');
  const potionCountEl = document.getElementById('bag-potion-count');
  const useBtn = document.getElementById('bag-use-potion');
  const goldHud = document.getElementById('goldcount');

  function refreshHud() {
    goldHud.textContent = progression.gold;
  }

  function render() {
    goldEl.textContent = progression.gold;
    potionCountEl.textContent = `× ${progression.potions}`;
    useBtn.classList.toggle('disabled', progression.potions <= 0);
    refreshHud();
  }

  function toggle(show = panel.classList.contains('hidden')) {
    panel.classList.toggle('hidden', !show);
    if (show) render();
  }

  useBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (onUsePotion()) render();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB') toggle();
    if (e.code === 'Escape') toggle(false);
  });
  document.getElementById('bagbtn').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    toggle();
  });
  document.getElementById('bag-close').addEventListener('pointerdown', () => toggle(false));

  refreshHud();
  return { toggle, render, refreshHud };
}
