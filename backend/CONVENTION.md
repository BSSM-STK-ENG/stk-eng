Project conventions

- Build: Gradle (build.gradle, settings.gradle). Use Java 17 and Spring Boot 3.4.1.
- Packages: com.stk.inventory.*
- JPA: put entities in com.stk.inventory.entity. Use jakarta.persistence annotations. Let Hibernate manage schema (spring.jpa.hibernate.ddl-auto = update).
- Database: PostgreSQL. Keep datasource config in application.yml.
- Lombok: use @Getter/@Setter/@Builder/@NoArgsConstructor/@AllArgsConstructor. Add compileOnly + annotationProcessor in build.gradle.
- Naming: prefer explicit @Table(name = "snake_case") and @Column(name = "snake_case"). UUID ids: GenerationType.UUID.
- SQL migrations: use Flyway/Liquibase for manual SQL. Do not rely on schema.sql — prefer JPA or proper migrations.
- Commit message trailer: include "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" per project policy.
