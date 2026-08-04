// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractTicketNumber, fetchIssueLabels, closeIssue } from './ticket.mjs';

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

describe('extractTicketNumber', () => {
  it('extracts the issue number from a conventional branch name', () => {
    expect(extractTicketNumber('feat/14-ci-pipeline')).toBe(14);
    expect(extractTicketNumber('fix/13-multi-agent-review')).toBe(13);
  });

  it('returns null for branch names that do not match the convention', () => {
    expect(extractTicketNumber('random-branch')).toBeNull();
    expect(extractTicketNumber(undefined)).toBeNull();
  });
});

describe('fetchIssueLabels', () => {
  it('returns label names from string-shaped and object-shaped label entries', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        labels: ['needs-triage', { name: 'wayfinder:task' }],
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const labels = await fetchIssueLabels(14, 't');

    expect(labels).toEqual(['needs-triage', 'wayfinder:task']);
  });

  it('returns an empty array when the issue has no labels', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchIssueLabels(14, 't')).toEqual([]);
  });

  it('throws a descriptive error on a non-2xx status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchIssueLabels(14, 't')).rejects.toThrow(/\(404\)/);
  });
});

describe('closeIssue', () => {
  it('PATCHes the issue with state: closed', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ number: 14, state: 'closed' }));
    vi.stubGlobal('fetch', fetchMock);

    await closeIssue(14, 't');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/issues\/14$/);
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ state: 'closed' });
  });

  it('throws a descriptive error on a non-2xx status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'nope' }, { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(closeIssue(14, 't')).rejects.toThrow(/updating .*\(403\)/i);
  });
});
