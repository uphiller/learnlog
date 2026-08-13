import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { Layout } from "./Layout";
import { BookDetailPage } from "./pages/BookDetailPage";
import { BookGroupBooksPage } from "./pages/BookGroupBooksPage";
import { BookGroupCreatePage } from "./pages/BookGroupCreatePage";
import { BookGroupDetailLayout } from "./pages/BookGroupDetailLayout";
import { BookGroupMembersPage } from "./pages/BookGroupMembersPage";
import { BookGroupsPage } from "./pages/BookGroupsPage";
import { BookListPage } from "./pages/BookListPage";
import { BookSearchPage } from "./pages/BookSearchPage";
import { HistoryPage } from "./pages/HistoryPage";
import { OfMeHomePage } from "./pages/OfMeHomePage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<OfMeHomePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/book" element={<BookListPage />} />
            <Route path="/book/groups/new" element={<BookGroupCreatePage />} />
            <Route path="/book/groups/:slug" element={<BookGroupDetailLayout />}>
              <Route index element={<Navigate to="books" replace />} />
              <Route path="books" element={<BookGroupBooksPage />} />
              <Route path="members" element={<BookGroupMembersPage />} />
            </Route>
            <Route path="/book/groups" element={<BookGroupsPage />} />
            <Route path="/book/search" element={<BookSearchPage />} />
            <Route path="/book/:id" element={<BookDetailPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
