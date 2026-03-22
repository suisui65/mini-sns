const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 🔥 MongoDB URL
const uri = "mongodb+srv://suisui:suisui@keigiban.qmrxf6o.mongodb.net/?appName=KEIGIBAN";
const client = new MongoClient(uri);

let postsCollection = null;
let usersCollection = null;

// 画像アップロード
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 2 }
});

// 管理者パス
const ADMIN_PASS = "0725";

// DB接続
async function start() {
  try {
    await client.connect();
    const db = client.db("sns");
    postsCollection = db.collection("posts");
    usersCollection = db.collection("users");
    console.log("DB接続OK");
  } catch (e) {
    console.error("DB接続エラー:", e);
  }
}
start().catch(console.error);

// 🏠 ホーム
app.get("/", async (req, res) => {
  try {
    if (!postsCollection) {
      return res.send("DB接続中...");
    }

    const posts = await postsCollection.find().sort({ _id: -1 }).toArray();
    const username = req.cookies.username || "";

    let html = `
      <h1>ミニSNS🔥（完全版）</h1>

      <h3>👤 ユーザー設定</h3>
      <form method="POST" action="/setuser" enctype="multipart/form-data">
        名前: <input name="name" value="${username}" required><br>
        アイコン: <input type="file" name="icon"><br>
        <button>設定</button>
      </form>

      <hr>

      <h3>📝 投稿</h3>
      <form method="POST" action="/post" enctype="multipart/form-data">
        内容: <input name="content" required><br>
        画像: <input type="file" name="image"><br>
        <button>投稿</button>
      </form>

      <hr>
    `;

    posts.forEach(p => {
      html += `
        <div style="margin-bottom:20px; display:flex;">
          
          ${p.icon 
            ? `<img src="${p.icon}" width="40" height="40" style="border-radius:50%; margin-right:10px;">`
            : `<div style="width:40px;height:40px;border-radius:50%;background:#ccc;display:flex;align-items:center;justify-content:center;margin-right:10px;">○</div>`
          }

          <div>
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
        </div>
      `;
    });

    res.send(html);
  } catch (e) {
    res.send("エラー: " + e);
  }
});

// 👤 ユーザー設定（DB保存）
app.post("/setuser", upload.single("icon"), async (req, res) => {
  try {
    let iconData = "";

    if (req.file) {
      iconData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    await usersCollection.updateOne(
      { name: req.body.name },
      { $set: { icon: iconData } },
      { upsert: true }
    );

    res.cookie("username", req.body.name);
    res.redirect("/");
  } catch (e) {
    res.send("ユーザー設定エラー: " + e);
  }
});

// 📤 投稿（DBからアイコン取得）
app.post("/post", upload.single("image"), async (req, res) => {
  try {
    let imageData = null;

    if (req.file) {
      imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const user = await usersCollection.findOne({ name: req.cookies.username });

    await postsCollection.insertOne({
      name: req.cookies.username || "名前のない呟き者",
      icon: user?.icon || "",
      content: req.body.content,
      image: imageData,
      time: new Date(),
      likes: 0
    });

    res.redirect("/");
  } catch (e) {
    res.send("投稿エラー: " + e);
  }
});

// 👍 いいね
app.post("/like", async (req, res) => {
  try {
    await postsCollection.updateOne(
      { _id: new ObjectId(req.body.id) },
      { $inc: { likes: 1 } }
    );
    res.redirect("/");
  } catch (e) {
    res.send("いいねエラー: " + e);
  }
});

// 🗑️ 削除
app.post("/delete", async (req, res) => {
  try {
    if (req.body.pass === ADMIN_PASS) {
      await postsCollection.deleteOne({
        _id: new ObjectId(req.body.id)
      });
    }
    res.redirect("/");
  } catch (e) {
    res.send("削除エラー: " + e);
  }
});

// 🚀 起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("起動成功✨");
});
