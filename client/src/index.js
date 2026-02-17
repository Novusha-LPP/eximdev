import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import {ImportersProvider} from "./contexts/importersContext.js"
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { YearProvider } from "./contexts/yearContext.js";

import { SnackbarProvider } from "./contexts/SnackbarContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <React.StrictMode>
      <SnackbarProvider>
        <YearProvider>
          <ImportersProvider>
            <App />
          </ImportersProvider>
        </YearProvider>
      </SnackbarProvider>
    </React.StrictMode>
  </BrowserRouter>
);
