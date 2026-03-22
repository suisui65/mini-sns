const express = require("express");
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

/* 🔥 メモリ保存（DB用） */
const upload = multer();

/* ================================
   🔑 管理者パスワード（変更してOK）
================================ */
const ADMIN_PASS = "0725";

/* ================================
   🌐 MongoDB URL（ここに入れる）
================================ */
const MONGO_URL = "mongodb+srv://suisui:suisui@keigiban.qmrxf6o.mongodb.net/?appName=KEIGIBAN";
/* ================================ */

let db;
let settingsCollection;

/* ===== DB接続 ===== */
async function connectDB(){
  const client = await MongoClient.connect(MONGO_URL);
  db = client.db("sns");
  settingsCollection = db.collection("settings");
  console.log("DB接続OK🔥");
}
connectDB();

/* ===== トップ ===== */
app.get("/", async (req, res) => {

  if(!db) return res.send("DB接続中...");

  const posts = await db.collection("posts")
    .find({})
    .sort({ _id:-1 })
    .toArray();

  const bg = await settingsCollection.findOne({type:"bg"});
  const appIcon = await settingsCollection.findOne({type:"icon"});

  const username = req.cookies.name;
  const usericon = req.cookies.icon;

  let html = `
  <style>
  body{
    margin:0;
    font-family:sans-serif;
    background-image:url('${bg?.image || ""}');
    background-size:cover;
  }
  .topbar{display:flex;align-items:center;background:#fff;padding:10px;}
  .app-icon{width:40px;height:40px;border-radius:50%;}
  .user-icon{width:35px;height:35px;border-radius:50%;}
  .post{background:#fff;margin:10px;padding:10px;border-radius:8px;}
  </style>

  <div class="topbar">
    <img class="app-icon" src="${appIcon?.image || ''}">

    <form method="POST" action="/post" enctype="multipart/form-data">
      <input name="content" required>
      <input type="file" name="image">
      <button>投稿</button>
    </form>

    <div style="margin-left:auto">
      ${username || "我輩に名がない..."}
      ${
        usericon
        ? `<img class="user-icon" src="${usericon}">`
        : "○"
      }
      <button onclick="toggle()">⚙️</button>
    </div>
  </div>
  `;

  posts.forEach(p=>{
    html += `
    <div class="post">
      <b>${p.name}</b><br>
      <small>${new Date(p.time).toLocaleString("ja-JP")}</small><br>
      ${p.content}<br>
      ${p.image ? `<img src="${p.image}" width="150">`:""}
    </div>
    `;
  });

  html += `
  <!-- 設定 -->
  <div id="s" style="display:none;position:fixed;top:0;width:100%;height:100%;background:#0008;">
    <div style="background:#fff;margin:100px auto;padding:20px;width:300px">

      <button onclick="tab('n')">名前</button>
      <button onclick="tab('i')">アイコン</button>
      <button onclick="tab('a')">管理</button>

      <div id="n">
        <form method="POST" action="/setuser">
          <input name="name">
          <button>確定</button>
        </form>
      </div>

      <div id="i" style="display:none">
        <form method="POST" action="/setuser" enctype="multipart/form-data">
          <input type="file" name="icon">
          <button>確定</button>
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

      <button onclick="toggle()">閉じる</button>
    </div>
  </div>

  <script>
  function toggle(){
    const e=document.getElementById("s");
    e.style.display = e.style.display==="block"?"none":"block";
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

/* ===== 投稿 ===== */
app.post("/post", upload.single("image"), async (req,res)=>{

  let image="";
  if(req.file){
    image = "data:"+req.file.mimetype+";base64,"+req.file.buffer.toString("base64");
  }

  await db.collection("posts").insertOne({
    name:req.cookies.name || "我輩に名がない...",
    icon:req.cookies.icon || "",
    content:req.body.content,
    image,
    time:Date.now()
  });

  res.redirect("/");
});

/* ===== ユーザー設定 ===== */
app.post("/setuser", upload.single("icon"), (req,res)=>{

  if(req.body.name){
    res.cookie("name", req.body.name);
  }

  if(req.file){
    const icon="data:"+req.file.mimetype+";base64,"+req.file.buffer.toString("base64");
    res.cookie("icon", icon);
  }

  res.redirect("/");
});

/* ===== 背景 ===== */
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

/* ===== アプリアイコン ===== */
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

app.listen(3000, ()=>console.log("🌊 完成SNS起動"));
