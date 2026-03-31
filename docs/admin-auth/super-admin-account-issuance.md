# 이메일 인증 회원가입 + 슈퍼 어드민 권한 관리

## 개요

현재 계정 흐름은 아래 두 축으로 동작합니다.

- 일반 사용자는 `/register` 에서 이메일과 비밀번호로 회원가입합니다.
- 가입 직후에는 기본 권한 `USER` 만 부여되며, 이메일 인증을 완료해야 로그인할 수 있습니다.
- 더 높은 권한이 필요하면 슈퍼 어드민이 `/admin/accounts` 에서 역할을 `ADMIN` 으로 변경합니다.
- 슈퍼 어드민이 직접 만든 계정은 즉시 사용 가능하며, 초기 비밀번호 `1234` 로 로그인한 뒤 첫 로그인에서 비밀번호를 변경해야 합니다.

## 회원가입 흐름

1. 사용자가 `/register` 에서 이메일과 비밀번호를 입력합니다.
2. 서버는 `USER` 권한의 미인증 계정을 저장합니다.
3. 가입한 이메일로 인증 링크를 보냅니다.
4. 사용자가 메일의 링크(`/verify-email?token=...`)를 엽니다.
5. 이메일 인증이 완료되면 `/login` 에서 로그인할 수 있습니다.

정책:

- 기본 권한은 항상 `USER`
- 이메일 인증 전 로그인 불가
- 같은 이메일로 재가입하면, 아직 미인증 계정인 경우 새 인증 링크로 갱신
- 이미 인증된 이메일이면 중복 가입 불가

## 슈퍼 어드민

부트스트랩 슈퍼 어드민은 서버 시작 시 자동 보장됩니다.

```env
SUPER_ADMIN_ENABLED=true
SUPER_ADMIN_EMAIL=superadmin@stk.local
SUPER_ADMIN_NAME=슈퍼 어드민
SUPER_ADMIN_PASSWORD=change-this-super-admin-password
```

환경변수:

- `SUPER_ADMIN_ENABLED`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_NAME`
- `SUPER_ADMIN_PASSWORD`

기본 동작:

- 같은 이메일이 없으면 `SUPER_ADMIN` 계정을 생성
- 같은 이메일이 있는데 역할이 다르면 `SUPER_ADMIN` 으로 보정
- 슈퍼 어드민 계정은 이메일 인증이 완료된 상태로 유지
- 이메일 또는 비밀번호가 비어 있으면 부트스트랩을 건너뜀

## 메일 설정

Gmail SMTP 예시:

```env
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=your-gmail@gmail.com
SPRING_MAIL_PASSWORD=your-16-char-app-password
SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true
MAIL_FROM=your-gmail@gmail.com
APP_FRONTEND_BASE_URL=http://localhost:3000
APP_AUTH_VERIFICATION_EXPIRATION_HOURS=24
```

주의:

- `MAIL_FROM` 은 실제 발송에 사용하는 서비스 메일 계정입니다.
- 가입자의 이메일은 `MAIL_FROM` 이 아니라 인증 메일의 수신자입니다.
- Gmail 일반 비밀번호가 아니라 앱 비밀번호를 사용해야 합니다.

## 프런트 라우트

- `/login`
  - 이메일 인증 완료 계정 로그인
- `/register`
  - 이메일 회원가입
- `/verify-email`
  - 이메일 인증 완료 화면
- `/setup-password`
  - 슈퍼 어드민이 만든 계정의 초기 비밀번호 변경
- `/admin/accounts`
  - 슈퍼 어드민 전용 사용자 관리
  - 권한 변경, 초기 비밀번호 재설정 가능

## API

### 회원가입

`POST /api/auth/register`

```json
{
  "email": "user@company.com",
  "password": "Password123!"
}
```

### 이메일 인증

`GET /api/auth/verify-email?token=...`

### 로그인

`POST /api/auth/login`

이메일 인증이 끝나지 않은 계정은 로그인할 수 없습니다.

### 계정 목록 조회

`GET /api/admin/users`

권한:

- `SUPER_ADMIN`

응답에는 `emailVerified`, `role`, `passwordChangeRequired` 가 포함됩니다.

### 계정 권한 변경

`PUT /api/admin/users/{id}/role`

정책:

- `SUPER_ADMIN` 만 가능
- `USER`, `ADMIN` 으로만 변경 가능
- `SUPER_ADMIN` 계정은 변경 불가

### 초기 비밀번호 재설정

`POST /api/admin/users/{id}/reset-password`

정책:

- `SUPER_ADMIN` 만 가능
- 재설정 후 초기 비밀번호는 `1234`
- 다음 로그인 시 `/setup-password` 로 이동

## 저장 데이터

`users` 테이블 주요 컬럼:

- `role`
- `password_change_required`
- `email_verified`
- `email_verification_token`
- `email_verification_expires_at`

## 운영 절차

1. 사용자가 직접 회원가입한다.
2. 인증 메일에서 링크를 눌러 이메일 인증을 완료한다.
3. 로그인한다.
4. 더 높은 권한이 필요하면 슈퍼 어드민이 `/admin/accounts` 에서 권한을 바꾼다.
5. 슈퍼 어드민이 직접 만든 계정은 초기 비밀번호 변경을 거쳐 사용한다.
