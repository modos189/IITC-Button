//@license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3
export async function injectUserScript(code) {
  const inject = `
    document.dispatchEvent(new CustomEvent('IITCButtonInitJS', {
      detail: ${JSON.stringify(code)}
    }));
  `;
  // Fetch all completly loaded Ingress Intel tabs
  const tabs = await browser.tabs.query({
    url: "https://intel.ingress.com/*",
    status: "complete"
  });

  for (let tab of Object.values(tabs)) {
    try {
      await browser.tabs.executeScript(tab.id, {
        code: inject
      });
    } catch (error) {
      console.error(`An error occurred while reloading tabs: ${error.message}`);
    }
  }
}