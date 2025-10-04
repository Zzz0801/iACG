# iAcg Forum (local)

轻量级基于文件存储的论坛示例项目（Node + Express）。适用于学习、原型或小型本地演示。

## 目录结构（重要）

- `public/` - 静态前端页面（`forum.html`、`register.html`、`login.html` 等）
- `server/` - 后端代码和数据
  - `app.js` - Express 应用入口
  - `data/` - JSON 数据文件（`users.json`, `posts.json`）
- `uploads/` - 上传的媒体文件

## 快速开始

必须在本地有 Node.js（建议 18+），在项目根目录下运行：

1. 安装依赖（如果首次运行）：

   npm install

2. 启动服务器：

   node server/app.js

3. 在浏览器打开：

   http://localhost:3000/forum.html

提示：登录/注册在页面上通过表单完成（会话基于 express-session）。

## 主要 API 端点

以下为后端已实现的主要接口。示例均假设服务器运行在 `http://localhost:3000`。

- POST /register
  - 表单字段：`username`, `password`（x-www-form-urlencoded）
  - 返回：302 重定向到 `/forum.html`（成功）或 400/409（失败）

- POST /login
  - 表单字段：`username`, `password`
  - 返回：302 重定向到 `/forum.html`（成功）

- GET /currentUser
  - 返回: `{ user: <username> }` 或 `{ user: null }`

- GET /posts
  - 返回：帖子数组（JSON）。每个帖子基本格式：
    {
      id, title, content, media, author, time, comments: [ { id, author, content, time, likes: [user,...] } ]
    }

- POST /post
  - 用于发帖（支持图片）。使用 multipart/form-data（字段：`title`, `content`, 可选 `media` 文件）。
  - 需先登录（有会话）。返回 JSON { success: true, post }

- POST /posts/:postId/comments
  - JSON body: `{ content: "..." }`，需登录。返回新增评论对象。

- POST /posts/:postId/comments/:commentId/like
  - 对评论点赞（或重复调用取消）；需登录。返回 { success: true, likes: <number> }

- POST /posts/:postId/comments/:commentId/unlike
  - 取消点赞。返回 { success: true, likes: <number> }

- DELETE /posts/:postId
  - 删除帖子（仅帖子作者可删）。需登录。返回 { success: true }

- POST /posts/:postId/delete
  - 兼容不支持 DELETE 的客户端（表现等同于 DELETE）。

## 数据注意事项

- 数据以 JSON 文件保存在 `server/data/` 目录下。直接编辑这些文件请小心。文件锁/并发写入没有实现——在多用户或并发环境下可能出现竞争问题。
- 媒体文件保存在 `uploads/`，前端通过 `media` 字段引用路径，例如 `/uploads/<filename>`。

## 建议改进（非必须）

- 使用数据库（SQLite / PostgreSQL / MongoDB）替代文件存储以解决并发/一致性问题。
- 删除审计：在删除时记录 `delete_logs.json`，包含删除者、时间、被删帖子基本信息。
- 为关键操作添加 CSRF 保护、速率限制、输入校验和更严格的认证流程。

## 常见问题

- 如果登录后看不到删除按钮，确认前端已成功获取 `/currentUser` 并且 `currentUser === post.author`。
- 上传文件未显示：检查 `uploads/` 目录下是否有文件并确认 `media` 路径在帖子对象中是正确的。

---

如果你想，我可以：
- 生成一份简单的 API 文档（Markdown）用于开发者阅读；
- 添加删除审计日志并在管理员页面显示它；
- 将删除改为软删除并在前端显示“已删除”占位。
