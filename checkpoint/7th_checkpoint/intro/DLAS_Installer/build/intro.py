import sys
import os
from PySide6.QtWidgets import QApplication, QWidget, QVBoxLayout
from PySide6.QtMultimedia import QMediaPlayer, QAudioOutput
from PySide6.QtMultimediaWidgets import QVideoWidget
from PySide6.QtCore import QUrl, Qt, QLibraryInfo

# Qt plugin path 설정
os.environ["QT_PLUGIN_PATH"] = QLibraryInfo.path(QLibraryInfo.PluginsPath)
print("QT_PLUGIN_PATH =", os.environ["QT_PLUGIN_PATH"])

class TransparentVideoPlayer(QWidget):
    def __init__(self, video_path):
        super().__init__()

        print("Initializing TransparentVideoPlayer...")

        # ✅ 프레임 제거 + 항상 맨 위
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)

        # ✅ 반투명한 배경 (검정색 + 약간 투명)
        self.setStyleSheet("background-color: rgba(0, 0, 0, 100);")

        # ✅ 비디오 위젯은 불투명하게 (투명하면 안 보일 수 있음)
        self.video_widget = QVideoWidget(self)
        self.video_widget.setStyleSheet("background-color: black;")

        # ✅ 미디어 플레이어 설정
        self.player = QMediaPlayer()
        self.audio_output = QAudioOutput()
        self.player.setAudioOutput(self.audio_output)
        self.player.setVideoOutput(self.video_widget)
        self.player.setSource(QUrl.fromLocalFile(video_path))

        # 오류 메시지 출력
        self.player.errorOccurred.connect(lambda err, err_str: print("❌ Player error:", err_str))

        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.video_widget)
        self.setLayout(layout)

        self.player.mediaStatusChanged.connect(self.check_media_status)
        print("▶️ Starting video playback...")
        self.player.play()

    def check_media_status(self, status):
        print("Media status:", status)
        if status == QMediaPlayer.MediaStatus.EndOfMedia:
            print("✅ Video finished.")
            self.close()  # 즉시 종료

if __name__ == "__main__":
    print("🚀 Application starting...")
    app = QApplication(sys.argv)

    video_path = "C:/Users/user/Desktop/intro/intro.mp4"
    print("🎞️ Video path:", video_path)
    if not os.path.exists(video_path):
        print("❌ Video file not found!")
        input("Press Enter to exit...")
        sys.exit(1)

    player = TransparentVideoPlayer(video_path)

    # ✅ 중앙 위치, 적당한 크기 설정
    screen = app.primaryScreen().geometry()
    width, height = 800, 450
    x = (screen.width() - width) // 2
    y = (screen.height() - height) // 2
    player.setGeometry(x, y, width, height)

    player.show()

    sys.exit(app.exec())

# 콘솔 유지용 (필요 없으면 삭제해도 됨)
input("Press Enter to exit...")
