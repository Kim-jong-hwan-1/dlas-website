# SMS 인증 백엔드 API 구현 가이드

## 개요
본인인증을 통한 3일 무료 라이센스 발급 시스템을 위한 백엔드 API 구현 가이드입니다.
NCP SENS (Naver Cloud Platform Simple & Easy Notification Service)를 사용합니다.

---

## 1. NCP SENS 설정

### 1.1 NCP 계정 생성 및 프로젝트 설정
1. [Naver Cloud Platform](https://www.ncloud.com/) 회원가입
2. 콘솔 로그인 후 "Application" → "Simple & Easy Notification Service" 선택
3. SMS 서비스 신청

### 1.2 발신번호 등록
1. SENS 콘솔에서 "발신번호 관리" 메뉴
2. 사업자등록증 또는 통신서비스 이용증명원 제출
3. 심사 완료 후 발신번호 사용 가능 (보통 1-2일 소요)

### 1.3 인증 정보 획득
다음 정보를 `.env` 파일에 저장:
```env
NCP_ACCESS_KEY=your_access_key
NCP_SECRET_KEY=your_secret_key
NCP_SERVICE_ID=your_service_id
NCP_SENDER_PHONE=01012345678
```

**획득 방법:**
- `NCP_ACCESS_KEY`, `NCP_SECRET_KEY`:
  - 콘솔 우측 상단 계정 → "계정 관리" → "인증키 관리"
- `NCP_SERVICE_ID`:
  - SENS 콘솔 → SMS → 프로젝트 선택 시 URL에서 확인
  - 예: `ncp:sms:kr:123456789012:service-id`에서 `service-id` 부분
- `NCP_SENDER_PHONE`:
  - 등록한 발신번호 (하이픈 제거)

---

## 2. 필요한 API 엔드포인트

백엔드 서버 `https://license-server-697p.onrender.com`에 다음 엔드포인트를 구현해야 합니다.

### 2.1 인증번호 발송 API

**Endpoint:** `POST /sms/send-verification`

**Request Body:**
```json
{
  "phoneNumber": "01012345678",
  "userID": "user123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "인증번호가 발송되었습니다."
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "인증번호 발송에 실패했습니다."
}
```

**구현 로직:**
1. 6자리 랜덤 인증번호 생성
2. Redis 또는 DB에 저장 (유효기간 3분)
   - Key: `phone:${phoneNumber}`
   - Value: `{ code: "123456", userID: "user123", expiresAt: timestamp }`
3. NCP SENS API를 통해 SMS 발송
4. 동일 번호로 하루 최대 5회 제한 (스팸 방지)

**NCP SENS API 호출 예시 (Node.js):**
```javascript
const crypto = require('crypto');
const axios = require('axios');

async function sendSMS(phoneNumber, verificationCode) {
  const timestamp = Date.now().toString();
  const serviceId = process.env.NCP_SERVICE_ID;
  const accessKey = process.env.NCP_ACCESS_KEY;
  const secretKey = process.env.NCP_SECRET_KEY;
  const senderPhone = process.env.NCP_SENDER_PHONE;

  // Signature 생성
  const method = 'POST';
  const space = ' ';
  const newLine = '\n';
  const url = `/sms/v2/services/${serviceId}/messages`;
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(method);
  hmac.update(space);
  hmac.update(url);
  hmac.update(newLine);
  hmac.update(timestamp);
  hmac.update(newLine);
  hmac.update(accessKey);

  const signature = hmac.digest('base64');

  // SMS 발송 요청
  const response = await axios.post(
    `https://sens.apigw.ntruss.com/sms/v2/services/${serviceId}/messages`,
    {
      type: 'SMS',
      contentType: 'COMM',
      countryCode: '82',
      from: senderPhone,
      content: `[DLAS] 인증번호 [${verificationCode}]를 입력해주세요. (유효시간 3분)`,
      messages: [
        {
          to: phoneNumber,
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': accessKey,
        'x-ncp-apigw-signature-v2': signature,
      },
    }
  );

  return response.data;
}
```

---

### 2.2 인증번호 확인 API

**Endpoint:** `POST /sms/verify-code`

**Request Body:**
```json
{
  "phoneNumber": "01012345678",
  "code": "123456",
  "userID": "user123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "인증이 완료되었습니다.",
  "license": {
    "licenseKey": "XXXX-XXXX-XXXX-XXXX",
    "expiryDate": "2025-11-02T00:00:00Z",
    "duration": 3
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "인증번호가 일치하지 않습니다."
}
```

**구현 로직:**
1. Redis/DB에서 인증번호 조회
2. 유효기간 확인 (3분 초과 시 에러)
3. 입력된 코드와 비교
4. 인증 성공 시:
   - 해당 번호로 이미 발급받았는지 확인 (중복 방지)
   - 3일 무료 라이센스 생성
   - 사용자 계정에 라이센스 연결
   - 인증 기록 저장 (phoneNumber, userID, timestamp)
5. 인증번호 삭제 (재사용 방지)

**라이센스 생성 로직:**
```javascript
async function issueTrialLicense(userID, phoneNumber) {
  // 1. 중복 체크 (이미 해당 번호로 발급받았는지)
  const existingVerification = await db.phoneVerifications.findOne({
    phoneNumber: phoneNumber,
    licenseIssued: true
  });

  if (existingVerification) {
    throw new Error('이미 해당 번호로 무료 라이센스를 발급받으셨습니다.');
  }

  // 2. 라이센스 키 생성
  const licenseKey = generateLicenseKey(); // XXXX-XXXX-XXXX-XXXX 형식

  // 3. 만료일 계산 (3일 후)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 3);

  // 4. 라이센스 DB에 저장
  const license = await db.licenses.create({
    licenseKey: licenseKey,
    userID: userID,
    type: 'TRIAL',
    duration: 3,
    expiryDate: expiryDate,
    modules: 'ALL', // 모든 모듈
    createdAt: new Date(),
    activatedAt: new Date(),
  });

  // 5. 인증 기록 저장
  await db.phoneVerifications.create({
    phoneNumber: phoneNumber,
    userID: userID,
    verifiedAt: new Date(),
    licenseIssued: true,
    licenseKey: licenseKey,
  });

  return license;
}
```

---

## 3. 데이터베이스 스키마

### 3.1 phone_verifications 테이블
```sql
CREATE TABLE phone_verifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  phone_number VARCHAR(11) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  verification_code VARCHAR(6),
  code_expires_at DATETIME,
  verified_at DATETIME,
  license_issued BOOLEAN DEFAULT FALSE,
  license_key VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone_number),
  INDEX idx_user (user_id)
);
```

### 3.2 licenses 테이블 (기존 테이블에 추가)
기존 라이센스 테이블에 `type` 컬럼 추가:
```sql
ALTER TABLE licenses ADD COLUMN type VARCHAR(20) DEFAULT 'PAID';
-- type: 'PAID', 'TRIAL', 'FAMILY' 등
```

---

## 4. 보안 고려사항

### 4.1 Rate Limiting
- 동일 번호: 하루 최대 5회 인증번호 발송
- 동일 IP: 시간당 최대 10회 요청
- 동일 userID: 하루 최대 3회 인증 시도

### 4.2 개인정보 보호
- 전화번호는 해시 처리 후 저장 권장
- 인증 완료 후 원본 인증번호는 즉시 삭제
- 로그에 전화번호/인증번호 기록 금지

### 4.3 중복 발급 방지
- 1인당 1회만 무료 라이센스 발급
- 전화번호 기준으로 중복 체크
- 악용 시 블랙리스트 처리

---

## 5. 테스트

### 5.1 개발 환경 테스트
NCP SENS는 실제 SMS가 발송되므로, 개발 시 테스트 모드 구현 권장:

```javascript
const IS_TEST_MODE = process.env.NODE_ENV === 'development';

if (IS_TEST_MODE) {
  // 개발 환경에서는 항상 "123456" 고정
  console.log(`[TEST MODE] 인증번호: ${verificationCode}`);
  // SMS 발송 생략
} else {
  // 실제 SMS 발송
  await sendSMS(phoneNumber, verificationCode);
}
```

### 5.2 API 테스트 예시
```bash
# 1. 인증번호 발송
curl -X POST https://license-server-697p.onrender.com/sms/send-verification \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "01012345678",
    "userID": "testuser123"
  }'

# 2. 인증번호 확인
curl -X POST https://license-server-697p.onrender.com/sms/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "01012345678",
    "code": "123456",
    "userID": "testuser123"
  }'
```

---

## 6. 비용 및 모니터링

### 6.1 예상 비용
- NCP SENS SMS: 약 9원/건
- 하루 100명 가입 시: 900원/일
- 월 3,000명 가입 시: 약 27,000원/월

### 6.2 모니터링 항목
- SMS 발송 성공률
- 인증 완료율
- 라이센스 발급 수
- 일일/월별 SMS 발송량
- 에러 로그 (발송 실패, 중복 시도 등)

---

## 7. 프론트엔드 통합 완료

프론트엔드는 이미 구현 완료되었습니다:
- `components/PhoneVerification.tsx`: SMS 인증 UI 컴포넌트
- `app/page.tsx`: 무료 라이센스 버튼 → SMS 인증 모달 연동
- 버튼 텍스트: "3일 무료 라이센스 받기 (본인인증)"

위 백엔드 API만 구현하면 즉시 사용 가능합니다.

---

## 8. 참고 자료
- [NCP SENS 공식 문서](https://api.ncloud-docs.com/docs/ai-application-service-sens-smsv2)
- [NCP SENS API 가이드](https://guide.ncloud-docs.com/docs/sens-sens-1-1)
- [Node.js Signature 생성 예시](https://api.ncloud-docs.com/docs/common-ncpapi)
