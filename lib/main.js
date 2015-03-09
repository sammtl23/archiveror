var Request = require("sdk/request").Request;
function archive(url, save) {
    // submit url to archive.today
    var r = Request({
        url: "https://archive.today/submit/",
        content: {"url": url},
        onComplete: function (response) {
            // Extract link from response
            var link = response.text.match(/(https?:\/\/archive.today\/\w+)/)[0];
            postArchive(url, link, save);
        }
    }).post();
}

// Store archive links for bookmarks
var ss = require("sdk/simple-storage");
if (!ss.storage.data)
    ss.storage.data = {};
var data = ss.storage.data;

var clipboard = require("sdk/clipboard");
function postArchive(url, link, save) {
    // console.log(link);
    clipboard.set(link);
    if (save === true) {
        data[url] = link;
        showArchive(url);
    }
    else if (preferences.prefs.openPage === true) {
        tabs.open(link);
    }
}

var buttons = require('sdk/ui/button/action');
var defaultButton = {label: "Archive Page",
                     icon: {"16": "./icon-16.png",
                            "32": "./icon-32.png",
                            "64": "./icon-64.png"}
                    };
var showButton = {label: "Go to archived page",
                     icon: {"16": "./icon-16-star.png",
                            "32": "./icon-32-star.png",
                            "64": "./icon-64-star.png"}
                    };

var button = buttons.ActionButton({
    id: "archive-button",
    label: "Archive Page",
    icon: {
        "16": "./icon-16.png",
        "32": "./icon-32.png",
        "64": "./icon-64.png"
    },
    onClick: function (state) {
        // console.log(button.label);
        if (button.state("tab").label == defaultButton.label)
            archivePage();
        else
            tabs.open(data[tabs.activeTab.url]);
    }
});

var tabs = require('sdk/tabs');
function archivePage() {
    // console.log(tabs.activeTab.url);
    archive(tabs.activeTab.url, false);  // don't save non-bookmark archives
}

var preferences = require("sdk/simple-prefs");
// Make a hotkey to archive current page
var { Hotkey } = require("sdk/hotkeys");
function setArchiveKey () {
    var archiveKey = Hotkey({
        combo: preferences.prefs.archiveKey,
        onPress: archivePage
    });
}
setArchiveKey();

function showArchive(url) {
    // If we have archived a bookmark, change the icon to reflect this and
    // let the button open the archive link.
    // console.log("Bookmark visit!");
    if (url in data) {
        button.state("tab", showButton);
        // and reset the button when we change the page again
        var currentTab = tabs.activeTab;
        function resetButton() {
            currentTab.once("ready", function () {
                if (! (tabs.activeTab.url in data)) {
                    // console.log("Button Reset");
                    button.state(currentTab, defaultButton);
                }
                else
                    resetButton();
            });
        }
        resetButton();
    }
    else
        archive(url, true);
}

function newBookmark(url) {
    archive(url, true);
}

var bookmarks = require("./bookmarks");

exports.main = function() {
    // archive newly made bookmarks
    bookmarks.on("added", newBookmark);
    // Inform user we have an archive of their bookmark
    bookmarks.on("visited", showArchive);
    // listen for pref change
    preferences.on("archiveKey", setArchiveKey);
};

exports.onUnload = function() {
    bookmarks.removeListener("added", newBookmark);
    bookmarks.removeListener("visited", showArchive);
    preferences.removeListener("archiveKey", setArchiveKey);
};