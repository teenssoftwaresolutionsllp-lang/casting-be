# CI/CD deployment

The GitHub Actions workflow in `.github/workflows/ci-cd.yml` runs tests and a
production build for pull requests and pushes to `deployment-setup`. A push to
`deployment-setup` deploys to the EC2 instance only after CI passes. A manual
workflow run also deploys, but only when run on `deployment-setup`.

The deployment uses SSH to update the existing EC2 checkout at
`/home/ubuntu/casting-be` to the exact commit that passed CI, install locked
dependencies, build the NestJS app, restart the PM2 process named `casting-be`, and check
`http://127.0.0.1:3000/api/docs`.

## One-time GitHub setup

In the GitHub repository, open **Settings → Environments → `Production – casting-be`**
and add these environment secrets:

| Secret | Value |
| --- | --- |
| `EC2_HOST` | The EC2 Elastic IP or DNS name |
| `EC2_USER` | `ubuntu` for the current server setup |
| `EC2_SSH_PRIVATE_KEY` | The private SSH deployment key, including its BEGIN/END lines |
| `EC2_KNOWN_HOSTS` | The verified SSH host-key line(s) for the EC2 host |

Do not commit the private key, `.env`, or any application credentials. Prefer a
dedicated deployment key with only the access needed for this deployment.

Obtain the EC2 SSH host key from a trusted source, then verify its fingerprint
against the instance's host-key fingerprint over a trusted channel before
saving it as `EC2_KNOWN_HOSTS`. `ssh-keyscan` can collect a candidate line, but
does not verify that line by itself.

The workflow's runner must be allowed to connect to EC2 on TCP port 22. Do not
open SSH to `0.0.0.0/0`; use a self-hosted runner or tightly maintained
GitHub Actions runner IP allow rules. The EC2 host must also be able to fetch
the repository using its existing `origin` authentication.

## Server prerequisites

The EC2 instance must have:

- The repository checked out at `/home/ubuntu/casting-be`, with `origin`
  configured and the deployment commit available from
  `origin/deployment-setup`. The workflow leaves the checkout in detached-HEAD
  state at the deployed commit.
- Node.js 22 installed through nvm, npm, and PM2 on the `ubuntu` user's PATH.
- A PM2 application named `casting-be`, started from this project, with its
  runtime `.env` stored on EC2 (never in Git).
- The app listening on `127.0.0.1:3000` and serving `/api/docs`.
- Enough memory/swap to complete `npm ci` and `npm run build`.

The workflow runs `npm ci`, which uses `package-lock.json`; commit that lockfile
with dependency changes. It does not run database migrations or seed scripts.
Review and run database migrations separately when a release requires them.
Never run the demo seed script as part of deployment.

## Deploying

1. Open a pull request targeting `deployment-setup`. The workflow runs tests
   and a build but does not deploy the pull request.
2. Merge the reviewed change into `deployment-setup`. The push workflow runs
   CI, then deploys automatically if CI passes.
3. Check **Actions → CI/CD** for the test, build, deployment, and health-check
   results.
4. To redeploy the current branch, use **Actions → CI/CD → Run workflow** and
   select `deployment-setup`.

The deployment refuses to proceed if the branch advanced after the workflow's
CI run, so an untested commit is not deployed. It checks out the exact tested
commit in detached-HEAD state. Keep the server checkout dedicated to
deployments; do not make manual source changes there.

## Troubleshooting

- **SSH or host-key failure:** verify the host, key permissions/content, stored
  host key, and EC2 security-group SSH rules. Do not disable host-key checking.
- **Git fetch failure:** verify that the EC2 `ubuntu` account can fetch
  `origin/deployment-setup`.
- **Build failure:** inspect the Actions logs. The PM2 restart occurs only
  after dependency installation and build succeed.
- **Health-check failure:** SSH to EC2 and inspect `pm2 status`,
  `pm2 logs casting-be --lines 100`, and
  `sudo tail -n 100 /var/log/nginx/error.log`. The workflow reports failure,
  but does not automatically roll back the deployed source.
