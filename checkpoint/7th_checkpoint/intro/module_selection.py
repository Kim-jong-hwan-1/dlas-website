import sys
import os
import subprocess
from PySide6.QtWidgets import QMainWindow, QWidget, QVBoxLayout, QLabel, QGridLayout, QGraphicsOpacityEffect
from PySide6.QtGui import QPixmap, QCursor, QMouseEvent, QIcon, QGuiApplication
from PySide6.QtCore import Qt, QEasingCurve, QPropertyAnimation

# ✅ PyInstaller-safe 리소스 경로
def resource_path(relative_path):
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

# ✅ 모듈 목록
MODULES = [
    "FAST IMAGE CONVERTER",
    "FAST MODIFIER",
    "FAST TRANSFER JIG MAKER",
    "FAST HTML VIEWER CONVERTER",
    "FAST DENTURE BOOLEANER",
    "FAST STL REDUCER",
    "CROWN CAD",
    "DENTURE CAD",
    "BITE FINDER",
]

class ClickableImage(QLabel):
    def __init__(self, module_name, enabled=True, callback=None):
        super().__init__()
        self.module_name = module_name
        self.enabled = enabled
        self.callback = callback

        self.setFixedSize(220, 140)
        self.setAlignment(Qt.AlignCenter)

        image_path = resource_path(f"{module_name.lower().replace(' ', '_')}.png")
        if os.path.exists(image_path):
            pixmap = QPixmap(image_path)
            if not pixmap.isNull():
                self.setPixmap(pixmap.scaled(self.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation))

        common_style = """
            QLabel {
                border-radius: 8px;
                background-color: white;
                transform: translateY(100px);
            }
        """

        if self.enabled:
            self.setCursor(QCursor(Qt.PointingHandCursor))
            self.setStyleSheet(common_style + """
                QLabel:hover {
                    border: 2px solid #0078d7;
                    background-color: #f5faff;
                }
            """)
        else:
            self.setStyleSheet(common_style)
            opacity = QGraphicsOpacityEffect(self)
            opacity.setOpacity(0.3)
            self.setGraphicsEffect(opacity)

    def resizeEvent(self, event):
        if self.pixmap():
            self.setPixmap(self.pixmap().scaled(self.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation))

    def mousePressEvent(self, event: QMouseEvent):
        if self.enabled and self.callback:
            self.animate_click()
            self.callback(self.module_name)

    def animate_click(self):
        animation = QPropertyAnimation(self, b"geometry", self)
        animation.setDuration(150)
        animation.setEasingCurve(QEasingCurve.InOutQuad)
        original_geom = self.geometry()
        shrink_geom = original_geom.adjusted(5, 5, -5, -5)
        animation.setStartValue(original_geom)
        animation.setKeyValueAt(0.5, shrink_geom)
        animation.setEndValue(original_geom)
        animation.start()
        self.animation = animation

class ModuleSelectionWindow(QMainWindow):
    def __init__(self, available_modules):
        super().__init__()
        self.setWindowTitle("DLAS")
        self.setFixedSize(800, 560)
        self.setWindowIcon(QIcon(resource_path("D.png")))
        self.setStyleSheet("background-color: white;")

        screen = QGuiApplication.primaryScreen().availableGeometry()
        self.move((screen.width() - 800) // 2, (screen.height() - 560) // 2)

        central = QWidget()
        outer_layout = QVBoxLayout()
        outer_layout.setContentsMargins(20, 30, 20, 5)
        outer_layout.setSpacing(8)

        # 타이틀 이미지
        title_label = QLabel()
        title_label.setAlignment(Qt.AlignCenter)
        title_pixmap = QPixmap(resource_path("modules.png"))
        if not title_pixmap.isNull():
            title_label.setPixmap(title_pixmap.scaledToHeight(50, Qt.SmoothTransformation))
        outer_layout.addWidget(title_label)

        # 모듈 이미지 그리드
        grid = QGridLayout()
        grid.setSpacing(8)

        row, col = 0, 0
        for module in MODULES:
            enabled = any(
                module.strip().lower() == available.strip().lower()
                for available in available_modules
            )
            image_label = ClickableImage(module, enabled, self.module_selected)
            grid.addWidget(image_label, row, col)
            col += 1
            if col == 3:
                col = 0
                row += 1

        outer_layout.addLayout(grid)

        # Footer
        footer_label = QLabel("DLAS v1.0.3 © 2025 Dental Lab Automation Solution - All rights reserved.")
        footer_label.setStyleSheet("color: #999999; font-size: 10px;")
        footer_label.setAlignment(Qt.AlignRight | Qt.AlignBottom)
        outer_layout.addWidget(footer_label)

        central.setLayout(outer_layout)
        self.setCentralWidget(central)

    def module_selected(self, module_name):
        print(f"모듈 선택됨: {module_name}")
        normalized = module_name.lower().replace(" ", "_")

        try:
            subprocess.Popen([sys.executable, os.path.abspath(sys.argv[0]), f"--module={normalized}"])

            self.close()
        except Exception as e:
            print(f"❌ 모듈 실행 오류: {e}")
