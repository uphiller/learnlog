import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LoadingState } from "../LoadingState";
import { api, type GroupMemberWriting, type GroupReading } from "../api";

export function BookGroupBookDetailPage() {
  const { t, i18n } = useTranslation();
  const { slug, readingId } = useParams<{ slug: string; readingId: string }>();
  const [book, setBook] = useState<GroupReading | null>(null);
  const [writings, setWritings] = useState<GroupMemberWriting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dateLocale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

  useEffect(() => {
    if (!slug || !readingId) return;
    setLoading(true);
    api
      .getGroupBookDetail(slug, Number(readingId))
      .then((data) => {
        setBook(data.book);
        setWritings(data.writings);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, readingId]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !book || !slug) {
    return (
      <section className="m-group-panel">
        <p className="m-error">{error ?? t("bookGroupDetail.bookNotFound")}</p>
        <Link to={`/book/groups/${slug}/books`} className="m-link-btn">
          {t("bookGroupDetail.backToBooks")}
        </Link>
      </section>
    );
  }

  return (
    <section className="m-group-panel">
      <article className="m-article">
        <header className="m-article__header">
          {book.cover_url && (
            <img src={book.cover_url} alt="" className="m-article__cover" loading="lazy" />
          )}
          <h2 className="m-article__title m-serif">{book.title}</h2>
          {book.author && <p className="m-article__byline">{book.author}</p>}
          {(book.publisher || book.pub_date) && (
            <p className="m-article__meta">
              {[book.publisher, book.pub_date].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="m-article__meta">
            {t("bookGroupDetail.addedBy", {
              name: book.set_by_name,
              date: new Date(book.created_at).toLocaleDateString(dateLocale),
            })}
          </p>
          <div className="m-article__actions">
            <Link to={`/book/groups/${slug}/books`} className="m-link-btn">
              {t("bookGroupDetail.backToBooks")}
            </Link>
          </div>
        </header>

        <hr className="m-rule" />

        <section className="m-group-writings">
          <h3 className="m-compose__label">{t("bookGroupDetail.memberWritingsTitle")}</h3>
          {writings.length === 0 ? (
            <p className="m-muted">{t("bookGroupDetail.memberWritingsEmpty")}</p>
          ) : (
            <ul className="m-group-writings__list">
              {writings.map((writing) => (
                <li key={writing.keycloak_sub} className="m-group-writing">
                  <header className="m-group-writing__head">
                    <span className="m-avatar m-avatar--sm" aria-hidden>
                      {writing.display_name.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <span className="m-group-writing__name">{writing.display_name}</span>
                  </header>
                  {writing.completion_sentence && (
                    <div className="m-group-writing__completion">
                      <span className="m-book-badge m-book-badge--sm">{t("bookList.finished")}</span>
                      <p className="m-article__completion m-serif">
                        「{writing.completion_sentence}」
                      </p>
                    </div>
                  )}
                  {writing.quotes.length > 0 && (
                    <ul className="m-quotes__list">
                      {writing.quotes.map((quote, index) => (
                        <li key={`${writing.keycloak_sub}-${index}`} className="m-quote m-quote--peer">
                          <blockquote className="m-quote__text m-serif">{quote.quote}</blockquote>
                          {quote.memo && <p className="m-quote__memo">{quote.memo}</p>}
                          <footer className="m-quote__foot">
                            {quote.page && (
                              <span>{t("common.pageShort", { page: quote.page })}</span>
                            )}
                            <span>
                              {new Date(quote.created_at).toLocaleDateString(dateLocale)}
                            </span>
                          </footer>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </section>
  );
}
