"use client";

import { useState } from "react";
// Coupon validation integrated

interface EmailVerificationProps {
  onVerificationSuccess: () => void;
  onBack?: () => void;
  userID: string;
}

export default function EmailVerification({
  onVerificationSuccess,
  onBack,
  userID,
}: EmailVerificationProps) {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  // 쿠폰 관련 state
  const [couponCode, setCouponCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isCouponValid, setIsCouponValid] = useState(false);
  const [licenseDays, setLicenseDays] = useState(3); // 기본 3일, 쿠폰 적용시 10일

  // 이메일 유효성 검사
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 인증번호 발송
  const handleSendCode = async () => {
    if (!validateEmail(email)) {
      setMessage("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    setIsSending(true);
    setMessage("");

    try {
      const response = await fetch(
        "https://license-server-697p.onrender.com/email/send-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            userID: userID,
            couponCode: isCouponValid ? couponCode : undefined,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setIsCodeSent(true);
        setMessage("인증번호가 이메일로 발송되었습니다. (3분 내 입력해주세요)");
        setCountdown(180);

        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setMessage(data.message || "인증번호 발송에 실패했습니다.");
      }
    } catch (error) {
      setMessage("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      console.error("Email send error:", error);
    } finally {
      setIsSending(false);
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setMessage("6자리 인증번호를 입력해주세요.");
      return;
    }

    setIsVerifying(true);
    setMessage("");

    try {
      const response = await fetch(
        "https://license-server-697p.onrender.com/email/verify-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            code: verificationCode,
            userID: userID,
            couponCode: isCouponValid ? couponCode : undefined, // 쿠폰이 검증된 경우 전달
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const days = data.license.duration || licenseDays;
        setMessage(`본인인증이 완료되었습니다! ${days}일 무료 라이센스가 발급되었습니다.`);

        // 인증 완료 후 메인으로 이동
        setTimeout(() => {
          onVerificationSuccess();
        }, 2000);
      } else {
        setMessage(data.message || "인증번호가 일치하지 않습니다.");
      }
    } catch (error) {
      setMessage("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      console.error("Verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  // 쿠폰 검증 (프론트엔드에서만)
  const handleValidateCoupon = () => {
    if (!couponCode.trim()) {
      setMessage("쿠폰 코드를 입력해주세요.");
      return;
    }

    setIsValidatingCoupon(true);
    setMessage("");

    // 쿠폰 코드 검증 (2804dlas)
    const normalizedCode = couponCode.trim().toLowerCase();
    if (normalizedCode === "2804dlas") {
      setIsCouponValid(true);
      setLicenseDays(10); // 3일 + 7일 = 10일
      setMessage("🎉 쿠폰이 적용되었습니다! 10일 라이센스가 발급됩니다.");
    } else {
      setIsCouponValid(false);
      setLicenseDays(3);
      setMessage("유효하지 않은 쿠폰 코드입니다.");
    }

    setIsValidatingCoupon(false);
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="underline text-blue-600 mb-4 hover:text-blue-800"
        >
          ← Back
        </button>
      )}

      <h3 className="text-2xl font-bold text-center text-gray-800">
        이메일 본인인증
      </h3>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>📧 본인인증 완료 시</strong>
        </p>
        <ul className="mt-2 space-y-1 text-sm text-blue-700">
          <li>• 모든 모듈 {licenseDays}일 무료 라이센스 즉시 발급</li>
          <li>• 인증된 이메일은 안전하게 암호화되어 저장됩니다</li>
          <li>• 1회 인증으로 자동 발급됩니다</li>
        </ul>
      </div>

      <div className="space-y-4">
        {/* 쿠폰 코드 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            쿠폰 코드 (선택사항)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.trim())}
              placeholder=""
              disabled={isCouponValid}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleValidateCoupon}
              disabled={isValidatingCoupon || !couponCode || isCouponValid}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium whitespace-nowrap"
            >
              {isCouponValid ? "적용 완료" : "적용"}
            </button>
          </div>
        </div>

        {/* 이메일 입력 */}
        <div className="pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이메일 주소
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@naver.com (Gmail 제외)"
              disabled={isCodeSent}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendCode}
              disabled={isSending || isCodeSent}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium whitespace-nowrap"
            >
              {isSending ? "발송 중..." : isCodeSent ? "발송 완료" : "인증번호 발송"}
            </button>
          </div>
        </div>

        {/* 인증번호 입력 */}
        {isCodeSent && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              인증번호
              {countdown > 0 && (
                <span className="ml-2 text-red-600 font-semibold">
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "");
                  if (value.length <= 6) {
                    setVerificationCode(value);
                  }
                }}
                placeholder="6자리 숫자 입력"
                maxLength={6}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleVerifyCode}
                disabled={isVerifying || verificationCode.length !== 6}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium whitespace-nowrap"
              >
                {isVerifying ? "확인 중..." : "인증 확인"}
              </button>
            </div>
          </div>
        )}

        {/* 재발송 버튼 */}
        {isCodeSent && countdown === 0 && (
          <button
            onClick={() => {
              setIsCodeSent(false);
              setVerificationCode("");
              setMessage("");
            }}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            인증번호 다시 받기
          </button>
        )}

        {/* 메시지 표시 */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.includes("완료") || message.includes("발송되었습니다") || message.includes("🎉")
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          본인인증은 이메일을 통해 안전하게 처리됩니다.
          <br />
          수집된 정보는 본인 확인 및 라이센스 발급 용도로만 사용됩니다.
          <br />
          <strong>Gmail은 사용할 수 없습니다.</strong> 네이버, 다음, 회사 이메일을 사용해주세요.
        </p>
      </div>
    </div>
  );
}
