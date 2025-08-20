const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// API đăng ký
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Tên người dùng đã tồn tại' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, password: hashedPassword });
      await user.save();
      res.status(201).json({ message: 'Đăng ký thành công' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server', error });
    }
});

// API đăng nhập
router.post('/login', async (req, res) => {
     const { username, password } = req.body; 
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ message: 'Tên người dùng không tồn tại' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Mật khẩu không đúng' });
      }
      res.json({ username });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server', error });
    }
});

module.exports = router;