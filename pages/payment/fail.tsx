import { useEffect } from "react";
import { useRouter } from "next/router";

export default function PaymentFail() {
  const router = useRouter();
  const { code, message, orderId } = router.query;

  useEffect(() => {
    console.warn("Toss 결제 실패", { code, message, orderId });
  }, [code, message, orderId]);

  return (
    <div style={{ padding: "2rem", fontSize: "1.1rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "#d00" }}>
        ❌ 결제가 실패했습니다.
      </h1>
      <p style={{ marginBottom: "0.5rem" }}>에러 코드: {code}</p>
      <p style={{ marginBottom: "1rem" }}>메시지: {message}</p>
      <p style={{ fontSize: "0.95rem" }}>
        다시 시도하거나, 문제가 지속된다면 support@dlas.io 로 문의해주세요.
      </p>
      <button
        style={{ marginTop: "2rem", padding: "0.7rem 1.5rem", fontSize: "1rem" }}
        onClick={() => router.replace("/?tab=home")}
      >
        홈으로 돌아가기
      </button>
    </div>
  );
}
