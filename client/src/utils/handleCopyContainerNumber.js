export const handleCopyContainerNumber = (container_number, setSnackbar) => {
  let containerNumber = container_number;
  const textArea = document.createElement("textarea");
  textArea.value = containerNumber;
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
};
