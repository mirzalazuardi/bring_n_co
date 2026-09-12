import { defineConfig } from '@trigger.dev/sdk';

export default defineConfig({
  project: 'proj_lnbprsctcyudxgydsacx',
  dirs: ['jobs'],
  maxDuration: 60,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 30_000,
    },
  },
});
