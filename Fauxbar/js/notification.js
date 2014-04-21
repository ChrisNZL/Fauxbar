function closeWindow() {
	setTimeout(function(){
		window.close();
	}, 1);
}

$(document).ready(function(){
	$('.fauxbar').html(localStorage.extensionName);
	$('style').append('* { font-family:'+localStorage.option_font+', Ubuntu, Lucida Grande, Segoe UI, Arial, sans-serif; }');

	if (navigator.appVersion.indexOf("Mac")!=-1) { // OS is Mac
		$('*:not(h1)').css('font-size','11px');
		$('h1, h1 *').css('font-size','12px');
	}
	
	/*$('a').live('click', function(){
		closeWindow();
		return true;
	});*/
});

