import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CreateRulesetData, Ruleset } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { DEFAULT_RULESET } from '@heist-mind/shared';
import { getRepositories } from '@/lib/auth';
import { RepositoryError } from '@/lib/query/result';
import { rulesetKeys, useRulesetsByCreator } from '../queries';
import { useCreateRuleset } from '../mutations';

// Representative seam tests: one read hook (Result unwrapping into RQ data/error state) and one
// write hook (repo call + concept-wide invalidation), per the characters seam pattern. Ruleset
// content comes from the real builtin bundle — content shapes are never invented in tests.

const RULESET = { id: 'rs1', name: 'Blades in the Dark', version: '1' } as unknown as Ruleset;
const RULESET_DATA: CreateRulesetData = {
  name: DEFAULT_RULESET.metadata.name,
  version: DEFAULT_RULESET.metadata.version,
  description: DEFAULT_RULESET.metadata.description,
  content: DEFAULT_RULESET,
};

function mockRepos(repos: Record<string, unknown>) {
  vi.mocked(getRepositories).mockReturnValue(repos as unknown as DatabaseRepositories);
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function testQueryClient() {
  // retry off so the error-path test settles on the first failure.
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
  vi.mocked(getRepositories).mockReset();
});

describe('useRulesetsByCreator (read side)', () => {
  it('unwraps a successful Result into query data', async () => {
    const findByCreator = vi.fn().mockResolvedValue({ success: true, data: [RULESET] });
    mockRepos({ rulesets: { findByCreator } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useRulesetsByCreator('u1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([RULESET]);
    expect(findByCreator).toHaveBeenCalledWith('u1');
  });

  it('routes a failed Result into query error state as a RepositoryError', async () => {
    const findByCreator = vi
      .fn()
      .mockResolvedValue({ success: false, error: { message: 'nope', code: '42501' } });
    mockRepos({ rulesets: { findByCreator } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useRulesetsByCreator('u1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const err = result.current.error as RepositoryError;
    expect(err).toBeInstanceOf(RepositoryError);
    expect(err.message).toBe('nope');
    expect(err.code).toBe('42501');
  });

  it('stays disabled without a userId', () => {
    mockRepos({});
    const qc = testQueryClient();

    const { result } = renderHook(() => useRulesetsByCreator(undefined), {
      wrapper: createWrapper(qc),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateRuleset (write side)', () => {
  it('calls the repo and invalidates the whole rulesets concept on success', async () => {
    const create = vi.fn().mockResolvedValue({ success: true, data: RULESET });
    mockRepos({ rulesets: { create } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useCreateRuleset(), {
      wrapper: createWrapper(qc),
    });

    await result.current.mutateAsync({ userId: 'u1', data: RULESET_DATA });

    expect(create).toHaveBeenCalledWith('u1', RULESET_DATA);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: rulesetKeys.all });
  });

  it('throws (and does not invalidate) on a failed Result', async () => {
    const create = vi.fn().mockResolvedValue({
      success: false,
      error: { message: 'already exists', code: '23505' },
    });
    mockRepos({ rulesets: { create } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useCreateRuleset(), {
      wrapper: createWrapper(qc),
    });

    await expect(result.current.mutateAsync({ userId: 'u1', data: RULESET_DATA })).rejects.toThrow(
      'already exists'
    );
    expect(invalidate).not.toHaveBeenCalled();
  });
});
