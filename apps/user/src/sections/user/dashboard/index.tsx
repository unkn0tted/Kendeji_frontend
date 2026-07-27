import Announcement from "../announcement";
import Content from "./content";

export default function Dashboard() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col gap-6 overflow-hidden">
      <Announcement type="pinned" />
      <Content />
    </div>
  );
}
