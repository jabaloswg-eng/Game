// talents.js — the talent tree panel: open with T (or tap the level
// badge), spend skill points earned from leveling up.

import { TALENT_TREE } from './progression.js';

export function createTalentsUI(progression, onChanged) {
  const panel = document.getElementById('talents');
  const pointsEl = document.getElementById('talent-points');
  const columns = document.getElementById('talent-columns');

  function render() {
    pointsEl.textContent = `Skill points: ${progression.availablePoints()}`;
    columns.innerHTML = '';
    for (const branch of TALENT_TREE) {
      const col = document.createElement('div');
      col.className = 'talent-branch';
      col.innerHTML = `<div class="branch-title" style="color:${branch.color}">${branch.icon} ${branch.branch}</div>`;
      for (const node of branch.nodes) {
        const el = document.createElement('div');
        const owned = progression.has(node.id);
        const can = progression.canLearn(node.id);
        el.className = `talent-node ${owned ? 'owned' : can ? 'can' : 'locked'}`;
        if (owned) el.style.borderColor = branch.color;
        el.innerHTML = `<div class="node-name">${node.name}</div><div class="node-desc">${node.desc}</div>`;
        if (can) {
          el.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (progression.learn(node.id)) {
              render();
              onChanged();
            }
          });
        }
        col.appendChild(el);
      }
      columns.appendChild(col);
    }
  }

  function toggle(show = panel.classList.contains('hidden')) {
    panel.classList.toggle('hidden', !show);
    if (show) render();
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyT') toggle();
    if (e.code === 'Escape') toggle(false);
  });
  document.getElementById('levelbadge').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    toggle();
  });
  document.getElementById('talents-close').addEventListener('pointerdown', () => toggle(false));

  return { toggle, render };
}
