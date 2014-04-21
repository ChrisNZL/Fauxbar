function showErrors() {
	if (openDb()){
		window.db.readTransaction(function(tx){
			tx.executeSql('SELECT * FROM errors ORDER BY id ASC', [], function(tx, results){
				var len = results.rows.length, i;
				var row = '';
				var url = '';
				var class1 = 'odd'; // used to be `var class`, but it seems that "class" is now a reserved var name
				if (len > 0) {
					for (i = 0; i < len; i++) {
						row = results.rows.item(i);
						url = str_replace(chrome.extension.getURL(""), "", row.url);
						class1 = class1 == "odd" ? "even" : "odd";
						$("tr").last().after('<tr class="'+class1+'"><td style="text-align:right">'+(i+1)+'.</td><td>'+row.date+'</td><td>'+row.version+'</td><td>'+url+'</td><td>'+row.file+'</td><td>'+row.line+'</td><td>'+row.message+'</td><td style="text-align:right">'+row.count+'</td></tr>');
						if (!strstr((i+1)/20, ".")) {
							$("tr").last().after('<tr>'+$("tr").first().html()+'</tr>');
						}
					}
				} else {
					$("#sadlogo").attr("src","/img/fauxbar48.png");
					if (localStorage.unreadErrors > 0) {
						$("body").append('<div style="text-align:center; padding-top:40px; font-size:130%">Whoops! No errors have been logged.<br /><br />False alarm. Sorry about that.</div>');
						localStorage.unreadErrors = 0;
						window.onunload = function(){
							chrome.runtime.sendMessage(null, "reload options");
						}

					} else {
						$("body").append('<div style="text-align:center; padding-top:40px; font-size:170%;">Hooray! No errors here.</div>');
					}
					$("button").remove();
				}
			});
		}, function(t){
			errorHandler(t, getLineInfo());
		});
	}
}

$(document).ready(function(){

	var chromeVersion = '?';
	if (strstr(window.navigator.appVersion, 'Chrome')) {
		chromeVersion = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
	} else if (strstr(window.navigator.appVersion, 'Chromium')) {
		chromeVersion = parseInt(window.navigator.appVersion.match(/Chromium\/(\d+)\./)[1], 10);
	}

	window.OS = "Unknown";
	if (navigator.appVersion.indexOf("Win")!=-1) window.OS="Windows";
	if (navigator.appVersion.indexOf("Mac")!=-1) window.OS="Mac";
	if (navigator.appVersion.indexOf("X11")!=-1) window.OS="UNIX";
	if (navigator.appVersion.indexOf("Linux")!=-1) window.OS="Linux";
	$("table").prepend("\n<!-- Operating system: "+window.OS+"; Chrome version: "+chromeVersion+" -->");

	if (localStorage.latestError && localStorage.latestError.length) {
		var e = jQuery.parseJSON(localStorage.latestError);
		if (openDb()) {
			window.db.transaction(function(tx){
				tx.executeSql('INSERT INTO errors (date, version, url, file, line, message, count) VALUES (?, ?, ?, ?, ?, ?, ?)', [e.date, e.version, e.url, e.file, e.line, e.msg, e.count]);
			}, function(t){
				errorHandler(t, getLineInfo());
			}, showErrors);
		}
	} else {
		showErrors();
	}

	window.clearErrors = function(){
		if (confirm("Clear the error log?\n\nIf you've reported these errors (thank you), click OK.\n\nBut if you haven't reported these errors yet, click Cancel.")) {
			if (openDb()) {
				$("button").prop("disabled",1).first().html("Clearing...").next().remove();

				window.db.transaction(function(tx){
					tx.executeSql('drop table errors');
					tx.executeSql('CREATE TABLE IF NOT EXISTS errors (id INTEGER PRIMARY KEY, date NUMERIC, version TEXT, url TEXT, file TEXT, line NUMERIC, message TEXT, count NUMERIC)');
				}, function(t){
					errorHandler(t, getLineInfo());
				}, function(){
					localStorage.unreadErrors = 0;
					chrome.runtime.sendMessage(null, "reload options");
					setTimeout(function(){
						window.close();
					}, 100);
				});
			} else {
				alert("Fauxbar has encountered a database error.\n\nPlease try disabling and re-enabling Fauxbar to resolve this.\n\nAdditionally, Fauxbar's error log and/or background console may contain useful information to report.");
			}
		}
	};

	window.sendReport = function() {
		var data = '<table>'+$("table").html()+'</table>';
		$("#errorFade, #errorReport").css("display","block");
		$("textarea").val(data).select();
	};
	window.closeReport = function() {
		$("#errorFade, #errorReport").css("display","none");
	};

	$("#text").live("mouseover", function(){
		$("textarea").select();
	});

	if (localStorage.extensionName) {
		$(".extensionName").text(localStorage.extensionName);
		window.document.title = (localStorage.extensionName ? localStorage.extensionName : "Fauxbar")+": Error Log";
	}
	
	$('#clear').live('click', clearErrors);
	$('#sendReport').live('click', sendReport);
	$('#cross').live('click', closeReport);
});