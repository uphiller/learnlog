import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";
import { isBookFinished } from "../bookProgress";
import { LoadingState } from "../LoadingState";
import { api, type Book } from "../api";
import { OnboardingChecklist } from "../OnboardingChecklist";
import { bookPath } from "../routes";

const SHELF_CAPACITY = 5;

function chunkIntoShelves(books: Book[], size: number): Book[][] {
  if (books.length === 0) return [];
  const shelves: Book[][] = [];
  for (let i = 0; i < books.length; i += size) {
    shelves.push(books.slice(i, i + size));
  }
  return shelves;
}

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

  const shelves = useMemo(() => chunkIntoShelves(books, SHELF_CAPACITY), [books]);

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
        <div className="m-bookshelf" aria-label={t("bookList.title")}>
          {shelves.map((shelf, shelfIndex) => (
            <div key={shelfIndex} className="m-bookshelf__shelf">
              <ul className="m-bookshelf__row">
                {shelf.map((book) => {
                  const finished = isBookFinished(book);
                  const showProgress = book.total_pages != null && book.read_page != null;
                  const progressPct = showProgress
                    ? Math.min(100, Math.round((book.read_page! / book.total_pages!) * 100))
                    : 0;

                  return (
                    <li key={book.id} className="m-bookshelf__slot">
                      <Link
                        to={bookPath(`/${book.id}`)}
                        className="m-bookshelf__book"
                        title={book.author ? `${book.title} — ${book.author}` : book.title}
                      >
                        <span className="m-bookshelf__spine" aria-hidden />
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt=""
                            className="m-bookshelf__cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="m-bookshelf__cover m-bookshelf__cover--empty" aria-hidden>
                            <span className="m-bookshelf__cover-title">{book.title}</span>
                          </span>
                        )}
                        {finished && (
                          <span className="m-book-badge m-bookshelf__badge">
                            {t("bookList.finished")}
                          </span>
                        )}
                        {showProgress && !finished && (
                          <span
                            className="m-bookshelf__progress"
                            role="progressbar"
                            aria-valuenow={book.read_page!}
                            aria-valuemin={0}
                            aria-valuemax={book.total_pages!}
                          >
                            <span
                              className="m-bookshelf__progress-fill"
                              style={{ width: `${progressPct}%` }}
                            />
                          </span>
                        )}
                        <span className="m-bookshelf__caption">
                          <span className="m-bookshelf__caption-title">{book.title}</span>
                          {book.author && (
                            <span className="m-bookshelf__caption-author">{book.author}</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="m-bookshelf__plank" aria-hidden />
            </div>
          ))}
        </div>
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
