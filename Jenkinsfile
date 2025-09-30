pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        PROJECT_DIR = "${WORKSPACE}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Node modules') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh 'npm install'
                }
            }
        }

        stage('Docker Compose Down') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh 'docker-compose down || true'
                }
            }
        }

        stage('Docker Compose Up') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh 'docker-compose up -d --build'
                }
            }
        }
    }

    post {
        always {
            echo "Build finished"
        }
    }
}
