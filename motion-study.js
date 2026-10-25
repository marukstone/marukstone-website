const stage = document.querySelector('.sequence-stage');
const track = document.querySelector('.sequence-track');
const messages = [...document.querySelectorAll('.sequence-message .message')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const solutionField = document.querySelector('.solution-field');
const solutionChips = [...document.querySelectorAll('.solution-chip')];
const connectionSvg = document.querySelector('.solution-connections');
let solutionLinks = [];
let particleFrame = 0;
let shownProgress = 0;
const particleState = [];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ease = (value) => value * value * (3 - 2 * value);

if (stage && track) {
  let targetProgress = 0;
  let frame = 0;

  const setMessage = (index) => {
    messages.forEach((message, i) => message.classList.toggle('is-active', i === index));
  };

  const buildConnections = () => {
    if (!connectionSvg || !solutionField) return;
    const width = solutionField.clientWidth;
    const height = solutionField.clientHeight;
    connectionSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    connectionSvg.replaceChildren();
    solutionLinks = [];
    const points = solutionChips.map((chip, index) => {
      const x = chip.offsetLeft + chip.offsetWidth / 2;
      const y = chip.offsetTop + chip.offsetHeight / 2;
      return { index, x, y };
    });
    // Connect each word to its two nearest neighbors: organic network, not a rigid grid.
    points.forEach((point) => {
      const nearest = points
        .filter((other) => other.index !== point.index)
        .map((other) => ({ ...other, distance: Math.hypot(other.x - point.x, other.y - point.y) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 2);
      nearest.forEach((other) => {
        if (point.index >= other.index) return;
        const curve = (Math.random() - .5) * 34;
        const midX = (point.x + other.x) / 2 + curve;
        const midY = (point.y + other.y) / 2 - curve;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${point.x} ${point.y} Q ${midX} ${midY} ${other.x} ${other.y}`);
        path.setAttribute('class', 'solution-link');
        connectionSvg.appendChild(path);
        solutionLinks.push({ path, a: point.index, b: other.index });
      });
    });
  };

  const positionSolutions = (progress) => {
    if (!solutionField || !solutionChips.length) return;
    const width = solutionField.clientWidth;
    const height = solutionField.clientHeight;
    // Three connected phases: float near the center, get thrown beyond the viewport,
    // then return to their individual positions as the dark message settles in.
    const flyOut = ease(clamp((progress - .12) / .27, 0, 1));
    const returnIn = ease(clamp((progress - .66) / .25, 0, 1));
    solutionChips.forEach((chip, index) => {
      const x = chip.offsetLeft + chip.offsetWidth / 2;
      const y = chip.offsetTop + chip.offsetHeight / 2;
      const angle = Math.atan2(y - height * .5, x - width * .5) + ((index % 5) - 2) * .17;
      const edgeRadius = Math.hypot(width, height) * (1.05 + (index % 6) * .12);
      const outX = width * .5 + Math.cos(angle) * edgeRadius;
      const outY = height * .5 + Math.sin(angle) * edgeRadius;
      const flyX = outX - x;
      const flyY = outY - y;
      // On the final message scene, arrange words around the copy instead of across it.
      // Keep the center reserved for the fixed two-line headline. Place words on a
      // loose perimeter orbit (top / right / bottom / left), never through the copy.
      // Keep the headline's center clear: most words use two outer rows above/below,
      // with only a few words on the side rails. This avoids the old crowded 4-side grid.
      let orbitX, orbitY;
      if (index < 10) {
        const slot = index;
        orbitX = width * (.045 + (slot + .5) * .91 / 10);
        orbitY = height * (slot % 2 === 0 ? .085 : .205);
      } else if (index < 20) {
        const slot = index - 10;
        orbitX = width * (.045 + (slot + .5) * .91 / 10);
        orbitY = height * (slot % 2 === 0 ? .915 : .795);
      } else {
        const slot = index - 20;
        const side = slot % 2;
        const row = Math.floor(slot / 2);
        orbitX = width * (side ? .88 : .12);
        orbitY = height * (.31 + row * .19);
      }
      const safeX = clamp(orbitX, chip.offsetWidth * .5 + 12, width - chip.offsetWidth * .5 - 12);
      const safeY = clamp(orbitY, chip.offsetHeight * .5 + 12, height - chip.offsetHeight * .5 - 12);
      const orbitTravelX = safeX - x;
      const orbitTravelY = safeY - y;
      const tx = flyX * flyOut * (1 - returnIn) + orbitTravelX * returnIn;
      const ty = flyY * flyOut * (1 - returnIn) + orbitTravelY * returnIn;
      chip.style.setProperty('--travel-x', `${tx}px`);
      chip.style.setProperty('--travel-y', `${ty}px`);
      if (progress >= .12) { chip.style.setProperty('--bounce-x', '0px'); chip.style.setProperty('--bounce-y', '0px'); }
      chip.style.opacity = String(clamp(.9 - flyOut * .9 + returnIn * .9, 0, 1));
      chip.style.setProperty('--drift', `${Math.sin(index * 1.7) * 3}px`);
    });
  };

  const readScroll = () => {
    const rect = track.getBoundingClientRect();
    const travel = Math.max(1, track.offsetHeight - window.innerHeight);
    targetProgress = clamp(-rect.top / travel, 0, 1);
    if (!frame) frame = requestAnimationFrame(animate);
  };

  const animate = () => {
    shownProgress += (targetProgress - shownProgress) * (reduceMotion.matches ? 1 : .12);
    if (Math.abs(targetProgress - shownProgress) < .001) shownProgress = targetProgress;
    const rotation = ease(shownProgress) * 360;
    const shapeScale = .86 + Math.sin(shownProgress * Math.PI) * .22 + shownProgress * .12;
    // A visible diagonal wipe bridges the light scene and the final dark scene.
    const wipeProgress = ease(clamp((shownProgress - .50) / .32, 0, 1));
    stage.style.setProperty('--rotation', `${rotation}deg`);
    stage.style.setProperty('--shape-scale', shapeScale.toFixed(3));
    stage.style.setProperty('--wipe-edge', `${wipeProgress * 118}%`);
    stage.classList.toggle('is-wiping', wipeProgress > 0);
    stage.classList.toggle('is-wiping', shownProgress > .50 && shownProgress < .82);
    stage.classList.toggle('is-dark', shownProgress >= .82);
    stage.classList.toggle('is-message', shownProgress >= .86);
    if (shownProgress < .38) setMessage(0);
    else setMessage(2);
    positionSolutions(shownProgress);
    frame = 0;
    if (Math.abs(targetProgress - shownProgress) >= .001) frame = requestAnimationFrame(animate);
  };

  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', () => { buildConnections(); readScroll(); });
  buildConnections();
  readScroll();
}


// Lightweight 2D particle motion. Text words drift independently and bounce off one another
// and the viewport edges during the scattered-solutions phase.
if (solutionField && solutionChips.length && !reduceMotion.matches) {
  const initParticles = () => {
    const w = solutionField.clientWidth || window.innerWidth;
    const h = solutionField.clientHeight || window.innerHeight;
    particleState.length = 0;
    solutionChips.forEach((chip, i) => {
      const x = parseFloat(chip.style.left) || chip.offsetLeft;
      const y = parseFloat(chip.style.top) || chip.offsetTop;
      const radius = Math.max(24, Math.min(62, Math.max(chip.offsetWidth, chip.offsetHeight) * .34));
      // Seeded variety makes each word move independently without a uniform orbit.
      const angle = (i * 2.399963) % (Math.PI * 2);
      const speed = 1.15 + ((i * 7) % 9) * 0.16;
      particleState.push({ chip, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.86, r: radius, baseX: x, baseY: y });
    });
  };
  const tickParticles = () => {
    const w = solutionField.clientWidth || window.innerWidth;
    const h = solutionField.clientHeight || window.innerHeight;
    const progress = shownProgress;
    if (progress < .12) {
      for (let i = 0; i < particleState.length; i++) {
        const a = particleState[i];
        a.x += a.vx; a.y += a.vy;
        const maxX = Math.max(0, w - a.chip.offsetWidth);
        const maxY = Math.max(0, h - a.chip.offsetHeight);
        if (a.x < 0 || a.x > maxX) { a.vx *= -1; a.x = clamp(a.x, 0, maxX); }
        if (a.y < 0 || a.y > maxY) { a.vy *= -1; a.y = clamp(a.y, 0, maxY); }
        for (let j = i + 1; j < particleState.length; j++) {
          const b = particleState[j];
          const ax = a.x + a.chip.offsetWidth / 2, ay = a.y + a.chip.offsetHeight / 2;
          const bx = b.x + b.chip.offsetWidth / 2, by = b.y + b.chip.offsetHeight / 2;
          const dx = bx - ax, dy = by - ay, dist = Math.hypot(dx, dy) || .001;
          const minDist = (a.r + b.r) * .52;
          if (dist < minDist) {
            const nx = dx / dist, ny = dy / dist;
            const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rel < 0) {
              // Equal-mass elastic collision: exchange velocity along the collision normal.
              a.vx += rel * nx; a.vy += rel * ny;
              b.vx -= rel * nx; b.vy -= rel * ny;
            }
            const overlap = (minDist - dist) * .5 + .15;
            a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
          }
        }
        a.chip.style.setProperty('--bounce-x', `${a.x - a.baseX}px`);
        a.chip.style.setProperty('--bounce-y', `${a.y - a.baseY}px`);
      }
    }
    particleFrame = requestAnimationFrame(tickParticles);
  };
  initParticles();
  particleFrame = requestAnimationFrame(tickParticles);
  window.addEventListener('resize', initParticles);
}

// Hover creates a local elastic response. Clicking a solution sends a synapse-like pulse
// through its nearest connected words instead of simply highlighting one label.
if (solutionField && solutionChips.length) {
  let pointerFrame = 0;
  let pointerX = -10000;
  let pointerY = -10000;
  const updateSolutions = () => {
    solutionChips.forEach((chip) => {
      const rect = chip.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - pointerX;
      const dy = cy - pointerY;
      const distance = Math.hypot(dx, dy);
      const strength = Math.max(0, 1 - distance / 230);
      const push = strength * 8;
      const angle = Math.atan2(dy, dx);
      chip.style.setProperty('--mx', `${Math.cos(angle) * push}px`);
      chip.style.setProperty('--my', `${Math.sin(angle) * push}px`);
      chip.style.setProperty('--pop', (1 + strength * .16).toFixed(3));
      chip.style.setProperty('--glow', strength.toFixed(3));
      chip.classList.toggle('is-near', strength > .12);
    });
    pointerFrame = 0;
  };
  solutionField.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(updateSolutions);
  });
  solutionField.addEventListener('pointerleave', () => {
    pointerX = -10000;
    pointerY = -10000;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(updateSolutions);
  });

  solutionChips.forEach((chip, index) => {
    chip.addEventListener('click', () => {
      solutionChips.forEach((item) => item.classList.remove('is-selected'));
      chip.classList.add('is-selected');
      const connected = new Set([index]);
      solutionLinks.forEach((link) => {
        const adjacent = link.a === index || link.b === index;
        link.path.classList.toggle('is-lit', adjacent);
        if (adjacent) { connected.add(link.a); connected.add(link.b); }
      });
      solutionChips.forEach((item, itemIndex) => item.classList.toggle('is-near', connected.has(itemIndex)));
    });
  });
}
