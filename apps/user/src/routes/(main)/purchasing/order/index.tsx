import { createFileRoute } from "@tanstack/react-router";

export interface OrderSearch {
  order_no?: string;
}

// Route modules without a `.lazy` sibling are pulled into the synchronous
// entry chunk by the generated route tree. Validating this single optional
// search param by hand keeps the whole zod runtime off the critical path —
// every other zod usage lives in lazily loaded sections.
function validateSearch(search: Record<string, unknown>): OrderSearch {
  return {
    order_no: typeof search.order_no === "string" ? search.order_no : undefined,
  };
}

export const Route = createFileRoute("/(main)/purchasing/order/")({
  validateSearch,
});
