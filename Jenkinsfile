// Multibranch pipeline. Branch name decides what runs.
//   feature/*  -> build + test only
//   PR-*       -> build + test (+ security scan if PR targets main)
//   develop    -> build, test, push, auto-deploy to DEV (8081)
//   hotfix/*   -> build, test, scan, push (deploy happens after merge to main)
//   main       -> build, test, scan, push, manual approval, deploy to PROD (8082), git tag

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '15'))
  }

  environment {
    // CHANGE THIS to your Docker Hub username
    IMAGE = 'gowthamk4/gitflow-cicd-demo'
  }

  stages {

    stage('Init') {
      steps {
        script {
          def safeBranch = env.BRANCH_NAME.replaceAll('[^a-zA-Z0-9_.-]', '-')
          env.TAG = "${safeBranch}-${env.BUILD_NUMBER}"
          echo "Branch: ${env.BRANCH_NAME} | Image tag: ${env.TAG}"
        }
      }
    }

    stage('Build & Unit Test') {
      steps {
        // The Dockerfile 'test' stage runs npm test. If tests fail, this stage fails.
        sh 'docker build --target test -t ${IMAGE}:test-${BUILD_NUMBER} .'
      }
    }

    stage('Build Image') {
      steps {
        sh 'docker build --target prod -t ${IMAGE}:${TAG} .'
      }
    }

    stage('Security Scan (Trivy)') {
      when {
        anyOf {
          branch 'main'
          branch pattern: 'hotfix/.*', comparator: 'REGEXP'
          changeRequest target: 'main'
        }
      }
      steps {
        // exit-code 0 = report only. Change to 1 to fail the build on HIGH/CRITICAL issues.
        sh '''
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy:latest image --severity HIGH,CRITICAL --exit-code 0 ${IMAGE}:${TAG}
        '''
      }
    }

    stage('Push Image') {
      when {
        anyOf {
          branch 'develop'
          branch 'main'
          branch pattern: 'hotfix/.*', comparator: 'REGEXP'
        }
      }
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub',
                                          usernameVariable: 'DH_USER',
                                          passwordVariable: 'DH_PASS')]) {
          sh 'echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin'
          sh 'docker push ${IMAGE}:${TAG}'
        }
      }
    }

    stage('Deploy DEV') {
      when { branch 'develop' }
      steps {
        sh 'bash scripts/deploy.sh dev 8081 ${IMAGE}:${TAG}'
      }
    }

    stage('Approval for PROD') {
      when { branch 'main' }
      steps {
        timeout(time: 30, unit: 'MINUTES') {
          input message: "Deploy ${env.TAG} to PRODUCTION?", ok: 'Deploy'
        }
      }
    }

    stage('Deploy PROD') {
      when { branch 'main' }
      steps {
        sh 'bash scripts/deploy.sh prod 8082 ${IMAGE}:${TAG}'
      }
    }

    stage('Tag Release') {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(credentialsId: 'github-creds',
                                          usernameVariable: 'GH_USER',
                                          passwordVariable: 'GH_TOKEN')]) {
          sh '''
            VERSION=$(grep '"version"' package.json | head -1 | sed -E 's/.*: "([^"]+)".*/\\1/')
            TAG_NAME="v${VERSION}-build${BUILD_NUMBER}"
            REPO_URL=$(git config --get remote.origin.url | sed "s#https://#https://${GH_USER}:${GH_TOKEN}@#")
            git -c user.name=jenkins -c user.email=jenkins@local tag -a "$TAG_NAME" -m "Release $TAG_NAME"
            git push "$REPO_URL" "$TAG_NAME"
          '''
        }
      }
    }
  }

  post {
    success { echo "Pipeline succeeded for ${env.BRANCH_NAME}" }
    failure { echo "Pipeline FAILED for ${env.BRANCH_NAME} - add Slack/email notification here" }
    always  { sh 'docker image prune -f || true' }
  }
}
