학문적·엄격한 코드 리뷰: SRP(단일 책임 원칙) 중심 분석

목적
- 코드베이스의 설계 품질을 학문적으로 분석하여 SRP, 모듈 경계, 응집도/결합도 관점에서 결함을 지적하고, 구체적인 리팩토링 제안과 검증 항목을 제시.

요약 결론
- 전반적으로 기능 구현은 충실하나 여러 클래스/서비스가 다수의 책임을 혼재. 결과적으로 변경 영향 범위가 넓고 테스트하기 어렵다.
- 보안 관련 책임(비밀 관리·암호화·로깅)이 비즈니스 로직과 섞여 있어 위협 표면이 커짐.

핵심 SRP 위반 사례 (파일별, 엄중하게 지적)
1) CredentialCryptoService (src/.../CredentialCryptoService.java)
- 책임 혼재: ①마스터키 기본값(구성·비밀 소유) 제공, ②암호화/복호화 로직, ③마스킹 유틸리티까지 포함.
- 문제: "구성/비밀 공급자" 책임과 "암호화 알고리즘" 책임이 분리되지 않음. 기본 키 하드코딩은 구성 책임의 위임 실패.
- 권고: SecretProvider 인터페이스 추출(환경변수/KMS 구현). CryptoEngine는 순수 암복호만 담당. 마스킹은 Presentation 유틸로 분리.

2) ProviderCredentialService (src/.../ProviderCredentialService.java)
- 책임 혼재: 저장소 CRUD + 외부 provider 연결 테스트 + 복호화 요구 API.
- 문제: 데이터 영속성, 통합(네트워크) 검증, 키 노출(복호화 반환)을 한 서비스에서 담당 — 높은 결합과 테스트 비결정성 유발.
- 권고: RepositoryService(영속성), ConnectionValidator(네트워크), CredentialFacade(오케스트레이션)로 분리. requireApiKey()는 내부에서만 복호화하고, 외부에 노출하지 않도록 API 재설계.

3) AbstractJsonHttpProviderClient (src/.../AbstractJsonHttpProviderClient.java)
- 책임 혼재: HTTP 전송·에러 정상화·응답 파싱·메시지 병합 등 여러 레이어.
- 문제: Provider-specific 응답 파싱이 추상화되어 있으나, 메시지 병합(toText) 등 프롬프트 포맷팅 로직도 포함되어 있어 책임 경계가 모호.
- 권고: Transport 레이어(HTTP)와 MessageFormatter(프롬프트 직렬화)를 분리. ErrorNormalizer는 별도 컴포넌트로 추출.

4) JwtTokenProvider (src/.../JwtTokenProvider.java)
- 책임 혼재: 비밀(value) 파싱 및 토큰 생성/검증. 또한 디코딩/키 초기화가 생성자에서 즉시 실행되어 테스트 하드함.
- 권고: KeyProvider 인터페이스로 비밀 로딩 분리. TokenService는 발급/검증만 담당.

5) CustomUserDetailsService (src/.../CustomUserDetailsService.java)
- 책임 혼재: 사용자 조회 + 권한 해석(resolvePermissions) 호출. 권한 해석은 별도의 권한 해석기(Policy/PermissionResolver)로 위임해야 함.

구체적 설계·리팩토링 제안 (단계별)
A. 인프라/구성 분리
- Introduce SecretProvider { String getMasterKey(); String getJwtSecret(); } 인터페이스.
- 구현체: EnvSecretProvider, KmsSecretProvider. 앱은 SecretProvider에만 의존.

B. 암호화 계층 정리
- CryptoEngine { encrypt, decrypt }(순수 로직), CryptoService(비즈니스 오케스트레이션: 키 버전 관리, IV 저장 관례).
- 마스킹은 MaskingUtil로 분리.

C. Credential 관리 리팩토링
- ProviderCredentialRepository (JPA) — 순수 CRUD
- ProviderConnectionValidator — 외부 호출(네트워크), 타임아웃·재시도 정책 책임
- ProviderCredentialManager(또는 Facade) — 트랜잭션 경계, 감사 로그, 검증 호출
- requireApiKey() API는 "복호화된 키 반환"을 막고, 필요한 작업(예: provider 호출)만 수행하는 콜백 형태로 제공: withDecryptedKey(ProviderType, Consumer<String>)

D. 인프라 안정성
- AbstractJsonHttpProviderClient: HTTP 호출은 HttpTransport로 위임. 추상클라이언트는 변환(serialize/deserialize)만 수행.

E. 보안·테스트·운영
- 비밀의 소유권을 코드에서 제거, 키 회전 스펙 문서화.
- 외부 통신은 인터페이스로 래핑해 모의(Mock) 가능하게 만들 것.
- 모든 암복호/검증 경로에 단위 테스트·통합 테스트 추가. 네트워크는 WireMock 같은 테스트 더블 사용.

검증 항목(테스트 목록)
- SecretProvider를 Kms/Env 구현으로 교체했을 때 동작 검증(단위 테스트)
- CryptoEngine: encrypt->decrypt 동일성, IV 충돌 없음, 예외 경로 테스트
- ProviderCredentialManager: upsert 트랜잭션, validation 실패 시 롤백
- JwtTokenProvider (KeyProvider 주입 후): 서명/검증/만료 경로 모두 테스트
- PasswordChangeRequiredFilter: 허용 경로 중앙화 테스트

측정 가능한 리팩토링 목표
- 클래스당 메서드 수 1) 감소, 2) public 메서드 수 감소
- 의존성 사이클 제거(의존성 그래프에서 순환 없음)
- 테스트 커버리지: 보안 핵심 모듈(=CredentialCryptoService, ProviderCredentialManager, JwtTokenProvider) 최소 80%

우선순위(긴급→낮음)
1. 하드코딩 마스터키 제거 + SecretProvider 추출 (긴급: 보안)
2. ProviderCredentialService 분리(영속성/검증/오케스트레이션) 및 requireApiKey API 제한
3. JwtTokenProvider 의존성 분리(KeyProvider) 및 토큰 예외 처리 정교화
4. AbstractJsonHttpProviderClient의 Transport/Formatter 분리
5. 문서화·테스트 보강(위의 검증 항목)

결어
- "SRP 위반"은 단순한 스타일 문제가 아니라, 보안·운영·확장성의 실질적 위험요소다. 위 권고를 적용하면 코드 변경이 안전해지고 테스트·배포·감사 추적이 쉬워진다.

원하면 다음 단계로 PR 초안(분리된 인터페이스·초기 리팩토링 커밋: SecretProvider 추출 → CredentialManager 분리)을 만들어 적용하겠습니다.