import { cn } from "@workspace/ui/lib/utils";
import type { CSSProperties } from "react";

const NODE_COUNT = 6;

interface AuroraOrbProps {
  className?: string;
  /** Optional mark rendered in the core — typically the site logo. */
  logo?: string;
}

/**
 * Pure-CSS aurora orb: concentric rings, orbiting nodes and a glowing core.
 *
 * Replaces the Lottie player that used to sit on the auth page. That pulled a
 * ~2.7MB WASM-backed package onto the critical path of the most-visited
 * unauthenticated route; this renders the same "connected network" idea with
 * a handful of divs and compositor-only animation.
 */
export function AuroraOrb({ className, logo }: AuroraOrbProps) {
  return (
    <div aria-hidden="true" className={cn("aurora-orb", className)}>
      <span className="aurora-orb__glow" />
      <span className="aurora-orb__ring aurora-orb__ring--one" />
      <span className="aurora-orb__ring aurora-orb__ring--two" />
      <span className="aurora-orb__ring aurora-orb__ring--three" />

      <span className="aurora-orb__orbit">
        {Array.from({ length: NODE_COUNT }).map((_, index) => (
          <span
            className="aurora-orb__node"
            key={index}
            style={{ "--node-index": index } as CSSProperties}
          />
        ))}
      </span>

      <span className="aurora-orb__core">
        {logo ? (
          // Rendered size comes from CSS (56% of the core); these are the
          // intrinsic hints the browser uses to reserve the box.
          <img
            alt=""
            className="aurora-orb__core-logo"
            height={64}
            src={logo}
            width={64}
          />
        ) : (
          <span className="aurora-orb__core-pulse" />
        )}
      </span>
    </div>
  );
}
