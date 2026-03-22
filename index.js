const express = require("express");
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

/* 🔥 メモリ保存（画像をBase64で扱う） */
const upload = multer();

/* ================================
   🔑 管理者パスワード（ここ書き換えて！）
================================ */
const ADMIN_PASS = "0725";

/* ================================
   🌐 MongoDB接続URL（ここ書き換えて！）
================================ */
const MONGO_URL = "mongodb+srv://suisui:suisui@keigiban.qmrxf6o.mongodb.net/?appName=KEIGIBAN";
/* ================================ */

let db = null;
let settingsCollection;

/* ===== MongoDB接続 ===== */
async function connectDB() {
  try {
    const client = await MongoClient.connect(MONGO_URL);
    db = client.db("sns");
    settingsCollection = db.collection("settings");
    console.log("DB connected");
  } catch (err) {
    console.error("❌ DB接続失敗:", err);
  }
}
connectDB();

/* ===== トップ ===== */
app.get("/", async (req, res) => {

  if (!db) {
    return res.send("⚠️ データベース接続中...");
  }

  const posts = await db.collection("posts")
    .find({})
    .sort({ _id: -1 })
    .toArray();

  const username = req.cookies.name;
  const usericon = req.cookies.icon;

  const bg = await settingsCollection.findOne({ type: "bg" });
  const appIcon = await settingsCollection.findOne({ type: "icon" });

  let html = `
  <style>
  body{
    margin:0;
    font-family:sans-serif;
    background-image:url('${bg?.image || ""}');
    background-size:cover;
    background-position:center;
    background-attachment:fixed;
  }

  .topbar{
    display:flex;
    align-items:center;
    justify-content:space-between;
    background:rgba(255,255,255,0.9);
    padding:10px;
    border-bottom:1px solid #ccc;
  }

  .app-icon{width:45px;height:45px;border-radius:50%;}
  .post-box{flex:1;margin:0 10px;display:flex;gap:5px;}
  .post-box input{flex:1;padding:8px;}
  .user-box{text-align:right;}
  .user-icon{width:40px;height:40px;border-radius:50%;}

  .timeline{max-width:700px;margin:20px auto;}
  .post{
    background:rgba(255,255,255,0.9);
    padding:12px;
    margin-bottom:10px;
    border-radius:8px;
    display:flex;
    gap:10px;
  }

  .post-icon{width:40px;height:40px;border-radius:50%;}
  .name{font-weight:bold;}
  .delete{font-size:10px;margin-left:5px;}
  .time{font-size:10px;color:#888;}
  img.post-img{max-width:200px;margin-top:5px;border-radius:6px;}
  </style>

  <div class="topbar">
    <img class="app-icon" src="${appIcon?.image || 'https://cdn-icons-png.flaticon.com/512/1055/1055687.png'}">

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

        <div class="time">
          ${new Date(p.time).toLocaleString("ja-JP")}
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

  <hr>

  <h3>管理者設定</h3>
  <form method="POST" action="/setbg" enctype="multipart/form-data">
    背景 <input type="file" name="bg">
    パス <input name="pass">
    <button>変更</button>
  </form>

  <form method="POST" action="/seticon" enctype="multipart/form-data">
    アイコン <input type="file" name="icon">
    パス <input name="pass">
    <button>変更</button>
  </form>
  `;

  res.send(html);
});

/* ===== 投稿 ===== */
app.post("/post", upload.single("image"), async (req, res) => {
  if (!db) return res.send("DB未接続");

  let image = "";
  if (req.file) {
    image = "data:" + req.file.mimetype + ";base64," + req.file.buffer.toString("base64");
  }

  await db.collection("posts").insertOne({
    name: req.cookies.name || "我輩には名がない...",
    icon: req.cookies.icon || "",
    content: req.body.content,
    image,
    time: Date.now()
  });

  res.redirect("/");
});

/* ===== ユーザー設定 ===== */
app.post("/setuser", upload.single("icon"), (req, res) => {

  if (req.body.name) {
    res.cookie("name", req.body.name);
  }

  if (req.file) {
    const icon = "data:" + req.file.mimetype + ";base64," + req.file.buffer.toString("base64");
    res.cookie("icon", icon);
  }

  res.redirect("/");
});

/* ===== 削除 ===== */
app.post("/delete", async (req, res) => {
  if (!db) return res.redirect("/");

  if (req.body.pass === ADMIN_PASS) {
    await db.collection("posts").deleteOne({
      _id: new ObjectId(req.body.id)
    });
  }

  res.redirect("/");
});

/* ===== 背景設定 ===== */
app.post("/setbg", upload.single("bg"), async (req, res) => {

  if (req.body.pass !== ADMIN_PASS) return res.send("権限なし");
  if (!req.file) return res.redirect("/");

  const data = "data:" + req.file.mimetype + ";base64," + req.file.buffer.toString("base64");

  await settingsCollection.updateOne(
    { type: "bg" },
    { $set: { image: data } },
    { upsert: true }
  );

  res.redirect("/");
});

/* ===== アイコン設定 ===== */
app.post("/seticon", upload.single("icon"), async (req, res) => {

  if (req.body.pass !== ADMIN_PASS) return res.send("権限なし");
  if (!req.file) return res.redirect("/");

  const data = "data:" + req.file.mimetype + ";base64," + req.file.buffer.toString("base64");

  await settingsCollection.updateOne(
    { type: "icon" },
    { $set: { image: data } },
    { upsert: true }
  );

  res.redirect("/");
});

/* ===== 起動 ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🌊 Server running on port " + PORT);
});
