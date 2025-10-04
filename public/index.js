// 从 /posts 获取帖子并随机选择最多 4 个标题显示为热门帖子
(function(){
  function pickRandom(arr, n) {
    const copy = arr.slice();
    const res = [];
    while (res.length < n && copy.length) {
      const idx = Math.floor(Math.random() * copy.length);
      res.push(copy.splice(idx,1)[0]);
    }
    return res;
  }

  function renderHot(posts) {
    const container = document.getElementById('hotPosts');
    container.innerHTML = '';
    const picks = pickRandom(posts, 4);
    if (!picks.length) {
      container.innerHTML = '<li>暂无帖子</li>';
      return;
    }
    picks.forEach(p => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = 'forum.html';
      a.textContent = (p.title && p.title.trim()) ? p.title : (p.content ? (p.content.slice(0,40) + (p.content.length>40? '...':'')) : '(无标题)');
      li.appendChild(a);
      container.appendChild(li);
    });
  }

  fetch('/posts').then(r=>r.json()).then(posts=>{
    renderHot(posts || []);
  }).catch(err=>{
    const container = document.getElementById('hotPosts');
    if (container) container.innerHTML = '<li>加载失败</li>';
    console.error('加载 hot posts 失败', err);
  });
})();
