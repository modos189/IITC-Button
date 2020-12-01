//@license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3
import {
  onUpdatedListener,
  onRemovedListener,
  onRequestOpenIntel,
  onToggleIITC
} from "./intel";
import {
  addUserScripts,
  checkExternalUpdates,
  checkUpdates,
  managePlugin,
  runExtension
} from "./manager";

const { onUpdated, onRemoved } = browser.tabs;
onUpdated.addListener(onUpdatedListener);
onRemoved.addListener(onRemovedListener);

runExtension().then();

browser.runtime.onMessage.addListener(async request => {
  switch (request.type) {
    case "requestOpenIntel":
      await onRequestOpenIntel();
      break;
    case "toggleIITC":
      await onToggleIITC(request.value);
      break;
    case "xmlHttpRequestHandler":
      await xmlHttpRequestHandler(request.value);
      break;
  }
});

browser.webNavigation.onBeforeNavigate.addListener(
  async requestDetails => {
    browser.tabs.create({
      url: await browser.extension.getURL(
        `/jsview.html?url=${requestDetails.url}`
      )
    });
  },
  { url: [{ pathSuffix: ".user.js" }] }
);

browser.runtime.onMessage.addListener(function(request) {
  switch (request.type) {
    case "managePlugin":
      managePlugin(request.uid, request.category, request.action).then();
      break;
    case "safeUpdate":
      checkUpdates(false).then();
      checkExternalUpdates(false).then();
      break;
    case "forceFullUpdate":
      checkUpdates(true).then();
      checkExternalUpdates(true).then();
      break;
    case "addUserScripts":
      addUserScripts(request.scripts).then();
      break;
  }
});

async function xmlHttpRequestHandler(data) {
  async function xmlResponse(tab_id, callback, response) {
    const injectedCode = `
    document.dispatchEvent(new CustomEvent('onXmlHttpRequestHandler', {
      detail: JSON.stringify({
        callback: "${String(callback)}",
        response: ${String(response)}
      })
    }));
  `;

    try {
      await browser.tabs.executeScript(data.tab_id, {
        code: injectedCode
      });
    } catch (error) {
      console.error(`An error occurred while execute script: ${error.message}`);
    }
  }

  const req = new XMLHttpRequest();
  req.onload = function() {
    const response = {
      readyState: this.readyState,
      responseHeaders: this.responseHeaders,
      responseText: this.responseText,
      status: this.status,
      statusText: this.statusText
    };
    xmlResponse(data.tab_id, data.onload, JSON.stringify(response));
  };
  req.open(data.method, data.url, true, data.user, data.password);
  req.send();
}
