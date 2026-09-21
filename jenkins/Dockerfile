FROM jenkins/jenkins:lts-jdk17

USER root
# Docker CLI only (talks to Docker Desktop's engine through the mounted socket)
COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker
RUN apt-get update && apt-get install -y --no-install-recommends git curl \
    && rm -rf /var/lib/apt/lists/*

USER jenkins
RUN jenkins-plugin-cli --plugins git workflow-aggregator github-branch-source github credentials-binding timestamps
