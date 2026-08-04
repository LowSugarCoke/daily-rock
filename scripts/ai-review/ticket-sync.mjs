import { extractTicketNumber, fetchIssueLabels, closeIssue } from './lib/ticket.mjs';
import { findCommentByMarker, createComment } from './lib/pr-comment.mjs';
import { AI_REVIEW_COMMENT_MARKER } from './lib/format-comment.mjs';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const prNumber = process.env.PR_NUMBER;
const headBranch = process.env.HEAD_REF || '';

if (!token) throw new Error('GITHUB_TOKEN env var is required');
if (!repo) throw new Error('GITHUB_REPOSITORY env var is required');
if (!prNumber) throw new Error('PR_NUMBER env var is required');

const ticketNumber = extractTicketNumber(headBranch);

if (!ticketNumber) {
  await createComment({
    repo,
    issueNumber: prNumber,
    token,
    body: '⚠️ 找不到對應的 ticket（分支名稱不符合 `type/<issue-number>-slug` 命名慣例），已略過合併後自動同步 ticket 的流程。',
  });
  console.log(
    '[ticket-sync] no ticket number resolved from branch, warned on PR and exiting'
  );
  process.exit(0);
}

const labels = await fetchIssueLabels(ticketNumber, token);
if (labels.some((l) => l.startsWith('wayfinder:'))) {
  console.log(
    `[ticket-sync] #${ticketNumber} is a wayfinder ticket, skipping automated sync`
  );
  process.exit(0);
}

const summaryComment = await findCommentByMarker({
  repo,
  issueNumber: prNumber,
  token,
  marker: AI_REVIEW_COMMENT_MARKER,
});

const summaryBody = summaryComment?.body
  ?.replace(AI_REVIEW_COMMENT_MARKER, '')
  .trim();

const body = summaryBody
  ? `此 ticket 已透過 #${prNumber} 合併完成，以下是該 PR 的 AI review 摘要：\n\n---\n\n${summaryBody}`
  : `此 ticket 已透過 #${prNumber} 合併完成。（找不到該 PR 的 AI review 摘要留言，可能是 review pipeline 當時未成功執行）`;

await createComment({ repo, issueNumber: ticketNumber, token, body });
await closeIssue(ticketNumber, token);

console.log(`[ticket-sync] closed #${ticketNumber} with summary from PR #${prNumber}`);
