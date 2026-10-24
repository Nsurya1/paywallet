# ==============================================================================
# Stage 1: Build & Package JAR
# ==============================================================================
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copy Maven Wrapper and POM first to leverage Docker layer caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy application source code and build executable JAR
COPY src/ ./src/
RUN ./mvnw clean package -DskipTests -B

# Extract Spring Boot layers for efficient container layering
RUN java -Djarmode=layertools -jar target/*.jar extract --destination target/extracted

# ==============================================================================
# Stage 2: Minimal Lightweight Runtime Image
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine AS runner

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl && \
    addgroup -S paywallet && adduser -S paywallet -G paywallet

# Copy Spring Boot extracted layers in order of change frequency
COPY --from=builder --chown=paywallet:paywallet /app/target/extracted/dependencies/ ./
COPY --from=builder --chown=paywallet:paywallet /app/target/extracted/spring-boot-loader/ ./
COPY --from=builder --chown=paywallet:paywallet /app/target/extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=paywallet:paywallet /app/target/extracted/application/ ./

USER paywallet:paywallet

ENV SERVER_PORT=8080 \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
