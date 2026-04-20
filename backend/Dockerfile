FROM ghcr.io/adoptium/temurin:17-jdk AS build
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
COPY gradlew .
COPY src ./src
RUN chmod +x gradlew \
    && ./gradlew bootJar -x test --no-daemon \
    && cp build/libs/*.jar /app/app.jar

FROM ghcr.io/adoptium/temurin:17-jre
WORKDIR /app
COPY --from=build /app/app.jar .
ENTRYPOINT ["java", "-jar", "app.jar"]
