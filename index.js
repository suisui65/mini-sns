const express = require("express");
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

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

  .modal{
    display:none;
    position:fixed;
    top:0;left:0;
    width:100%;height:100%;
    background:rgba(0,0,0,0.5);
    justify-content:center;
    align-items:center;
  }

  .modal-box{
    background:white;
    padding:20px;
    border-radius:10px;
    width:320px;
  }
  </style>

  <div class="topbar">
    <img class="app-icon" src="${appIcon?.image || 'https://cdn-icons-png.flaticon.com/512/1055/1055687.png'}">

    <form class="post-box" method="POST" action="/post" enctype="multipart/form-data">
      <input type="text" name="content" placeholder="かくこと" required>
      <input type="file" name="image">
      <button>かく</button>
    </form>

    <div class="user-box">
      <div>${username || "我輩に名がない..."}</div>
      ${
        usericon
        ? `<img class="user-icon" src="${usericon}">`
        : `<div class="user-icon" style="background:#ccc;display:flex;align-items:center;justify-content:center;">○</div>`
      }
      <button onclick="toggleSettings()">⚙</button>
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

  <!-- ⚙ 設定モーダル -->
  <div id="settings" class="modal">
    <div class="modal-box">

      <div style="display:flex;gap:5px;margin-bottom:10px;">
        <button onclick="showTab('name')">名前変更</button>
        <button onclick="showTab('icon')">アイコン変更</button>
        <button onclick="showTab('admin')">管理者</button>
      </div>

      <div id="tab-name">
        <form method="POST" action="/setuser">
          <input name="name" placeholder="名前"><br><br>
          <button>保存</button>
        </form>
      </div>

      <div id="tab-icon" style="display:none;">
        <form method="POST" action="/setuser" enctype="multipart/form-data">
          <input type="file" name="icon"><br><br>
          <button>保存</button>
        </form>
      </div>

      <div id="tab-admin" style="display:none;">
        <div id="admin-lock">
          <input id="admin-pass" type="password" placeholder="パスワード"><br><br>
          <button onclick="checkAdmin()">入る</button>
        </div>

        <div id="admin-panel" style="display:none;">
          <form method="POST" action="/setbg" enctype="multipart/form-data">
            背景<br>
            <input type="file" name="bg"><br><br>
            <input type="hidden" name="pass" id="hidden-pass">
            <button>変更</button>
          </form>

          <hr>

          <form method="POST" action="/seticon" enctype="multipart/form-data">
            アイコン<br>
            <input type="file" name="icon"><br><br>
            <input type="hidden" name="pass" id="hidden-pass2">
            <button>変更</button>
          </form>
        </div>
      </div>

      <br>
      <button onclick="toggleSettings()">閉じる</button>
    </div>
  </div>

  <script>
  function toggleSettings(){
    const s = document.getElementById("settings");
    s.style.display = (s.style.display === "flex") ? "none" : "flex";
  }

  function showTab(tab){
    document.getElementById("tab-name").style.display = "none";
    document.getElementById("tab-icon").style.display = "none";
    document.getElementById("tab-admin").style.display = "none";
    document.getElementById("tab-" + tab).style.display = "block";
  }

  function checkAdmin(){
    const pass = document.getElementById("admin-pass").value;

    if(pass === "${ADMIN_PASS}"){
      document.getElementById("admin-lock").style.display = "none";
      document.getElementById("admin-panel").style.display = "block";

      document.getElementById("hidden-pass").value = pass;
      document.getElementById("hidden-pass2").value = pass;
    } else {
      alert("パスワード違う");
    }
  }
  </script>
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
    name: req.cookies.name || "我輩に名がない...",
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
