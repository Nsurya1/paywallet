import confetti from 'canvas-confetti';

export function triggerConfetti() {
  try {
    // Shoot celebratory particles from center-bottom
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#4F46E5', '#7C3AED', '#06B6D4', '#10B981', '#F59E0B'],
      disableForReducedMotion: true,
    });

    // Secondary burst
    setTimeout(() => {
      try {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0.2, y: 0.65 },
          colors: ['#4F46E5', '#06B6D4', '#10B981'],
          disableForReducedMotion: true,
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 0.8, y: 0.65 },
          colors: ['#7C3AED', '#F59E0B', '#10B981'],
          disableForReducedMotion: true,
        });
      } catch {
        // ignore in tests / unsupported environments
      }
    }, 200);
  } catch {
    // ignore in tests / unsupported environments
  }
}
