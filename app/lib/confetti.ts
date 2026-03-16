import confetti from 'canvas-confetti';

export const triggerConfetti = {
  basic: () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  },

  success: () => {
    const duration = 2100; // 30% shorter (was 3000ms)
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 42, zIndex: 0 }; // Reduced ticks by 30%

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  },

  money: () => {
    const scalar = 2;
    const money = confetti.shapeFromText?.({ text: '💰', scalar });

    confetti({
      shapes: money ? [money as any] : undefined,
      scalar,
      particleCount: 30,
      spread: 90,
      origin: { y: 0.6 }
    });
  }
};