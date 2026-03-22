const express = require("express");
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const upload = multer({ dest: "uploads/" });

/* ================================
   🔑 管理者パスワード（ここ書き換えて！）
================================ */
const ADMIN_PASS = "0725";

/* ================================
   🌐 MongoDB接続URL（ここ書き換えて！）
   例：
   mongodb+srv://ユーザー名:パスワード@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
================================ */
const MONGO_URL = "mongodb+srv://suisui:suisui@keigiban.qmrxf6o.mongodb.net/?appName=KEIGIBAN";
/* ================================ */

let db;

MongoClient.connect(MONGO_URL).then(client => {
  db = client.db("sns");
  console.log("DB connected");
});

let username = "";
let usericon = "";

/* ===== トップ ===== */
app.get("/", async (req, res) => {

  const posts = await db.collection("posts")
    .find({})
    .sort({ _id: -1 })
    .toArray();

  let html = `
  <style>
  body{margin:0;font-family:sans-serif;background:#e8f6ff;}
  .topbar{display:flex;align-items:center;justify-content:space-between;background:white;padding:10px;border-bottom:1px solid #ccc;}
  .app-icon{width:45px;height:45px;border-radius:50%;}
  .post-box{flex:1;margin:0 10px;display:flex;gap:5px;}
  .post-box input{flex:1;padding:8px;}
  .user-box{text-align:right;}
  .user-icon{width:40px;height:40px;border-radius:50%;}
  .timeline{max-width:700px;margin:20px auto;}
  .post{background:white;padding:12px;margin-bottom:10px;border-radius:8px;display:flex;gap:10px;}
  .post-icon{width:40px;height:40px;border-radius:50%;}
  .name{font-weight:bold;}
  .delete{font-size:10px;margin-left:5px;}
  img.post-img{max-width:200px;margin-top:5px;border-radius:6px;}

  .guide{
    max-width:700px;
    margin:20px auto;
    background:white;
    padding:10px;
    border-radius:8px;
    font-size:13px;
  }
  </style>

  <div class="topbar">
    <img class="app-icon" src="https://cdn-icons-png.flaticon.com/512/1055/1055687.png">

    <form class="post-box" method="POST" action="/post" enctype="multipart/form-data">
      <input type="text" name="content" placeholder="かくこと" required>
      <input type="file" name="image">
      <button>かく</button>
    </form>

    <div class="user-box">
      <div>${username || "ユーザー未設定"}</div>
      ${
        usericon
        ? `<img class="user-icon" src="${usericon}">`
        : `<div class="user-icon" style="background:#ccc;display:flex;align-items:center;justify-content:center;">○</div>`
      }
    </div>
  </div>

  <!-- 🌊 ガイド -->
  <div class="guide">
  <b>P-Drum Aqua 9"</b><br>
  自由に投稿できるSNS🌊<br><br>

  ✏️ 投稿 → 上から書いて「書く」<br>
  👤 名前・アイコン → 下で設定<br>
  🗑 CL → 投稿削除（パス必要）<br><br>

  🔑 パスワードの場所👇<br>
  <code>const ADMIN_PASS = "1234";</code><br>
  👉 ここを書き換え<br><br>

  🌐 データ保存👇<br>
  <code>const MONGO_URL = "ここにMongoDBのURL";</code><br>
  👉 MongoDBのURL貼る
  </div>

  <div class="timeline">
  `;

  posts.forEach(p => {
    html += `
    <div class="post">
      ${
        p.icon
        ? `<img class="post-icon" src="${p.icon}">`
        : `<div class="post-icon" style="background:#ccc;display:flex;align-items:center;justify-content:center;">○</div>`
      }

      <div style="flex:1">
        <div class="name">
          ${p.name}
          <form style="display:inline;" method="POST" action="/delete">
            <input type="hidden" name="id" value="${p._id}">
            <input name="pass" placeholder="CL" style="width:40px;">
            <button class="delete">CL</button>
          </form>
        </div>

        <div>${p.content}</div>
        ${p.image ? `<img class="post-img" src="${p.image}">` : ""}
      </div>
    </div>
    `;
  });

  html += `
  </div>

  <hr>

  <h3>ユーザー設定</h3>
  <form method="POST" action="/setuser" enctype="multipart/form-data">
    名前 <input name="name">
    アイコン <input type="file" name="icon">
    <button>設定</button>
  </form>
  `;

  res.send(html);
});

/* 投稿 */
app.post("/post", upload.single("image"), async (req, res) => {
  const image = req.file ? "/uploads/" + req.file.filename : "";

  await db.collection("posts").insertOne({
    name: username || "我輩には名がない",
    icon: usericon,
    content: req.body.content,
    image
  });

  res.redirect("/");
});

/* ユーザー設定 */
app.post("/setuser", upload.single("icon"), (req, res) => {
  username = req.body.name;
  if (req.file) usericon = "/uploads/" + req.file.filename;
  res.redirect("/");
});

/* 削除 */
app.post("/delete", async (req, res) => {
  if (req.body.pass === ADMIN_PASS) {
    await db.collection("posts").deleteOne({
      _id: new ObjectId(req.body.id)
    });
  }
  res.redirect("/");
});

/* 起動 */
app.listen(3000, () => {
  console.log("起動できたよ");
});
