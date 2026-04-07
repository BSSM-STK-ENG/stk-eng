프로젝트 코드 리뷰 (핵심 요약)

요약
- 주로 Spring Boot + Spring Security 기반의 재고 관리 서비스.
- AI 통합(LLM) 기능 존재: 사용자별 API 키 저장·검증·호출 경로 포함.
- 전반적으로 구조가 잘 잡혀 있으나 보안/운영 관점의 중요한 취약점과 개선 여지가 있음.

심각도: Critical
1) 하드코딩된 기본 마스터 키
- 파일: src/main/java/com/stk/inventory/ai/service/CredentialCryptoService.java
- 문제: 소스에 base64 기본 마스터 키를 포함함(기본값 파라미터). 이 키로 모든 저장된 provider API 키를 복호화 가능.
- 영향: 리포지토리 노출만으로 모든 사용자별 LLM API 키 유출 가능.
- 권고: 즉시 기본 키 제거(코드에 비밀 포함 금지). 환경변수, Vault/KMS(예: AWS KMS/GCP KMS/HashiCorp Vault)로 이동. 이미 유출된 키는 전부 교체 및 재암호화.

2) JWT/비밀관리 위험
- 파일: src/main/java/com/stk/inventory/security/JwtTokenProvider.java
- 문제: jwt.secret이 프로퍼티로 주입됨(올바르지만, 배포전에 env/시크릿 매니저 사용 검증 필요). 또한 토큰 파싱로직이 예외를 넓게 잡아 실패 사유 표준화가 부족.
- 권고: jwt.secret은 반드시 시크릿 매니저에 저장하고 키 길이/회전 정책 수립. 토큰 검증 실패 시 자세한 원인(서명/만료 등)을 내부 로깅/모니터링으로 분류하되 클라이언트에는 노출 금지.

3) 기본 이메일 검증 플래그(true)
- 파일: src/main/java/com/stk/inventory/entity/User.java
- 문제: emailVerified 기본값이 true. 신규 가입자가 자동으로 검증된 상태가 될 위험.
- 권고: 기본값을 false로 변경. 가입 흐름에서 이메일 확인 완료 시만 true로 설정.

중간/높음 우선순위
4) 암호 변경 강제 필터 동작
- 파일: PasswordChangeRequiredFilter.java
- 관찰: 초기 비밀번호 강제화 논리 존재. 허용 경로 설정은 적절하지만, 향후 API 추가 시 경로 누락으로 우회될 수 있음.
- 권고: 허용 경로를 중앙화된 상수로 관리하고 테스트 추가.

5) CORS 구성
- 파일: SecurityConfig.java
- 문제: allowedOrigins 프로퍼티 처리는 좋음. 다만 conf.setAllowedHeaders(List.of("*"))와 setAllowCredentials(true) 조합 사용 시 일부 브라우저 정책/프록시에서 거부될 수 있음.
- 권고: 허용 헤더를 필요한 목록으로 제한하고, 운영 환경에서 allowedOrigins를 명확히 설정.

6) 로깅과 민감 정보
- 관찰: ProviderCredentialService는 마스킹(mask)을 적용해 저장함. AiController/서비스 레벨에서 예외 메시지/로깅에 민감 값(예: apiKey)을 직접 기록하지 않는지 코드 전체 점검 필요.
- 권고: 로거 사용 시 민감 데이터(키·비밀번호·전체 토큰) 기록 금지. 실패 트레이스는 내부 식별자만 기록.

7) 암호화 구현 검토
- 파일: CredentialCryptoService.java
- 관찰: AES/GCM 사용은 적절. IV 길이(12)와 GCM_TAG_LENGTH(128)도 올바름.
- 권고: 키 길이(256비트) 확보를 보장하고, 키 관리를 KMS로 이전. 예외 메시지를 더 구체적으로 로깅하지 말 것.

운영/개발 관점 권장사항
- 비밀/키 회전 정책 도입(특히 LLM provider keys). 즉시 마스터키 제거 · 키 재발급.
- 통합 테스트 및 단위 테스트 추가: 인증 필터, PasswordChangeRequiredFilter 동작, ProviderCredentialService 암호화/복호화 테스트 우선 작성.
- 시크릿 스캔(예: git-secrets) 및 CI에서 스캔 실행.
- 감사 로깅(Audit): API 키 접근/복호화/사용 이벤트에 대한 감사 로그(비밀 값은 제외)와 관리자 알림.
- 권한 모델 검토: SecurityConfig의 requestMatchers 권한 부여가 중복·누락 없는지 권한 테이블과 대조 테스트.
- AI 입력 처리: 사용자 입력이 외부 LLM에 전달될 때 프롬프트 인젝션/SQL 인젝션 방어(이미 SqlValidationService 존재 - 사용 확인).

테스트/문서화
- 현재 테스트 코드(테스트 폴더) 미발견(리포지토리 전체). 단위·통합 테스트 추가 권장.
- 보안 관련 README 섹션 추가: 설정해야 할 환경변수, 시크릿 구성, KMS 안내, 권한 매핑 문서화.

참고로 검토한 주요 파일
- src/main/java/com/stk/inventory/ai/service/CredentialCryptoService.java
- src/main/java/com/stk/inventory/ai/service/ProviderCredentialService.java
- src/main/java/com/stk/inventory/ai/service/AbstractJsonHttpProviderClient.java
- src/main/java/com/stk/inventory/ai/controller/AiController.java
- src/main/java/com/stk/inventory/security/JwtTokenProvider.java
- src/main/java/com/stk/inventory/security/JwtAuthenticationFilter.java
- src/main/java/com/stk/inventory/security/PasswordChangeRequiredFilter.java
- src/main/java/com/stk/inventory/config/SecurityConfig.java
- src/main/java/com/stk/inventory/entity/User.java

긴급 실행 항목 (Action Items)
1. (즉시) CredentialCryptoService의 기본 마스터 키 제거 및 시크릿 교체, 기존 저장 API 키 재암호화/교체.
2. User.emailVerified 기본값 false로 변경 및 관련 마이그레이션/테스트 수행.
3. 시크릿 저장소(KMS/Vault)를 도입하고 배포 파이프라인에서 시크릿을 관리하도록 전환.
4. 민감정보 로깅 검토 및 스캐닝 도구 추가(git-secrets, trufflehog 등).
5. 단위/통합 테스트 추가(특히 보안 필터, 자격 증명 저장/복호화, JWT 처리).

마무리
- 아키텍처와 기능은 잘 설계되어 있으나, 비밀관리(하드코딩 마스터키)와 인증 관련 기본 설정(이메일 검증 기본값)이 즉시 개선되어야 할 치명적 이슈입니다.
- 원하는 경우 우선순위에 따라 패치 PR을 생성하고, 코드 수정·테스트·시크릿 마이그레이션을 직접 적용해 드립니다.

(자동 생성된 리뷰 — 더 깊은 코드 라인별 리뷰, 특정 파일에 대한 개선 패치 요청 시 알려주세요.)
