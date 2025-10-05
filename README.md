# iAcg 二次元社区（本地）

一个轻量级的二次元主题社区项目，基于 Node.js + Express + 原生静态页面实现，数据以 JSON 文件存储。

---

## 功能概览

- 用户注册、登录、注销（基于 `express-session` 会话）
- 发帖（支持图片上传）、浏览帖子列表
- 我的帖子列表（按作者过滤）
- 帖子删除（仅作者可删）
- 评论发布
- 点赞/取消点赞（支持帖子与评论）
- 用户资料：查看个人资料、修改密码、上传头像

---

## 技术栈

- 后端：Node.js (>=16，建议 18+)、Express、Multer（文件上传）、express-session（会话）
- 前端：原生 HTML/CSS/JS（静态页面托管于 Express）
- 存储：本地 JSON 文件（`server/data/*.json`），媒体文件存于 `uploads/`

---

## 目录结构

- `public/`
  - 静态前端页面与脚本：`index.html`、`forum.html`、`login.html`、`register.html`、`my.html`、`index.js`、`my.js`、`script.js`、`style.css`
- `server/`
  - `app.js`：Express 应用入口与所有主要路由
  - `data/`：数据文件（`users.json`、`posts.json`）
  - `routes/`：示例路由（当前未挂载到入口，可作为扩展示例）
- `uploads/`：图片、头像等上传文件目录

---

## 快速开始

1. 安装依赖（首次运行）：

   ```bash
   npm install
   ```

2. 启动服务：

   ```bash
   node server/app.js
   ```

3. 访问站点：

   - 论坛页：`http://localhost:3000/forum.html`
   - 首页：`http://localhost:3000/`
   - 登录：`http://localhost:3000/login.html`
   - 注册：`http://localhost:3000/register.html`
   - 我的：`http://localhost:3000/my.html`

提示：首启将自动创建 `server/data/` 与 `uploads/` 目录及空白 JSON 文件。

---

## 后端 API 文档（核心）

以下接口均基于 `http://localhost:3000`。

- 身份与会话
  - `GET /currentUser`
    - 响应：`{ user: <username|null> }`
  - `POST /login`（`application/x-www-form-urlencoded`）
    - 入参：`username`, `password`
    - 成功：302 重定向到 `/forum.html`
  - `POST /register`（`application/x-www-form-urlencoded`）
    - 入参：`username`, `email`, `password`, `confirm`
    - 成功：302 重定向到 `/login.html`
  - `POST /logout`
    - 成功：`{ success: true }`

- 用户资料
  - `GET /user/profile`
    - 响应：`{ user: { username, email?, avatar?, registerTime? } | null }`（不含密码）
  - `POST /user/change-password`
    - 需登录；入参：`oldPassword`, `newPassword`
    - 成功：`{ success: true }`
  - `POST /user/avatar`（`multipart/form-data`）
    - 需登录；字段：`avatar`（文件）
    - 成功：`{ success: true, avatar: "/uploads/<file>" }`

- 帖子
  - `GET /posts`
    - 响应：`Post[]`（见数据结构）
  - `POST /post`（`multipart/form-data`）
    - 需登录；字段：`title`, `content`, 可选 `media`（文件）
    - 成功：返回创建的 `Post`
  - `DELETE /posts/:postId`（或 `POST /posts/:postId/delete` 兼容表单）
    - 需登录；仅作者可删
    - 成功：`{ success: true }`
  - `GET /my/posts`
    - 需登录；返回当前用户的帖子列表
  - 点赞与取消点赞（帖子）
    - `POST /posts/:postId/like` / `POST /posts/:postId/unlike`
    - 成功：`{ success: true, likes: <number> }`

- 评论
  - `POST /posts/:postId/comments`
    - 需登录；入参（JSON 或表单）：`content`
    - 成功：`{ success: true, comment }`
  - 点赞与取消点赞（评论）
    - `POST /posts/:postId/comments/:commentId/like`
    - `POST /posts/:postId/comments/:commentId/unlike`
    - 成功：`{ success: true, likes: <number> }`

错误码约定：

- 401 未登录；403 无权限；404 资源不存在；400 参数错误。部分登录/注册接口返回 HTML 文本或 302 跳转，前端已按表单方式对接。

---

## 数据结构（JSON）

- User（`server/data/users.json`）
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string",  // 明文存储，仅用于示例，生产不推荐
    "registerTime": "ISO string",
    "avatar": "/uploads/<file>" | undefined
  }
  ```

- Post（`server/data/posts.json`）
  ```json
  {
    "id": 1718000000000,
    "title": "string",
    "content": "string",
    "media": "/uploads/<file>" | "",
    "author": "<username>",
    "time": "YYYY/MM/DD HH:mm:ss",
    "likes": ["<username>", ...],
    "comments": [Comment, ...]
  }
  ```

- Comment
  ```json
  {
    "id": 1718000001000,
    "author": "<username>",
    "content": "string",
    "time": "YYYY/MM/DD HH:mm:ss",
    "likes": ["<username>", ...]
  }
  ```

---

## 前端页面说明

- `index.html`：入口页
- `forum.html`：帖子流与发帖入口（登录后可发帖/删除）
- `login.html` / `register.html`：登录与注册表单页
- `my.html`：当前用户的帖子与资料操作（头像、改密）
- `index.js`/`script.js`/`my.js`：与上述页面配套的前端脚本

---

## 权限与认证

- 会话基于 `express-session`，登录成功后将用户名写入 `req.session.user`
- 发帖、评论、点赞、删除、头像上传、改密等均要求已登录
- 删除帖子需满足：`post.author === req.session.user`

---

## 文件上传

- 使用 Multer 将文件保存到 `uploads/` 目录
- 访问路径形如：`/uploads/<filename>`（由后端静态托管）


---


## 未来规划

- 使用数据库与迁移脚本替代 JSON 文件
- 统一错误响应格式（避免混合 302 与纯文本）
- 引入 JWT（或继续会话但补齐 CSRF 防护）
- 增加分页/搜索、话题标签、置顶与版块管理
- 图片压缩与 CDN、附件类型与大小限制
- 审计日志（删除、改密、头像变更）与简单的后台管理

