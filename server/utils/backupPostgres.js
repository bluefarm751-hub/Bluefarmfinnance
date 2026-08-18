const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

function backupPostgres(outputDir = process.env.BACKUP_DIR || '/tmp/bluefarm-backups') {
  return new Promise((resolve, reject) => {
    if (!process.env.DATABASE_URL) {
      return reject(new Error('DATABASE_URL is required for PostgreSQL backups'));
    }

    fs.mkdirSync(outputDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `bluefarm-postgres-${stamp}.dump`);

    execFile('pg_dump', [
      process.env.DATABASE_URL,
      '--format=custom',
      '--file', outputFile,
      '--no-owner',
      '--no-acl'
    ], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) return reject(new Error(`PostgreSQL backup failed: ${stderr || error.message}`));
      resolve(outputFile);
    });
  });
}

module.exports = { backupPostgres };
