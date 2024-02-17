//@license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3

import browser from "webextension-polyfill";
import { IS_USERSCRIPTS_API } from "@/userscripts/env";
import {
  inject_plugin_via_content_scripts,
  inject_plugin_via_userscripts_api,
} from "@/background/injector";
import { strToBase64 } from "@/strToBase64";
import { getUID } from "lib-iitc-manager";
import { inject } from "@/content-scripts/utils";
import { GM } from "@/userscripts/gm-api";
import { isIITCEnabled } from "@/userscripts/utils";

function getPluginHash(uid) {
  return "VMin" + strToBase64(uid);
}

export async function inject_plugin(plugin, use_gm_api) {
  if (use_gm_api === undefined) use_gm_api = true;

  const iitc_status = await isIITCEnabled();
  if (iitc_status === false) return;

  if (IS_USERSCRIPTS_API) {
    console.log("INJECT LIKE IS CHROME MV3");
    await inject_plugin_via_userscripts_api(plugin, use_gm_api);
  } else {
    console.log("INJECT LIKE OTHER BROWSER");
    await inject_plugin_via_content_scripts(plugin, use_gm_api);
  }
}

export function inject_gm_api() {
  const plugin = {
    uid: "gm_api",
    code: `((${GM.toString()}))()\n//# sourceURL=${browser.runtime.getURL(
      "js/GM_api.js"
    )}`,
  };

  if (IS_USERSCRIPTS_API) {
    inject_plugin_via_userscripts_api(plugin, false).then();
  } else {
    inject(plugin.code);
  }
}

export async function gm_api_for_plugin(plugin, tab_id) {
  const uid = plugin.uid ? plugin.uid : getUID(plugin);
  let data_key = getPluginHash(uid);
  const name = encodeURIComponent(plugin.name);

  const meta = { ...plugin };
  delete meta.code;

  return [
    "((GM)=>{",
    // an implementation of GM API v3 based on GM API v4
    "const GM_info = GM.info; const unsafeWindow = window;",
    "const exportFunction = GM.exportFunction; const createObjectIn = GM.createObjectIn; const cloneInto = GM.cloneInto;",
    "const GM_getValue = (key, value) => GM._getValueSync(key, value);",
    "const GM_setValue = (key, value) => GM._setValueSync(key, value);",
    "const GM_xmlhttpRequest = (details) => GM.xmlHttpRequest(details);",

    plugin.code,
    // adding a new line in case the code ends with a line comment
    plugin.code.endsWith("\n") ? "" : "\n",
    `})(GM("${data_key}", ${tab_id}, ${JSON.stringify(meta)}))`,

    // Firefox lists .user.js among our own content scripts so a space at start will group them
    `\n//# sourceURL=${browser.runtime.getURL(
      "plugins/%20" + name + ".user.js"
    )}`,
  ].join("");
}

export function is_userscripts_api_available() {
  try {
    // Property access which throws if developer mode is not enabled.
    chrome.userScripts;
    return true;
  } catch {
    // Not available.
    return false;
  }
}