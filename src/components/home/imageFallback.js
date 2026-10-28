// A host rewrite or missing derivative must not leave an empty app preview.
export default function restoreOriginal(event, filename) {
  const image = event.currentTarget;
  const original = `/images/home/${filename}`;
  if (image.getAttribute("src") === original) return;
  image.removeAttribute("srcset");
  image.src = original;
}
