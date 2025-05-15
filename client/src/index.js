import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import {ImportersProvider} from "./contexts/importersContext.js"
// import { BrowserRouter } from "react-router-dom";
import { HashRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { YearProvider } from "./contexts/yearContext.js";
import { UserProvider } from "./contexts/UserContext.js";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <HashRouter>
    <React.StrictMode>
      <UserProvider>
        <YearProvider>
          <ImportersProvider>
            <App />
          </ImportersProvider>
        </YearProvider>
      </UserProvider>
    </React.StrictMode>
  </HashRouter>
);
