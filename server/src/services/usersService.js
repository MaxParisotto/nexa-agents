const settingsService = require('./settingsService');
const logger = require('../utils/logger');

class UsersService {
  constructor() {
    this.logger = logger.createLogger('users-service');
  }

  /**
   * Get all users
   * @returns {Array} List of users
   */
  getAllUsers() {
    const settings = settingsService.getSettings();
    return settings.users?.items || [];
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID to find
   * @returns {Object|null} User if found, null otherwise
   */
  getUserById(userId) {
    const settings = settingsService.getSettings();
    return settings.users?.items.find(u => u.id === userId) || null;
  }

  /**
   * Create new user
   * @param {Object} userData - User data to create
   * @returns {Object} Created user
   */
  createUser(userData) {
    const settings = settingsService.getSettings();
    const newUser = {
      id: `user-${Date.now()}`,
      ...userData,
      type: 'user',
      avatar: userData.avatar || '/static/images/avatar/user.png',
      createdAt: new Date().toISOString()
    };

    settings.users = settings.users || { items: [] };
    settings.users.items.push(newUser);
    settingsService.updateSettings(settings);

    return newUser;
  }

  /**
   * Update user
   * @param {string} userId - User ID to update
   * @param {Object} userData - Updated user data
   * @returns {Object} Updated user
   */
  updateUser(userId, userData) {
    const settings = settingsService.getSettings();
    const userIndex = settings.users?.items.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...settings.users.items[userIndex],
      ...userData,
      updatedAt: new Date().toISOString()
    };

    settings.users.items[userIndex] = updatedUser;
    settingsService.updateSettings(settings);

    return updatedUser;
  }

  /**
   * Delete user
   * @param {string} userId - User ID to delete
   * @returns {Object} Deleted user
   */
  deleteUser(userId) {
    const settings = settingsService.getSettings();
    const userIndex = settings.users?.items.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const deletedUser = settings.users.items[userIndex];
    settings.users.items.splice(userIndex, 1);
    settingsService.updateSettings(settings);

    return deletedUser;
  }
}

// Create singleton instance
const usersService = new UsersService();

module.exports = usersService; 