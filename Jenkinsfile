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
    }
}