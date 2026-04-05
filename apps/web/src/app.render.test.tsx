import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

const clients: QueryClient[] = [];

afterEach(() => {
  for (const client of clients.splice(0)) {
    client.clear();
  }
});

describe('App render', () => {
  it('renders the app shell with mocked API data', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/directories')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ directories: [] }),
          text: async () => '{}'
        } as Response;
      }

      if (url.endsWith('/api/skills')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ skills: [] }),
          text: async () => '{}'
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ logs: [] }),
        text: async () => '{}'
      } as Response;
    }) as typeof fetch;

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0
        },
        mutations: {
          gcTime: 0
        }
      }
    });
    clients.push(queryClient);

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Skills Manager')).toBeInTheDocument();
  });
});
