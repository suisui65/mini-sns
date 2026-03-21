const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.urlencoded({ extended: true }));

// 🔥 ここに自分のURL貼る
const uri = "mongodb+srv://suisui:suisui@keigiban.qmrxf6o.mongodb.net/?appName=KEIGIBAN";

// DB接続
const client = new MongoClient(uri);
let postsCollection;

async function start() {
  await client.connect();
  const db = client.db("sns");
  postsCollection = db.collection("posts");
  console.log("DB接続OK");
}
start();

// 🏠 ホーム
app.get("/", async (req, res) => {
  const posts = await postsCollection.find().sort({ _id: -1 }).toArray();

  let html = `
    <h1>ミニSNS（保存版）</h1>

    <form method="POST" action="/post">
      名前: <input name="name" required><br>
      内容: <input name="content" required><br>
      <button>投稿</button>
    </form>
    <hr>
  `;

  posts.forEach(p => {
    html += `<p><b>${p.name}</b>: ${p.content}</p>`;
  });

  res.send(html);
});

// 📤 投稿
app.post("/post", async (req, res) => {
  await postsCollection.insertOne({
    name: req.body.name,
    content: req.body.content,
    time: new Date()
  });
  res.redirect("/");
});

// 🔥 Render対応
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("起動！");
});
