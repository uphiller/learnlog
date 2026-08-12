import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";
import { isBookFinished, canRequestCompletionBadge } from "../bookProgress";
import { LoadingState } from "../LoadingState";
import { api, type Book, type BookQuote, type PeerBook, type PeerQuote } from "../api";

export function BookDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const bookId = Number(id);
  const navigate = useNavigate();
  const { authenticated } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [quotes, setQuotes] = useState<BookQuote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState("");
  const [memo, setMemo] = useState("");
  const [page, setPage] = useState("");
  const [saving, setSaving] = useState(false);
  const [peerQuotes, setPeerQuotes] = useState<PeerQuote[]>([]);
  const [peerBooks, setPeerBooks] = useState<PeerBook[]>([]);
  const [peerUnlocked, setPeerUnlocked] = useState(false);
  const [peerLoading, setPeerLoading] = useState(false);
  const [addingPeerBookId, setAddingPeerBookId] = useState<string | null>(null);
  const [completionSentence, setCompletionSentence] = useState("");
  const [completing, setCompleting] = useState(false);

  const dateLocale = i18n.language === "ko" ? "ko-KR" : "en-US";

  const loadPeerContent = useCallback(async (b: Book) => {
    if (!isBookFinished(b)) {
      setPeerUnlocked(false);
      setPeerQuotes([]);
      setPeerBooks([]);
      return;
    }
    setPeerLoading(true);
    try {
      const [quotesData, booksData] = await Promise.all([
        api.getPeerQuotes(b.id),
        api.getPeerBooks(b.id),
      ]);
      setPeerUnlocked(quotesData.unlocked);
      setPeerQuotes(quotesData.results);
      setPeerBooks(booksData.results);
    } catch {
      setPeerUnlocked(false);
      setPeerQuotes([]);
      setPeerBooks([]);
    } finally {
      setPeerLoading(false);
    }
  }, []);

  function reloadQuotes() {
    return Promise.all([api.getBook(bookId), api.listQuotes(bookId)]).then(async ([b, q]) => {
      setBook(b);
      setQuotes(q.results);
      await loadPeerContent(b);
    });
  }

  useEffect(() => {
    if (!bookId || !authenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([api.getBook(bookId), api.listQuotes(bookId)])
      .then(async ([b, q]) => {
        setBook(b);
        setQuotes(q.results);
        setError(null);
        await loadPeerContent(b);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookId, authenticated, loadPeerContent]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!book) return;
    setSaving(true);
    setError(null);
    try {
      await api.createQuote({
        book: book.id,
        quote,
        memo: memo.trim() || undefined,
        page: page.trim() || undefined,
      });
      setQuote("");
      setMemo("");
      setPage("");
      await reloadQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteBook() {
    if (!book || !window.confirm(t("bookDetail.confirmDeleteBook", { title: book.title }))) return;
    await api.deleteBook(book.id);
    navigate("/book");
  }

  async function onCompleteSubmit(e: FormEvent) {
    e.preventDefault();
    if (!book) return;
    setCompleting(true);
    setError(null);
    try {
      const updated = await api.completeBook(book.id, completionSentence.trim());
      setBook(updated);
      setCompletionSentence("");
      await loadPeerContent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.saveFailed"));
    } finally {
      setCompleting(false);
    }
  }

  async function onDeleteQuote(quoteId: number) {
    if (!window.confirm(t("bookDetail.confirmDeleteQuote"))) return;
    await api.deleteQuote(quoteId);
    await reloadQuotes();
  }

  async function addPeerBook(hit: PeerBook) {
    setAddingPeerBookId(hit.aladin_item_id);
    setError(null);
    try {
      const created = await api.createBook({
        aladin_item_id: hit.aladin_item_id,
        title: hit.title,
        author: hit.author,
        cover_url: hit.cover_url,
        isbn13: hit.isbn13,
        publisher: hit.publisher,
        pub_date: hit.pub_date,
        total_pages: hit.total_pages,
      });
      navigate(`/book/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.addFailed"));
    } finally {
      setAddingPeerBookId(null);
    }
  }

  if (!authenticated) {
    return (
      <div className="m-page">
        <p className="m-muted m-text-center">{t("common.loginRequired")}</p>
      </div>
    );
  }
  if (error && !book && !loading) return <p className="m-error">{error}</p>;
  if (loading || !book) return <LoadingState />;

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

        {isBookFinished(book) && (
          <div className="m-article__finished">
            <span className="m-book-badge">{t("bookList.finished")}</span>
            <p className="m-article__completion m-serif">「{book.completion_sentence}」</p>
          </div>
        )}

        <div className="m-article__actions">
          <Link to="/book" className="m-link-btn">
            {t("bookDetail.backToLibrary")}
          </Link>
          <button type="button" className="m-link-btn m-link-btn--danger" onClick={() => void onDeleteBook()}>
            {t("bookDetail.removeFromLibrary")}
          </button>
        </div>
      </header>


      {canRequestCompletionBadge(book) && (
        <section className="m-complete-prompt">
          <p className="m-complete-prompt__lead">{t("bookDetail.completePrompt")}</p>
          <form className="m-complete-prompt__form" onSubmit={onCompleteSubmit}>
            <input
              className="m-complete-prompt__input"
              value={completionSentence}
              onChange={(e) => setCompletionSentence(e.target.value)}
              maxLength={500}
              required
              placeholder={t("bookDetail.completePlaceholder")}
            />
            <button type="submit" className="m-btn m-btn--write m-btn--sm" disabled={completing}>
              {completing ? t("common.saving") : t("bookDetail.completeBadge")}
            </button>
          </form>
        </section>
      )}

      <hr className="m-rule" />

      <section className="m-compose">

        <h2 className="m-compose__label">{t("bookDetail.newNote")}</h2>
        {error && <p className="m-error">{error}</p>}
        <form className="m-compose__form" onSubmit={onSubmit}>
          <textarea
            className="m-compose__quote"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            required
            rows={5}
            placeholder={t("bookDetail.quotePlaceholder")}
          />
          <textarea
            className="m-compose__memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            placeholder={t("bookDetail.memoPlaceholder")}
          />
          <div className="m-compose__row">
            <input
              className="m-compose__page"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              maxLength={32}
              placeholder={t("bookDetail.pagePlaceholder")}
            />
            <button type="submit" className="m-btn m-btn--write m-btn--sm" disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </section>

      <section className="m-quotes">
        {quotes.length === 0 ? (
          <p className="m-muted">{t("bookDetail.noQuotes")}</p>
        ) : (
          <ul className="m-quotes__list">
            {quotes.map((item) => (
              <li key={item.id} className="m-quote">
                <blockquote className="m-quote__text m-serif">{item.quote}</blockquote>
                {item.memo && <p className="m-quote__memo">{item.memo}</p>}
                <footer className="m-quote__foot">
                  {item.page && <span>{t("common.pageShort", { page: item.page })}</span>}
                  <span>{new Date(item.created_at).toLocaleDateString(dateLocale)}</span>
                  <button
                    type="button"
                    className="m-link-btn m-link-btn--danger"
                    onClick={() => void onDeleteQuote(item.id)}
                  >
                    {t("common.delete")}
                  </button>
                </footer>
              </li>
            ))}
          </ul>
        )}
      </section>

      {peerUnlocked && (
        <>
          <hr className="m-rule" />
          <section className="m-peer-quotes">
            <h2 className="m-compose__label">{t("bookDetail.peerQuotesTitle")}</h2>
            {peerLoading ? (
              <LoadingState />
            ) : peerQuotes.length === 0 ? (
              <p className="m-muted">{t("bookDetail.noPeerQuotes")}</p>
            ) : (
              <ul className="m-quotes__list">
                {peerQuotes.map((item, index) => (
                  <li key={index} className="m-quote m-quote--peer">
                    <blockquote className="m-quote__text m-serif">{item.quote}</blockquote>
                    {item.memo && <p className="m-quote__memo">{item.memo}</p>}
                    {item.page && (
                      <footer className="m-quote__foot">
                        <span>{t("common.pageShort", { page: item.page })}</span>
                      </footer>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <hr className="m-rule" />
          <section className="m-peer-books">
            <h2 className="m-compose__label">{t("bookDetail.peerBooksTitle")}</h2>
            {peerLoading ? (
              <LoadingState />
            ) : peerBooks.length === 0 ? (
              <p className="m-muted">{t("bookDetail.noPeerBooks")}</p>
            ) : (
              <ul className="m-peer-books__list">
                {peerBooks.map((item) => (
                  <li key={item.aladin_item_id} className="m-peer-books__item">
                    <article className="m-peer-book-card">
                      <div className="m-peer-book-card__cover">
                        {item.cover_url ? (
                          <img src={item.cover_url} alt="" loading="lazy" />
                        ) : (
                          <div className="m-peer-book-card__cover--empty" aria-hidden />
                        )}
                      </div>
                      <div className="m-peer-book-card__overlay">
                        <div className="m-peer-book-card__info">
                          <h3 className="m-peer-book-card__title">{item.title}</h3>
                          {item.author && <p className="m-peer-book-card__author">{item.author}</p>}
                          <p className="m-peer-book-card__readers">
                            {t("bookDetail.readerCount", { count: item.reader_count })}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="m-btn m-btn--write m-btn--sm"
                          disabled={addingPeerBookId === item.aladin_item_id}
                          onClick={() => void addPeerBook(item)}
                        >
                          {addingPeerBookId === item.aladin_item_id
                            ? t("common.adding")
                            : t("bookDetail.addToLibrary")}
                        </button>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </article>
  );
}
