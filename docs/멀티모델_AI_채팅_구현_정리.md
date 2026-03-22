# 멀티모델 AI 채팅 기능 구현 정리

작성일: 2026-03-23

## 1. 개요

이번 작업에서는 재고 관리 서비스에 우측 AI 채팅 패널을 추가하고, OpenAI, Claude, Gemini 기반의 멀티모델 채팅과 재고 DB 조회 기능을 연결했다.

주요 목표는 다음과 같다.

- 웹 화면에서 공급자와 모델을 설정하고 API 키를 저장할 수 있게 한다.
- 화면 어디서든 우측 패널을 열어 자연어로 재고 데이터를 질의할 수 있게 한다.
- 질문이 재고 데이터와 관련된 경우 DB 조회 결과를 근거로 답변하게 한다.
- 세션 목록 중심 UI를 제거하고, 단일 채팅 중심의 간단한 메신저형 UX로 정리한다.
- 로컬 개발 환경과 Docker 환경에서 프런트와 백엔드가 같은 출처 기준으로 안정적으로 통신하게 한다.

## 2. 구현 범위

### 2.1 프런트엔드

- 전 화면 공통 우측 AI 채팅 패널 추가
- 패널 접기/펼치기 지원
- 모바일 전체 높이 채팅 드로어 지원
- 사용자 메시지 우측, AI 메시지 좌측 정렬의 메신저형 UI 적용
- 점 세 개 메뉴 기반 설정 진입 구조 적용
- 공급자, 모델, API 키 설정을 전체 화면 오버레이 모달로 제공
- 세션 목록 제거, 단일 대화 흐름으로 단순화
- 새로고침 시 새 대화로 시작하고, 사용자 기본 모델 설정은 서버에 저장
- SQL 근거는 기본 접힘 상태로 노출

### 2.2 백엔드

- AI 전용 모듈 추가
- 사용자별 공급자 API 키 암호화 저장
- 사용자별 기본 공급자 및 기본 모델 저장
- 채팅 세션 및 메시지 저장
- OpenAI, Anthropic, Gemini 어댑터 추가
- 재고 질의용 SQL 생성, 검증, 실행, 근거 포맷팅 파이프라인 추가
- 상대 날짜 해석 지원
- 재고 관련 읽기 전용 SQL 허용 범위를 기존 분석 뷰 3개에서 실제 재고 테이블과 뷰 전체로 확대

### 2.3 인프라 및 보안

- 프런트 API 호출을 `/api` 기준 same-origin 으로 통일
- Vite dev proxy 추가
- nginx reverse proxy 추가
- Spring Security의 CORS 및 `/error` 처리 보강
- 민감 정보 보호를 위해 SQL 로그 기본 비활성화

## 3. 지원 모델 및 설정 방식

현재 지원 공급자는 다음과 같다.

- `openai`
- `anthropic`
- `google`

설정 방식은 다음과 같다.

- 사용자별 API 키를 서버 DB에 저장
- API 키는 서버 마스터 키 기반으로 암호화 저장
- 사용자별 기본 공급자와 기본 모델을 별도로 저장
- 채팅 화면에서는 상시 모델 선택 UI를 노출하지 않고, 설정 화면에서만 변경

기본값은 다음과 같이 저장된다.

- 기본 공급자: `openai`
- 기본 모델: `gpt-5`

## 4. 채팅 UX 변경 사항

### 4.1 레이아웃

- `MainLayout` 기준으로 본문 + 우측 AI 패널 구조를 적용했다.
- 기존 본문 영역의 과도한 radius 카드 래퍼를 제거해 중앙 UI가 깨지는 문제를 정리했다.
- 데스크톱에서는 우측 패널이 고정 aside 로 동작하고, 접었을 때는 얇은 rail 만 남는다.
- 모바일에서는 전체 높이 드로어로 채팅 화면을 연다.

### 4.2 채팅 동작

- 세션 목록을 제거했다.
- 화면에서는 하나의 대화만 보인다.
- 첫 메시지 전송 시 서버 세션이 생성된다.
- 같은 화면 안에서는 서버 세션을 재사용한다.
- 새로고침 후에는 항상 새 대화로 시작한다.

### 4.3 설정 UX

- 설정 진입은 채팅 헤더의 점 세 개 메뉴에서만 가능하다.
- 메뉴 항목은 `설정`, `대화 초기화`, `패널 접기/닫기` 로 단순화했다.
- 설정 모달은 패널 내부가 아니라 `document.body` 기준 전체 화면 오버레이로 렌더링한다.
- 설정 항목은 `provider`, `model`, `API key` 만 남겼다.

## 5. 백엔드 AI 아키텍처

### 5.1 주요 구성 요소

- `AiController`
- `AiChatOrchestrationService`
- `ProviderCredentialService`
- `AiPreferencesService`
- `InventoryToolRegistryService`
- `InventoryQueryService`
- `SqlValidationService`
- `InventorySchemaService`
- `RelativeDateContextService`

### 5.2 Provider 어댑터

공통 인터페이스:

- `LlmProviderClient`

구현체:

- `OpenAiClient`
- `AnthropicClient`
- `GeminiClient`

### 5.3 저장 엔티티

- `ProviderCredential`
- `ChatSession`
- `ChatMessage`

추가 사용자 필드:

- `defaultProvider`
- `defaultModel`

## 6. API 정리

### 6.1 공급자/모델/설정

- `GET /api/ai/providers`
- `GET /api/ai/models?provider=...`
- `GET /api/ai/credentials`
- `PUT /api/ai/credentials/{provider}`
- `DELETE /api/ai/credentials/{provider}`
- `POST /api/ai/credentials/{provider}/test`
- `GET /api/ai/preferences`
- `PUT /api/ai/preferences`

### 6.2 채팅

- `GET /api/ai/sessions`
- `POST /api/ai/sessions`
- `GET /api/ai/sessions/{id}/messages`
- `POST /api/ai/chat`

현재 UI는 단일 대화 중심이므로 부팅 시 세션 목록을 적극 활용하지는 않지만, 내부 저장 및 확장 호환성을 위해 관련 API는 유지했다.

## 7. DB 조회 방식

### 7.1 기존 방식

초기 버전은 다음 3개 분석 뷰만 AI가 조회할 수 있었다.

- `inventory_transaction_facts`
- `material_stock_snapshot`
- `monthly_closing_status`

이 구조는 안전했지만, 질문 범위가 넓어질수록 표현력이 부족했다.

### 7.2 현재 방식

현재는 `InventorySchemaService` 가 `information_schema` 를 읽어 공개 가능한 재고 관련 테이블/뷰 목록과 컬럼 정보를 동적으로 만든다.

AI가 조회 가능한 대상은 다음 원칙을 따른다.

- `public` 스키마 기준
- 재고 관련 테이블과 뷰 허용
- 민감하거나 내부 관리용 테이블은 제외

현재 제외 대상:

- `users`
- `provider_credentials`
- `chat_messages`
- `chat_sessions`

### 7.3 SQL 검증 정책

허용:

- `SELECT`
- `WITH ... SELECT`
- 허용된 재고 테이블/뷰 간의 `JOIN`
- trailing semicolon, SQL 주석, markdown fence 가 포함된 안전한 조회 쿼리

차단:

- `INSERT`
- `UPDATE`
- `DELETE`
- `ALTER`
- `DROP`
- `TRUNCATE`
- `CREATE`
- `MERGE`
- `CALL`
- `COPY`
- 다중문
- 비허용 테이블 접근

즉, “모든 쿼리”가 아니라 “재고 도메인에 대한 거의 모든 읽기 쿼리”를 허용하는 구조다. 서비스 안정성과 데이터 보호를 위해 쓰기/DDL 쿼리는 계속 막고 있다.

### 7.4 상대 날짜 처리

예:

- 어제
- 지난달
- 이번 달

상대 날짜는 `Asia/Seoul` 기준으로 해석하며, 최종 답변에는 가능하면 절대 날짜도 함께 설명하도록 구성했다.

## 8. 대표 질의 예시

- `총 재고가 몇 개야?`
- `어제 들어온 물자가 얼마나 있어?`
- `자재별 현재 재고를 보여줘`
- `지난달 입고량과 출고량 합계를 알려줘`
- `월마감 상태를 보여줘`
- `특정 자재코드의 입출고 내역을 최근 순으로 보여줘`

## 9. 연결 및 배포 설정 변경

### 9.1 프런트

- 기본 API base URL 을 `http://localhost:8080/api` 에서 `/api` 로 변경
- Vite 개발 서버에 `/api` 프록시 추가
- nginx 에 `/api/` reverse proxy 추가

### 9.2 백엔드

- 허용 origin 을 환경 변수로 관리
- `OPTIONS`, `/error`, `ERROR/FORWARD dispatcher` 허용
- 인증된 AI API 호출 흐름이 프런트 same-origin 환경에서 정상 동작하도록 보강

### 9.3 Docker

- 프런트 컨테이너 빌드 인자 기본값을 `/api` 기준으로 변경
- Docker 환경에서도 프런트에서 직접 백엔드 포트를 때리지 않도록 정리

## 10. 테스트 및 검증

실행한 주요 검증:

- `cd backend && mvn -B -Dtest=SqlValidationServiceTest,AiControllerTest test`
- `cd frontend && npm test`
- `cd frontend && npm run build`
- `docker compose up -d --build backend`
- `docker compose ps`

프런트 검증 결과:

- `41 passed`
- production build 성공

백엔드 검증 결과:

- `SqlValidationServiceTest` 통과
- `AiControllerTest` 통과

Docker 검증 결과:

- `inventory-backend` 정상 기동
- `inventory-frontend` 정상 기동
- `postgres` 정상 기동

## 11. 이번 작업에서 해결한 주요 이슈

### 11.1 저장이 안 되던 문제

원인:

- 프런트와 백엔드가 서로 다른 출처 기준으로 엮여 있었고,
- 백엔드 에러 응답이 `/error` 처리 과정에서 다시 막히는 경우가 있었다.

조치:

- same-origin `/api` 구조로 통일
- nginx, Vite proxy, axios base URL 수정
- Spring Security의 `/error`, `OPTIONS`, dispatcher 처리 보강

### 11.2 `Blocked SQL token detected` 문제

원인:

- SQL validator 가 너무 공격적으로 작성되어,
- 정상적인 `SELECT ...;`, 주석 포함 SQL, markdown fenced SQL, CTE 기반 SQL 까지도 차단할 수 있었다.

조치:

- comment 제거
- trailing semicolon 제거
- markdown fence 제거
- CTE alias 허용
- 실제 위험한 DDL/DML 과 다중문만 차단하도록 정리

### 11.3 질의 범위가 너무 좁던 문제

원인:

- AI가 오직 3개 뷰만 볼 수 있었다.

조치:

- 재고 도메인 테이블/뷰 전체를 스키마로 노출하도록 구조 변경
- `materials`, `inventory_transactions`, `monthly_closing` 등 베이스 테이블 조인 허용

## 12. 관련 브랜치 및 PR

- 브랜치: `codex/multi-model-inventory-chat`
- PR: `#19 Add multi-provider inventory chat panel`

## 13. 후속 개선 후보

- 생성된 SQL 을 UI에서 개발자 모드로 직접 확인하는 토글 제공
- 재고 질문 유형별 prompt template 고도화
- chunk 분리로 프런트 번들 크기 최적화
- DB 질의 로그 및 토큰 사용량 관측 추가
- provider 별 연결 테스트 결과를 더 상세하게 시각화
