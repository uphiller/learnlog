import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { Layout } from "./Layout";
import { PostListPage } from "./pages/PostListPage";
import { PostDetailPage, PostFormPage } from "./pages/PostPages";
import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<PostListPage />} />
            <Route path="/posts/new" element={<PostFormPage mode="create" />} />
            <Route path="/posts/:id" element={<PostDetailPage />} />
            <Route path="/posts/:id/edit" element={<PostFormPage mode="edit" />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
