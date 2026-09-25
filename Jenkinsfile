pipeline {
    agent any

    environment {
        APP_IMAGE = 'task-crud-app'
        DEPLOY_PORT = '3000'
        PRODUCTION_PORT = '3001'
        PRODUCTION_PROJECT = 'task-crud-production'
        PROMETHEUS_URL = 'http://localhost:9090'
        PRODUCTION_JOB = 'task-crud-production'
        MONITORING_NETWORK = 'task-crud-monitoring'
    }

    stages {

        stage('Build') {
            steps {
                echo 'Starting Build stage...'

                sh 'node --version'
                sh 'npm --version'
                sh 'npm install'

                sh '''
                    mkdir -p artifacts
                    tar \
                        --exclude=node_modules \
                        --exclude=artifacts \
                        --exclude=.git \
                        -czf artifacts/task-crud-${BUILD_NUMBER}.tar.gz .
                '''

                archiveArtifacts artifacts: 'artifacts/*.tar.gz', fingerprint: true

                echo 'Build completed successfully.'
            }
        }

        stage('Test') {
            steps {
                echo 'Starting Test stage...'

                sh 'npm test -- --ci'
            }

            post {
                always {
                    junit testResults: 'test-results/junit.xml', allowEmptyResults: false
                    archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('Code Quality') {
            steps {
                echo 'Starting Code Quality stage...'

                sh 'npm run lint'
                sh 'npm run lint:report'

                echo 'Code Quality quality gate passed.'
            }

            post {
                always {
                    archiveArtifacts artifacts: 'eslint-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Security') {
            steps {
                echo 'Starting Security stage...'

                sh 'npm audit --audit-level=high'

                echo 'Security audit completed successfully.'
            }
        }

        stage('Deploy') {
            steps {
                echo 'Starting Deploy stage...'

                sh '''
                    set -eu

                    PIPELINE_ID="$(printf '%s' "${JOB_NAME:-pipeline}" | \
                        tr '[:upper:]' '[:lower:]' | \
                        sed 's/[^a-z0-9_-]/-/g; s/^[.-]*//; s/[.-]*$//' | \
                        cut -c1-40)"

                    [ -n "$PIPELINE_ID" ] || PIPELINE_ID="pipeline"

                    APP_VERSION="${PIPELINE_ID}-build-${BUILD_NUMBER}"
                    ROLLBACK_TAG="${PIPELINE_ID}-rollback-${BUILD_NUMBER}"

                    echo "Pipeline identifier: ${PIPELINE_ID}"
                    echo "New deployment version: ${APP_VERSION}"

                    echo "Checking Docker availability..."
                    docker --version
                    docker compose version

                    echo "Ensuring shared monitoring network exists..."
                    docker network inspect "${MONITORING_NETWORK}" >/dev/null 2>&1 || \
                        docker network create "${MONITORING_NETWORK}"

                    echo "Checking currently deployed application..."

                    CURRENT_CONTAINER="$(docker compose -p "${PIPELINE_ID}" ps -q app || true)"
                    PREVIOUS_IMAGE=""

                    if [ -n "$CURRENT_CONTAINER" ]; then
                        PREVIOUS_IMAGE="$(docker inspect "$CURRENT_CONTAINER" \
                            --format '{{.Config.Image}}' 2>/dev/null || true)"
                    fi

                    echo "Previous deployed image: ${PREVIOUS_IMAGE:-none}"

                    if [ -n "$PREVIOUS_IMAGE" ]; then
                        docker tag "$PREVIOUS_IMAGE" "${APP_IMAGE}:${ROLLBACK_TAG}"
                        echo "Rollback image created: ${APP_IMAGE}:${ROLLBACK_TAG}"
                    fi

                    echo "Building application image..."
                    APP_VERSION="$APP_VERSION" \
                    APP_PORT="${DEPLOY_PORT}" \
                    APP_NETWORK_ALIAS="staging-app" \
                    docker compose -p "${PIPELINE_ID}" build app

                    echo "Deploying ${APP_VERSION}..."
                    APP_VERSION="$APP_VERSION" \
                    APP_PORT="${DEPLOY_PORT}" \
                    APP_NETWORK_ALIAS="staging-app" \
                    docker compose -p "${PIPELINE_ID}" up -d --no-build --force-recreate app

                    echo "Checking deployed containers..."
                    docker compose -p "${PIPELINE_ID}" ps

                    APP_CONTAINER="$(docker compose -p "${PIPELINE_ID}" ps -q app)"
                    MONGO_CONTAINER="$(docker compose -p "${PIPELINE_ID}" ps -q mongo)"

                    APP_RUNNING="$(docker inspect "$APP_CONTAINER" \
                        --format '{{.State.Running}}')"

                    MONGO_HEALTH="$(docker inspect "$MONGO_CONTAINER" \
                        --format '{{.State.Health.Status}}')"

                    echo "Application running: ${APP_RUNNING}"
                    echo "MongoDB health: ${MONGO_HEALTH}"

                    DEPLOY_FAILED="false"

                    if [ "$APP_RUNNING" != "true" ]; then
                        echo "Application container is not running."
                        DEPLOY_FAILED="true"
                    fi

                    if [ "$MONGO_HEALTH" != "healthy" ]; then
                        echo "MongoDB is not healthy."
                        DEPLOY_FAILED="true"
                    fi

                    echo "Testing application HTTP endpoint..."

                    ATTEMPTS=0

                    while ! node -e "
                        require('http')
                            .get('http://127.0.0.1:${DEPLOY_PORT}', res => {
                                process.exit(
                                    res.statusCode >= 200 && res.statusCode < 400 ? 0 : 1
                                )
                            })
                            .on('error', () => process.exit(1))
                    "
                    do
                        ATTEMPTS=$((ATTEMPTS + 1))

                        if [ "$ATTEMPTS" -ge 30 ]; then
                            echo "Application HTTP health check failed."
                            DEPLOY_FAILED="true"
                            break
                        fi

                        echo "Application not ready yet. Retry ${ATTEMPTS}/30..."
                        sleep 2
                    done

                    if [ "$DEPLOY_FAILED" = "false" ]; then
                        echo "Deployment health checks passed."
                        echo "Deployment of ${APP_VERSION} completed successfully."
                        exit 0
                    fi

                    echo "Deployment failed."
                    echo "Starting automatic rollback..."

                    if [ -z "$PREVIOUS_IMAGE" ]; then
                        echo "No previous deployment was available for rollback."
                        exit 1
                    fi

                    echo "Rolling back to previous image..."
                    APP_VERSION="$ROLLBACK_TAG" \
                    APP_PORT="${DEPLOY_PORT}" \
                    APP_NETWORK_ALIAS="staging-app" \
                    docker compose -p "${PIPELINE_ID}" up -d --no-build --force-recreate app

                    echo "Checking rollback deployment..."
                    docker compose -p "${PIPELINE_ID}" ps

                    ROLLBACK_CONTAINER="$(docker compose -p "${PIPELINE_ID}" ps -q app)"

                    ROLLBACK_RUNNING="$(docker inspect "$ROLLBACK_CONTAINER" \
                        --format '{{.State.Running}}')"

                    if [ "$ROLLBACK_RUNNING" != "true" ]; then
                        echo "Rollback failed: application container is not running."
                        exit 1
                    fi

                    ATTEMPTS=0

                    while ! node -e "
                        require('http')
                            .get('http://127.0.0.1:${DEPLOY_PORT}', res => {
                                process.exit(
                                    res.statusCode >= 200 && res.statusCode < 400 ? 0 : 1
                                )
                            })
                            .on('error', () => process.exit(1))
                    "
                    do
                        ATTEMPTS=$((ATTEMPTS + 1))

                        if [ "$ATTEMPTS" -ge 30 ]; then
                            echo "Rollback HTTP health check failed."
                            exit 1
                        fi

                        sleep 2
                    done

                    echo "Rollback completed successfully."
                    echo "The deployment stage will fail because the new version was unhealthy."

                    exit 1
                '''
            }

            post {
                success {
                    echo 'Deploy stage completed successfully.'
                }

                failure {
                    echo 'Deploy stage failed. Check the console log for deployment or rollback details.'
                }
            }
        }

        stage('Release') {
            steps {
                echo 'Starting Release stage...'

                sh '''
                    set -eu

                    PIPELINE_ID="$(printf '%s' "${JOB_NAME:-pipeline}" | \
                        tr '[:upper:]' '[:lower:]' | \
                        sed 's/[^a-z0-9_-]/-/g; s/^[.-]*//; s/[.-]*$//' | \
                        cut -c1-40)"

                    [ -n "$PIPELINE_ID" ] || PIPELINE_ID="pipeline"

                    BUILD_VERSION="${PIPELINE_ID}-build-${BUILD_NUMBER}"
                    RELEASE_VERSION="${PIPELINE_ID}-release-${BUILD_NUMBER}"

                    echo "Build version: ${BUILD_VERSION}"
                    echo "Release version: ${RELEASE_VERSION}"
                    echo "Production project: ${PRODUCTION_PROJECT}"

                    echo "Checking source image..."
                    docker image inspect \
                        "${APP_IMAGE}:${BUILD_VERSION}" > /dev/null

                    echo "Source image exists."

                    # Promotes image by tagging it with a release tag.
                    echo "Promoting image to release..."

                    docker tag \
                        "${APP_IMAGE}:${BUILD_VERSION}" \
                        "${APP_IMAGE}:${RELEASE_VERSION}"

                    echo "Release image created:"
                    echo "${APP_IMAGE}:${RELEASE_VERSION}"

                    echo "Ensuring shared monitoring network exists..."
                    docker network inspect "${MONITORING_NETWORK}" >/dev/null 2>&1 || \
                        docker network create "${MONITORING_NETWORK}"

                    echo "Replacing current production deployment..."

                    APP_VERSION="${RELEASE_VERSION}" \
                    APP_PORT="${PRODUCTION_PORT}" \
                    APP_NETWORK_ALIAS="production-app" \
                    docker compose \
                        -p "${PRODUCTION_PROJECT}" \
                        up -d \
                        --no-build \
                        --force-recreate \
                        app

                    echo "Production deployment started."

                    docker compose \
                        -p "${PRODUCTION_PROJECT}" \
                        ps

                    echo "Checking production containers..."

                    APP_CONTAINER="$(docker compose \
                        -p "${PRODUCTION_PROJECT}" \
                        ps -q app)"

                    MONGO_CONTAINER="$(docker compose \
                        -p "${PRODUCTION_PROJECT}" \
                        ps -q mongo)"

                    APP_RUNNING="$(docker inspect "$APP_CONTAINER" \
                        --format '{{.State.Running}}')"

                    MONGO_HEALTH="$(docker inspect "$MONGO_CONTAINER" \
                        --format '{{.State.Health.Status}}')"

                    echo "Production application running: ${APP_RUNNING}"
                    echo "Production MongoDB health: ${MONGO_HEALTH}"

                    if [ "$APP_RUNNING" != "true" ]; then
                        echo "Production application is not running."
                        exit 1
                    fi

                    if [ "$MONGO_HEALTH" != "healthy" ]; then
                        echo "Production MongoDB is not healthy."
                        exit 1
                    fi

                    echo "Testing production HTTP endpoint..."

                    ATTEMPTS=0

                    while ! node -e "
                        require('http')
                            .get('http://127.0.0.1:${PRODUCTION_PORT}', res => {
                                process.exit(
                                    res.statusCode >= 200 && res.statusCode < 400 ? 0 : 1
                                )
                            })
                            .on('error', () => process.exit(1))
                    "
                    do
                        ATTEMPTS=$((ATTEMPTS + 1))

                        if [ "$ATTEMPTS" -ge 30 ]; then
                            echo "Production HTTP health check failed."
                            exit 1
                        fi

                        echo "Production not ready. Retry ${ATTEMPTS}/30..."
                        sleep 2
                    done

                    echo "Production health check passed."
                    echo "Release ${RELEASE_VERSION} successfully promoted to production."

                    printf '%s\n' \
                        "Release: ${RELEASE_VERSION}" \
                        "Source: ${BUILD_VERSION}" \
                        "Environment: production" \
                        "Port: ${PRODUCTION_PORT}" \
                        > "release-${BUILD_NUMBER}.txt"
                '''

                archiveArtifacts artifacts: "release-${BUILD_NUMBER}.txt", fingerprint: true
            }

            post {
                success {
                    echo 'Release stage completed successfully.'
                }

                failure {
                    echo 'Release stage failed.'
                }
            }
        }

        stage('Monitoring') {
            steps {
                echo 'Starting Monitoring stage...'

                sh '''
                    set -eu

                    PIPELINE_ID="$(printf '%s' "${JOB_NAME:-pipeline}" | \
                        tr '[:upper:]' '[:lower:]' | \
                        sed 's/[^a-z0-9_-]/-/g; s/^[.-]*//; s/[.-]*$//' | \
                        cut -c1-40)"

                    [ -n "$PIPELINE_ID" ] || PIPELINE_ID="pipeline"

                    echo "Starting monitoring infrastructure..."

                    docker network inspect "${MONITORING_NETWORK}" >/dev/null 2>&1 || \
                        docker network create "${MONITORING_NETWORK}"

                    docker compose \
                        -p "${PIPELINE_ID}" \
                        up -d \
                        --force-recreate \
                        prometheus

                    echo "Prometheus container started."

                    echo "Checking Prometheus availability..."

                    ATTEMPTS=0

                    until curl -fsS "${PROMETHEUS_URL}/-/ready" > /dev/null
                    do
                        ATTEMPTS=$((ATTEMPTS + 1))

                        if [ "$ATTEMPTS" -ge 30 ]; then
                            echo "Prometheus failed to become ready."
                            docker compose -p "${PIPELINE_ID}" ps prometheus
                            docker compose -p "${PIPELINE_ID}" logs prometheus --tail=50
                            exit 1
                        fi

                        echo "Prometheus not ready yet. Retry ${ATTEMPTS}/30..."
                        sleep 2
                    done

                    echo "Prometheus is ready."

                    echo "Waiting for production monitoring target..."

                    ATTEMPTS=0

                    while true
                    do
                        TARGET_RESPONSE="$(
                            curl -fsS \
                            "${PROMETHEUS_URL}/api/v1/targets"
                        )"

                        if echo "$TARGET_RESPONSE" | grep -q "\"job\":\"${PRODUCTION_JOB}\"" && \
                           echo "$TARGET_RESPONSE" | grep -q '"health":"up"'; then
                            break
                        fi

                        ATTEMPTS=$((ATTEMPTS + 1))

                        if [ "$ATTEMPTS" -ge 30 ]; then
                            echo "Production monitoring target did not become healthy."
                            echo "$TARGET_RESPONSE"
                            docker compose -p "${PIPELINE_ID}" logs prometheus --tail=100
                            exit 1
                        fi

                        echo "Production target not ready yet. Retry ${ATTEMPTS}/30..."
                        sleep 2
                    done

                    echo "Production monitoring target exists and is UP."

                    echo "Checking configured alert rules..."

                    RULE_RESPONSE="$(
                        curl -fsS \
                        "${PROMETHEUS_URL}/api/v1/rules"
                    )"

                    echo "$RULE_RESPONSE"

                    echo "$RULE_RESPONSE" | grep -q 'ProductionAppDown'
                    echo "$RULE_RESPONSE" | grep -q 'ProductionHighErrorRate'
                    echo "$RULE_RESPONSE" | grep -q 'ProductionHighLatency'

                    echo "All required production alert rules are loaded."

                    echo "Querying production availability metric..."

                    QUERY_RESPONSE="$(
                        curl -fsS \
                        --get \
                        --data-urlencode "query=up{job=\"${PRODUCTION_JOB}\"}" \
                        "${PROMETHEUS_URL}/api/v1/query"
                    )"

                    echo "$QUERY_RESPONSE"

                    echo "$QUERY_RESPONSE" | grep -qF '"value"'

                    echo "Production monitoring check passed."
                '''

                echo 'Monitoring stage completed successfully.'
            }

            post {
                failure {
                    echo 'Monitoring stage failed. Production monitoring requires attention.'
                }
            }
        }
    }
}
