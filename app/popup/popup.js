//@license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3

let updateChannelsData = {
  release: {name: _('release'), value: 'release'},
  test: {name: _('testBuilds'), value: 'test',},
  local: {name: _('localServer'), value: 'local'}
};
let updateIntervalsData = [
  {name: _('every6hours'), value: '6'},
  {name: _('every12hours'), value: '12'},
  {name: _('everyDay'), value: '24'},
  {name: _('everyWeek'), value: '168'}
];


let app = new Vue({
  el: '#app',
  data: {
    'IITC_is_enabled': true,
    'categories': {},
    'plugins': {},
    'plugins_flat': {},
    'channel': 'release',
    'updateChannels': updateChannelsData,
    'updateIntervals': updateIntervalsData,
    'release_update_check_interval': 24,
    'test_update_check_interval': 24,
    'external_update_check_interval': 24,
    'category_name': '',
    'message': {'opened': false, 'text': ''},
    'showProgressbar': false,
    'localServerHost': 'localhost:8000',
    'localServerStatus': ''
  },
  components: {
    'component-main-menu': ComponentMainMenu,
    'component-options': ComponentOptions,
    'component-plugins': ComponentPlugins
  }
});


let message_timeout_id = null;
function showMessage(msg) {
  app.$data.message.text = msg;
  app.$data.message.opened = true;

  clearTimeout(message_timeout_id);
  message_timeout_id = setTimeout(function(){
    app.$data.message.opened = false;
  }, 3000);
}

chrome.runtime.onMessage.addListener(function(request) {
  switch (request.type) {
    case "showProgressbar":
      app.$data.showProgressbar = request.value;
      break;
    case "showMessage":
      showMessage(request.message);
      break;
  }
});


chrome.storage.local.get([
  "IITC_is_enabled",
  "channel",
  "local_server_host",
  "release_categories",            "test_categories",            "local_categories",
  "release_plugins_flat",          "test_plugins_flat",          "local_plugins_flat",
  "release_update_check_interval", "test_update_check_interval", "external_update_check_interval"
], function(data) {

  if (data.channel) {
    app.$data.channel = data.channel;
  }

  // initialize categories
  app.$data.categories = data[app.$data.channel+'_categories'];

  // initialize all plugins
  app.$data.plugins_flat = data[app.$data.channel+'_plugins_flat'];

  // initialize toggleIITC
  let status = data.IITC_is_enabled;
  if (status === false) {
    app.$data.IITC_is_enabled = false
  }

  ['release', 'test', 'external'].forEach(function(channel) {
    let update_check_interval = data[channel+'_update_check_interval'];
    if (update_check_interval) {
      app.$data[channel+"_update_check_interval"] = update_check_interval;
    }
  });

  if (data.local_server_host) {
    app.$data.localServerHost = data.local_server_host;
  }
});


chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (let key in changes) {

    if (key === app.$data.channel+"_categories") {
      app.$data.categories = {};
      app.$data.categories = changes[key].newValue;
    }

    if (key === app.$data.channel+"_plugins_flat") {
      app.$data.plugins_flat = changes[key].newValue;
      let category_name = app.$data.category_name;
      if (category_name !== '') {
        if (app.$data.categories[category_name]) {

          app.$data.plugins = Object.entries(changes[key].newValue).reduce(function (category_plugins, plugin_pair) {
            const [plugin_uid, plugin_obj] = plugin_pair;
            if (plugin_obj.category === category_name) {
              category_plugins[plugin_uid] = plugin_obj;
            }
            return category_plugins;
          }, {});
        } else {
          app.$data.plugins = {};
        }
      }
    }

    if (key === "local_server_host") {
      app.$data.localServerHost = changes[key].newValue;
    }

  }
});