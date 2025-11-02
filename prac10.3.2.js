import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import multer from "multer";
import { Sequelize, DataTypes } from "sequelize";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const sequelize = new Sequelize("social_db", "admin", "password", {
  host: "your-rds-endpoint.amazonaws.com",
  dialect: "mysql",
});

const User = sequelize.define("User", {
  username: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
});

const Post = sequelize.define("Post", {
  content: DataTypes.STRING,
  imageUrl: DataTypes.STRING,
  likes: { type: DataTypes.INTEGER, defaultValue: 0 },
});

User.hasMany(Post);
Post.belongsTo(User);

const SECRET = "supersecretkey";
const upload = multer({ dest: "uploads/" });

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(403).json({ message: "Invalid token" });
  }
}

app.post("/register", async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({ username: req.body.username, password: hashed });
  res.json(user);
});

app.post("/login", async (req, res) => {
  const user = await User.findOne({ where: { username: req.body.username } });
  if (!user || !(await bcrypt.compare(req.body.password, user.password)))
    return res.status(401).json({ message: "Invalid credentials" });
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET);
  res.json({ token });
});

app.post("/posts", auth, upload.single("image"), async (req, res) => {
  const post = await Post.create({
    UserId: req.user.id,
    content: req.body.content,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
  });
  res.json(post);
});

app.get("/feed", async (_, res) => {
  const posts = await Post.findAll({ include: User, order: [["createdAt", "DESC"]] });
  res.json(posts);
});

app.put("/posts/:id/like", auth, async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  post.likes++;
  await post.save();
  res.json(post);
});

sequelize.sync().then(() => {
  app.listen(5000, () => console.log("🚀 Backend running on port 5000"));
});
