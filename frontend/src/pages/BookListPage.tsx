import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";
import { isBookFinished } from "../bookProgress";
import { LoadingState } from "../LoadingState";
import { api, type Book } from "../api";
import { OnboardingChecklist } from "../OnboardingChecklist";
import { bookPath } from "../routes";

export function BookListPage() {
  const { t } = useTranslation();
  const { authenticated } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      setBooks([]);
      return;
    }
    setLoading(true);
    api
      .listBooks()
      .then((data) => {
        setBooks(data.results);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authenticated]);

  return (
    <div className="m-page">
      {!authenticated && !loading && (
        <div className="m-hero">
          <h1 className="m-hero__title">{t("bookList.guestTitle")}</h1>
          <p className="m-hero__lead">{t("bookList.guestLead")}</p>
          <p className="m-muted">{t("common.loginToStart")}</p>
        </div>
      )}

      {authenticated && (
        <header className="m-page-head">
          <p className="m-breadcrumb">
            <Link to="/">{t("common.brand")}</Link>
            <span aria-hidden> › </span>
            <span>{t("bookList.breadcrumb")}</span>
          </p>
          <h1 className="m-page-head__title">{t("bookList.title")}</h1>
          <p className="m-page-head__sub">{t("bookList.bookCount", { count: books.length })}</p>
        </header>
      )}

      {authenticated && <OnboardingChecklist books={books} />}

      {authenticated && loading && <LoadingState />}
      {error && <p className="m-error">{error}</p>}

      {authenticated && !loading && books.length > 0 && (
        <ul className="m-feed">
          {books.map((book) => {
            const showProgress = book.total_pages != null;
            const finished = isBookFinished(book);
            const progressPct =
              showProgress && book.read_page != null
                ? Math.min(100, Math.round((book.read_page / book.total_pages!) * 100))
                : 0;

            return (
              <li key={book.id} className="m-feed__item">
                <Link to={bookPath(`/${book.id}`)} className="m-feed-row">
                  <div className="m-feed-row__body">
                    <div className="m-feed-row__title-row">
                      <h2 className="m-feed-row__title">{book.title}</h2>
                      {finished && <span className="m-book-badge">{t("bookList.finished")}</span>}
                    </div>
                    {book.author && <p className="m-feed-row__meta">{book.author}</p>}
                    {showProgress && (
                      <div className="m-read-progress m-read-progress--row">
                        <p className="m-feed-row__sub">
                          {book.read_page != null
                            ? t("bookList.pagesRead", {
                                read: book.read_page,
                                total: book.total_pages,
                              })
                            : t("bookList.pagesTotal", { total: book.total_pages })}
                        </p>
                        {book.read_page != null && (
                          <div
                            className="m-read-progress__bar"
                            role="progressbar"
                            aria-valuenow={book.read_page}
                            aria-valuemin={0}
                            aria-valuemax={book.total_pages!}
                          >
                            <div
                              className="m-read-progress__fill"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {book.cover_url ? (
                    <img src={book.cover_url} alt="" className="m-feed-row__thumb" loading="lazy" />
                  ) : (
                    <div className="m-feed-row__thumb m-feed-row__thumb--empty" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && authenticated && books.length === 0 && !error && (
        <div className="m-empty">
          <p className="m-empty__text">{t("bookList.empty")}</p>
          <Link to={bookPath("/search")} className="m-btn m-btn--write">
            {t("bookList.searchBooks")}
          </Link>
        </div>
      )}
    </div>
  );
}
