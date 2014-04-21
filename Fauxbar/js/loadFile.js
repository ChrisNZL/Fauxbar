var url = window.location.hash.substr(1);
chrome.tabs.getCurrent(function(tab){
	chrome.tabs.update(tab.id, {url:url});
});