$('#awesomeinput').ready(function(){
	if (getHashVar('options') == 1 || (window.location.hash == '#newTab' && localStorage.option_stealFocusFromOmnibox != 1)) {
		$('#awesomeinput').attr('placeholder', 'Go to a web site');
	} else if (localStorage.option_openfauxbarfocus == 'addressbox') {
		$('#awesomeinput:focus').live('focus', function(){
			$(this).attr('placeholder', 'Go to a web site');
		});
		$('#awesomeinput').focus().live('blur', function(){
			$(this).attr('placeholder', 'Go to a web site');
		});
	}
});
$('#opensearchinput').ready(function(){
	if (getHashVar('options') == 1) {
		$('#opensearchinput').attr('placeholder', str_replace('"', '&quot;', localStorage.osshortname));
	} else if (localStorage.option_openfauxbarfocus == 'searchbox') {
		$('#opensearchinput:focus').live('focus', function(){
			$(this).attr('placeholder', str_replace('"', '&quot;', localStorage.osshortname));
		});
		$('#opensearchinput').focus().live('blur', function(){
			$(this).attr('placeholder', str_replace('"', '&quot;', localStorage.osshortname));
		});
	}
});

$("#awesomeinput_cell").html('<input type="text" id="awesomeinput" spellcheck="false" autocomplete="off" '+speech+
	(localStorage.option_openfauxbarfocus != 'addressbox' ? ' placeholder="Go to a web site" ' : '') +
	' />');

$("#opensearchinput_cell").html('<input type="text" id="opensearchinput" spellcheck="false" autocomplete="off" '+speech+
	(localStorage.option_openfauxbarfocus != 'searchbox' ? ' placeholder="'+str_replace('"', '&quot;', localStorage.osshortname)+'" ' : '') +
	' />');

if (localStorage.osiconsrc) {
	var ico = localStorage.osiconsrc == "google.ico" || localStorage.osiconsrc == "yahoo.ico" || localStorage.osiconsrc == "bing.ico" ? "/img/"+localStorage.osiconsrc : localStorage.osiconsrc;
	$("#opensearch_triangle span").first().html('<img class="opensearch_selectedicon" src="'+ico+'" style="height:16px; width:16px;" /><span class="triangle static" style="margin-top:1px"></span>');
} else {
	$("#opensearch_triangle span").first().html('<img class="opensearch_selectedicon" src="chrome://favicon/null" style="height:16px; width:16px;" /><span class="triangle static" style="margin-top:1px"></span>');
}

$('#awesomeinput_cell')[0].addEventListener('webkitspeechchange', function(){
	setTimeout(function(){
		$('#awesomeinput').setSelection($('#awesomeinput').val().length,$('#awesomeinput').val().length);
		getResults();
	}, 250);
});

$("#opensearchinput_cell")[0].addEventListener('webkitspeechchange', function(){
	setTimeout(function(){
		$('#opensearchinput').setSelection($('#opensearchinput').val().length,$('#opensearchinput').val().length);
		getSearchSuggestions();
	}, 250);
});