export function groupInviteUrl(slug: string): string {
  return `${window.location.origin}/book/groups/join/${encodeURIComponent(slug)}`;
}

export async function copyGroupInviteLink(slug: string): Promise<void> {
  const url = groupInviteUrl(slug);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
