"use client";

import { useState } from "react";

interface SeminarInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SeminarInfoModal({ isOpen, onClose }: SeminarInfoModalProps) {
  const [activeTab, setActiveTab] = useState<"video" | "seminar" | "webinar">("video");

  if (!isOpen) return null;

  const seminarLink = "https://docs.google.com/forms/d/e/1FAIpQLSc_fzZTLxCqNlCYlbZs3RvogqSxbzq9BMFQnAiTBSNyw8z52A/viewform?usp=sharing&ouid=100677474144073110334";
  const webinaLink = "https://docs.google.com/forms/d/e/1FAIpQLSfX_YSbdyGM92f6CWVg_VkiTXan5AxGYRSPMshfXkeN4kgSYg/viewform?usp=sharing&ouid=100677474144073110334";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 z-10 h-10 w-10 rounded-full
                     bg-black/90 text-white shadow-lg
                     flex items-center justify-center
                     hover:bg-black active:scale-95
                     transition"
        >
          <span className="text-2xl leading-none">×</span>
        </button>

        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
          <h2 className="text-2xl font-bold text-center">세미나 & 웨비나 안내</h2>
        </div>

        {/* 탭 버튼 */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("video")}
            className={`flex-1 py-3 px-4 font-semibold transition ${
              activeTab === "video"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            소개 영상
          </button>
          <button
            onClick={() => setActiveTab("seminar")}
            className={`flex-1 py-3 px-4 font-semibold transition ${
              activeTab === "seminar"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            세미나
          </button>
          <button
            onClick={() => setActiveTab("webinar")}
            className={`flex-1 py-3 px-4 font-semibold transition ${
              activeTab === "webinar"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            웨비나
          </button>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 영상 탭 */}
          {activeTab === "video" && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">DLAS 소개 영상</h3>
              <div className="aspect-[9/16] max-w-md mx-auto bg-black rounded-lg overflow-hidden">
                <iframe
                  src="https://www.youtube.com/embed/nIW3pJCzfOM"
                  title="DLAS 소개"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* 세미나 탭 */}
          {activeTab === "seminar" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-blue-600">DLAS 세미나</h3>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-bold text-lg mb-2">참가비</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-white p-3 rounded">
                    <span className="font-semibold">1인 신청</span>
                    <span className="text-lg font-bold text-blue-600">20만원</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded">
                    <span className="font-semibold">2인 신청</span>
                    <span className="text-lg font-bold text-blue-600">각 17만원</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded">
                    <span className="font-semibold">3인 신청</span>
                    <span className="text-lg font-bold text-blue-600">각 15만원</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">* 부가세 별도</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-lg mb-2">주요 내용</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>DLAS 프로그램 전체 기능 소개</li>
                  <li>실전 활용 팁 및 노하우</li>
                  <li>질의응답 세션</li>
                </ul>
              </div>

              <button
                onClick={() => window.open(seminarLink, "_blank", "noopener,noreferrer")}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-lg
                           hover:bg-blue-700 active:scale-95 transition shadow-lg text-lg"
              >
                세미나 신청하기
              </button>
            </div>
          )}

          {/* 웨비나 탭 */}
          {activeTab === "webinar" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-purple-600">DLAS 웨비나</h3>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-bold text-lg mb-2">참가비</h4>
                <div className="flex justify-between items-center bg-white p-3 rounded">
                  <span className="font-semibold">참가비</span>
                  <span className="text-lg font-bold text-purple-600">7만원</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">* 부가세 포함</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-lg mb-2">주요 내용</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>온라인으로 진행되는 웨비나</li>
                  <li>DLAS 핵심 기능 집중 학습</li>
                  <li>실시간 Q&A</li>
                </ul>
              </div>

              <button
                onClick={() => window.open(webinaLink, "_blank", "noopener,noreferrer")}
                className="w-full py-4 bg-purple-600 text-white font-bold rounded-lg
                           hover:bg-purple-700 active:scale-95 transition shadow-lg text-lg"
              >
                웨비나 신청하기
              </button>
            </div>
          )}
        </div>

        {/* 하단 닫기 버튼 */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-200 text-gray-700 font-medium rounded-lg
                       hover:bg-gray-300 active:scale-95 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
