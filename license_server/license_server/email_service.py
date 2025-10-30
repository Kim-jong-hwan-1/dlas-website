import aiosmtplib
import random
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")

    def generate_verification_code(self) -> str:
        """6자리 랜덤 인증번호 생성"""
        return str(random.randint(100000, 999999))

    def get_verification_email_html(self, code: str) -> str:
        """인증번호 이메일 HTML 템플릿"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>DLAS 이메일 인증</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">DLAS</h1>
                      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">이메일 본인인증</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        안녕하세요,<br>
                        DLAS 3일 무료 라이센스 발급을 위한 이메일 인증번호입니다.
                      </p>

                      <!-- Verification Code Box -->
                      <div style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                        <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">인증번호</p>
                        <p style="color: #667eea; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                          {code}
                        </p>
                      </div>

                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                        ⏱️ 이 인증번호는 <strong style="color: #667eea;">3분간 유효</strong>합니다.<br>
                        🔒 본인이 요청하지 않았다면 이 이메일을 무시하세요.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
                      <p style="color: #999999; font-size: 12px; line-height: 1.5; margin: 0;">
                        본 메일은 DLAS 본인인증을 위해 발송되었습니다.<br>
                        문의: <a href="mailto:support@dlas.io" style="color: #667eea; text-decoration: none;">support@dlas.io</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """

    async def send_verification_code(self, email: str, code: str) -> bool:
        """인증번호 이메일 발송"""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = "[DLAS] 이메일 인증번호"
            message["From"] = f"DLAS <{self.smtp_user}>"
            message["To"] = email

            html_content = self.get_verification_email_html(code)
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)

            # aiosmtplib을 사용한 비동기 이메일 발송
            # 포트 465는 SSL, 포트 587은 STARTTLS 사용
            use_ssl = self.smtp_port == 465
            await aiosmtplib.send(
                message,
                hostname=self.smtp_server,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=use_ssl,  # 465 포트는 SSL 사용
                start_tls=(not use_ssl),  # 587 포트는 STARTTLS 사용
                timeout=30,  # 30초 타임아웃 설정
            )

            print(f"✅ 이메일 발송 성공: {email}")
            return True
        except aiosmtplib.SMTPException as e:
            print(f"❌ SMTP 오류: {e}")
            return False
        except Exception as e:
            print(f"❌ 이메일 발송 실패: {e}")
            return False

# Singleton instance
email_service = EmailService()
