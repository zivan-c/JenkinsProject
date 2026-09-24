pipeline {
    agent any

    stages {

        stage('Build') {
            steps {
                echo 'Starting Build stage...'

                //shows that the versions are working and that the pipeline has access to it
                sh 'node --version'
                sh 'npm --version'


                //installs the dependencies
                sh 'npm install'

                //building the artifact
                sh '''
                    mkdir -p artifacts
                    tar \
                        --exclude=node_modules \
                        --exclude=artifacts \
                        --exclude=.git \
                        -czf artifacts/task-crud-${BUILD_NUMBER}.tar.gz .
                '''

                //saving the artifact
                archiveArtifacts artifacts: 'artifacts/*.tar.gz',
                    fingerprint: true

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
                    junit testResults: 'test-results/junit.xml',
                        allowEmptyResults: false

                    archiveArtifacts artifacts: 'coverage/**',
                        allowEmptyArchive: true
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
                    archiveArtifacts artifacts: 'eslint-report.json',
                        allowEmptyArchive: true
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

                    APP_VERSION="build-${BUILD_NUMBER}"
                    ROLLBACK_TAG="rollback-${BUILD_NUMBER}"

                    echo "New deployment version: ${APP_VERSION}"

                    echo "Checking Docker availability..."
                    docker --version
                    docker compose version

                    echo "Checking currently deployed application..."

                    CURRENT_CONTAINER="$(docker compose ps -q app || true)"
                    PREVIOUS_IMAGE=""

                    if [ -n "$CURRENT_CONTAINER" ]; then
                        PREVIOUS_IMAGE="$(docker inspect "$CURRENT_CONTAINER" \
                            --format '{{.Config.Image}}' 2>/dev/null || true)"
                    fi

                    echo "Previous deployed image: ${PREVIOUS_IMAGE:-none}"

                    # Preserve the current image so it can be used for rollback.
                    if [ -n "$PREVIOUS_IMAGE" ]; then
                        docker tag "$PREVIOUS_IMAGE" "task-crud-app:${ROLLBACK_TAG}"
                        echo "Rollback image created: task-crud-app:${ROLLBACK_TAG}"
                    fi

                    echo "Building application image..."
                    APP_VERSION="$APP_VERSION" docker compose build app

                    echo "Deploying ${APP_VERSION}..."
                    APP_VERSION="$APP_VERSION" docker compose up -d --no-build app

                    echo "Checking deployed containers..."
                    docker compose ps

                    APP_CONTAINER="$(docker compose ps -q app)"
                    MONGO_CONTAINER="$(docker compose ps -q mongo)"

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
                            .get('http://127.0.0.1:3000', res => {
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

                    APP_VERSION="$ROLLBACK_TAG" docker compose up -d --no-build app

                    echo "Checking rollback deployment..."
                    docker compose ps

                    ROLLBACK_CONTAINER="$(docker compose ps -q app)"

                    ROLLBACK_RUNNING="$(docker inspect "$ROLLBACK_CONTAINER" \
                        --format '{{.State.Running}}')"

                    if [ "$ROLLBACK_RUNNING" != "true" ]; then
                        echo "Rollback failed: application container is not running."
                        exit 1
                    fi

                    ATTEMPTS=0

                    while ! node -e "
                        require('http')
                            .get('http://127.0.0.1:3000', res => {
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
    }
}