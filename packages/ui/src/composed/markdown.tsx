"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { lazy, Suspense } from "react";
import type { MarkdownProps } from "./markdown-content";

// The renderer pulls in react-markdown, rehype/remark plugins, KaTeX and the
// syntax highlighter — several hundred KB that used to sit on the critical
// path because the auth register form and the announcement popup import it.
// Loading it on demand keeps that weight off first paint.
const MarkdownContent = lazy(() => import("./markdown-content"));

function MarkdownFallback() {
  return (
    <div className="w-full space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function Markdown({ children, components }: MarkdownProps) {
  return (
    <Suspense fallback={<MarkdownFallback />}>
      <MarkdownContent components={components}>{children}</MarkdownContent>
    </Suspense>
  );
}

export type { MarkdownProps } from "./markdown-content";
