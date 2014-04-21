window.titleModified = function() {
	chrome.runtime.sendMessage(null, {action:"updateUrlTitles", urltitle:window.document.title, url:window.document.location.href});
}

$(document).ready(function(){
	var titleEl = document.getElementsByTagName("title")[0];
    var docEl = document.documentElement;

    if (docEl && docEl.addEventListener) {
        docEl.addEventListener("DOMSubtreeModified", function(evt) {
            var t = evt.target;
            if (t === titleEl || (t.parentNode && t.parentNode === titleEl)) {
                window.titleModified();
            }
        }, false);
    } else {
        document.onpropertychange = function() {
            if (window.event.propertyName == "title") {
                window.titleModified();
            }
        };
    }
    window.titleModified();
});