import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DependencyEcosystem, Package } from '@aba/database';

const OSV_ECOSYSTEM: Record<DependencyEcosystem, string> = {
  NPM: 'npm',
  PYPI: 'PyPI',
  MAVEN: 'Maven',
  RUBYGEMS: 'RubyGems',
  NUGET: 'NuGet',
  GO: 'Go',
  OTHER: 'other',
};

export interface OsvVuln {
  id: string;
  summary?: string;
  published?: string;
  severity?: { type: string; score: string }[];
  affected?: {
    ranges?: {
      type: string;
      events: { introduced?: string; fixed?: string }[];
    }[];
  }[];
}

export interface PackageScanResult {
  package: Package;
  vulns: OsvVuln[];
}

@Injectable()
export class OsvService {
  private readonly logger = new Logger(OsvService.name);
  private readonly OSV_URL = 'https://api.osv.dev/v1/querybatch';

  async queryBatch(packages: Package[]): Promise<PackageScanResult[]> {
    if (!packages.length) return [];

    const queries = packages.map((pkg) => ({
      package: {
        name: pkg.name,
        ecosystem: OSV_ECOSYSTEM[pkg.ecosystem] ?? 'other',
      },
      version: pkg.version,
    }));

    try {
      const { data } = await axios.post<{ results: { vulns?: OsvVuln[] }[] }>(
        this.OSV_URL,
        { queries },
        { timeout: 15_000 },
      );

      return packages.map((pkg, i) => ({
        package: pkg,
        vulns: data.results[i]?.vulns ?? [],
      }));
    } catch (error) {
      this.logger.error('OSV batch query failed', error?.message);
      // Return empty results so the upload still succeeds even if OSV is down
      return packages.map((pkg) => ({ package: pkg, vulns: [] }));
    }
  }
}
