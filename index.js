const express = require("express");
const app = express();

// フォームデータ使えるように
app.use(express.urlencoded({ extended: true }));

// 投稿データ
let posts = [];

// 🏠 ホーム
app.get("/", (req, res) => {
  let html = `
    <h1>ミニSNS</h1>

    <form method="POST" action="/post">
      名前: <input name="name" required><br>
      内容: <input name="content" required><br>
      <button type="submit">投稿</button>
    </form>

    <hr>

    <p>※リセットは /reset?pass=</p>
  `;

  posts.forEach(p => {
    html += `<p><b>${p.name}</b>: ${p.content}</p>`;
  });

  res.send(html);
});

// ✏️ 投稿
app.post("/post", (req, res) => {
  posts.unshift({
    name: req.body.name,
    content: req.body.content
  });
  res.redirect("/");
});

// 🧹 リセット（パスワード付き）
app.get("/reset", (req, res) => {
  if (req.query.pass === "0725") {
    posts = [];
    res.send("✅ 全投稿をリセットしました");
  } else {
    res.send("❌ パスワードが違います");
  }
});

// 🔥 Render対応
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("起動！ PORT:" + PORT);
});
