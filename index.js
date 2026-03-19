必須 express要求する("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

let posts = [];

app.get("/", (req, res) => {
  let html = `
    <h1>ミニSNS</h1>
    <form method="POST" action="/post">
      名前: <input name="name"><br>
      内容: <input name="content"><br>
      <button type="submit">投稿</button>
    </form>
    <hr>
  `;

  posts.forEach(p => {
    html += `<p><b>${p.name}</b>: ${p.content}</p>`;
  });

  res.send(html);
});

app.post("/post", (req, res) => {
  posts.push({
    name: req.body.name,
    content: req.body.content
  });
  res.redirect("/");
});

app.listen(3000, () => {
  console.log("起動！");
});
