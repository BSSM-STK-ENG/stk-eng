FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests \
    && cp target/*.jar /app/app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
