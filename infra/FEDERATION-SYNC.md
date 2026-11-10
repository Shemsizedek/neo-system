# GitHub → GitLab federation sync

Critical NEO infrastructure is mirrored from GitHub into the private GitLab Project 144 repository.

## Workflow
`.github/workflows/mirror-neomail-to-gitlab.yml`

The workflow pushes GitHub `main` to the GitLab branch `github-main-mirror`.

## Secret boundary
The workflow requires a GitHub Actions repository secret named:

`GITLAB_MIRROR_TOKEN`

The token MUST have only the minimum repository write access needed for the private GitLab mirror.

Never commit the token in:
- YAML;
- shell scripts;
- README files;
- issues;
- Git history;
- Render variables visible to clients.

If the secret is absent, the workflow fails closed before attempting a push.

## Canonical-source policy
GitHub remains the current primary development source. GitLab is an independent mirror/failure domain. Do not automatically merge GitLab-originated changes back to GitHub until bidirectional conflict policy is approved.
