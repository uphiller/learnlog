import type { Book } from "./api";

export function isBookFinished(book: Pick<Book, "completion_sentence">): boolean {
  return Boolean(book.completion_sentence?.trim());
}

export function canRequestCompletionBadge(
  book: Pick<Book, "completion_sentence">,
): boolean {
  return !book.completion_sentence?.trim();
}
