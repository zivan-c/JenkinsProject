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
    }
}