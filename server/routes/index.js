const express = require('express');
const router = express.Router();

// 首页路由
router.get('/', (req, res) => {
  res.send('<h1>欢迎来到 iAcg 二次元社区首页</h1><p><a href="/forum">论坛</a> | <a href="/user/login.html">登录</a></p>');
});

// 论坛路由示例
router.get('/forum', (req, res) => {
  res.send('<h1>论坛页面</h1><p>这里会显示帖子列表</p><a href="/">返回首页</a>');
});

module.exports = router;
