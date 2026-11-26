export type FacingMode = 'user' | 'environment';

export type CameraErrorCode = 'denied' | 'not-found' | 'unsupported' | 'unknown';

export class CameraError extends Error {
  readonly code: CameraErrorCode;

  constructor(code: CameraErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export class CameraController {
  private stream: MediaStream | null = null;
  private facing: FacingMode = 'user';

  get facingMode(): FacingMode {
    return this.facing;
  }

  get isMirrored(): boolean {
    return this.facing === 'user';
  }

  async start(videoEl: HTMLVideoElement, facing: FacingMode = this.facing): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new CameraError(
        'unsupported',
        'Camera access requires a modern browser over HTTPS or localhost.'
      );
    }

    this.stop();
    this.facing = facing;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 1280 }
        },
        audio: false
      });

      this.stream = stream;
      videoEl.srcObject = stream;
      videoEl.playsInline = true;
      videoEl.muted = true;
      await videoEl.play();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        throw new CameraError(
          'denied',
          'Camera permission was denied. Allow camera access in your device settings and retry.'
        );
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        throw new CameraError('not-found', 'No camera was found on this device.');
      }
      throw new CameraError('unknown', 'Unable to start camera.');
    }
  }

  async flip(videoEl: HTMLVideoElement): Promise<FacingMode> {
    const next: FacingMode = this.facing === 'user' ? 'environment' : 'user';
    await this.start(videoEl, next);
    return next;
  }

  stop(): void {
    if (!this.stream) return;
    for (const track of this.stream.getTracks()) {
      track.stop();
    }
    this.stream = null;
  }
}
