import { CheckoutForm } from "@/components/checkout-form";

export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="container-x max-w-4xl py-16">
      <p className="eyebrow mb-2">CONFIRMACIÓN</p>
      <h1 className="display-title mb-10 text-5xl">Checkout.</h1>
      <CheckoutForm />
    </div>
  );
}
