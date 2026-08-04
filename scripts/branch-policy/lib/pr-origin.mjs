/** A commit "came from a PR" if some PR associated with it was merged with this exact commit as its merge commit — a PR's non-merge commits (e.g. from a rebase-merge) also show up in this list, so merged_at + merge_commit_sha match is required, not just presence in the list. */
export async function cameFromMergedPr({ repo, sha, token }) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits/${sha}/pulls`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );
  if (!res.ok) {
    throw new Error(
      `GitHub API error fetching commit pulls (${res.status}): ${await res.text()}`
    );
  }
  const pulls = await res.json();
  return pulls.some((pr) => pr.merged_at && pr.merge_commit_sha === sha);
}

export async function warnOnCommit({ repo, sha, token, body }) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits/${sha}/comments`,
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
      `GitHub API error posting commit comment (${res.status}): ${await res.text()}`
    );
  }
  return res.json();
}
