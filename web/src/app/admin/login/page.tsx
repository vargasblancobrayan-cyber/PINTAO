import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Admin" };

export default function AdminLoginPage() {
  return (
    <div className="container-x flex flex-col items-center py-20">
      <p className="eyebrow mb-3">ADMINISTRACIÓN</p>
      <AuthForm title="Panel." hint="Solo administradores autorizados." />
    </div>
  );
}
