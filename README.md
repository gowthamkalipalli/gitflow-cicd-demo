# Git Flow + Jenkins CI/CD Demo (Windows / Docker Desktop)

A small Node.js API used to practice **production-style Git branching** (`main`, `develop`, `feature/*`, `hotfix/*`)
and a **Jenkins multibranch CI/CD pipeline** triggered by **GitHub webhooks**.
Everything runs on your Windows laptop using Docker Desktop.

## Architecture

```
GitHub repo --webhook--> ngrok tunnel --> Jenkins (Docker on your laptop)
                                              |
                                              |-- docker build + test (inside Dockerfile)
                                              |-- Trivy scan
                                              |-- push image to Docker Hub
                                              |
                          develop branch ---> DEV  container  http://localhost:8081
                          main branch    ---> PROD container  http://localhost:8082  (after manual approval)
```

DEV and PROD are two containers on the same laptop, on different ports.

## Branch rules and pipeline behaviour

| Branch / event | Created from | Merges into | Pipeline does |
|---|---|---|---|
| `main` | - | - | Production code. Build, test, scan, push, **manual approval**, deploy PROD (8082), git tag |
| `develop` | `main` | `main` (release PR) | Build, test, push, **auto-deploy DEV** (8081) |
| `feature/*` | `develop` | `develop` (PR, squash merge) | Build + unit test only. No deploy |
| PR to `develop` | - | - | Build + test. Result shows on the PR |
| PR to `main` | - | - | Build + test + Trivy scan |
| `hotfix/*` | `main` | `main` (PR), then back-merge to `develop` | Build, test, scan, push. Deploy happens once merged to `main` |

Merge styles:
- feature -> develop: **Squash and merge**
- develop -> main: **Create a merge commit**
- hotfix -> main: **Create a merge commit**, then open a second PR hotfix -> develop

## Setup on Windows

### 1. Install
- Windows 10/11 with virtualization enabled
- **Docker Desktop** (use the WSL 2 backend, Linux containers)
- **Git for Windows**
- **ngrok** (free account) so GitHub can reach your laptop
- A GitHub account and a Docker Hub account

Check in PowerShell:
```powershell
docker version
git --version
```

### 2. Put the repo on GitHub
See `docs/GIT-FLOW-COMMANDS.md` (section 1).

### 3. Start Jenkins
```powershell
cd jenkins
docker compose up -d --build
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```
Open http://localhost:8080, paste the password, choose **Install suggested plugins**, create your admin user.

### 4. Add credentials (Manage Jenkins -> Credentials -> Global)
| ID | Type | Value |
|---|---|---|
| `github-creds` | Username with password | GitHub username + Personal Access Token (scope: `repo`) |
| `dockerhub` | Username with password | Docker Hub username + access token |

Edit `IMAGE` at the top of the `Jenkinsfile` to use your Docker Hub username.

### 5. Create the Multibranch Pipeline
1. New Item -> name `gitflow-cicd-demo` -> **Multibranch Pipeline**
2. Branch Sources -> Add source -> **GitHub** -> pick `github-creds`, paste your repo URL
3. Behaviours: **Discover branches** (all branches), **Discover pull requests from origin**
4. Build Configuration: Mode = by Jenkinsfile, path `Jenkinsfile`
5. Scan Multibranch Pipeline Triggers: enable "Periodically if not otherwise run" = 1 hour (a backup if a webhook is missed)
6. Save. Jenkins scans the repo and builds `main` and `develop`.

### 6. Set up the webhook
Jenkins is on localhost, so expose it:
```powershell
ngrok http 8080
```
Copy the `https://xxxx.ngrok-free.app` address, then in GitHub -> repo -> **Settings -> Webhooks -> Add webhook**:
- Payload URL: `https://xxxx.ngrok-free.app/github-webhook/` (keep the trailing slash)
- Content type: `application/json`
- Events: choose "Let me select individual events" -> **Pushes** and **Pull requests**
- Active: ticked

Check **Recent Deliveries** shows a green tick (200). The free ngrok URL changes each time you restart it, so update the webhook then.

### 7. Branch protection (GitHub -> Settings -> Branches or Rulesets)
For `main`:
- Require a pull request before merging (1 approval, require Code Owners review)
- Require status checks to pass (pick the Jenkins check, for example `continuous-integration/jenkins/pr-merge`, after the first PR has run)
- Require branches to be up to date
- Block force pushes, block deletions

For `develop`: same, but the approval and checks can be lighter.

Note: branch protection on **private** repos needs GitHub Pro. Public repos get it free. If you are the only user, approvals from yourself are not allowed, so set required approvals to 0 for practice, or add a second account.

## Test each flow (this is your hands-on practice)
1. **Feature flow**: create `feature/add-delete-endpoint`, push, open a PR to `develop`, see Jenkins status on the PR, squash merge, check DEV at http://localhost:8081
2. **Release flow**: PR `develop` -> `main`, merge, approve in Jenkins ("Deploy to PRODUCTION?"), check http://localhost:8082
3. **Hotfix flow**: break something on `main` (fake bug), create `hotfix/fix-health`, PR to `main`, deploy, then back-merge to `develop`
4. **Rollback test**: change the Dockerfile HEALTHCHECK URL to a wrong path on `develop` and watch `deploy.sh` roll back to the previous image

Exact commands are in `docs/GIT-FLOW-COMMANDS.md`.

## Troubleshooting (Windows)
| Problem | Fix |
|---|---|
| `bad interpreter` or `\r` errors in scripts | Line endings. `.gitattributes` forces LF. Run `git add --renormalize .` |
| Jenkins cannot run `docker` | Make sure Docker Desktop is running and the compose file mounts `/var/run/docker.sock` |
| Webhook shows 403/404 | Use `/github-webhook/` with the trailing slash, and the ngrok address, not localhost |
| Port already in use | Stop the old container: `docker rm -f app-dev app-prod` |
| Jenkins does not see PRs | Enable "Discover pull requests from origin" in the job's Branch Sources |
