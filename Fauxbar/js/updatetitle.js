window.onTitleModified = function(newTitle) {
	chrome.runtime.sendMessage(null, {action:"updateUrlTitles", urltitle:newTitle, url:window.document.location.href});
}

var target = document.querySelector('head > title');
if (target) {
	var observer = new window.WebKitMutationObserver(function(mutations) {
	    mutations.forEach(function(mutation) {
	        var newTitle = mutation.target.textContent;
	        window.onTitleModified(newTitle);
	    });
	});
	observer.observe(target, { subtree: true, characterData: true, childList: true });
}