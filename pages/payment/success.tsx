import { useRouter } from "next/router";
import { useEffect } from "react";

export default function PaymentSuccess() {
  const router = useRouter();
  const { paymentKey, orderId, amount } = router.query;

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) return;
    const userID = localStorage.getItem("userID");
    if (!userID) return;

    const confirmPayment = async () => {
      try {
        const res = await fetch("https://license-server-697p.onrender.com/payment/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),  // ✅ 여기 수정됨
            userID,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          alert("✅ 결제 성공 및 라이선스 발급 완료");
          router.replace("/?tab=home");
        } else {
          alert("❌ 결제 확인 실패: " + (data.message || "Unknown error"));
        }
      } catch (err) {
        alert("❌ 서버 오류가 발생했습니다");
      }
    };

    confirmPayment();
  }, [paymentKey, orderId, amount]);

  return <p style={{ padding: "2rem", fontSize: "1.2rem" }}>결제를 확인 중입니다...</p>;
}
