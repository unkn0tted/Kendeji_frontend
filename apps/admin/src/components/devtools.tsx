import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackQueryDevtools } from "@workspace/ui/integrations/tanstack-query-devtools";

/**
 * Development-only devtools panel.
 *
 * This module is imported through a `import.meta.env.DEV` guarded dynamic
 * import so Rollup folds the branch away and never emits the chunk (nor the
 * devtools packages) in production builds.
 */
export default function Devtools() {
  return (
    <TanStackDevtools
      config={{
        position: "bottom-right",
      }}
      plugins={[
        {
          name: "Tanstack Router",
          render: <TanStackRouterDevtoolsPanel />,
        },
        TanStackQueryDevtools,
      ]}
    />
  );
}
