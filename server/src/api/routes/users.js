const express = require('express');
const router = express.Router();
const usersService = require('../../services/usersService');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = usersService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = usersService.getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(`Error retrieving user ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const newUser = usersService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const updatedUser = usersService.updateUser(req.params.id, req.body);
    res.json(updatedUser);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    console.error(`Error updating user ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = usersService.deleteUser(req.params.id);
    res.json(deletedUser);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    console.error(`Error deleting user ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router; 