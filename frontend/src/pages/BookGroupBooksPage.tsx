import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LoadingState } from "../LoadingState";
import { api, type GroupBook } from "../api";

export function BookGroupBooksPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [books, setBooks] = useState<GroupBook[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .listGroupBooks(slug)
      .then((data) => {
        setBooks(data.results);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <section className="m-group-panel">
      <h2 className="m-visually-hidden">{t("bookGroupDetail.booksTab")}</h2>
      {loading && <LoadingState />}
      {error && <p className="m-error">{error}</p>}
      {!loading && books.length > 0 && (
        <ul className="m-feed">
          {books.map((book) => (
            <li key={book.aladin_item_id} className="m-feed__item">
              <div className="m-feed-row m-feed-row--static">
                <div className="m-feed-row__body">
                  <h3 className="m-feed-row__title">{book.title}</h3>
                  {book.author && <p className="m-feed-row__meta">{book.author}</p>}
                  <p className="m-feed-row__sub">
                    {t("bookGroupDetail.readerCount", { count: book.reader_count })}
                  </p>
                </div>
                {book.cover_url ? (
                  <img src={book.cover_url} alt="" className="m-feed-row__thumb" loading="lazy" />
                ) : (
                  <div className="m-feed-row__thumb m-feed-row__thumb--empty" aria-hidden />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!loading && books.length === 0 && !error && (
        <div className="m-empty">
          <p className="m-empty__text">{t("bookGroupDetail.booksEmpty")}</p>
        </div>
      )}
    </section>
  );
}
