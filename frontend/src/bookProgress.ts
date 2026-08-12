import type { Book } from "./api";

export const FINISHED_THRESHOLD = 0.8;

type BookProgress = Pick<Book, "total_pages" | "read_page">;

export function isReadingCompleteEligible(book: BookProgress): boolean {
  if (book.total_pages == null || book.read_page == null || book.total_pages <= 0) {
    return false;
  }
  return book.read_page / book.total_pages >= FINISHED_THRESHOLD;
}

export function isBookFinished(
  book: BookProgress & Pick<Book, "completion_sentence">,
): boolean {
  return isReadingCompleteEligible(book) && Boolean(book.completion_sentence?.trim());
}

export function canRequestCompletionBadge(
  book: BookProgress & Pick<Book, "completion_sentence">,
): boolean {
  return isReadingCompleteEligible(book) && !book.completion_sentence?.trim();
}
