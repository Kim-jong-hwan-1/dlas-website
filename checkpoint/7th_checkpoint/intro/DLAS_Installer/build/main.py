import sys
import os
import json
import urllib.request
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout,
    QLineEdit, QPushButton, QLabel, QMainWindow, QFrame, QCheckBox, QSpacerItem, QSizePolicy
)
from PySide6.QtGui import QPixmap, QIcon, QCursor, QMovie
from PySide6.QtCore import Qt, QUrl, QSettings, QThread, Signal, QObject, QSize
from PySide6.QtMultimedia import QMediaPlayer, QAudioOutput
from PySide6.QtMultimediaWidgets import QVideoWidget
from PySide6.QtCore import QLibraryInfo
from module_selection import ModuleSelectionWindow

class LoginWorker(QObject):
    finished = Signal(dict)
    error = Signal(Exception)

    def __init__(self, email, password):
        super().__init__()
        self.email = email
        self.password = password

    def run(self):
        try:
            url = "http://localhost:8000/auth/login"
            data = json.dumps({"email": self.email, "password": self.password}).encode("utf-8")
            headers = {"Content-Type": "application/json"}
            req = urllib.request.Request(url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=20) as response:
                result = json.loads(response.read())
                self.finished.emit(result)
        except Exception as e:
            self.error.emit(e)

class TransparentVideoPlayer(QWidget):
    def __init__(self, video_path):
        super().__init__()
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.setStyleSheet("background-color: rgba(0, 0, 0, 100);")

        self.video_widget = QVideoWidget(self)
        self.video_widget.setStyleSheet("background-color: black;")

        self.player = QMediaPlayer()
        self.audio_output = QAudioOutput()
        self.player.setAudioOutput(self.audio_output)
        self.player.setVideoOutput(self.video_widget)
        self.player.setSource(QUrl.fromLocalFile(video_path))
        self.player.errorOccurred.connect(lambda err, err_str: print("❌ Player error:", err_str))

        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.video_widget)
        self.setLayout(layout)

        self.player.mediaStatusChanged.connect(self.check_media_status)
        self.player.play()

        self.installEventFilter(self)

    def eventFilter(self, source, event):
        if event.type() in [event.Type.MouseButtonPress, event.Type.KeyPress]:
            self.player.stop()
            self.close()
            self.open_login()
            return True
        return super().eventFilter(source, event)

    def check_media_status(self, status):
        if status == QMediaPlayer.MediaStatus.EndOfMedia:
            self.close()
            self.open_login()

    def open_login(self):
        self.login_window = LoginWindow()
        geo = self.geometry()
        x, y, w, h = geo.x(), geo.y(), geo.width(), geo.height()
        self.login_window.setGeometry(x, y + 10, w, h)
        self.login_window.show()

class LoginWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("DLAS Login")
        icon_path = "D.png"
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))

        self.setFixedSize(800, 450)
        self.setStyleSheet("background-color: white;")
        self.settings = QSettings("DLAS", "Login")

        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(30, 20, 30, 5)

        logo_label = QLabel()
        logo_image_path = "white logo.jpg"
        if os.path.exists(logo_image_path):
            pixmap = QPixmap(logo_image_path)
            scaled = pixmap.scaledToWidth(580, Qt.SmoothTransformation)
            logo_label.setPixmap(scaled)
            logo_label.setAlignment(Qt.AlignCenter)
            main_layout.addWidget(logo_label)
            main_layout.addSpacerItem(QSpacerItem(10, 12, QSizePolicy.Minimum, QSizePolicy.Fixed))

        frame = QFrame()
        frame.setStyleSheet("""
            QFrame {
                border: 2px solid #DDDDDD;
                border-radius: 15px;
                background-color: #FFFFFF;
            }
        """)
        frame_layout = QVBoxLayout()
        frame_layout.setSpacing(15)
        frame_layout.setContentsMargins(20, 20, 20, 20)

        self.email_input = QLineEdit()
        self.email_input.setPlaceholderText("Enter your email")
        self.email_input.setFixedHeight(40)
        self.email_input.setStyleSheet("padding: 5px; font-size: 16px;")
        self.email_input.returnPressed.connect(self.try_login)
        frame_layout.addWidget(self.email_input)

        self.pw_input = QLineEdit()
        self.pw_input.setPlaceholderText("Enter your password")
        self.pw_input.setEchoMode(QLineEdit.Password)
        self.pw_input.setFixedHeight(40)
        self.pw_input.setStyleSheet("padding: 5px; font-size: 16px;")
        self.pw_input.returnPressed.connect(self.try_login)
        frame_layout.addWidget(self.pw_input)

        self.remember_password_checkbox = QCheckBox("Remember Password")
        frame_layout.addWidget(self.remember_password_checkbox)

        self.login_btn = QPushButton("Login")
        self.login_btn.setFixedHeight(40)
        self.login_btn.setStyleSheet("""
            QPushButton {
                background-color: #888888;
                color: white;
                font-size: 16px;
                border-radius: 10px;
            }
            QPushButton:hover {
                background-color: #666666;
            }
        """)
        self.login_btn.setCursor(QCursor(Qt.PointingHandCursor))
        self.login_btn.clicked.connect(self.try_login)
        frame_layout.addWidget(self.login_btn)

        frame.setLayout(frame_layout)
        main_layout.addWidget(frame)

        self.footer_label = QLabel("DLAS v1.0.3 © 2025 Dental Lab Automation Solution - All rights reserved.")
        self.footer_label.setStyleSheet("color: #999999; font-size: 10px; padding-right: 0px; margin-bottom: 0px;")
        self.footer_label.setAlignment(Qt.AlignRight | Qt.AlignTop)
        main_layout.addStretch(1)
        main_layout.addWidget(self.footer_label)

        central_widget.setLayout(main_layout)
        self.load_settings()
        self.create_overlay_spinner()

    def load_settings(self):
        self.email_input.setText(self.settings.value("email", ""))
        if self.settings.value("remember_password") == "true":
            self.pw_input.setText(self.settings.value("password", ""))
            self.remember_password_checkbox.setChecked(True)

    def save_settings(self):
        self.settings.setValue("email", self.email_input.text())
        if self.remember_password_checkbox.isChecked():
            self.settings.setValue("password", self.pw_input.text())
            self.settings.setValue("remember_password", "true")
        else:
            self.settings.setValue("password", "")
            self.settings.setValue("remember_password", "false")

    def create_overlay_spinner(self):
        self.overlay = QWidget(self.centralWidget())
        self.overlay.setStyleSheet("background: transparent;")
        self.overlay.setAttribute(Qt.WA_TransparentForMouseEvents, True)
        self.overlay.setGeometry(self.centralWidget().rect())
        layout = QVBoxLayout(self.overlay)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setAlignment(Qt.AlignCenter)

        self.spinner = QLabel(self.overlay)
        self.spinner.setStyleSheet("background-color: transparent; border: none;")
        gif_path = os.path.join(os.path.dirname(__file__), "loading.gif")
        self.movie = QMovie(gif_path)
        self.movie.setScaledSize(QSize(100, 100))
        self.spinner.setFixedSize(QSize(100, 100))
        self.spinner.setMovie(self.movie)

        layout.addWidget(self.spinner)
        self.overlay.raise_()
        self.overlay.show()

    def try_login(self):
        self.login_btn.setEnabled(False)

        if not self.overlay:
            self.create_overlay_spinner()

        self.movie.start()
        self.overlay.raise_()

        if not hasattr(self, "status_label"):
            self.status_label = QLabel(self.centralWidget())
            self.status_label.setAlignment(Qt.AlignCenter)
            self.status_label.setStyleSheet("color: #555555; font-size: 12px; margin-top: 4px;")
            main_layout = self.centralWidget().layout()
            main_layout.insertWidget(main_layout.count() - 1, self.status_label)

        self.status_label.setText("Logging in...")
        self.status_label.show()

        email = self.email_input.text()
        password = self.pw_input.text()

        self.thread = QThread()
        self.worker = LoginWorker(email, password)
        self.worker.moveToThread(self.thread)
        self.thread.started.connect(self.worker.run)
        self.worker.finished.connect(self.on_login_success)
        self.worker.error.connect(self.on_login_error)
        self.worker.finished.connect(self.thread.quit)
        self.worker.error.connect(self.thread.quit)
        self.worker.finished.connect(self.worker.deleteLater)
        self.worker.error.connect(self.worker.deleteLater)
        self.thread.finished.connect(self.thread.deleteLater)
        self.thread.start()

    def on_login_success(self, result):
        token = result.get("access_token")
        self.save_settings()
        self.close()

        self.status_label.setText("📡 Fetching modules...")

        try:
            headers = {"Authorization": f"Bearer {token}"}
            req = urllib.request.Request("http://localhost:8000/admin/my-license", headers=headers)  # ✅ 수정됨
            with urllib.request.urlopen(req, timeout=10) as res:
                license_info = json.loads(res.read())
                modules = license_info.get("enabled_modules", [])
                print("✅ 활성화된 모듈:", modules)
        except Exception as e:
            print("❌ Failed to fetch /admin/my-license:", e)
            modules = []

        self.module_window = ModuleSelectionWindow(modules)
        self.module_window.show()

        self.overlay.hide()
        self.status_label.hide()

    def on_login_error(self, e):
        self.overlay.hide()
        error_message = str(e)
        if 'timed out' in error_message:
            self.status_label.setText("Login failed: Unable to connect to the server (timeout).")
        elif '401' in error_message or '403' in error_message:
            self.status_label.setText("Login failed: Invalid email or password.")
        elif '404' in error_message:
            self.status_label.setText("Login failed: Login endpoint not found.")
        else:
            self.status_label.setText(f"Login failed: {error_message}")
        self.status_label.show()
        print("❌ Login failed:", e)
        self.login_btn.setEnabled(True)

    def resizeEvent(self, event):
        if self.overlay:
            self.overlay.setGeometry(self.centralWidget().rect())
        super().resizeEvent(event)

if __name__ == "__main__":
    os.environ["QT_PLUGIN_PATH"] = QLibraryInfo.path(QLibraryInfo.PluginsPath)

    app = QApplication(sys.argv)

    video_path = "intro.mp4"
    if not os.path.exists(video_path):
        print("❌ Video file not found!")
        sys.exit(1)

    player = TransparentVideoPlayer(video_path)

    screen = app.primaryScreen().geometry()
    width, height = 800, 450
    x = (screen.width() - width) // 2
    y = (screen.height() - 30) // 2
    player.setGeometry(x, y - 30, width, height)

    player.show()
    sys.exit(app.exec())
