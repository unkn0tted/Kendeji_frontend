const PAGE_SIZE = 100;
const PAGE_REQUEST_CONCURRENCY = 5;

type PaginatedListFetcher<T> = (params: {
  page: number;
  size: number;
}) => Promise<{
  data?: {
    data?: {
      list?: T[];
      total?: number;
    };
  };
}>;

export const fetchAllPaginated = async <T>(
  fetchPage: PaginatedListFetcher<T>
): Promise<T[]> => {
  const firstResponse = await fetchPage({ page: 1, size: PAGE_SIZE });
  const firstPage = firstResponse.data?.data;
  const firstList = firstPage?.list || [];
  const total = firstPage?.total || firstList.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (totalPages <= 1) {
    return firstList;
  }

  const remainingResponses = new Array<
    Awaited<ReturnType<PaginatedListFetcher<T>>>
  >(totalPages - 1);
  const pageNumbers = Array.from(
    { length: totalPages - 1 },
    (_, index) => index + 2
  );
  let nextPageIndex = 0;

  const workers = Array.from(
    {
      length: Math.min(PAGE_REQUEST_CONCURRENCY, pageNumbers.length),
    },
    async () => {
      while (nextPageIndex < pageNumbers.length) {
        const currentIndex = nextPageIndex;
        nextPageIndex += 1;
        remainingResponses[currentIndex] = await fetchPage({
          page: pageNumbers[currentIndex]!,
          size: PAGE_SIZE,
        });
      }
    }
  );
  await Promise.all(workers);

  const items = [...firstList];

  for (const response of remainingResponses) {
    items.push(...(response.data?.data?.list || []));
  }

  return items;
};
