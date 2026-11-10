import axios from 'axios';
import { config } from '@/infrastructure/shared/config';
import { TestRunMaterials } from '@/infrastructure/kafka/types/testRunMessages';

/**
 * Fetches decrypted auth material for a run from aba-bl's internal endpoint,
 * keyed by runKey. Secrets live only in aba-bl (encrypted at rest) and are
 * never placed on Kafka — this HTTP call is the only path by which the
 * executor obtains them, authenticated with the shared INTERNAL_API_KEY.
 *
 * Returns null when the run is unknown or the call fails — the caller then
 * runs with no auth material (NONE-auth targets still work).
 */
export async function fetchTestRunMaterials(
  runKey: string,
): Promise<TestRunMaterials | null> {
  const url = `${config.BFF_URL}/internal/test-runs/${encodeURIComponent(
    runKey,
  )}/materials`;

  try {
    const response = await axios.get(url, {
      headers: { 'x-internal-api-key': config.INTERNAL_API_KEY },
      timeout: 10_000,
    });
    const body = response.data;
    // aba-bl wraps payloads in { success, error, data }.
    return (body?.data as TestRunMaterials) ?? null;
  } catch (error) {
    console.error(
      `[Worker] Failed to fetch test-run materials for runKey=${runKey}:`,
      (error as Error)?.message,
    );
    return null;
  }
}
