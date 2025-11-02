import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API = axios.create({ baseURL: "http://your-load-balancer-dns:5000" });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function App() {
  const [auth, setAuth] = useState(localStorage.getItem("token"));
  const [feed, setFeed] = useState([]);
  const [form, setForm] = useState({ username: "", password: "" });
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);

  const fetchFeed = async () => setFeed((await API.get("/feed")).data);

  useEffect(() => { if (auth) fetchFeed(); }, [auth]);

  const login = async () => {
    const { data } = await API.post("/login", form);
    localStorage.setItem("token", data.token);
    setAuth(data.token);
  };

  const register = async () => {
    await API.post("/register", form);
    alert("User registered, now login!");
  };

  const createPost = async () => {
    const formData = new FormData();
    formData.append("content", content);
    if (file) formData.append("image", file);
    await API.post("/posts", formData);
    setContent("");
    fetchFeed();
  };

  const likePost = async (id) => {
    await API.put(`/posts/${id}/like`);
    fetchFeed();
  };

  if (!auth)
    return (
      <div className="auth">
        <h2>🔐 Login / Register</h2>
        <input placeholder="Username" onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button onClick={login}>Login</button>
        <button onClick={register}>Register</button>
      </div>
    );

  return (
    <div className="app">
      <h1>🌍 Social Media Feed</h1>
      <textarea placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} />
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={createPost}>Post</button>

      <div className="feed">
        {feed.map((p) => (
          <div key={p.id} className="post">
            <h3>@{p.User.username}</h3>
            <p>{p.content}</p>
            {p.imageUrl && <img src={`${API.defaults.baseURL}${p.imageUrl}`} alt="" />}
            <button onClick={() => likePost(p.id)}>❤️ {p.likes}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
