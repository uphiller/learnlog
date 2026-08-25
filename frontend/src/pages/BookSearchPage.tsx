import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";
import { LoadingState } from "../LoadingState";
import { api, type BookSearchHit } from "../api";
import { bookPath } from "../routes";

export function BookSearchPage() {
  const { t } = useTranslation();
  const { authenticated } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<BookSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!authenticated || debounced.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .searchBooks(debounced)
      .then((data) => setResults(data.results))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [debounced, authenticated]);

  async function addToLibrary(hit: BookSearchHit) {
    setAddingId(hit.aladin_item_id);
    setError(null);
    try {
      const book = await api.createBook(hit);
      navigate(bookPath(`/${book.id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.addFailed"));
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="m-page m-page--narrow">
      <header className="m-page-head m-page-head--center">
        <h1 className="m-page-head__title m-serif">{t("bookSearch.title")}</h1>
        <p className="m-page-head__sub">{t("bookSearch.subtitle")}</p>
      </header>

      {!authenticated && (
        <p className="m-muted m-text-center">{t("bookSearch.loginToSearch")}</p>
      )}

      {authenticated && (
        <div className="m-search">
          <input
            type="search"
            className="m-search__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("bookSearch.placeholder")}
            autoFocus
          />
          {debounced.length > 0 && debounced.length < 2 && (
            <p className="m-hint">{t("bookSearch.minChars")}</p>
          )}
        </div>
      )}

      <div
        className={[
          "m-search-results",
          loading && results.length === 0 && debounced.length >= 2 ? "m-search-results--loading" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {loading && results.length > 0 && <LoadingState overlay label={t("common.searching")} />}
        {error && <p className="m-error">{error}</p>}

        {results.length > 0 && (
          <ul className="m-feed m-feed--search" aria-busy={loading}>
            {results.map((hit) => (
              <li key={hit.aladin_item_id} className="m-feed__item">
                <article className="m-search-result">
                  <div className="m-search-result__main">
                    {hit.cover_url ? (
                      <img src={hit.cover_url} alt="" className="m-search-result__cover" loading="lazy" />
                    ) : (
                      <div className="m-search-result__cover m-feed-row__thumb--empty" aria-hidden />
                    )}
                    <div className="m-search-result__text">
                      <h2 className="m-feed-row__title">{hit.title}</h2>
                      {hit.author && <p className="m-feed-row__meta">{hit.author}</p>}
                      {hit.publisher && (
                        <p className="m-feed-row__sub">
                          {hit.publisher}
                          {hit.pub_date ? ` · ${hit.pub_date}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="m-btn m-btn--write m-btn--sm"
                    disabled={addingId === hit.aladin_item_id}
                    onClick={() => void addToLibrary(hit)}
                  >
                    {addingId === hit.aladin_item_id
                      ? t("common.adding")
                      : t("bookDetail.addToLibrary")}
                  </button>
                </article>
              </li>
            ))}
          </ul>
        )}

        {!loading && debounced.length >= 2 && results.length === 0 && authenticated && !error && (
          <p className="m-muted m-text-center">{t("bookSearch.noResults")}</p>
        )}

        {loading && results.length === 0 && debounced.length >= 2 && (
          <LoadingState label={t("common.searching")} className="m-search-results__empty-loading" />
        )}
      </div>

      <p className="m-back">
        <Link to={bookPath()}>{t("bookSearch.backToLibrary")}</Link>
      </p>
    </div>
  );
}
