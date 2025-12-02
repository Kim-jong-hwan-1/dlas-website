"use client";

interface SeminarModalProps {
  onClose?: () => void;
}

export default function SeminarModal({ onClose }: SeminarModalProps) {
  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <div
      className="relative w-full h-full bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={handleClose}
        aria-label="닫기"
        className="absolute right-4 top-4 z-[9999] h-10 w-10 rounded-full
                   bg-black/90 text-white shadow-lg
                   flex items-center justify-center
                   hover:bg-black active:scale-95
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-black
                   transition"
      >
        <span className="text-2xl leading-none">×</span>
      </button>

      {/* 모달 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 sm:px-6 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center">지그 자동화 모듈</h2>
      </div>

      {/* 영상 영역 */}
      <div className="flex-1 bg-white p-4 sm:p-6 flex flex-col">
        <div className="flex-1 bg-black rounded-lg overflow-hidden shadow-lg">
          <iframe
            src="https://www.youtube.com/embed/4HxD16Tr2mg"
            title="지그 자동화 모듈"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>

      {/* 하단 버튼 영역 */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-t">
        <button
          onClick={handleClose}
          className="w-full py-3 rounded-lg bg-gray-500 text-white
                     hover:bg-gray-600 active:scale-95
                     font-medium transition shadow-lg text-base sm:text-lg"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
