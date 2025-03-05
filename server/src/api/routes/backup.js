/**
 * Backup management API routes
 */
const express = require('express');
const router = express.Router();
const settingsService = require('../../services/settingsService');
const logger = require('../../utils/logger').createLogger('backup');

/**
 * @api {get} /backup List all backups
 * @apiDescription Get a list of all available settings backups
 * @apiName GetBackups
 * @apiGroup Backup
 */
router.get('/', (req, res, next) => {
  try {
    const backups = settingsService.listBackups();
    res.json({ backups });
  } catch (error) {
    next(error);
  }
});

/**
 * @api {post} /backup Create a backup
 * @apiDescription Create a new backup of current settings
 * @apiName CreateBackup
 * @apiGroup Backup
 */
router.post('/', (req, res, next) => {
  try {
    settingsService.backupSettings();
    const backups = settingsService.listBackups();
    res.status(201).json({ 
      message: 'Backup created successfully',
      backups 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @api {post} /backup/restore/:name Restore backup
 * @apiDescription Restore settings from a specific backup
 * @apiName RestoreBackup
 * @apiGroup Backup
 */
router.post('/restore/:name', (req, res, next) => {
  try {
    const { name } = req.params;
    const success = settingsService.restoreBackup(name);
    
    if (success) {
      res.json({ 
        message: `Settings restored from ${name}`,
        settings: settingsService.getSettings()
      });
    } else {
      res.status(404).json({
        error: true,
        message: `Failed to restore from ${name}`
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
