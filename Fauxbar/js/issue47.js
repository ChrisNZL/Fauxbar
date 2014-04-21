function reinit() {
	$("button").prop("disabled",true);
	localStorage.indexedbefore = 0;
	localStorage.unreadErrors = 0;
	localStorage.issue47 = 1;
	chrome.runtime.sendMessage(null, {action:"reindex"});
	setTimeout(function(){
		chrome.tabs.create({selected:true, url:chrome.extension.getURL("html/fauxbar.html")}, function(){
			chrome.tabs.getCurrent(function(tab){
				chrome.tabs.remove(tab.id);
			});
		});
	}, 100);
}

$(document).ready(function(){
	$('button[reinit]').live('click', reinit);
});
