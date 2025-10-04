const fs = require('fs');
const path = require('path');

const postsPath = path.join(__dirname, 'data', 'posts.json');

if (!fs.existsSync(postsPath)) {
  console.log('posts.json not found');
  process.exit(1);
}

const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
let changed = false;
posts.forEach(p => {
  if (!Array.isArray(p.comments)) { p.comments = []; changed = true; }
  p.comments.forEach(c => {
    if (!Array.isArray(c.likes)) { c.likes = []; changed = true; }
  });
});

if (changed) {
  fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2), 'utf8');
  console.log('posts.json migrated');
} else {
  console.log('no changes needed');
}
