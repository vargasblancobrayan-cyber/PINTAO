import { AccountPanel } from "@/components/account-panel";

export const metadata = { title: "Mi cuenta — PINTAO" };

export default function CuentaPage() {
  return (
    <div className="container-x max-w-3xl py-16">
      <h1 className="display-title mb-10 text-5xl sm:text-6xl">Mi cuenta.</h1>
      <AccountPanel />
    </div>
  );
}
