CONVENTION.md 준수 점검 — 위반 목록 (요약)

방법론
- CONVENTION.md의 규칙(패키지 구조, 포트&어댑터, 컨트롤러/서비스 책임 분리, 시크릿 관리, DTO 사용 등)을 기준으로 코드베이스를 정적 분석하여 위반 사례를 식별했습니다.

중요 요약
- 주요 위반 유형: 컨트롤러/서비스가 포트(usecase/gateway) 대신 구체 구현(services/repositories)을 직접 참조, 컨트롤러에서 도메인 엔티티 반환·저수준 리포지토리 호출, 시크릿·기본값 하드코딩, 초기 비밀번호 상수화.

세부 위반 항목
1) 컨트롤러가 usecase 인터페이스 대신 서비스/리포지토리를 직접 의존
- 규칙 위치: CONVENTION.md, "Interface-driven design" / "Controllers depend on usecase interfaces"
- 위반 예시(파일):
  - src/main/java/com/stk/inventory/controller/ExportController.java
    - 직접 InventoryTransactionRepository, MaterialRepository 사용
  - src/main/java/com/stk/inventory/controller/InventoryController.java
    - InventoryCalendarService, StockTrendService 등 서비스 직접 주입
  - src/main/java/com/stk/inventory/controller/AuthController.java
    - AuthService 직접 주입
  - src/main/java/com/stk/inventory/controller/MonthlyClosingController.java
    - MonthlyClosingService 직접 주입
  - 다수의 컨트롤러(user-facing)에서 com.stk.inventory.service.* 직접 의존(검색 결과 참조)
- 영향: 포트&어댑터 구조 파괴 → 비즈니스 로직 테스트·교체 어려움, 높은 결합
- 권고: 각 컨트롤러가 의존해야 할 것은 usecase 인터페이스(com.stk.inventory.usecase.*). 컨트롤러 어댑터는 얇게 유지하고, 구체 구현은 adapter layer에 둡니다.

2) 컨트롤러가 도메인 엔티티를 직접 반환하거나 리포지토리 호출
- 규칙 위치: "Controllers should return DTOs, not JPA entities"
- 위반 예시:
  - MonthlyClosingController.getAllClosings() -> ResponseEntity<List<MonthlyClosing>> (entity 반환)
  - ExportController: transactionRepository.findAll(), materialRepository.findAll()를 직접 호출하고 엔티티 컬렉션을 가공
- 영향: 엔티티 노출로 직렬화·업그레이드 위험, API 계약과 DB 모델 결합
- 권고: 반드시 DTO를 만들어 Mapper를 통해 변환. 리포지토리 호출은 usecase interactor(또는 gateway)를 통해 수행.

3) 서비스 레이어가 포트(gateway) 대신 Spring Data JPA 리포지토리를 직접 사용
- 규칙 위치: "Services (use case interactors) depend only on ports" / "Define gateway/port interfaces"
- 위반 예시(파일 목록 일부):
  - src/main/java/com/stk/inventory/service/MonthlyClosingService.java (UserRepository 사용)
  - src/main/java/com/stk/inventory/service/InventoryService.java (UserRepository 등 직접 사용)
  - src/main/java/com/stk/inventory/service/AuthService.java
  - src/main/java/com/stk/inventory/service/UserDirectoryService.java
  - src/main/java/com/stk/inventory/service/AiPreferencesService.java
  - src/main/java/com/stk/inventory/ai/service/AiCurrentUserService.java
  - src/main/java/com/stk/inventory/config/SuperAdminBootstrapService.java
- 영향: 비즈니스 계층이 인프라에 결합되어 단위 테스트 어려움 및 교체 비용 증가
- 권고: 리포지토리 접근은 gateway 인터페이스(예: UserGateway)를 통해 수행. 이미 존재하는 GatewayImpl을 활용하도록 리팩토링.

4) usecase 인터페이스 구현 체계 미준수 (부분적으로만 적용)
- 규칙 위치: "usecase: com.stk.inventory.usecase for input port interfaces"
- 관찰: 일부 서비스는 usecase 인터페이스를 구현(AdminUserManagementService, InventoryService)하지만 대부분 서비스는 직접 서비스 클래스로 존재.
- 권고: 점진적으로 usecase 인터페이스를 만들고 컨트롤러→usecase 인터페이스→implementation 패턴으로 전환.

5) 시크릿·기본값이 코드/애플리케이션 기본값에 남아 있음
- 규칙 위치: (CONVENTION.md 전반) + 보안 모범사례
- 위반 예시:
  - src/main/java/com/stk/inventory/ai/service/CredentialCryptoService.java: 생성자 기본 파라미터에 base64 master key 하드코딩
  - src/main/resources/application.yml: jwt.secret 및 app.ai.master-key 기본값이 설정(예: AI_MASTER_KEY 기본값), DB 비밀번호 기본값 존재
- 영향: 리포지토리 유출·배포 실수 시 시크릿 노출
- 권고: 기본값 제거, 민감정보는 환경변수 또는 KMS/Vault로만 주입. CI/CD 시크릿 정책 수립.

6) 하드코딩된 초기 비밀번호 상수
- 위반 예시: src/main/java/com/stk/inventory/service/AdminUserManagementService.java 에 public static final String INITIAL_ISSUED_PASSWORD = "1234";
- 영향: 보안 위험(초기 계정 탈취), 규정 위반
- 권고: 초기 비밀번호 생성을 제거하거나 임시 랜덤 비밀번호 + 이메일 검증/강제 변경 흐름으로 대체.

7) schema 관리 지침 일부 미준수 여부(의심)
- 규칙 위치: "SQL migrations: use Flyway/Liquibase for manual SQL. Do not rely on schema.sql"
- 관찰: src/main/resources/schema.sql 파일은 주석만 포함되어 있음 — 현재는 JPA hibernate ddl-auto=update 사용.
- 권고: 운영 환경에서는 ddl-auto=update 비활성화하고 Flyway/Liquibase 마이그레이션으로 일원화할 것을 권장.

8) Mapper 사용의 일관성
- 규칙 위치: Mapper classes to convert between DTOs and entities
- 관찰: 프로젝트에 mappers 존재(com.stk.inventory.mapper.*). 다만 일부 컨트롤러(ExportController, MonthlyClosingController)가 매핑 레이어를 우회.
- 권고: 컨트롤러가 Mapper를 통해 DTO로 변환하도록 강제.

진단 요약(우선순위)
- 긴급(보안/아키텍처): 3, 5, 6 (서비스 직접 리포지토리 사용 → 포트 분리, 시크릿 제거, 초기 비밀번호 제거)
- 높음(설계·유지보수): 1, 2, 4, 8 (컨트롤러 책임 축소·DTO 사용·usecase 인터페이스 확장)
- 중간(운영): 7 (마이그레이션 전략 정리)

권고되는 작업 흐름(단계)
1. 즉시: 하드코딩된 시크릿·기본 비밀번호 제거(credential defaults), CI 비밀 스캔 적용
2. 단기(리팩토링 배치): 컨트롤러 → usecase 인터페이스 의존 전환(가장 노출된 컨트롤러부터: ExportController, MonthlyClosingController 등)
3. 중기: 서비스에서 repository 직접 참조를 gateway 사용으로 리팩토링(테스트 보강 포함)
4. 장기: Flyway 도입 및 ddl-auto 운영 비활성화, API 계약 문서화, DTO 표준 강제화

참고: 자동으로 검색된 관련 파일(발견 로그 요약)
- 컨트롤러 직접 서비스 의존: src/main/java/com/stk/inventory/controller/*.java (ExportController, MonthlyClosingController, InventoryController, AuthController, MaterialController 등)
- 서비스에서 리포지토리 직접 사용: src/main/java/com/stk/inventory/service/{AuthService,InventoryService,MonthlyClosingService,UserDirectoryService,...}
- 하드코딩/기본값: src/main/java/com/stk/inventory/ai/service/CredentialCryptoService.java, src/main/resources/application.yml, src/main/java/com/stk/inventory/service/AdminUserManagementService.java

원하시면 우선순위 1번(시크릿 제거·초기 비밀번호 제거)부터 자동으로 PR을 생성해 적용하고, 그 다음 컨트롤러 리팩토링(ExportController→usecase 인터페이스) 패치를 단계별로 적용하겠습니다.