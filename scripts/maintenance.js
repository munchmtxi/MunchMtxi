const { execSync } = require('child_process');
const { format } = require('date-fns');
const fs = require('fs-extra');

class Maintenance {
  async dailyBackup() {
    const date = format(new Date(), 'yyyy-MM-dd');
    const backupDir = `backups/${date}`;
    
    await fs.ensureDir(backupDir);
    
    // Database backup
    execSync(
      `PGPASSWORD="${process.env.DB_PASSWORD}" pg_dump -h ${process.env.DB_HOST} \
      -U ${process.env.DB_USER} -d ${process.env.DB_NAME} > ${backupDir}/db.sql`
    );

    // Log rotation
    execSync(`tar -czvf ${backupDir}/logs.tar.gz logs/`);
    
    console.log(`Backup created at ${backupDir}`);
  }
}

module.exports = new Maintenance();