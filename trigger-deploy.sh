#! /bin/bash

# Load .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

curl -L \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_API_KEY}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/toolness/vibecoded-hangul-fun/actions/workflows/deploy.yml/dispatches \
  -d '{"ref": "main"}'
