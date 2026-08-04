const BOT_LOGIN = 'github-actions[bot]';

function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

async function* listAllComments({ repo, issueNumber, token }) {
  let url = `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=100`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!res.ok) {
      throw new Error(
        `GitHub API error listing comments (${res.status}): ${await res.text()}`
      );
    }
    yield* await res.json();
    url = parseNextLink(res.headers.get('link'));
  }
}

/**
 * Finds the bot's own comment carrying `marker` — paginates through comment
 * pages (stopping as soon as it's found) so a long thread can't hide it on
 * page 2+ without requiring every page to be fetched. Returns undefined if
 * no such comment exists.
 */
export async function findCommentByMarker({ repo, issueNumber, token, marker }) {
  for await (const comment of listAllComments({ repo, issueNumber, token })) {
    if (comment.user?.login === BOT_LOGIN && comment.body?.includes(marker)) {
      return comment;
    }
  }
  return undefined;
}

export async function createComment({ repo, issueNumber, token, body }) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `GitHub API error creating comment (${res.status}): ${await res.text()}`
    );
  }

  return res.json();
}

/**
 * Creates the PR comment carrying `marker`, or updates it in place if one
 * already exists.
 */
export async function upsertComment({
  repo,
  issueNumber,
  token,
  marker,
  body,
}) {
  const existing = await findCommentByMarker({ repo, issueNumber, token, marker });

  if (!existing) {
    return createComment({ repo, issueNumber, token, body });
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/issues/comments/${existing.id}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `GitHub API error updating comment (${res.status}): ${await res.text()}`
    );
  }

  return res.json();
}
