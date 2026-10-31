const viewer = document.getElementById("image-viewer");
if (viewer) {
  const preview = document.getElementById("preview-image");
  document.querySelectorAll(".screen a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const thumbnail = link.querySelector("img");
      preview.src = link.getAttribute("href");
      preview.alt = thumbnail.alt;
      preview.classList.toggle("window-capture", thumbnail.classList.contains("window-capture"));
      viewer.showModal();
    });
  });
  document.getElementById("preview-close").addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) viewer.close();
  });
}
