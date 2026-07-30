export function playPopSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(680, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => void ctx.close(), 250);
  } catch {
    // ignore audio failures
  }
}

export function burstConfetti(originEl?: HTMLElement | null) {
  const root = document.createElement("div");
  root.className = "confetti-burst";
  const rect = originEl?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 3;
  root.style.left = `${x}px`;
  root.style.top = `${y}px`;
  document.body.appendChild(root);

  const colors = ["#d68d84", "#7a816c", "#cfbb9f", "#866a5b", "#8e967d", "#f0c27b"];
  for (let i = 0; i < 18; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 160}px`);
    piece.style.setProperty("--dy", `${-40 - Math.random() * 120}px`);
    piece.style.setProperty("--rot", `${Math.random() * 520}deg`);
    piece.style.background = colors[i % colors.length];
    root.appendChild(piece);
  }

  setTimeout(() => root.remove(), 900);
}

export function celebrate(originEl?: HTMLElement | null) {
  playPopSound();
  burstConfetti(originEl);
}
