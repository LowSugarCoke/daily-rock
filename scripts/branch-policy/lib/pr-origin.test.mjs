// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cameFromMergedPr, warnOnCommit } from './pr-origin.mjs';

function jsonResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cameFromMergedPr', () => {
  it('returns true when a merged PR has this sha as its merge commit', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse([
        { number: 5, merged_at: '2026-01-01T00:00:00Z', merge_commit_sha: 'abc123' },
      ])
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await cameFromMergedPr({ repo: 'o/r', sha: 'abc123', token: 't' });

    expect(result).toBe(true);
  });

  it('returns false when the associated PR is not merged', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse([{ number: 5, merged_at: null, merge_commit_sha: null }])
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await cameFromMergedPr({ repo: 'o/r', sha: 'abc123', token: 't' });

    expect(result).toBe(false);
  });

  it('returns false when the sha is listed on a PR but is not that PR\'s merge commit (e.g. an intermediate commit)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse([
        { number: 5, merged_at: '2026-01-01T00:00:00Z', merge_commit_sha: 'different-sha' },
      ])
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await cameFromMergedPr({ repo: 'o/r', sha: 'abc123', token: 't' });

    expect(result).toBe(false);
  });

  it('returns false when no PRs are associated with the commit', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await cameFromMergedPr({ repo: 'o/r', sha: 'abc123', token: 't' });

    expect(result).toBe(false);
  });

  it('throws a descriptive error on a non-2xx status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'nope' }, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      cameFromMergedPr({ repo: 'o/r', sha: 'abc123', token: 't' })
    ).rejects.toThrow(/fetching commit pulls \(404\)/i);
  });
});

describe('warnOnCommit', () => {
  it('POSTs a comment to the commit comments endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ id: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    await warnOnCommit({ repo: 'o/r', sha: 'abc123', token: 't', body: 'warning' });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/o/r/commits/abc123/comments');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ body: 'warning' });
  });

  it('throws a descriptive error on a non-2xx status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'nope' }, { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      warnOnCommit({ repo: 'o/r', sha: 'abc123', token: 't', body: 'warning' })
    ).rejects.toThrow(/posting commit comment \(403\)/i);
  });
});
