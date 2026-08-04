import { cameFromMergedPr, warnOnCommit } from './lib/pr-origin.mjs';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const commitsJson = process.env.COMMITS_JSON;

if (!token) throw new Error('GITHUB_TOKEN env var is required');
if (!repo) throw new Error('GITHUB_REPOSITORY env var is required');

const shas = JSON.parse(commitsJson || '[]').map((c) => c.id);

const WARNING_BODY =
  '⚠️ 這個 commit 是直接推到 `main` 的，沒有經過 PR。這個 repo 的慣例是所有變更都要走 PR（見 `docs/agents/issue-tracker.md`）——AI review 跟自動關票（`ticket-sync.yml`）都只在 PR 事件時觸發，直接 push 會跳過這兩個流程。';

for (const sha of shas) {
  const fromPr = await cameFromMergedPr({ repo, sha, token });
  if (fromPr) {
    console.log(`[warn-direct-push] ${sha} came from a merged PR, skipping`);
    continue;
  }

  await warnOnCommit({ repo, sha, token, body: WARNING_BODY });
  console.log(`[warn-direct-push] warned on ${sha} (not from a merged PR)`);
}
