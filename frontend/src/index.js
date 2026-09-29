import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";  // App.js'deki App componentini alıyoruz
import "./style.css";     // isteğe bağlı

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


