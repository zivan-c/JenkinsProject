pipeline {
    agent any

    stages {

        // Prepares the environment, installs dependencies, and packages the app
        stage('Build') {
            steps {
                echo 'Starting Build stage...'

                //shows that the versions are working and that the pipeline has access to it
                sh 'node --version'
                sh 'npm --version'


                //installs the dependencies
                sh 'npm install'

                //building the artifact and packing it into a compressed tarball artifact
                sh '''
                    mkdir -p artifacts
                    tar \
                        --exclude=node_modules \
                        --exclude=artifacts \
                        --exclude=.git \
                        -czf artifacts/task-crud-${BUILD_NUMBER}.tar.gz .
                '''

                //saving the artifact so it can be downloaded 
                archiveArtifacts artifacts: 'artifacts/*.tar.gz',
                    fingerprint: true

                echo 'Build completed successfully.'
                }
        }

        // Runs the automated unit/integration tests
        stage('Test') {
            steps {
                echo 'Starting Test stage...'

                // runs the test suite in continuous integration mode
                sh 'npm test -- --ci'
            }

            post {
                always {

                    // processes and saves the JUnit XML test results, failing it if empty
                    junit testResults: 'test-results/junit.xml',
                        allowEmptyResults: false
                    // archives the code coverage reports generated
                    archiveArtifacts artifacts: 'coverage/**',
                        allowEmptyArchive: true
                }
            }
        }

        // enforces coding standards and catch syntax errors with a linter
        stage('Code Quality') {
            steps {
                echo 'Starting Code Quality stage...'

                //runs the linter and generates a report of violations
                sh 'npm run lint'
                sh 'npm run lint:report'

                echo 'Code Quality quality gate passed.'
            }

            post {
                always {

                    //saves a JSON linter report even if the stage fails
                    archiveArtifacts artifacts: 'eslint-report.json',
                        allowEmptyArchive: true
                }
            }
        }

        //scans dependencies for known vulnerabilities
        stage('Security') {
            steps {
                echo 'Starting Security stage...'

                // fail the pipeline if any 'high' severity vulnerabilities are found
                sh 'npm audit --audit-level=high'

                echo 'Security audit completed successfully.'
            }
        }

        //builds a docker image, deploys it, runs health checks, and rolls back if it fails
        stage('Deploy') {
            steps {
                echo 'Starting Deploy stage...'

                sh '''
                    set -eu

                    # defining versioning tags using the build number
                    APP_VERSION="build-${BUILD_NUMBER}"
                    ROLLBACK_TAG="rollback-${BUILD_NUMBER}"

                    echo "New deployment version: ${APP_VERSION}"

                    # checking that docker is running
                    echo "Checking Docker availability..."
                    docker --version
                    docker compose version

                    echo "Checking currently deployed application..."

                    # identifying the current running container and image
                    CURRENT_CONTAINER="$(docker compose ps -q app || true)"
                    PREVIOUS_IMAGE=""

                    if [ -n "$CURRENT_CONTAINER" ]; then
                        PREVIOUS_IMAGE="$(docker inspect "$CURRENT_CONTAINER" \
                            --format '{{.Config.Image}}' 2>/dev/null || true)"
                    fi

                    echo "Previous deployed image: ${PREVIOUS_IMAGE:-none}"

                    # preserve the current image so it can be used for rollback.
                    if [ -n "$PREVIOUS_IMAGE" ]; then
                        docker tag "$PREVIOUS_IMAGE" "task-crud-app:${ROLLBACK_TAG}"
                        echo "Rollback image created: task-crud-app:${ROLLBACK_TAG}"
                    fi

                    # building new docker image with the latest code
                    echo "Building application image..."
                    APP_VERSION="$APP_VERSION" docker compose build app

                    # deploying the new image in detached mode
                    echo "Deploying ${APP_VERSION}..."
                    
                    docker compose stop app
                    docker compose rm -f app
                    
                    APP_VERSION="$APP_VERSION" docker compose up -d --no-build app

                    echo "Checking deployed containers..."
                    docker compose ps

                    # extracting  container IDs to check their status

                    APP_CONTAINER="$(docker compose ps -q app)"
                    MONGO_CONTAINER="$(docker compose ps -q mongo)"

                    # checking their status
                    APP_RUNNING="$(docker inspect "$APP_CONTAINER" \
                        --format '{{.State.Running}}')"

                    MONGO_HEALTH="$(docker inspect "$MONGO_CONTAINER" \
                        --format '{{.State.Health.Status}}')"

                    echo "Application running: ${APP_RUNNING}"
                    echo "MongoDB health: ${MONGO_HEALTH}"

                    DEPLOY_FAILED="false"

                    # flag deployment as failed if core containers arent working properly

                    if [ "$APP_RUNNING" != "true" ]; then
                        echo "Application container is not running."
                        DEPLOY_FAILED="true"
                    fi

                    if [ "$MONGO_HEALTH" != "healthy" ]; then
                        echo "MongoDB is not healthy."
                        DEPLOY_FAILED="true"
                    fi

                    echo "Testing application HTTP endpoint..."

                    # loop up to 30 times to verify that the HTTP requests are working
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

                        # if it fails after 30 attempts then mark as fail
                        if [ "$ATTEMPTS" -ge 30 ]; then
                            echo "Application HTTP health check failed."
                            DEPLOY_FAILED="true"
                            break
                        fi

                        echo "Application not ready yet. Retry ${ATTEMPTS}/30..."
                        sleep 2
                    done

                    # if it works then exit the script
                    if [ "$DEPLOY_FAILED" = "false" ]; then
                        echo "Deployment health checks passed."
                        echo "Deployment of ${APP_VERSION} completed successfully."
                        exit 0
                    fi

                    echo "Deployment failed."
                    echo "Starting automatic rollback..."

                    # start of rollback logic

                    if [ -z "$PREVIOUS_IMAGE" ]; then
                        echo "No previous deployment was available for rollback."
                        exit 1
                    fi

                    echo "Rolling back to previous image..."

                    # starting up old, good image
                    APP_VERSION="$ROLLBACK_TAG" docker compose up -d --no-build app

                    echo "Checking rollback deployment..."
                    docker compose ps

                    ROLLBACK_CONTAINER="$(docker compose ps -q app)"

                    # verify that the rollback container is actually working
                    ROLLBACK_RUNNING="$(docker inspect "$ROLLBACK_CONTAINER" \
                        --format '{{.State.Running}}')"

                    if [ "$ROLLBACK_RUNNING" != "true" ]; then
                        echo "Rollback failed: application container is not running."
                        exit 1
                    fi

                    # verify that the rollback container HTTP requests are working
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

        // promotes successful build towards a production environment
        stage('Release') {
            steps {
                echo 'Starting Release stage...'

                sh '''
                    set -eu

                    # variables specific to production

                    BUILD_VERSION="build-${BUILD_NUMBER}"
                    RELEASE_VERSION="release-${BUILD_NUMBER}"
                    PRODUCTION_PORT="3001"
                    PRODUCTION_PROJECT="task-crud-production"

                    echo "Build version: ${BUILD_VERSION}"
                    echo "Release version: ${RELEASE_VERSION}"

                    # verify that the docker image that was built exists locally
                    echo "Checking source image..."

                    docker image inspect \
                        "task-crud-app:${BUILD_VERSION}" > /dev/null

                    echo "Source image exists."

                    // promotes image by tagging it with a release tag
                    echo "Promoting image to release..."
                    
                    docker tag \
                        "task-crud-app:${BUILD_VERSION}" \
                        "task-crud-app:${RELEASE_VERSION}"

                    echo "Release image created:"
                    echo "task-crud-app:${RELEASE_VERSION}"

                    # deploying the release image to production docker compose project
                    echo "Replacing current production deployment..."

                    APP_VERSION="${RELEASE_VERSION}" \
                    APP_PORT="${PRODUCTION_PORT}" \
                    docker compose \
                        -p "${PRODUCTION_PROJECT}" \
                        up -d --no-build mongo app

                    echo "Production deployment started."

                    docker compose \
                        -p "${PRODUCTION_PROJECT}" \
                        ps

                    # run health checks specifically for production containers
                    echo "Checking production containers..."

                    APP_CONTAINER="$(
                        docker compose \
                            -p "${PRODUCTION_PROJECT}" \
                            ps -q app
                    )"

                    MONGO_CONTAINER="$(
                        docker compose \
                            -p "${PRODUCTION_PROJECT}" \
                            ps -q mongo
                    )"

                    APP_RUNNING="$(
                        docker inspect "$APP_CONTAINER" \
                        --format '{{.State.Running}}'
                    )"

                    MONGO_HEALTH="$(
                        docker inspect "$MONGO_CONTAINER" \
                        --format '{{.State.Health.Status}}'
                    )"

                    echo "Production application running: ${APP_RUNNING}"
                    echo "Production MongoDB health: ${MONGO_HEALTH}"

                    # fail immediately if production containers are down

                    if [ "$APP_RUNNING" != "true" ]; then
                        echo "Production application is not running."
                        exit 1
                    fi

                    if [ "$MONGO_HEALTH" != "healthy" ]; then
                        echo "Production MongoDB is not healthy."
                        exit 1
                    fi

                    # polls the production HTTP endpoint to confirm that its serving traffic
                    echo "Testing production HTTP endpoint..."

                    ATTEMPTS=0

                    while ! node -e "
                        require('http')
                            .get('http://127.0.0.1:${PRODUCTION_PORT}', res => {
                                process.exit(
                                    res.statusCode >= 200 &&
                                    res.statusCode < 400 ? 0 : 1
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

                    # generate a release manifest file recording deployment metadata
                    printf '%s\\n' \
                        "Release: ${RELEASE_VERSION}" \
                        "Source: ${BUILD_VERSION}" \
                        "Environment: production" \
                        "Port: ${PRODUCTION_PORT}" \
                        > "release-${BUILD_NUMBER}.txt"
                '''

                archiveArtifacts artifacts: "release-${BUILD_NUMBER}.txt",
                    fingerprint: true
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

        // ensures that production monitoring tools (prometheus) are properly tracking the app 
        stage('Monitoring') {
            steps {
                echo 'Starting Monitoring stage...'

                sh '''
                    set -eu

                    PROMETHEUS_URL="http://localhost:9090"
                    PRODUCTION_JOB="task-crud-production"

                    # verifies that the prometheus monitoring server is running and accessible
                    echo "Checking Prometheus availability..."

                    curl -fsS \
                        "${PROMETHEUS_URL}/-/ready"

                    echo "Prometheus is ready."

                    # checks that prometheus recognizes the prod app as a target
                    echo "Checking production monitoring target..."

                    TARGET_RESPONSE="$(
                        curl -fsS \
                        "${PROMETHEUS_URL}/api/v1/targets"
                    )"

                    echo "$TARGET_RESPONSE"

                    # verifies that the target job exists and is marked as 'up' by prometheus

                    echo "$TARGET_RESPONSE" | grep -q '"job":"task-crud-production"'

                    echo "Production monitoring target exists."

                    echo "$TARGET_RESPONSE" | grep -q '"health":"up"'

                    echo "Production monitoring target is UP."

                    # checks that required alert rules are correctly configured in prometheus
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

                    # implementing a test PromQl query to ensure metrics are being gathered
                    echo "Querying production availability metric..."

                    QUERY_RESPONSE="$(
                        curl -fsS \
                        --get \
                        --data-urlencode \
                        'query=up{job="task-crud-production"}' \
                        "${PROMETHEUS_URL}/api/v1/query"
                    )"

                    echo "$QUERY_RESPONSE"

                    # ensurs that the query returns a valid metric value
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
