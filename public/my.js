document.addEventListener('DOMContentLoaded', () => {
  const accountInfo = document.getElementById('accountInfo');
  const avatarForm = document.getElementById('avatarForm');
  const pwdForm = document.getElementById('pwdForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const myPosts = document.getElementById('myPosts');
  let currentUser = null;

  fetch('/user/profile').then(r => r.json()).then(d => {
    if (!d || !d.user) {
      accountInfo.innerHTML = '<p>未登录。请先 <a href="login.html">登录</a></p>';
      return;
    }
    const me = d.user;
    currentUser = me.username;
    accountInfo.innerHTML = `
      <p>用户名：${me.username}</p>
      <p>邮箱：${me.email || ''}</p>
      <p>头像：${ me.avatar ? '<img src="'+me.avatar+'" style="width:64px;height:64px;border-radius:50%">' : '无' }</p>
    `;
    loadMyPosts();
  }).catch(()=>{
    accountInfo.innerHTML = '<p>加载用户信息失败</p>';
  });

  function loadMyPosts() {
    fetch('/my/posts').then(r => r.json()).then(posts => {
      myPosts.innerHTML = '';
      posts.forEach(p => renderPost(p));
    });
  }

  function renderPost(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    const h2 = document.createElement('h3'); h2.textContent = post.title || '';
    const meta = document.createElement('div'); meta.style.color = '#666'; meta.style.fontSize = '12px'; meta.textContent = post.time;
    const content = document.createElement('p'); content.textContent = post.content || '';
    const actions = document.createElement('div'); actions.className = 'post-actions';

    post.likes = post.likes || [];
    const likePostBtn = document.createElement('button'); likePostBtn.type='button'; likePostBtn.className='btn-like'; likePostBtn.textContent = `👍 ${ post.likes.length }`;
    likePostBtn.addEventListener('click', ()=>{
      const action = (post.likes || []).includes(currentUser) ? 'unlike' : 'like';
      post.likes = post.likes || [];
      if (action === 'like' && !post.likes.includes(currentUser)) post.likes.push(currentUser);
      if (action === 'unlike') post.likes = post.likes.filter(u=>u!==currentUser);
      likePostBtn.textContent = `👍 ${post.likes.length}`;
      fetch(`/posts/${post.id}/${action}`, { method:'POST', credentials:'same-origin' }).then(r=>r.json()).then(d=>{
        if (d && d.likes !== undefined) likePostBtn.textContent = `👍 ${d.likes}`;
      }).catch(()=>{ loadMyPosts(); });
    });

    const deleteBtn = document.createElement('button'); deleteBtn.type='button'; deleteBtn.className='btn-delete'; deleteBtn.textContent='删除';
    deleteBtn.addEventListener('click', () => {
      if (!confirm('确定删除此帖子吗？')) return;
      fetch(`/posts/${post.id}`, { method: 'DELETE', credentials: 'same-origin' }).then(r=>r.json()).then(d=>{
        if (d && d.success) card.remove(); else alert(d && d.error ? d.error : '删除失败');
      });
    });

    actions.appendChild(deleteBtn);

    // 评论显示
    const commentsWrap = document.createElement('div'); commentsWrap.className='comments-wrap';
    (post.comments || []).forEach(c=>{
      const com = document.createElement('div'); com.className='comment';
      const meta = document.createElement('div'); meta.className='comment-meta'; meta.textContent = `${c.author} • ${c.time}`;
      const content = document.createElement('div'); content.className='comment-content'; content.textContent = c.content;
  const likeBtn = document.createElement('button'); likeBtn.type='button'; likeBtn.className='btn-like'; likeBtn.setAttribute('aria-label','点赞评论'); likeBtn.textContent = `👍 ${ (c.likes||[]).length }`;
      likeBtn.addEventListener('click', ()=>{
        const action = (c.likes||[]).includes(currentUser) ? 'unlike' : 'like';
        fetch(`/posts/${post.id}/comments/${c.id}/${action}`, { method: 'POST', credentials: 'same-origin' }).then(r=>r.json()).then(d=>{
          if (d && d.likes !== undefined) { likeBtn.textContent = `👍 ${d.likes}`; }
        });
      });
      com.appendChild(meta); com.appendChild(content); com.appendChild(likeBtn);
      commentsWrap.appendChild(com);
    });

    // 评论表单
    if (currentUser) {
      const form = document.createElement('form');
      const input = document.createElement('input'); input.type='text'; input.placeholder='写评论...'; input.required=true;
      const btn = document.createElement('button'); btn.type='submit'; btn.textContent='评论';
      form.appendChild(input); form.appendChild(btn);
      form.addEventListener('submit', (e)=>{
        e.preventDefault(); const content = input.value.trim(); if (!content) return;
        fetch(`/posts/${post.id}/comments`, { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content }) }).then(r=>r.json()).then(d=>{
          if (d && d.comment) { loadMyPosts(); }
        });
      });
      commentsWrap.appendChild(form);
    }

    card.appendChild(h2); card.appendChild(meta); card.appendChild(content); card.appendChild(actions); card.appendChild(commentsWrap);
    myPosts.appendChild(card);
  }

  avatarForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(avatarForm);
    fetch('/user/avatar', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(r => r.json()).then(d => {
        if (d && d.success) {
          alert('头像上传成功');
          location.reload();
        } else alert(d && d.error ? d.error : '上传失败');
      });
  });

  pwdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const oldPassword = pwdForm.elements['oldPassword'].value;
    const newPassword = pwdForm.elements['newPassword'].value;
    fetch('/user/change-password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword })
    }).then(r => r.json()).then(d => {
      if (d && d.success) { alert('修改成功，请重新登录'); location.href = '/login.html'; }
      else alert(d && d.error ? d.error : '修改失败');
    });
  });

  logoutBtn.addEventListener('click', () => {
    fetch('/logout', { method: 'POST', credentials: 'same-origin' }).then(r => r.json()).then(d => {
      if (d && d.success) location.href = '/login.html'; else alert('注销失败');
    });
  });

});
