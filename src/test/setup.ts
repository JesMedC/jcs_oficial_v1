import '@testing-library/jest-dom/vitest';

// jsdom does not implement `window.matchMedia`. Components that query
// reduced-motion preferences (e.g. AuroraBackground) need a non-throwing
// default. Returning `matches: false` here keeps motion enabled by
// default in tests so we cover the animated branch.
if (typeof globalThis.matchMedia !== 'function') {
  globalThis.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom also lacks ResizeObserver/IntersectionObserver. AuroraBackground
// uses IntersectionObserver to pause the canvas when off-screen. Provide
// a no-op stub so module top-level effects don't throw.
if (typeof globalThis.IntersectionObserver !== 'function') {
  class StubIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin = '0px';
    readonly thresholds: ReadonlyArray<number> = [0];
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver =
    StubIntersectionObserver as unknown as typeof IntersectionObserver;
}

// Canvas 2d context stub for jsdom (used by AuroraBackground). jsdom does
// not implement HTMLCanvasElement.getContext('2d'). Return a minimal
// in-memory surface so component effects do not throw during tests.
if (typeof HTMLCanvasElement !== 'undefined') {
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext?: (id: string) => unknown;
  };
  if (typeof proto.getContext !== 'function' || isJsdomCanvas(proto)) {
    proto.getContext = function getContext(id: string): unknown {
      if (id !== '2d') return null;
      const noop = () => {};
      return {
        canvas: this,
        fillStyle: '#000',
        strokeStyle: '#000',
        globalAlpha: 1,
        fillRect: noop,
        clearRect: noop,
        beginPath: noop,
        arc: noop,
        fill: noop,
        moveTo: noop,
        lineTo: noop,
        stroke: noop,
        save: noop,
        restore: noop,
        scale: noop,
        translate: noop,
        getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
      };
    };
  }
}

function isJsdomCanvas(proto: { getContext?: (id: string) => unknown }): boolean {
  try {
    const probe = proto.getContext?.call({} as HTMLCanvasElement, '2d');
    return probe === null;
  } catch {
    return true;
  }
}
