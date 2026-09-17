/*
 * jarvis-ui-redesign (T-07) — ServerRoomBackground primitive.
 *
 * The chrome backdrop simulating a dimly-lit server room behind glass.
 * Mounted as an absolutely-positioned overlay on the portal shell,
 * behind every content layer. Two background layers stacked:
 *
 *   1. --jarvis-bg-server : multi-stop radial gradient (bloom from
 *      off-center cyan with a secondary accent in the lower-left)
 *   2. --jarvis-bg-grid   : repeating linear-gradient crosshatch
 *      giving the surface the technical-grid HUD read
 *
 * Both layers read CSS vars (T-02) so swapping theme tokens swaps
 * the backdrop automatically. z-index -10 + pointer-events-none +
 * aria-hidden keep the layer purely decorative.
 *
 * Visual contract pinned by `ServerRoomBackground.test.tsx`.
 */
export function ServerRoomBackground(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      data-jarvis-server-bg
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{
        // Two-layer background: server radial on top, grid crosshatch
        // below. CSS parses each comma-separated layer and stacks them
        // from top (first) to bottom (last).
        backgroundImage: `var(--jarvis-bg-server), var(--jarvis-bg-grid)`,
      }}
    />
  );
}
