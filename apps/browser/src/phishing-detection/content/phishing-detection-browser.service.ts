export class PhishingDetectionBrowserService {
  static notifyUser(url: string) {
    const phishingDivId = "phishing-notification-bar";
    const message = `${url} is a known phishing site`;

    const wrapper = document.createElement("div");
    wrapper.id = phishingDivId;
    wrapper.classList.add("inner-wrapper");

    wrapper.style.position = "fixed";
    wrapper.style.top = "20px";
    wrapper.style.right = "20px";
    wrapper.style.zIndex = "10000";
    wrapper.style.backgroundColor = "#fff";
    wrapper.style.padding = "15px";
    wrapper.style.border = "1px solid #ccc";
    wrapper.style.borderRadius = "5px";
    wrapper.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";

    const messageElement = document.createElement("div");
    messageElement.id = "change-text";
    messageElement.classList.add("notification-body");
    messageElement.textContent = message;

    const exitButton = document.createElement("button");
    exitButton.type = "button";
    exitButton.id = "change-exit";
    exitButton.classList.add("primary");
    exitButton.textContent = "Exit the page";
    exitButton.onclick = () => {
      const barEl = document.getElementById(phishingDivId);
      if (barEl != null) {
        barEl.parentElement.removeChild(barEl);
      }
    };

    wrapper.appendChild(messageElement);
    wrapper.appendChild(exitButton);

    document.body.appendChild(wrapper);

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
