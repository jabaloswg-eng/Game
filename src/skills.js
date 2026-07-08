// skills.js — the battle-skill bar: keyboard/click triggers, cooldowns,
// and level-based unlocking. The skills' actual effects live in main.js
// and are passed in as `use` callbacks that return true when the skill
// actually fired (so a failed cast doesn't burn the cooldown).

export function createSkills(definitions) {
  const bar = document.getElementById('skillbar');
  const skills = definitions.map((def) => {
    const el = document.createElement('div');
    el.className = 'skill';
    el.innerHTML = `
      <span class="skill-icon">${def.icon}</span>
      <span class="skill-key">${def.key}</span>
      <div class="skill-cd"></div>
      <span class="skill-name">${def.name}</span>
    `;
    bar.appendChild(el);
    const skill = { ...def, el, cdEl: el.querySelector('.skill-cd'), remaining: 0 };
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); // don't let the click reach the game canvas as an attack
      trigger(skill);
    });
    return skill;
  });

  let currentLevel = 1;

  function trigger(skill) {
    if (skill.remaining > 0 || currentLevel < skill.unlockLevel) return;
    if (!skill.use()) {
      // cast failed (e.g. no target in range) — shake the slot as feedback
      skill.el.classList.remove('shake');
      void skill.el.offsetWidth; // restart the CSS animation
      skill.el.classList.add('shake');
      return;
    }
    // cooldown may be a function (talents can shorten it)
    skill.currentCd = typeof skill.cooldown === 'function' ? skill.cooldown() : skill.cooldown;
    skill.remaining = skill.currentCd;
  }

  window.addEventListener('keydown', (e) => {
    const skill = skills.find((s) => e.code === `Digit${s.key}`);
    if (skill) trigger(skill);
  });

  function update(dt, level) {
    currentLevel = level;
    for (const s of skills) {
      const locked = level < s.unlockLevel;
      s.el.classList.toggle('locked', locked);
      if (s.remaining > 0) {
        s.remaining = Math.max(0, s.remaining - dt);
        s.cdEl.style.height = `${(s.remaining / (s.currentCd || 1)) * 100}%`;
      } else {
        s.cdEl.style.height = '0%';
      }
    }
  }

  return {
    update,
    trigger: (id) => { const s = skills.find(x => x.id === id); if (s) trigger(s); },
    // 0 = ready, 1 = just used (for external cooldown displays)
    remainingFrac: (id) => {
      const s = skills.find(x => x.id === id);
      return s && s.remaining > 0 ? s.remaining / (s.currentCd || 1) : 0;
    },
  };
}
