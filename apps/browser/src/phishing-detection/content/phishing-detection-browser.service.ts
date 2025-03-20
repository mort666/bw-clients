export class PhishingDetectionBrowserService {
  static notifyUser(url: string) {
    const phishingDivId = "phishing-notification-bar";
    const message = `${url} is a known phishing site `;

    // Remove existing notification to prevent duplicates
    const existingAlert = document.getElementById(phishingDivId);
    if (existingAlert) {
      existingAlert.remove();
    }

    // Create notification wrapper
    const wrapper = document.createElement("div");
    wrapper.id = phishingDivId;
    wrapper.classList.add(
      "tw-fixed",
      "tw-top-4",
      "tw-right-4", // **Position at the top-right corner**
      "tw-p-4",
      "tw-rounded-xl",
      "tw-shadow-2xl",
      "tw-flex",
      "tw-items-center",
      "tw-gap-3",
      "tw-bg-danger",
      "tw-text-white",
    );

    // Styling
    wrapper.style.maxWidth = "400px";
    wrapper.style.zIndex = "10000";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.borderRadius = "12px";
    wrapper.style.padding = "16px 20px";
    wrapper.style.backgroundColor = "#b00020"; // Bitwarden danger red
    wrapper.style.color = "#ffffff";
    wrapper.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.3)";

    // Warning icon
    const icon = document.createElement("i");
    icon.classList.add("bwi", "bwi-fw", "bwi-warning");
    icon.setAttribute("aria-hidden", "true");
    icon.style.fontSize = "24px";

    // Alert message
    const messageElement = document.createElement("span");
    messageElement.classList.add("tw-text-xl", "tw-font-semibold", "tw-grow");
    messageElement.textContent = message;

    // "Exit the page" button
    const exitButton = document.createElement("button");
    exitButton.type = "button";
    exitButton.classList.add(
      "tw-bg-white",
      "tw-text-danger",
      "tw-font-semibold",
      "tw-text-lg",
      "tw-px-4",
      "tw-py-2",
      "tw-rounded-lg",
      "tw-ml-4",
    ); // Added tw-ml-4 for spacing
    exitButton.style.border = "none";
    exitButton.style.cursor = "pointer";
    exitButton.textContent = "Exit Page";
    exitButton.addEventListener("click", () => {
      window.open("about:blank", "_self"); // Open a blank page in the same tab
      window.close(); // Try to close it
    });

    // Assemble the notification
    wrapper.appendChild(icon);
    wrapper.appendChild(messageElement);
    wrapper.appendChild(exitButton);
    document.body.appendChild(wrapper);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
    }, 10000);
  }

  static getActiveUrl() {
    return window?.location?.href;
  }
}
