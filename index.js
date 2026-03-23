const express = require("express");
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const upload = multer();

/* 🔑 管理者パス */
const ADMIN_PASS = "0725";

/* 🌐 MongoDB */
const MONGO_URL = "mongodb+srv://suisui:suisui@keigiban.qmrxf6o.mongodb.net/?appName=KEIGIBAN";

let db;
let settingsCollection;
let usersCollection;

/* ===== DB接続 ===== */
async function connectDB(){
  const client = await MongoClient.connect(MONGO_URL);
  db = client.db("sns");
  settingsCollection = db.collection("settings");
  usersCollection = db.collection("users");
}
connectDB();

/* ===== トップ ===== */
app.get("/", async (req, res) => {

  if(!db) return res.send("DB接続中...");

  const posts = await db.collection("posts").find({}).sort({_id:-1}).toArray();
  const bg = await settingsCollection.findOne({type:"bg"});
  const appIcon = await settingsCollection.findOne({type:"icon"});

  const username = req.cookies.name;

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
    padding:10px;
    background:rgba(255,255,255,0.2);
    backdrop-filter:blur(10px);
  }

  .app-icon{width:40px;height:40px;border-radius:50%;}
  .user-icon{width:35px;height:35px;border-radius:50%;}

  .timeline{
    max-width:600px;
    margin:20px auto;
  }

  .post{
    margin:10px;
    padding:12px;
    border-radius:10px;
    display:flex;
    gap:10px;
    background:rgba(255,255,255,0.2);
    backdrop-filter:blur(8px);
    box-shadow:0 4px 10px rgba(0,0,0,0.2);
  }

  .time{
    font-size:10px;
    color:#ddd;
  }

  img{border-radius:8px;}

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
    <img class="app-icon" src="${appIcon?.image || ''}">

    <form method="POST" action="/post" enctype="multipart/form-data">
      <input name="content" required>
      <input type="file" name="image">
      <button>投稿</button>
    </form>

    <div>
      ${username || "我輩に名がない..."}
      <img class="user-icon" src="/me/icon">
      <button onclick="toggle()">⚙</button>
    </div>
  </div>

  <div class="timeline">
  `;

  posts.forEach(p=>{
    html += `
    <div class="post">
      ${
        p.icon
        ? `<img src="${p.icon}" style="width:40px;height:40px;border-radius:50%;">`
        : "○"
      }

      <div>
        <b>${p.name}</b>

        <form method="POST" action="/delete" style="display:inline;">
          <input type="hidden" name="id" value="${p._id}">
          <input name="pass" placeholder="CL" style="width:40px;">
          <button>🆑</button>
        </form>

        <div class="time">
          ${new Date(p.time).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </div>

        <div>${p.content}</div>
        ${p.image ? `<img src="${p.image}" width="150">` : ""}

        <form method="POST" action="/like">
          <input type="hidden" name="id" value="${p._id}">
          <button>👍 ${p.likes || 0}</button>
        </form>

      </div>
    </div>
    `;
  });

  html += `
  </div>

  <!-- 設定 -->
  <div id="s" class="modal">
    <div class="modal-box">

      <button onclick="tab('n')">名前</button>
      <button onclick="tab('i')">アイコン</button>
      <button onclick="tab('a')">管理</button>

      <div id="n">
        <form method="POST" action="/setuser">
          <input name="name">
          <button>保存</button>
        </form>
      </div>

      <div id="i" style="display:none">
        <form method="POST" action="/setuser" enctype="multipart/form-data">
          <input type="file" name="icon">
          <button>保存</button>
        </form>
      </div>

      <div id="a" style="display:none">
        <input id="p" type="password">
        <button onclick="enter()">入る</button>

        <div id="ap" style="display:none">
          <form method="POST" action="/setbg" enctype="multipart/form-data">
            <input type="file" name="bg">
            <input type="hidden" name="pass" id="hp">
            <button>背景</button>
          </form>

          <form method="POST" action="/seticon" enctype="multipart/form-data">
            <input type="file" name="icon">
            <input type="hidden" name="pass" id="hp2">
            <button>アイコン</button>
          </form>
        </div>
      </div>

      <br>
      <button onclick="toggle()">閉じる</button>
    </div>
  </div>

  <script>
  function toggle(){
    const e=document.getElementById("s");
    e.style.display = e.style.display==="flex"?"none":"flex";
  }

  function tab(t){
    ["n","i","a"].forEach(x=>document.getElementById(x).style.display="none");
    document.getElementById(t).style.display="block";
  }

  function enter(){
    const pass=document.getElementById("p").value;
    if(pass==="${ADMIN_PASS}"){
      document.getElementById("ap").style.display="block";
      document.getElementById("hp").value=pass;
      document.getElementById("hp2").value=pass;
    }else alert("違う");
  }
  </script>
  `;

  res.send(html);
});

/* ===== 自分のアイコン ===== */
app.get("/me/icon", async (req,res)=>{
  const name = req.cookies.name;
  if(!name) return res.send("");

  const user = await usersCollection.findOne({ name });
  res.send(user?.icon || "");
});

/* ===== 投稿 ===== */
app.post("/post", upload.single("image"), async (req,res)=>{

  const name = req.cookies.name || "我輩に名がない...";
  const user = await usersCollection.findOne({ name });

  let image="";
  if(req.file){
    image="data:"+req.file.mimetype+";base64,"+req.file.buffer.toString("base64");
  }

  await db.collection("posts").insertOne({
    name,
    icon:user?.icon || "",
    content:req.body.content,
    image,
    time:Date.now(),
    likes:0
  });

  res.redirect("/");
});

/* 👍 */
app.post("/like", async (req,res)=>{
  await db.collection("posts").updateOne(
    {_id:new ObjectId(req.body.id)},
    {$inc:{likes:1}}
  );
  res.redirect("/");
});

/* 👤 設定 */
app.post("/setuser", upload.single("icon"), async (req,res)=>{

  const name = req.body.name || req.cookies.name || "我輩に名がない...";
  res.cookie("name", name);

  let update = {};

  if(req.file){
    const icon="data:"+req.file.mimetype+";base64,"+req.file.buffer.toString("base64");
    update.icon = icon;
  }

  await usersCollection.updateOne(
    { name },
    { $set: update },
    { upsert:true }
  );

  res.redirect("/");
});

/* 🗑 */
app.post("/delete", async (req,res)=>{
  if(req.body.pass===ADMIN_PASS){
    await db.collection("posts").deleteOne({_id:new ObjectId(req.body.id)});
  }
  res.redirect("/");
});

/* 背景 */
app.post("/setbg", upload.single("bg"), async (req,res)=>{
  if(req.body.pass!==ADMIN_PASS) return res.send("NG");

  const img="data:"+req.file.mimetype+";base64,"+req.file.buffer.toString("base64");

  await settingsCollection.updateOne(
    {type:"bg"},
    {$set:{image:img}},
    {upsert:true}
  );

  res.redirect("/");
});

/* アプリアイコン */
app.post("/seticon", upload.single("icon"), async (req,res)=>{
  if(req.body.pass!==ADMIN_PASS) return res.send("NG");

  const img="data:"+req.file.mimetype+";base64,"+req.file.buffer.toString("base64");

  await settingsCollection.updateOne(
    {type:"icon"},
    {$set:{image:img}},
    {upsert:true}
  );

  res.redirect("/");
});

app.listen(3000, ()=>console.log("🌊 完全完成SNS"));
