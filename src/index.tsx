import "./index.css";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import UpdateElectron from "@/components/update";
import "./render";

const container = document.getElementById("root") as HTMLElement;
const root = ReactDOM.createRoot(container);
root.render(
  <StrictMode>
    <UpdateElectron />
    <App />
  </StrictMode>
);
