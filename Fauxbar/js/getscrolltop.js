// If page hasn't been scrolled at all, tell background to possibly create a thumbnail of the page

if (($("body").scrollTop() <= 0 || window.location.hash) && (!window.fauxbar_thumbdone || window.fauxbar_thumbdone != window.document.title)) {
	window.fauxbar_thumbdone = window.document.title;
	chrome.runtime.sendMessage(null, "scrolltop is 0");
}