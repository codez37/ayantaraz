/**
 * Orphan File Checker — read-only diagnostic
 *
 * Scans the uploads directory, cross-references with DB (Content.mediaUrl,
 * Content.thumbnailUrl), and reports files with no DB reference.
 *
 * Usage:
 *   npx tsx scripts/check-orphan-files.ts
 *
 * Cron (read-only, safe):
 *   0 3 * * * cd /app && node scripts/check-orphan-files.js >> logs/orphan.log 2>&1
 *
 * Design constraints (architecture lock):
 *   ✔ read-only analysis
 *   ✔ no state mutation
 *   ✔ no infrastructure dependency beyond DB + filesystem
 *   ❌ no auto-repair
 *   ❌ no file deletion
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

interface OrphanReport {
  orphans: string[];
  analyzedFiles: number;
  dbReferences: number;
  missingReferences: { contentId: number; type: string; url: string }[];
}

async function collectDbUrls(prisma: PrismaClient): Promise<Set<string>> {
  const contents = await prisma.content.findMany({
    select: { id: true, mediaUrl: true, thumbnailUrl: true },
  });

  const urls = new Set<string>();
  for (const c of contents) {
    if (c.mediaUrl) urls.add(c.mediaUrl);
    if (c.thumbnailUrl) urls.add(c.thumbnailUrl);
  }
  return urls;
}

function walkUploads(dir: string, baseDir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkUploads(full, baseDir));
    } else {
      files.push('/' + path.relative(baseDir, full).replace(/\\/g, '/'));
    }
  }
  return files;
}

async function checkOrphanFiles(): Promise<OrphanReport> {
  const prisma = new PrismaClient();
  await prisma.$connect();

  try {
    console.log(
      JSON.stringify({
        type: 'orphan-check-start',
        timestamp: new Date().toISOString(),
        uploadDir: UPLOAD_DIR,
      }),
    );

    const [dbUrls, allFiles] = await Promise.all([
      collectDbUrls(prisma),
      Promise.resolve(walkUploads(UPLOAD_DIR, UPLOAD_DIR)),
    ]);

    const orphans = allFiles.filter((f) => !dbUrls.has(f)).sort();

    const missingReferences: { contentId: number; type: string; url: string }[] = [];
    const contents = await prisma.content.findMany({
      select: { id: true, mediaUrl: true, thumbnailUrl: true },
    });

    const existingFiles = new Set(allFiles);
    for (const c of contents) {
      if (c.mediaUrl && c.mediaUrl.startsWith('/uploads/') && !existingFiles.has(c.mediaUrl)) {
        missingReferences.push({ contentId: c.id, type: 'mediaUrl', url: c.mediaUrl });
      }
      if (c.thumbnailUrl && c.thumbnailUrl.startsWith('/uploads/') && !existingFiles.has(c.thumbnailUrl)) {
        missingReferences.push({ contentId: c.id, type: 'thumbnailUrl', url: c.thumbnailUrl });
      }
    }

    const report: OrphanReport = {
      orphans,
      analyzedFiles: allFiles.length,
      dbReferences: dbUrls.size,
      missingReferences,
    };

    console.log(
      JSON.stringify({
        type: 'orphan-check-result',
        timestamp: new Date().toISOString(),
        ...report,
      }),
    );

    return report;
  } finally {
    await prisma.$disconnect();
  }
}

checkOrphanFiles()
  .then((report) => {
    process.exit(report.orphans.length > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        type: 'orphan-check-error',
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    process.exit(2);
  });
