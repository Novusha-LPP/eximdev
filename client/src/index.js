import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import {ImportersProvider} from "./contexts/importersContext.js"
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <React.StrictMode>
      <ImportersProvider>
      <App />
      </ImportersProvider>
    </React.StrictMode>
  </BrowserRouter>
);
