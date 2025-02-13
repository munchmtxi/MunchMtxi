const { execSync } = require('child_process');
const { format } = require('date-fns');
const fs = require('fs-extra');
const path = require('path');

const excelService = require('../services/excelService');
const emailService = require('../services/emailService');
// Adjust the following imports as per your project's structure:
const { ReportSchedule, Op } = require('../models');
const logger = require('../config/logger');
const { calculateNextRunDate } = require('../utils/dateHelpers');

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

  async processScheduledReports() {
    const schedules = await ReportSchedule.findAll({
      where: {
        nextRunAt: {
          [Op.lte]: new Date()
        }
      }
    });

    for (const schedule of schedules) {
      try {
        const filePath = await excelService.generateScheduledReport(schedule);
        
        await emailService.sendCustomEmail({
          to: schedule.email,
          subject: `Your scheduled ${schedule.reportType} report`,
          text: 'Please find your scheduled report attached.',
          attachments: [{
            filename: path.basename(filePath),
            path: filePath
          }]
        });

        await excelService.cleanup(filePath);
        
        // Update next run date based on frequency
        await schedule.update({
          nextRunAt: calculateNextRunDate(schedule.frequency)
        });
      } catch (error) {
        logger.error(`Failed to process scheduled report: ${error.message}`);
      }
    }
  }
}

module.exports = new Maintenance();
