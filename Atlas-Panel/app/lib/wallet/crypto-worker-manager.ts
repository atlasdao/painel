import type { WorkerRequest, WorkerResponse, EncryptedWalletBlob } from './wallet-types';

type PendingRequest = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

let instance: CryptoWorkerManager | null = null;

export class CryptoWorkerManager {
  private worker: Worker | null = null;
  private pending = new Map<string, PendingRequest>();
  private isReady = false;
  private onBlobCallback: ((blob: EncryptedWalletBlob) => void) | null = null;
  private onRequestBlobCallback: ((id: string) => void) | null = null;
  private msgCounter = 0;

  static getInstance(): CryptoWorkerManager {
    if (!instance) {
      instance = new CryptoWorkerManager();
    }
    return instance;
  }

  static destroy(): void {
    if (instance) {
      instance.terminate();
      instance = null;
    }
  }

  private constructor() {}

  async init(): Promise<void> {
    if (this.worker) return;

    this.worker = new Worker(
      new URL('../../workers/crypto.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this.worker.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };

    this.worker.onerror = (error) => {
      console.error('[WalletWorker] Error:', error.message);
    };

    // Wait for init
    await this.send({ type: 'init' });
    this.isReady = true;
  }

  private handleMessage(data: any): void {
    // Handle blob storage callback
    if (data.type === 'encryptedBlob') {
      this.onBlobCallback?.(data.blob);
      return;
    }

    // Handle blob request callback
    if (data.type === 'requestBlob') {
      this.onRequestBlobCallback?.(data.id);
      return;
    }

    const pending = this.pending.get(data.id);
    if (!pending) return;

    this.pending.delete(data.id);
    clearTimeout(pending.timeout);

    if (data.type === 'error') {
      pending.reject(new Error(data.message));
    } else {
      pending.resolve(data);
    }
  }

  onBlob(callback: (blob: EncryptedWalletBlob) => void): void {
    this.onBlobCallback = callback;
  }

  onRequestBlob(callback: (id: string) => void): void {
    this.onRequestBlobCallback = callback;
  }

  /**
   * Send unlock blob to worker (when worker requests it)
   */
  sendBlob(blob: EncryptedWalletBlob): void {
    this.worker?.postMessage({ type: 'unlockBlob', blob });
  }

  async send(request: Record<string, any> & { type: string }, timeoutMs = 60000): Promise<WorkerResponse> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const id = `msg_${++this.msgCounter}_${Date.now()}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Worker request timeout'));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timeout });
      this.worker!.postMessage({ ...request, id });
    });
  }

  terminate(): void {
    if (this.worker) {
      // Tell worker to lock first
      this.worker.postMessage({ id: 'terminate', type: 'lock' });
      setTimeout(() => {
        this.worker?.terminate();
        this.worker = null;
      }, 100);
    }
    this.pending.forEach(p => {
      clearTimeout(p.timeout);
      p.reject(new Error('Worker terminated'));
    });
    this.pending.clear();
    this.isReady = false;
  }

  get ready(): boolean {
    return this.isReady;
  }
}
