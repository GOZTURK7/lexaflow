import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { SavedWords } from "./pages/SavedWords";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/share" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/words" element={<SavedWords />} />
    </Routes>
  );
}
