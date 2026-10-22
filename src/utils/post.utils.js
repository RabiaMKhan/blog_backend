import crypto from "crypto";

// "Hello World! Café" -> "hello-world-cafe"
export const slugify = (text) =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "") || "post";

// short random ending to tell apart posts with the same title, e.g. "my-post-3f9a1c"
export const slugSuffix = () => crypto.randomBytes(3).toString("hex");

// first ~160 characters of the content as plain text, for the post list
export const makeExcerpt = (content, length = 160) => {
  const text = content
    .replace(/<[^>]*>/g, " ") // content may be HTML from a rich text editor
    .replace(/\s+/g, " ")
    .replace(/ ([.,!?;:])/g, "$1") // "<b>world</b>," would otherwise leave "world ,"
    .trim();
  if (text.length <= length) return text;
  return text.slice(0, text.lastIndexOf(" ", length) || length) + "...";
};
