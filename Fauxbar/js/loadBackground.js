// Delay loading of background.js to hopefully prevent Fauxbar's database from getting corrupted (issue #47)
$(document).ready(function(){
	setTimeout(function(){
		var newScript = document.createElement("script");
		newScript.setAttribute("src", "/js/background-new.js");
		document.head.appendChild(newScript);
	}, 500);
});