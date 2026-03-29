import { useRouter } from "next/router";

export default function PaymentFail() {
  const router = useRouter();
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Online payment is currently unavailable.</p>
      <button style={{ marginTop: "1rem", padding: "0.5rem 1rem" }} onClick={() => router.replace("/")}>
        Go Home
      </button>
    </div>
  );
}
