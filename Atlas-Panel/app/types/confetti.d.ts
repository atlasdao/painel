declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number;
    startVelocity?: number;
    spread?: number;
    ticks?: number;
    zIndex?: number;
    origin?: {
      x?: number;
      y?: number;
    };
    angle?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    flat?: boolean;
    scalar?: number;
    colors?: string[];
    shapes?: Array<'square' | 'circle' | string>;
    disableForReducedMotion?: boolean;
  }

  interface ConfettiShape {
    type?: string;
    // Add more shape properties as needed
  }

  interface ConfettiFunction {
    (options?: ConfettiOptions): Promise<void>;
    reset?: () => void;
    create?: (canvas: HTMLCanvasElement, options?: { resize?: boolean; useWorker?: boolean }) => ConfettiFunction;
    shapeFromPath?: (options: { path: string; [key: string]: any }) => ConfettiShape;
    shapeFromText?: (options: { text: string; [key: string]: any }) => ConfettiShape;
  }

  const confetti: ConfettiFunction;
  export default confetti;
}

interface Window {
  confetti?: (options: ConfettiOptions) => void;
}