export function generateIdFromText(text: any): string {
  if (typeof text !== "string") {
    throw new Error(`text must be a string, received: ${text}`);
  }

  return text
    .replaceAll(/`[a-z]+`/gi, "")
    .trim()
    .split("")
    .filter((c) => /[a-z ]/i.test(c))
    .map((c) => (c === " " ? "-" : c.toLowerCase()))
    .join("");
}
