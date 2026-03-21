const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");

const app = express();
app.use(express.urlencoded({ extended: true }));

// 🔥 MongoDB URL
const uri = "mongodb+srv://suisui:suisui@keigiban.qmrxf6o.mongodb.net/?appName=KEIGIBAN";
const client = new MongoClient(uri);

let postsCollection;

// 画像アップロード設定（メモリ保存）
const upload = multer({ storage: multer.memoryStorage() });

// 管理者パス
const ADMIN_PASS = "1234";

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
    <h1>ミニSNS（画像直接投稿）</h1>

    <form method="POST" action="/post" enctype="multipart/form-data">
      名前: <input name="name" required><br>
      内容: <input name="content" required><br>
      画像: <input type="file" name="image"><br>
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

// 📤 投稿（画像をbase64で保存）
app.post("/post", upload.single("image"), async (req, res) => {
  let imageData = null;

  if (req.file) {
    imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  }

  await postsCollection.insertOne({
    name: req.body.name,
    content: req.body.content,
    image: imageData,
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

// 🗑️ 削除
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
