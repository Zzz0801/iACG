const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

const app = express();
const PORT = 3000;

// ---------- 创建必要文件夹 ----------
const dataDir = path.join(__dirname, "data");
const uploadsDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ---------- 初始化 JSON 文件 ----------
const usersPath = path.join(dataDir, "users.json");
const postsPath = path.join(dataDir, "posts.json");
if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, "[]");
if (!fs.existsSync(postsPath)) fs.writeFileSync(postsPath, "[]");

// ---------- 中间件 ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "iacg-secret",
    resave: false,
    saveUninitialized: true
}));

// ---------- 静态文件 ----------
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(uploadsDir));

// ---------- 上传文件配置 ----------
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random()*1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ---------- 路由 ----------
// 首页
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

// 注册
app.post("/register", (req, res) => {
    const { username, email, password, confirm } = req.body;
    if (!username || !email || !password || !confirm) return res.send("请填写所有字段");
    if (password !== confirm) return res.send("两次密码输入不一致");

    let users = [];
    try { users = JSON.parse(fs.readFileSync(usersPath)); } 
    catch(e) { users = []; }

    if (users.find(u => u.username === username)) return res.send("用户名已存在");

    users.push({ username, email, password, registerTime: new Date().toISOString() });
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

    // 注册成功 → 跳转登录页
    res.redirect("/login.html");
});

// 登录
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    let users = [];
    try { users = JSON.parse(fs.readFileSync(usersPath)); } 
    catch(e) { users = []; }

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.send("用户名或密码错误");

    req.session.user = username;
    res.redirect("/forum.html");
});

// 当前登录用户
app.get("/currentUser", (req, res) => {
    res.json({ user: req.session.user || null });
});

// 获取帖子列表
app.get("/posts", (req, res) => {
    let posts = [];
    try { posts = JSON.parse(fs.readFileSync(postsPath)); } 
    catch(e) { posts = []; }
    res.json(posts);
});

// 发帖（需登录）
app.post("/post", upload.single("media"), (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "请先登录" });

    const { title, content } = req.body;
    // Debug log to see what the client sent
    console.log('POST /post received. user=', req.session.user, 'body=', req.body, 'file=', req.file && req.file.filename);

    let media = "";
    if (req.file) media = "/uploads/" + req.file.filename;

    let posts = [];
    try { posts = JSON.parse(fs.readFileSync(postsPath)); } 
    catch(e) { posts = []; }

    const newPost = {
        id: Date.now(),
        title: title || "",
        content: content || "",
        media,
        author: req.session.user,
        time: new Date().toLocaleString()
    };

    posts.unshift(newPost);
    fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));

    res.json(newPost);
});

// ---------- 评论相关接口 ----------
// 发评论
app.post('/posts/:postId/comments', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '请先登录' });
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: '评论内容不能为空' });

    let posts = [];
    try { posts = JSON.parse(fs.readFileSync(postsPath)); } catch (e) { posts = []; }

    const post = posts.find(p => String(p.id) === String(req.params.postId));
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    post.comments = post.comments || [];
    const comment = {
        id: Date.now(),
        author: req.session.user,
        content: content,
        time: new Date().toLocaleString(),
        likes: []
    };
    post.comments.push(comment);

    fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
    res.json({ success: true, comment });
});

// 点赞评论
app.post('/posts/:postId/comments/:commentId/like', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '请先登录' });
    const username = req.session.user;

    let posts = [];
    try { posts = JSON.parse(fs.readFileSync(postsPath)); } catch (e) { posts = []; }

    const post = posts.find(p => String(p.id) === String(req.params.postId));
    if (!post) return res.status(404).json({ error: '帖子不存在' });
    post.comments = post.comments || [];

    const comment = post.comments.find(c => String(c.id) === String(req.params.commentId));
    if (!comment) return res.status(404).json({ error: '评论不存在' });

    comment.likes = comment.likes || [];
    if (!comment.likes.includes(username)) comment.likes.push(username);
    fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
    res.json({ success: true, likes: comment.likes.length });
});

// 取消点赞
app.post('/posts/:postId/comments/:commentId/unlike', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '请先登录' });
    const username = req.session.user;

    let posts = [];
    try { posts = JSON.parse(fs.readFileSync(postsPath)); } catch (e) { posts = []; }

    const post = posts.find(p => String(p.id) === String(req.params.postId));
    if (!post) return res.status(404).json({ error: '帖子不存在' });
    post.comments = post.comments || [];

    const comment = post.comments.find(c => String(c.id) === String(req.params.commentId));
    if (!comment) return res.status(404).json({ error: '评论不存在' });

    comment.likes = comment.likes || [];
    const idx = comment.likes.indexOf(username);
    if (idx !== -1) comment.likes.splice(idx, 1);
    fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
    res.json({ success: true, likes: comment.likes.length });
});

// 给帖子点赞
app.post('/posts/:postId/like', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '请先登录' });
    const username = req.session.user;

    let posts = [];
    try { posts = JSON.parse(fs.readFileSync(postsPath)); } catch (e) { posts = []; }

    const post = posts.find(p => String(p.id) === String(req.params.postId));
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    post.likes = post.likes || [];
    if (!post.likes.includes(username)) post.likes.push(username);
    fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
    res.json({ success: true, likes: post.likes.length });
});

// 给帖子取消点赞
app.post('/posts/:postId/unlike', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '请先登录' });
    const username = req.session.user;

    let posts = [];
    try { posts = JSON.parse(fs.readFileSync(postsPath)); } catch (e) { posts = []; }

    const post = posts.find(p => String(p.id) === String(req.params.postId));
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    post.likes = post.likes || [];
    const idx = post.likes.indexOf(username);
    if (idx !== -1) post.likes.splice(idx, 1);
    fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
    res.json({ success: true, likes: post.likes.length });
});

// 删除帖子（只有作者可以删除）
app.delete('/posts/:postId', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '请先登录' });
    const username = req.session.user;

    let posts = [];
    try { posts = JSON.parse(fs.readFileSync(postsPath)); } catch (e) { posts = []; }

    const idx = posts.findIndex(p => String(p.id) === String(req.params.postId));
    if (idx === -1) return res.status(404).json({ error: '帖子不存在' });

    const post = posts[idx];
    if (post.author !== username) return res.status(403).json({ error: '没有权限删除此帖子' });

    posts.splice(idx, 1);
    fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
    res.json({ success: true });
});

// 兼容性：使用 POST 请求删除帖子（某些客户端或表单无法发出 DELETE）
app.post('/posts/:postId/delete', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '请先登录' });
    const username = req.session.user;

    let posts = [];
    try { posts = JSON.parse(fs.readFileSync(postsPath)); } catch (e) { posts = []; }

    const idx = posts.findIndex(p => String(p.id) === String(req.params.postId));
    if (idx === -1) return res.status(404).json({ error: '帖子不存在' });

    const post = posts[idx];
    if (post.author !== username) return res.status(403).json({ error: '没有权限删除此帖子' });

    posts.splice(idx, 1);
    fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
    res.json({ success: true });
});

// 获取当前用户的帖子
app.get('/my/posts', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '请先登录' });
    const username = req.session.user;
    let posts = [];
    try { posts = JSON.parse(fs.readFileSync(postsPath)); } catch (e) { posts = []; }
    const myPosts = posts.filter(p => p.author === username);
    res.json(myPosts);
});

// 注销
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: '注销失败' });
        res.json({ success: true });
    });
});

// 修改密码
app.post('/user/change-password', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '请先登录' });
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: '参数缺失' });

    let users = [];
    try { users = JSON.parse(fs.readFileSync(usersPath)); } catch (e) { users = []; }

    const user = users.find(u => u.username === req.session.user);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.password !== oldPassword) return res.status(403).json({ error: '旧密码错误' });

    user.password = newPassword;
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    res.json({ success: true });
});

// 上传/更换头像
app.post('/user/avatar', upload.single('avatar'), (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: '请先登录' });
    if (!req.file) return res.status(400).json({ error: '未上传文件' });

    const avatarPath = '/uploads/' + req.file.filename;
    let users = [];
    try { users = JSON.parse(fs.readFileSync(usersPath)); } catch (e) { users = []; }
    const user = users.find(u => u.username === req.session.user);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    user.avatar = avatarPath;
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    res.json({ success: true, avatar: avatarPath });
});

// 获取当前用户详情（不返回密码）
app.get('/user/profile', (req, res) => {
    if (!req.session.user) return res.status(200).json({ user: null });
    let users = [];
    try { users = JSON.parse(fs.readFileSync(usersPath)); } catch (e) { users = []; }
    const user = users.find(u => u.username === req.session.user);
    if (!user) return res.status(200).json({ user: null });
    const safe = Object.assign({}, user);
    delete safe.password;
    res.json({ user: safe });
});

// ---------- 启动服务器 ----------
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// ---------- 防止 Windows 秒退 ----------
setInterval(() => {}, 1000);

// ---------- 全局错误处理 ----------
process.on('uncaughtException', (err) => {
    console.error('uncaughtException:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('unhandledRejection at:', promise, 'reason:', reason);
});
