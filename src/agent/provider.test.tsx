/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { HttpClient } from '../http/client';
import { FilesAPI } from '../api/files';
import type { AgentClient, AgentInfo } from './types';
import { AgentChatProvider } from './provider';
import { useAgentChat } from './hooks';
import * as api from './api';

jest.mock('./api', () => {
  const actual = jest.requireActual<typeof import('./api')>('./api');
  return {
    ...actual,
    fetchAgentInfo: jest.fn(),
  };
});

const fetchAgentInfoMock = api.fetchAgentInfo as jest.MockedFunction<typeof api.fetchAgentInfo>;

function makeClient(): AgentClient {
  const http = new HttpClient({ apiKey: 'test-key' });
  const files = new FilesAPI(http);
  return { http, files };
}

function AgentInfoProbe() {
  const { agentInfo } = useAgentChat();
  return (
    <div data-testid="agent-info">
      {agentInfo ? JSON.stringify(agentInfo) : 'none'}
    </div>
  );
}

describe('AgentChatProvider fetchAgentInfo effect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches agent info for template configs', async () => {
    fetchAgentInfoMock.mockResolvedValueOnce({
      description: 'Support bot',
      example_prompts: ['Help me'],
    });

    const { getByTestId } = render(
      <AgentChatProvider client={makeClient()} agentConfig={{ agent: 'acme/support@latest' }}>
        <AgentInfoProbe />
      </AgentChatProvider>
    );

    await waitFor(() => {
      expect(getByTestId('agent-info').textContent).toContain('Support bot');
    });
    expect(fetchAgentInfoMock).toHaveBeenCalledWith(expect.anything(), 'acme/support@latest');
  });

  it('does not fetch agent info for ad-hoc configs', async () => {
    render(
      <AgentChatProvider
        client={makeClient()}
        agentConfig={{ core_app: { ref: 'openrouter/claude@abc' }, system_prompt: 'hi' }}
      >
        <AgentInfoProbe />
      </AgentChatProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchAgentInfoMock).not.toHaveBeenCalled();
  });

  it('ignores stale fetch results when agentRef changes', async () => {
    let resolveFirst!: (value: AgentInfo | null) => void;
    const firstPromise = new Promise<AgentInfo | null>((resolve) => {
      resolveFirst = resolve;
    });
    fetchAgentInfoMock
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce({
        description: 'Agent B',
        example_prompts: ['B prompt'],
      });

    const client = makeClient();
    const { getByTestId, rerender } = render(
      <AgentChatProvider client={client} agentConfig={{ agent: 'acme/agent-a@latest' }}>
        <AgentInfoProbe />
      </AgentChatProvider>
    );

    rerender(
      <AgentChatProvider client={client} agentConfig={{ agent: 'acme/agent-b@latest' }}>
        <AgentInfoProbe />
      </AgentChatProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });
    resolveFirst({
      description: 'Agent A (stale)',
      example_prompts: ['A prompt'],
    });

    await waitFor(() => {
      expect(getByTestId('agent-info').textContent).toContain('Agent B');
    });
    expect(getByTestId('agent-info').textContent).not.toContain('Agent A');
  });

  it('does not refetch when agentConfig object changes but agent ref is stable', async () => {
    fetchAgentInfoMock.mockResolvedValue({
      description: 'Support bot',
      example_prompts: ['Help me'],
    });

    const client = makeClient();
    const { rerender } = render(
      <AgentChatProvider
        client={client}
        agentConfig={{ agent: 'acme/support@latest', context: { locale: 'en' } }}
      >
        <AgentInfoProbe />
      </AgentChatProvider>
    );

    await waitFor(() => {
      expect(fetchAgentInfoMock).toHaveBeenCalledTimes(1);
    });

    rerender(
      <AgentChatProvider
        client={client}
        agentConfig={{ agent: 'acme/support@latest', context: { locale: 'fr' } }}
      >
        <AgentInfoProbe />
      </AgentChatProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchAgentInfoMock).toHaveBeenCalledTimes(1);
  });
});
