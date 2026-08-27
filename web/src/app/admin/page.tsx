import { AdminPanel } from "@/components/admin-panel";

export const metadata = { title: "Panel" };

export default function AdminPage() {
  return (
    <div className="container-x py-12">
      <h1 className="display-title mb-10 text-4xl sm:text-5xl">Dashboard.</h1>
      <AdminPanel />
    </div>
  );
}
