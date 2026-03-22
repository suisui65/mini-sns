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

// 画像アップロード（制限付き）
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 2 } // 2MBまで
});

// 管理者パス
const ADMIN_PASS = "0725";

// DB接続
async function start() {
  try {
    await client.connect();
    const db = client.db("sns");
    postsCollection = db.collection("posts");
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
    const usericon = req.cookies.usericon || "";

    let html = `
      <h1>🌠ミニSNS🌠</h1>

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
        <div style="margin-bottom:20px; display:flex; align-items:flex-start;">
          
          ${p.icon 
            ? `<img src="${p.icon}" width="40" height="40" style="border-radius:50%; object-fit:cover; margin-right:10px;">` 
            : `<div style="width:40px;height:40px;border-radius:50%;background:#ccc;margin-right:10px;display:flex;align-items:center;justify-content:center;">○</div>`
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

// 👤 ユーザー設定（修正版）
app.post("/setuser", upload.single("icon"), (req, res) => {
  let iconData = req.cookies.usericon || "";

  if (req.file) {
    iconData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  }

  res.cookie("username", req.body.name, { maxAge: 1000 * 60 * 60 * 24 * 365 });
  res.cookie("usericon", iconData, { maxAge: 1000 * 60 * 60 * 24 * 365 });

  res.redirect("/");
});

// 📤 投稿
app.post("/post", upload.single("image"), async (req, res) => {
  try {
    let imageData = null;

    if (req.file) {
      imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    await postsCollection.insertOne({
      name: req.cookies.username || "名無し",
      icon: req.cookies.usericon || "",
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
  console.log("起動成功🌠");
});
