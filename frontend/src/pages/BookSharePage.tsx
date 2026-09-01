import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";
import { LoadingState } from "../LoadingState";
import { api, type PublicBook } from "../api";
import { bookPath } from "../routes";

export function BookSharePage() {
  const { t, i18n } = useTranslation();
  const { token } = useParams();
  const { authenticated, loginWithGoogle, loginWithKakao } = useAuth();
  const [book, setBook] = useState<PublicBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const dateLocale = i18n.language === "ko" ? "ko-KR" : "en-US";

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError(t("bookShare.notFound"));
      return;
    }
    setLoading(true);
    api
      .getSharedBook(token)
      .then((data) => {
        setBook(data);
        setError(null);
        document.title = data.author
          ? `${data.title} · ${data.author} · of.me`
          : `${data.title} · of.me`;
      })
      .catch(() => setError(t("bookShare.notFound")))
      .finally(() => setLoading(false));
  }, [token, t]);

  if (loading) return <LoadingState />;
  if (error || !book) return <p className="m-error m-text-center">{error ?? t("bookShare.notFound")}</p>;

  return (
    <article className="m-article">
      <header className="m-article__header">
        {book.cover_url && (
          <img src={book.cover_url} alt="" className="m-article__cover" loading="lazy" />
        )}
        <h1 className="m-article__title m-serif">{book.title}</h1>
        {book.author && <p className="m-article__byline">{book.author}</p>}
        {(book.publisher || book.pub_date) && (
          <p className="m-article__meta">
            {[book.publisher, book.pub_date].filter(Boolean).join(" · ")}
          </p>
        )}

        {book.completion_sentence?.trim() && (
          <div className="m-article__finished">
            <span className="m-book-badge">{t("bookList.finished")}</span>
            <p className="m-article__completion m-serif">「{book.completion_sentence}」</p>
          </div>
        )}
      </header>

      <hr className="m-rule" />

      <section className="m-quotes">
        {book.quotes.length === 0 ? (
          <p className="m-muted">{t("bookShare.noQuotes")}</p>
        ) : (
          <ul className="m-quotes__list">
            {book.quotes.map((item, index) => (
              <li key={index} className="m-quote">
                <blockquote className="m-quote__text m-serif">{item.quote}</blockquote>
                {item.memo && <p className="m-quote__memo">{item.memo}</p>}
                <footer className="m-quote__foot">
                  {item.page && <span>{t("common.pageShort", { page: item.page })}</span>}
                  <span>{new Date(item.created_at).toLocaleDateString(dateLocale)}</span>
                </footer>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!authenticated && (
        <>
          <hr className="m-rule" />
          <section className="m-share-cta">
            <p className="m-muted m-text-center">{t("bookShare.ctaLead")}</p>
            <div className="m-login-actions">
              <button type="button" className="m-btn m-btn--write" onClick={loginWithGoogle}>
                {t("home.startGoogle")}
              </button>
              <button type="button" className="m-btn m-btn--kakao" onClick={loginWithKakao}>
                {t("home.startKakao")}
              </button>
            </div>
            <p className="m-muted m-text-center">
              <Link to={bookPath()}>{t("bookShare.browseLibrary")}</Link>
            </p>
          </section>
        </>
      )}
    </article>
  );
}
