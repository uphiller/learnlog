import { BrowserRouter, Navigate, useRoutes } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { GroupDetailProvider } from "./GroupDetailContext";
import { Layout } from "./Layout";
import { ProfileMenuProvider } from "./ProfileMenuContext";
import { BookDetailPage } from "./pages/BookDetailPage";
import { BookGroupBoardPage } from "./pages/BookGroupBoardPage";
import { BookGroupBookAddPage } from "./pages/BookGroupBookAddPage";
import { BookGroupBookDetailPage } from "./pages/BookGroupBookDetailPage";
import { BookGroupBooksPage } from "./pages/BookGroupBooksPage";
import { BookGroupCreatePage } from "./pages/BookGroupCreatePage";
import { BookGroupDetailLayout } from "./pages/BookGroupDetailLayout";
import { BookGroupMembersPage } from "./pages/BookGroupMembersPage";
import { BookGroupJoinPage } from "./pages/BookGroupJoinPage";
import { BookGroupPostCreatePage } from "./pages/BookGroupPostCreatePage";
import { BookGroupPostPage } from "./pages/BookGroupPostPage";
import { BookGroupsPage } from "./pages/BookGroupsPage";
import { BookListPage } from "./pages/BookListPage";
import { BookSearchPage } from "./pages/BookSearchPage";
import { HistoryPage } from "./pages/HistoryPage";
import { OfMeHomePage } from "./pages/OfMeHomePage";
import { isBookHost } from "./routes";

function bookGroupRoutes(prefix: string) {
  const p = (sub: string) => `${prefix}${sub}`;

  return [
    { path: p("/groups/new"), element: <BookGroupCreatePage /> },
    { path: p("/groups/join/:inviteSlug"), element: <BookGroupJoinPage /> },
    { path: p("/groups/join"), element: <BookGroupJoinPage /> },
    { path: p("/groups/:slug/books/add"), element: <BookGroupBookAddPage /> },
    { path: p("/groups/:slug/board/new"), element: <BookGroupPostCreatePage /> },
    {
      path: p("/groups/:slug"),
      element: <BookGroupDetailLayout />,
      children: [
        { index: true, element: <Navigate to="books" replace /> },
        { path: "books/:readingId", element: <BookGroupBookDetailPage /> },
        { path: "books", element: <BookGroupBooksPage /> },
        { path: "members", element: <BookGroupMembersPage /> },
        { path: "board", element: <BookGroupBoardPage /> },
        { path: "board/:postId", element: <BookGroupPostPage /> },
      ],
    },
    { path: p("/groups"), element: <BookGroupsPage /> },
  ];
}

function AppRoutes() {
  const bookHost = isBookHost();
  const routes = bookHost
    ? [
        { path: "/", element: <BookListPage /> },
        { path: "/search", element: <BookSearchPage /> },
        ...bookGroupRoutes(""),
        { path: "/:id", element: <BookDetailPage /> },
      ]
    : [
        { path: "/", element: <OfMeHomePage /> },
        { path: "/history", element: <HistoryPage /> },
        { path: "/book", element: <BookListPage /> },
        { path: "/book/search", element: <BookSearchPage /> },
        ...bookGroupRoutes("/book"),
        { path: "/book/:id", element: <BookDetailPage /> },
      ];

  return useRoutes(routes);
}

export default function App() {
  return (
    <AuthProvider>
      <GroupDetailProvider>
        <BrowserRouter>
          <ProfileMenuProvider>
            <Layout>
              <AppRoutes />
            </Layout>
          </ProfileMenuProvider>
        </BrowserRouter>
      </GroupDetailProvider>
    </AuthProvider>
  );
}
