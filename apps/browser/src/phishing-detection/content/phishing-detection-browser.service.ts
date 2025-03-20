export class PhishingDetectionBrowserService {
  static notifyUser(url: string) {
    const phishingDivId = "phishing-notification-dialog";
    const message = `${url} is a known phishing site `;

    // Remove existing notification to prevent duplicates
    const existingDialog = document.getElementById(phishingDivId);
    if (existingDialog) {
      existingDialog.remove();
    }

    // Create the backdrop (dark overlay)
    const backdrop = document.createElement("div");
    backdrop.id = "phishing-dialog-backdrop";
    backdrop.style.position = "fixed";
    backdrop.style.top = "0";
    backdrop.style.left = "0";
    backdrop.style.width = "100vw";
    backdrop.style.height = "100vh";
    backdrop.style.backgroundColor = "rgba(0, 0, 0, 0.6)"; // Semi-transparent dark background
    backdrop.style.zIndex = "9999";
    backdrop.style.display = "flex";
    backdrop.style.justifyContent = "center";
    backdrop.style.alignItems = "center";

    // Create the dialog box
    const dialog = document.createElement("div");
    dialog.id = phishingDivId;
    dialog.style.backgroundColor = "#b00020"; // Danger red
    dialog.style.color = "#ffffff";
    dialog.style.borderRadius = "12px";
    dialog.style.padding = "20px 30px";
    dialog.style.maxWidth = "450px";
    dialog.style.textAlign = "center";
    dialog.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.3)";
    dialog.style.display = "flex";
    dialog.style.flexDirection = "column";
    dialog.style.alignItems = "center";

    // Warning icon
    const icon = document.createElement("i");
    icon.classList.add("bwi", "bwi-fw", "bwi-warning");
    icon.setAttribute("aria-hidden", "true");
    icon.style.fontSize = "32px";
    icon.style.marginBottom = "10px";

    // Alert message
    const messageElement = document.createElement("span");
    messageElement.style.fontSize = "18px";
    messageElement.style.fontWeight = "bold";
    messageElement.style.marginBottom = "15px";
    messageElement.textContent = message;

    // "Exit the page" button
    const exitButton = document.createElement("button");
    exitButton.type = "button";
    exitButton.style.backgroundColor = "#ffffff";
    exitButton.style.color = "#b00020";
    exitButton.style.fontSize = "16px";
    exitButton.style.fontWeight = "bold";
    exitButton.style.padding = "10px 20px";
    exitButton.style.border = "none";
    exitButton.style.borderRadius = "8px";
    exitButton.style.cursor = "pointer";
    exitButton.style.marginTop = "10px";
    exitButton.textContent = "Exit Page";
    exitButton.addEventListener("click", () => {
      window.open("about:blank", "_self"); // Open a blank page in the same tab
      window.close(); // Try to close it
    });

    // Append elements
    dialog.appendChild(icon);
    dialog.appendChild(messageElement);
    dialog.appendChild(exitButton);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (document.body.contains(backdrop)) {
        document.body.removeChild(backdrop);
      }
    }, 10000);
  }

  static getActiveUrl() {
    return window?.location?.href;
  }
}
