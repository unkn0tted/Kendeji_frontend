import { GlobalMap } from "./global-map";
import { Hero } from "./hero";
import { ProductShowcase } from "./product-showcase";
import { Stats } from "./stats";

// Logged-in and landing-disabled redirects live in the route's `beforeLoad`
// (routes/(main)/index.tsx), so they run before anything paints.
export default function Main() {
  return (
    <main className="container relative pt-6 pb-4 sm:pt-8 sm:pb-6 lg:pt-10 lg:pb-8">
      <div className="relative grid gap-6 sm:gap-7 lg:gap-9">
        <Hero />
        <Stats />
        <ProductShowcase />
        <GlobalMap />
      </div>
    </main>
  );
}
