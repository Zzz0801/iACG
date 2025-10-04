const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, '../data/users.json');

// 注册
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  let users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  if (users.find(u => u.username === username)) {
    return res.json({ success: false, message: '用户名已存在' });
  }
  users.push({ username, password });
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  res.json({ success: true });
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  let users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  let user = users.find(u => u.username === username && u.password === password);
  if (user) {
    return res.json({ success: true });
  } else {
    return res.json({ success: false, message: '用户名或密码错误' });
  }
});

module.exports = router;
