const express = require("express");
const app = express();

// フォームのデータを使えるようにする
app.use(express.urlencoded({ extended: true }));

// 投稿データ（今は一時保存）
let posts = [];

// ホーム画面
app.get("/", (req, res) => {
  let html = `
    <h1>ミニSNS</h1>
    <form method="POST" action="/post">
      名前: <input name="name" required><br>
      内容: <input name="content" required><br>
      <button type="submit">投稿</button>
    </form>
    <hr>
  `;

  posts.forEach(p => {
    html += `<p><b>${p.name}</b>: ${p.content}</p>`;
  });

  res.send(html);
});

// 投稿処理
app.post("/post", (req, res) => {
  posts.unshift({   // ←新しい投稿を上に表示
    name: req.body.name,
    content: req.body.content
  });
  res.redirect("/");
});

// 🔥 Render対応（ここが重要）
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("起動！ PORT:" + PORT);
});
