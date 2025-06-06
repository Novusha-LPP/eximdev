export function handleCopyText(bl_no_ref, setSnackbar) {
  if (bl_no_ref.current) {
    const textToCopy = bl_no_ref.current.innerText;
    const textArea = document.createElement("textarea");
    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      setSnackbar(true);
      setTimeout(() => {
        setSnackbar(false);
      }, 1000);
    } catch (err) {
      console.error("Unable to copy to clipboard", err);
    }
    document.body.removeChild(textArea);
  }
}
