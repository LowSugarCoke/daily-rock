const TICKET_BRANCH_PATTERN =
  /^(?:feat|fix|chore|refactor|perf|docs|test)\/(\d+)-/;

const [TRACKER_OWNER, TRACKER_REPO] = (process.env.GITHUB_REPOSITORY || 'LowSugarCoke/daily-rock').split('/');

export function extractTicketNumber(branchName) {
  const match = branchName?.match(TICKET_BRANCH_PATTERN);
  return match ? Number(match[1]) : null;
}

async function ghGet(path, token) {
  const res = await fetch(
    `https://api.github.com/repos/${TRACKER_OWNER}/${TRACKER_REPO}${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );
  if (!res.ok) {
    throw new Error(`GitHub API error fetching ${path} (${res.status})`);
  }
  return res.json();
}

async function ghPatch(path, token, payload) {
  const res = await fetch(
    `https://api.github.com/repos/${TRACKER_OWNER}/${TRACKER_REPO}${path}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    throw new Error(
      `GitHub API error updating ${path} (${res.status}): ${await res.text()}`
    );
  }
  return res.json();
}

/** Fetches the label names on an issue — used to detect wayfinder child tickets (`wayfinder:*`), which ticket-sync skips. */
export async function fetchIssueLabels(number, token) {
  const issue = await ghGet(`/issues/${number}`, token);
  return (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name));
}

export async function closeIssue(number, token) {
  return ghPatch(`/issues/${number}`, token, { state: 'closed' });
}

/**
 * Parses the ticket number out of the PR's head branch name and fetches the
 * corresponding issue + comments from the (private) X-Talent-Tracker repo.
 * Returns { ticketFound: false } when the branch name has no ticket number,
 * or when it does but the token is missing/invalid — callers should treat
 * that as "no ticket context available", not a hard failure.
 */
export async function fetchTicketContext(branchName, token) {
  const number = extractTicketNumber(branchName);
  if (!number) {
    return { ticketFound: false };
  }

  const issue = await ghGet(`/issues/${number}`, token);
  const comments = await ghGet(`/issues/${number}/comments`, token);

  return {
    ticketFound: true,
    number,
    title: issue.title,
    body: issue.body ?? '',
    comments: comments.map((c) => ({
      author: c.user?.login ?? 'unknown',
      body: c.body ?? '',
    })),
  };
}
