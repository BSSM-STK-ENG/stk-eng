Project conventions

- Build: Gradle (build.gradle, settings.gradle). Use Java 17 and Spring Boot 3.4.1.
- Packages: com.stk.inventory.*
- JPA: put entities in com.stk.inventory.entity. Use jakarta.persistence annotations. Let Hibernate manage schema (spring.jpa.hibernate.ddl-auto = update).
- Database: PostgreSQL. Keep datasource config in application.yml.
- Lombok: use @Getter/@Setter/@Builder/@NoArgsConstructor/@AllArgsConstructor. Add compileOnly + annotationProcessor in build.gradle.
- Naming: prefer explicit @Table(name = "snake_case") and @Column(name = "snake_case"). UUID ids: GenerationType.UUID.
- SQL migrations: use Flyway/Liquibase for manual SQL. Do not rely on schema.sql — prefer JPA or proper migrations.
- Commit message trailer: include "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" per project policy.

Clean Architecture & OOP conventions

- Layers and packages:
  - domain: com.stk.inventory.entity (pure domain models, no Spring annotations), com.stk.inventory.domain for domain services/interfaces.
  - usecase (application): com.stk.inventory.usecase for input port interfaces (use cases) and DTOs for boundary data.
  - adapter.inbound: com.stk.inventory.controller (HTTP controllers, thin adapters)
  - adapter.outbound: com.stk.inventory.repository (JPA implementations) and other infrastructure

- Dependency rule: inner layers must not depend on outer layers. Use interfaces (ports) in inner layers and implementations in adapters.
- Interface-driven design: controllers depend on usecase interfaces; services implement usecase interfaces.
- Single Responsibility & SOLID: keep classes small and focused, inject collaborators via constructor, avoid static state.
- DTOs & Mappers: use DTOs for API boundaries and simple mappers for conversion; keep entities out of controller responses when possible.
- Testing: unit test use cases and mappers; write integration tests for adapters.
- KISS/DRY: prefer readable, small methods; avoid premature abstraction.

Apply these incrementally: start by extracting use case interfaces for services and updating controllers to depend on them. Refactor one bounded context at a time.
