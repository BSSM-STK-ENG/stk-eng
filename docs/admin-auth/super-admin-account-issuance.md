# 슈퍼 어드민 기반 계정 발급 흐름

## 개요

이번 변경으로 공개 회원가입은 비활성화되었고, 계정은 슈퍼 어드민이 직접 발급합니다. 발급된 계정은 첫 로그인 직후 반드시 새 비밀번호를 설정해야 하며, 비밀번호 설정 전에는 일반 기능에 접근할 수 없습니다.

## 핵심 변경 사항

- 공개 `POST /api/auth/register` 는 더 이상 계정을 만들지 않고 `403` 으로 차단됩니다.
- 서버 시작 시 슈퍼 어드민 계정이 자동 보장됩니다.
- 슈퍼 어드민은 웹의 `계정 발급` 화면에서 `USER` 또는 `ADMIN` 계정을 발급할 수 있습니다.
- 발급된 계정은 `passwordChangeRequired=true` 상태로 저장됩니다.
- 첫 로그인 후 `/setup-password` 화면에서 새 비밀번호를 설정해야 사용이 가능합니다.
- 백엔드도 `PasswordChangeRequiredFilter` 로 비밀번호 설정 전 일반 API 접근을 차단합니다.

## 부트스트랩 슈퍼 어드민

애플리케이션 시작 시 아래 설정으로 슈퍼 어드민 계정을 확인하거나 생성합니다.

```yaml
app:
  bootstrap:
    super-admin:
      enabled: true
      email: superadmin@stk.local
      password: ChangeMe123!
```

운영 환경에서는 반드시 환경변수로 덮어써야 합니다.

- `APP_BOOTSTRAP_SUPER_ADMIN_ENABLED`
- `APP_BOOTSTRAP_SUPER_ADMIN_EMAIL`
- `APP_BOOTSTRAP_SUPER_ADMIN_PASSWORD`

기본 동작:

- 동일 이메일 계정이 없으면 새 `SUPER_ADMIN` 계정을 생성합니다.
- 동일 이메일 계정이 있는데 역할이 다르면 `SUPER_ADMIN` 으로 승격합니다.
- 새로 생성된 슈퍼 어드민은 첫 로그인 후 비밀번호 변경이 필요합니다.

## 프런트 라우팅

- `/login`
  - 로그인 전용 화면
  - 회원가입 링크 제거
  - 슈퍼 어드민 발급 안내 표시
- `/setup-password`
  - 첫 로그인 비밀번호 설정 전용 화면
  - `passwordChangeRequired=true` 인 경우에만 접근 가능
- `/admin/accounts`
  - 슈퍼 어드민 전용 계정 발급 화면
  - 새 계정 발급과 계정 목록 확인 가능
- `/register`
  - 더 이상 회원가입 페이지가 아니며 `/login` 으로 리다이렉트

## API

### 로그인

`POST /api/auth/login`

응답 예시:

```json
{
  "token": "jwt-token",
  "email": "issued-user@company.com",
  "role": "USER",
  "passwordChangeRequired": true,
  "message": "Success"
}
```

### 초기 비밀번호 설정

`POST /api/auth/change-password`

요청 예시:

```json
{
  "newPassword": "NewPassword123!"
}
```

제약:

- 로그인된 사용자만 가능
- 현재 계정이 `passwordChangeRequired=true` 여야 함
- 새 비밀번호는 8자 이상

### 계정 목록 조회

`GET /api/admin/users`

권한:

- `SUPER_ADMIN` 만 가능

### 계정 발급

`POST /api/admin/users`

요청 예시:

```json
{
  "email": "new-user@company.com",
  "temporaryPassword": "TempPass123!",
  "role": "USER"
}
```

정책:

- `SUPER_ADMIN` 만 가능
- `SUPER_ADMIN` 계정은 발급 불가
- 중복 이메일 불가
- 임시 비밀번호는 8자 이상

## 저장 데이터

`users` 테이블에 아래 정보가 추가 또는 활용됩니다.

- `role`
  - `USER`
  - `ADMIN`
  - `SUPER_ADMIN`
- `password_change_required`
  - 첫 로그인 비밀번호 설정 필요 여부
- 기존 `default_provider`, `default_model` 컬럼은 유지

## 운영 절차

1. 서버를 올린다.
2. 슈퍼 어드민 계정으로 로그인한다.
3. 첫 로그인이라면 `/setup-password` 에서 비밀번호를 변경한다.
4. `계정 발급` 화면에서 사용자 계정을 만든다.
5. 발급한 이메일과 임시 비밀번호를 전달한다.
6. 사용자는 첫 로그인 후 즉시 비밀번호를 새로 설정한다.

## 검증

프런트:

- `npm test`
- `npm run build`

백엔드:

- `JAVA_HOME=/Users/heodongun/Library/Java/JavaVirtualMachines/corretto-17.0.13/Contents/Home /tmp/apache-maven-3.9.9/bin/mvn -B -Dtest=AuthServiceTest,AuthControllerTest,AdminUserManagementServiceTest,SuperAdminBootstrapServiceTest test`
- `JAVA_HOME=/Users/heodongun/Library/Java/JavaVirtualMachines/corretto-17.0.13/Contents/Home /tmp/apache-maven-3.9.9/bin/mvn -B -DskipTests package`
