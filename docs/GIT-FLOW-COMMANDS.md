# Git Flow commands (copy and practice)

## 1. First push to GitHub
Create an **empty** repo on GitHub (no README) named `gitflow-cicd-demo`, then:
```powershell
cd gitflow-cicd-demo
git remote add origin https://github.com/<your-username>/gitflow-cicd-demo.git
git push -u origin main
git push -u origin develop
```
On GitHub: Settings -> Branches, set **default branch = develop** (optional) so PRs target develop by default.

## 2. Feature flow
```powershell
git checkout develop
git pull origin develop
git checkout -b feature/add-delete-endpoint

# make changes, then
git add .
git commit -m "feat: add DELETE /items/:id"
git push -u origin feature/add-delete-endpoint
```
Open a PR: `feature/add-delete-endpoint` -> `develop`. Wait for Jenkins to go green, get review, **Squash and merge**.

Keep your branch up to date while working:
```powershell
git checkout feature/add-delete-endpoint
git fetch origin
git merge origin/develop        # or: git rebase origin/develop (only on your own branch)
```
Clean up after merge:
```powershell
git checkout develop
git pull origin develop
git branch -d feature/add-delete-endpoint
git push origin --delete feature/add-delete-endpoint
```

## 3. Release flow (develop -> main)
Bump the version in `package.json` on develop first (for example 1.1.0), through a small PR. Then on GitHub open a PR `develop` -> `main`, wait for green checks and approval, choose **Create a merge commit**.
Jenkins then waits for your click on **Deploy to PRODUCTION?**. After deploy, Jenkins pushes a `v1.1.0-buildN` tag.

## 4. Hotfix flow (urgent production bug)
```powershell
git checkout main
git pull origin main
git checkout -b hotfix/fix-health-endpoint

# fix the bug
git add .
git commit -m "fix: correct health endpoint response"
git push -u origin hotfix/fix-health-endpoint
```
1. PR `hotfix/fix-health-endpoint` -> `main`, merge (merge commit), approve deploy in Jenkins.
2. **Back-merge so develop also gets the fix**: PR `hotfix/fix-health-endpoint` -> `develop`, merge.
3. Delete the hotfix branch.

If you forget step 2, the bug comes back on the next release. This is a common interview question.

## 5. Handy commands
```powershell
git log --oneline --graph --all     # see the branch history as a graph
git tag                             # list tags
git branch -a                       # list all branches
git stash / git stash pop           # park changes temporarily
git revert <commit>                 # safe undo on shared branches (never force push main)
```

## 6. Merge vs Squash vs Rebase
| Type | Result | Use it for |
|---|---|---|
| Merge commit | Keeps all commits + one merge commit | develop -> main, hotfix -> main |
| Squash merge | All commits become one | feature -> develop |
| Rebase | Replays your commits on top, straight history | Updating your own feature branch only |
