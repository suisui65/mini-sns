const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.urlencoded({ extended: true }));

// 🔥ここに自分のMongoDB URL
const uri = "mongodb+srv://suisui:suisui@keigiban.qmrxf6o.mongodb.net/?appName=KEIGIBAN";
const client = new MongoClient(uri);

let postsCollection;

// 管理者パス（好きに変えてOK）
const ADMIN_PASS = "0725";

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
    <h1>ミニSNS</h1>

    <form method="POST" action="/post">
      名前: <input name="name" required><br>
      内容: <input name="content" required><br>
      画像URL: <input name="image"><br>
      <button>投稿</button>
    </form>

    <hr>
  `;

  posts.forEach(p => {
    html += `
      <div style="margin-bottom:20px;">
        <b>${p.name}</b>
        <small>(${new Date(p.time).toLocaleString()})</small><br>

        ${p.content}<br>

        ${p.image ? `<img src="${p.image}" width="150">` : ""}

        <br>
        👍 ${p.likes || 0}

        <form method="POST" action="/like">
          <input type="hidden" name="id" value="${p._id}">
          <button>いいね</button>
        </form>

        <form method="POST" action="/delete">
          <input type="hidden" name="id" value="${p._id}">
          管理者パス: <input name="pass">
          <button>削除</button>
        </form>
      </div>
    `;
  });

  res.send(html);
});

// 📤 投稿
app.post("/post", async (req, res) => {
  await postsCollection.insertOne({
    name: req.body.name,
    content: req.body.content,
    image: req.body.image || null,
    time: new Date(),
    likes: 0
  });
  res.redirect("/");
});

// 👍 いいね
app.post("/like", async (req, res) => {
  await postsCollection.updateOne(
    { _id: new ObjectId(req.body.id) },
    { $inc: { likes: 1 } }
  );
  res.redirect("/");
});

// 🗑️ 削除（管理者のみ）
app.post("/delete", async (req, res) => {
  if (req.body.pass === ADMIN_PASS) {
    await postsCollection.deleteOne({
      _id: new ObjectId(req.body.id)
    });
  }
  res.redirect("/");
});

// 🔥 Render対応
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("起動！");
});
