// When user hovers over an input field, decide whether to show or hide the "add search engine" context menu option
// If JavaScript is disabled, context menu option will always be shown, but invalid fields are caught in contextMenu-addAsSearchEngine.js
$(document).ready(function(){
	$("input").live("mouseenter", function(){
		if (
			$(this).parents("form").length &&
			$(this).attr("type") &&
			($(this).attr("type") == "text" || $(this).attr("type") == "search") &&
			$(this).attr("name")
		) {
			chrome.runtime.sendMessage(null, "create context menu");
		} else {
			chrome.runtime.sendMessage(null, "remove context menu");
		}
	});
	$("textarea").live("mouseenter", function(){
		chrome.runtime.sendMessage(null, "remove context menu");
	});
});