/**
 * Integration tests for @inferencesh/sdk
 * 
 * These tests hit the real API and require INFERENCE_API_KEY to be set.
 * Run with: npm run test:integration
 * 
 * @jest-environment node
 */

import { Inference, inference } from './index';
import { TaskStatusCompleted, TaskStatusFailed } from './types';

// Skip all tests if no API key is set
const API_KEY = process.env.INFERENCE_API_KEY;
const BASE_URL = process.env.INFERENCE_BASE_URL || 'https://api.inference.sh';

// Use a pinned app version that's known to work
const TEST_APP = 'infsh/text-templating@53bk0yzk';

const describeIfApiKey = API_KEY ? describe : describe.skip;

describeIfApiKey('Integration Tests', () => {
    let client: Inference;

    beforeAll(() => {
        client = new Inference({
            apiKey: API_KEY!,
            baseUrl: BASE_URL,
        });
    });

    describe('Basic Run', () => {
        it('should run a simple task and wait for completion', async () => {
            const result = await client.run({
                app: TEST_APP,
                input: { template: 'Hello {1}!', strings: ['Jest'] },
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.status).toBe(TaskStatusCompleted);
            expect(result.output).toBeDefined();
        }, 60000); // 60 second timeout for API call
    });

    describe('Run with Updates', () => {
        it('should receive status updates during task execution', async () => {
            const updates: number[] = [];

            const result = await client.run(
                {
                    app: TEST_APP,
                    input: { template: 'Testing {1}', strings: ['SDK'] },
                },
                {
                    onUpdate: (update) => {
                        updates.push(update.status);
                    },
                }
            );

            expect(result.status).toBe(TaskStatusCompleted);
            expect(updates.length).toBeGreaterThan(0);
        }, 60000);
    });

    describe('Fire and Forget', () => {
        it('should submit a task without waiting for completion', async () => {
            const result = await client.run(
                {
                    app: TEST_APP,
                    input: { template: '{1}', strings: ['Fire and forget'] },
                },
                { wait: false }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            // Status should NOT be completed yet (task was just submitted)
            expect(result.status).not.toBe(TaskStatusCompleted);
            expect(result.status).not.toBe(TaskStatusFailed);
        }, 30000);
    });

    describe('Factory Function', () => {
        it('should work with lowercase inference() factory', async () => {
            const factoryClient = inference({
                apiKey: API_KEY!,
                baseUrl: BASE_URL,
            });

            const result = await factoryClient.run(
                {
                    app: TEST_APP,
                    input: { template: '{1}', strings: ['Factory test'] },
                },
                { wait: false }
            );

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        }, 30000);
    });

    describe('Error Handling', () => {
        it('should throw an error for non-existent app', async () => {
            await expect(
                client.run(
                    {
                        app: 'non-existent/app-that-does-not-exist@xyz123',
                        input: {},
                    },
                    { wait: false }
                )
            ).rejects.toThrow();
        }, 30000);
    });
});

// Add a simple test that always runs to ensure Jest doesn't complain about no tests
describe('Integration Test Setup', () => {
    it('should have API key check', () => {
        if (!API_KEY) {
            console.log('⚠️  Skipping integration tests - INFERENCE_API_KEY not set');
        }
        expect(true).toBe(true);
    });
});
