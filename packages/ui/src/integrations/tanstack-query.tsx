import {
  QueryClient,
  type QueryClientConfig,
  QueryClientProvider,
} from "@tanstack/react-query";

export function TanStackQueryContext(config?: QueryClientConfig) {
  const queryClient = new QueryClient(config);
  return {
    queryClient,
  };
}

export function TanStackQueryProvider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
