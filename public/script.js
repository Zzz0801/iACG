document.addEventListener("DOMContentLoaded", () => {
    const postForm = document.getElementById("postForm");
    const postList = document.getElementById("postList");
    let currentUser = null;

    // 获取当前登录用户
    fetch("/currentUser")
        .then(res => res.json())
        .then(data => { currentUser = data.user; loadPosts(); });

    // 加载帖子
    function loadPosts() {
        fetch("/posts")
            .then(res => res.json())
            .then(posts => {
                postList.innerHTML = "";
                posts.forEach(post => renderPost(post));
            });
    }

    function renderPost(post) {
        post.likes = post.likes || [];
        const card = document.createElement("div");
        card.className = "post-card";

    const h2 = document.createElement("h2");
    h2.textContent = post.title;

    const author = document.createElement("p");
    author.className = "author";
    author.textContent = `作者：${post.author} | 发布时间：${post.time}`;

    // avatar
    const row = document.createElement('div');
    row.className = 'post-row';
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = (post.author || 'U').slice(0,1).toUpperCase();
    const main = document.createElement('div');
    main.className = 'post-main';

        const p = document.createElement("p");
        p.textContent = post.content;

    main.appendChild(h2);
    main.appendChild(author);
    main.appendChild(p);

        if (post.media) {
            if (post.media.match(/\.(jpg|jpeg|png|gif)$/i)) {
                const img = document.createElement("img");
                img.src = post.media;
                img.style.maxWidth = "100%";
                img.style.marginTop = "10px";
                card.appendChild(img);
            } else if (post.media.match(/\.(mp4|webm|ogg)$/i)) {
                const video = document.createElement("video");
                video.src = post.media;
                video.controls = true;
                video.style.maxWidth = "100%";
                video.style.marginTop = "10px";
                card.appendChild(video);
            }
        }

        // 操作区（点赞、删除等）
        const actions = document.createElement('div');
        actions.className = 'post-actions';
    const likePostBtn = document.createElement('button');
    likePostBtn.type = 'button';
    likePostBtn.className = 'btn-like';
    likePostBtn.setAttribute('aria-label', '给帖子点赞');
    likePostBtn.textContent = `👍 ${ (post.likes || []).length }`;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
        deleteBtn.className = 'btn-delete';
        deleteBtn.setAttribute('aria-label', '删除帖子');
        deleteBtn.tabIndex = 0;
        deleteBtn.textContent = '删除';
        deleteBtn.style.display = 'none';
        deleteBtn.addEventListener('click', () => {
            if (!confirm('确定删除此帖子吗？')) return;
            fetch(`/posts/${post.id}`, { method: 'DELETE', credentials: 'same-origin' })
                .then(res => res.json())
                .then(data => {
                    if (data && data.success) {
                        // remove card from DOM
                        card.remove();
                    } else {
                        alert(data && data.error ? data.error : '删除失败');
                    }
                });
        });
        // 帖子点赞操作
        likePostBtn.addEventListener('click', () => {
            const action = (post.likes || []).includes(currentUser) ? 'unlike' : 'like';
            // 乐观更新
            post.likes = post.likes || [];
            if (action === 'like' && !post.likes.includes(currentUser)) post.likes.push(currentUser);
            if (action === 'unlike') post.likes = post.likes.filter(u => u !== currentUser);
            likePostBtn.textContent = `👍 ${post.likes.length}`;

            fetch(`/posts/${post.id}/${action}`, { method: 'POST', credentials: 'same-origin' })
                .then(res => res.json())
                .then(data => {
                    if (data && data.likes !== undefined) {
                        likePostBtn.textContent = `👍 ${data.likes}`;
                    }
                }).catch(() => {
                    // 回滚（简单策略）
                    loadPosts();
                });
        });

        actions.appendChild(likePostBtn);
        actions.appendChild(deleteBtn);

        // 评论列表
        const commentsWrap = document.createElement('div');
        commentsWrap.className = 'comments-wrap';
        const commentsTitle = document.createElement('h4');
        commentsTitle.textContent = '评论';
        commentsWrap.appendChild(commentsTitle);

        (post.comments || []).forEach(comment => {
            const com = document.createElement('div');
            com.className = 'comment';
            const meta = document.createElement('div');
            meta.className = 'comment-meta';
            meta.textContent = `${comment.author} • ${comment.time}`;
            const content = document.createElement('div');
            content.className = 'comment-content';
            content.textContent = comment.content;

            const likeBtn = document.createElement('button');
            likeBtn.type = 'button';
            likeBtn.className = 'btn-like';
            likeBtn.setAttribute('aria-label', '点赞评论');
            likeBtn.tabIndex = 0;
            likeBtn.textContent = `👍 ${ (comment.likes || []).length }`;
            likeBtn.addEventListener('click', () => {
                const action = (comment.likes || []).includes(currentUser) ? 'unlike' : 'like';
                fetch(`/posts/${post.id}/comments/${comment.id}/${action}`, { method: 'POST', credentials: 'same-origin' })
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.likes !== undefined) {
                            comment.likes = comment.likes || [];
                            if (action === 'like' && !comment.likes.includes(currentUser)) comment.likes.push(currentUser);
                            if (action === 'unlike') comment.likes = comment.likes.filter(u => u !== currentUser);
                            likeBtn.textContent = `👍 ${comment.likes.length}`;
                        }
                    });
            });

            com.appendChild(meta);
            com.appendChild(content);
            com.appendChild(likeBtn);
            commentsWrap.appendChild(com);
        });

    // 评论输入框（只有登录用户可见）
        if (currentUser) {
            const commentForm = document.createElement('form');
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '写评论...';
            input.required = true;
            const btn = document.createElement('button');
            btn.type = 'submit';
            btn.textContent = '评论';
            commentForm.appendChild(input);
            commentForm.appendChild(btn);
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const content = input.value.trim();
                if (!content) return;
                fetch(`/posts/${post.id}/comments`, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                }).then(res => res.json()).then(data => {
                    if (data && data.comment) {
                        post.comments = post.comments || [];
                        post.comments.push(data.comment);
                        // re-render list by clearing and re-adding
                        // naive approach: reload posts
                        loadPosts();
                    }
                });
            });
            commentsWrap.appendChild(commentForm);
        }

        // 如果是帖子作者，显示删除按钮（用规范化比较避免类型/空格问题）
        try {
            const authorNorm = (post.author || '').toString().trim();
            const userNorm = (currentUser || '').toString().trim();
                // 设置 data 属性，便于在浏览器元素检查器看到作者信息
                deleteBtn.setAttribute('data-author', authorNorm);
                deleteBtn.setAttribute('data-user', userNorm);
                console.log('post', post.id, 'author=', authorNorm, 'currentUser=', userNorm);
                if (userNorm && authorNorm && authorNorm === userNorm) {
                    deleteBtn.style.display = 'inline-block';
                    deleteBtn.removeAttribute('aria-hidden');
                } else {
                    deleteBtn.setAttribute('aria-hidden', 'true');
                }
        } catch (e) {
            // 忽略比较错误，保持按钮隐藏
            deleteBtn.setAttribute('aria-hidden', 'true');
        }

        // 将操作区插入主内容区（确保按钮出现在 DOM 中）
        main.appendChild(actions);

    card.appendChild(row);
    row.appendChild(avatar);
    row.appendChild(main);
    card.appendChild(commentsWrap);
    postList.appendChild(card);
    }

    // loadPosts() is called after currentUser is fetched so delete buttons
    // (which depend on currentUser) render correctly.

    // 发帖
    // Modal 控制（浮动按钮打开发帖窗口）
    const fab = document.getElementById('fabPost');
    const postModal = document.getElementById('postModal');
    const modalClose = document.getElementById('modalClose');
    const postTitle = document.getElementById('postTitle');

    if (fab && postModal) {
        fab.addEventListener('click', () => {
            postModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            setTimeout(()=> postTitle && postTitle.focus(), 50);
        });
        modalClose && modalClose.addEventListener('click', ()=>{
            postModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        });
        // 点击遮罩关闭
        postModal.addEventListener('click', (e)=>{ if (e.target === postModal) { postModal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; } });
    }

    postForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!currentUser) return alert("请先登录才能发帖！");

        const formData = new FormData(postForm);

        fetch("/post", { method: "POST", body: formData, credentials: 'same-origin' })
            .then(res => res.json())
            .then(newPost => {
                    // 重新从服务器加载帖子，按照服务器保存的顺序渲染（保证最新在最上）
                    postForm.reset();
                    if (postModal) { postModal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
                    loadPosts();
                });
    });
});
