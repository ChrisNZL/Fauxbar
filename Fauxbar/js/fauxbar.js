//// This file is used by Fauxbar's main page. Gets loaded first before the other JS files.

// Placeholder text for Address Box
window.placeholder = "Go to a web site";

// Initial loading calls this function (icon canvas coloring), but it's slow. Real function gets created later
//
// Now that the Fauxbar page is pretty much loaded, load the JS files to apply custom colors to the various icons, if they're not the defaults.
// Page loads a bit slower if these are loaded first, so that's why we're loading them now.
if (localStorage.option_iconcolor.toLowerCase() != "#3374ab" || localStorage.option_favopacity != 0 || getHashVar("options") == 1) {
	if (localStorage.option_favopacity != 0) {
		$("#fauxstar").addClass("filter-tint");
	}
	delete processFilters;
	var newScript = document.createElement("script");
	newScript.setAttribute('src', '/js/mezzoblue-PaintbrushJS-098389a/paintbrush.js');
	document.getElementById('head').appendChild(newScript);
	processFilters();
}
// If user has default colors set, load darkened icons
else {
	function processFilters() {}

	$("#address_goarrow")
		.live("mouseenter", function(){
			if (window.tileEditMode) {
				$("img",this).attr("src","/img/plus_dark.png");
			} else {
				$("img",this).attr("src","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAi0lEQVQoU2NkwAGsYmtngqSOLW5Ox6aEEZugbXyt9T8GxiMguf///s/CphmrRpAGy/i6SCYGhmW4NOPUSEgzXo34NDPaxNca4wogmPi/fwzGf///m8nEyMQAtAnsZ0aruNozQAUENf/8/Zfh////YLM4WFkekq+RbKcS8h+uaKF+dJCVAChKcoQSOQCI22/3L6cKGwAAAABJRU5ErkJggg==");
			}
		})
		.live("mouseleave", function(){
			if (window.tileEditMode) {
				$("img",this).attr("src","/img/plus.png");
			} else {
				$("img",this).attr("src","/img/goarrow.png");
			}
		});
	$("#searchicon_cell")
		.live("mouseenter", function(){
			$("#searchicon").attr("src","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABdUlEQVQ4T5WTIUzDUBCG7zqWgBpqAgNBYtgWZrAEhSJZQpssm8DjIG0wGCgJDoFDQAitICEBiZ9ZslVNIVAkJAjAzECPu0fbdN1bw6rWvvd/7//vf0P4x1M1nQYhlYtUCLr+cSctwTx91XLOeUMbCGbifQTwxr8P+r57J98mAmo79gMgbighwicQffB7mWFz/P5NBLsC0QLq5uH6D4RPoiWEy77n7sUOapbTZciKOGHAshZQsZwbg2CbTxr0PLeejcmQd3FSAGNTC0jsG3jWuz05GgOY9oBzLYZI+7mAEOE+8NymxsErOyhxjLYWILXxwpUMKyRaDfzTlxiimuEByhrHK01uIcqpIACPBuIzN7ElA0wPdwwQdd8QiyweqtoyTzraCCCxF3XPFhdUHKKWfAoN/CqScZG+jQlgRKzpf9KNVYBkaNGu7OXJu+74J6ZrrmQWAYfTiFXSimkv8YQ7POF5AmzFf5K8U9NrKoJA+PS1acWi/QVHr6EUsRkP6wAAAABJRU5ErkJggg==");
		})
		.live("mouseleave", function(){
			$("#searchicon").attr("src","/img/search.png");
		});
}

// Create the HTML for a page tile
function renderPageTile(url, title, startHidden) {
	var thumbs = '';

	// Handle file:/// link if needed
	if (url.length > 8 && url.substring(0, 8) == "file:///") {
		var newHref = "/html/loadfile.html#"+url;
	} else {
		var newHref = url;
	}

	var onClick = !window.tileEditMode && localStorage.option_pagetilearrangement == "frecency" ? 'tileAddTypedVisit' : '';

	thumbs += '<a class="sitetile" href="'+newHref+'" style="opacity:0" url="'+url+'" origtitle="'+title+'" '+onClick+'>';

	if (startHidden == true) {
		thumbs += '<span class="tileCross" title="Remove tile"><img src="/img/cross.png" /></span>';
	}

	var height = window.tileEditMode && $("div.thumb").length ? ' style="height:'+$("div.thumb").first().innerHeight()+'px"' : '';

	thumbs += '		<div class="thumb" '+height+'>';
	//thumbs += '			<img src="filesystem:'+chrome.extension.getURL("/persistent/thumbs/"+hex_md5(url)+".png")+'" />';
	thumbs += '			<img src="filesystem:'+chrome.extension.getURL("/persistent/thumbs/"+chrome.extension.getBackgroundPage().hex_md5(url)+".png")+'" />';
	thumbs += '		</div>';
	thumbs += '		<span class="toptitle"><img src="chrome://favicon/'+url+'" />';
	thumbs += '		<span class="toptitletext">'+title+'</span></span>';
	thumbs += '</a>';
	return thumbs;
}
$('.sitetile[tileAddTypedVisit]').live('click', function(){
	return addTypedVisitId($(this).attr('href'));
});



// Change the font size of the Address Box and Search Box (but not the results from them)
function changeInputFontSize() {
	var newSize = localStorage.option_inputfontsize;
	if (newSize) {
		$("#customstyle").append('#addresswrapper input, #searchwrapper input { font-size:'+newSize+'px; }');
		var newPadding = newSize-7;
		if (newPadding > 10) {
			newPadding = 10;
		}
		if (newPadding < 7) {
			newPadding = 7;
		}

		var newWidth = newSize-11;
		if (newWidth > 6) {
			newWidth = 6;
		}
		if (newWidth < 3) {
			newWidth = 3;
		}

		$(".wrapper").css("padding", newPadding+"px");
		$("#handle").css("width",newWidth+"px").css("min-width",newWidth+"px");
	} else {
		$("#customstyle").append('#addresswrapper input, #searchwrapper input { font-size:15px; }');
		$(".wrapper").css("padding","8px");
		$("#handle").css("width","4px").css("min-width","4px");
	}
}



// If the user selects to change the input boxes on Fauxbar, fade them out... then update with the new settings.
function changeInputBoxDisplayOrder(init) {
	if (init == true) {
		actuallyChangeInputBoxDisplayOrder();
	} else {
		$("#thefauxbar").children("table").first().animate({opacity:0},200, function(){
			actuallyChangeInputBoxDisplayOrder();
			$(this).animate({opacity:1},200);
		});
	}
}

// Alter Fauxbar's input boxes with the user's selected options.
function actuallyChangeInputBoxDisplayOrder() {
	if (localStorage.option_inputboxdisplayorder && localStorage.option_inputboxdisplayorder.length > 0) {
		switch (localStorage.option_inputboxdisplayorder) {
			case "addressleft_searchright":
				$("#addresswrapper").appendTo("#leftcell").parent("td").css("display","table-cell");
				$("#searchwrapper").appendTo("#rightcell").parent("td").css("display","table-cell");
				$("#handle").css("display","table-cell");
				break;
			case "searchleft_addressright":
				$("#searchwrapper").appendTo("#leftcell").parent("td").css("display","table-cell");
				$("#addresswrapper").appendTo("#rightcell").parent("td").css("display","table-cell");
				$("#handle").css("display","table-cell");
				break;
			case "addressonly":
				$("#searchwrapper").parent("td").css("display","none");
				$("#addresswrapper").parent("td").css("display","table-cell").css("width","100%");
				$("#handle").css("display","none");
				break;
			case "searchonly":
				$("#addresswrapper").parent("td").css("display","none");
				$("#searchwrapper").parent("td").css("display","table-cell").css("width","100%");
				$("#handle").css("display","none");
				break;
		}
	}
	$("#addresswrapper").parent("td").css("width", localStorage.option_leftcellwidthpercentage ? localStorage.option_leftcellwidthpercentage+'%' : '65%');
	$("#searchwrapper").parent("td").css("width", "auto");
}

// Change the Fauxbar's background gradient colors.
function changeFauxbarColors() {
	var r1 = hexToR(localStorage.option_topgradient);
	var g1 = hexToG(localStorage.option_topgradient);
	var b1 = hexToB(localStorage.option_topgradient);
	var r2 = hexToR(localStorage.option_bottomgradient);
	var g2 = hexToG(localStorage.option_bottomgradient);
	var b2 = hexToB(localStorage.option_bottomgradient);
	var topOpacity = localStorage.option_topopacity / 100;
	var bottomOpacity = localStorage.option_bottomopacity / 100;
	var newStyle = ".wrapper { background:-webkit-gradient(linear, left top, left bottom, from(rgba("+r1+","+g1+","+b1+","+topOpacity+")), to(rgba("+r2+","+g2+","+b2+","+bottomOpacity+"))); }";
	$("#customstyle").append(newStyle);
}

// Change the colors of the Go Arrow and Search Magnifying Glass icons.
function changeTintColors() {
	$("#address_goarrow img").attr("data-pb-tint-colour",localStorage.option_iconcolor).attr("data-pb-tint-opacity",1);
	$("#searchicon_cell img").attr("data-pb-tint-colour",localStorage.option_iconcolor).attr("data-pb-tint-opacity",1);
	processFilters();
	setTimeout(function(){
		$("#goarrow_hovered").attr("src",$("#address_goarrow img").attr("src"));
		$("#searchicon_hovered").attr("src",$("#searchicon_cell img").attr("src"));
		processFilters();
	}, 200);
}

// Once the Fauxbar page code has been loaded and is ready to go...
$(document).ready(function(){

	// Apply Options
	// ..Most code below applies user-specified options just before the Fauxbar is shown
	// Lots of customization :)

	// Change the order of the Address Box and Search Box, if user has chosen
	changeInputBoxDisplayOrder(true);

	// Change the font size of the Address Box and Search Box
	changeInputFontSize();

	if (!localStorage.customStyles) {

		// Load the user's font name
		$("#customstyle").append("#apps, #topthumbs { font-family:"+localStorage.option_font+", Ubuntu, Lucida Grande, Segoe UI, Arial, sans-serif; font-size:"+localStorage.option_sappsfontsize+"px; }");
		$("#customstyle").append("#apps a { color:"+localStorage.option_titlecolor+"; }");
		$("#customstyle").append("#apps a:hover { color:"+localStorage.option_selectedtitlecolor+"; }");

		// Show or hide the Fauxbar's drop shadow
		if (localStorage.option_shadow && localStorage.option_shadow != 1) {
			$("#customstyle").append(".wrapper { box-shadow:none; } ");
		}

		// Apply the user's background image, if selected
		if (localStorage.option_bgimg && localStorage.option_bgimg.length) {
			//$("body").css("background-image", "url("+localStorage.option_bgimg+")");
			$("#customstyle").append("body { background-image:url("+localStorage.option_bgimg+"); }");
		}

		// Apply the user's background color, if selected
		if (localStorage.option_bgcolor && localStorage.option_bgcolor.length) {
			//$("body").css("background-color", localStorage.option_bgcolor);
			$("#customstyle").append("body { background-color:"+localStorage.option_bgcolor+"; }");
		}

		// Apply the user's background image position, if selected
		if (localStorage.option_bgpos && localStorage.option_bgpos.length) {
			//$("body").css("background-position", localStorage.option_bgpos);
			$("#customstyle").append("body { background-position:"+localStorage.option_bgpos+"; }");
		}

		// Apply the user's background-repeat, if selected
		if (localStorage.option_bgrepeat && localStorage.option_bgrepeat.length) {
			//$("body").css("background-repeat", localStorage.option_bgrepeat);
			$("#customstyle").append("body { background-repeat:"+localStorage.option_bgrepeat+"; }");
		}

		// Apply the user's background image size, if selected
		if (localStorage.option_bgsize && localStorage.option_bgsize.length) {
			//$("body").css("background-size", localStorage.option_bgsize);
			$("#customstyle").append("body { background-size:"+localStorage.option_bgsize+"; }");
		}

		// Apply the user's maximum width of the Fauxbar, if selected
		if (localStorage.option_maxwidth && localStorage.option_maxwidth.length) {
			$("#customstyle").append(".wrapper { max-width:"+localStorage.option_maxwidth+"px; }");
		}

		// Apply the user's global font name, if selected
		if (localStorage.option_font && localStorage.option_font.length) {
			$("#customstyle").append("#thefauxbar *, #options .resultpreview *, #menubar, #results *, #opensearch_results, #opensearch_results *, #contextMenu * { font-family:"+localStorage.option_font+", Ubuntu, Lucida Grande, Segoe UI, Arial, sans-serif; }");
		}

		// Apply the user's specified font size for the Address Box and Search Box
		if (localStorage.option_inputfontsize && localStorage.option_inputfontsize.length) {
			$("#customstyle").append("#addresswrapper input, #searchwrapper input, .switchtext, .insetButton { font-size:"+localStorage.option_inputfontsize+"px; }");
			if (localStorage.option_inputfontsize == 13) {
				$("#customstyle").append(".insetButton { padding:2px 3px 1px 1px; } .insetButton .triangle { position:relative; top:0px; }");
			}
		}

		if (window.OS == "Mac") {
			$("#customstyle").append(".triangle { position:relative; top:1px; }");
		}

		// Apply the user's specified color for Address Box result title texts, and Search Box queries/suggestions
		if (localStorage.option_titlecolor && localStorage.option_titlecolor.length) {
			$("#customstyle").append(".result_title, #opensearch_results .result, .result_title .dotdotdot, .resultTag { color:"+localStorage.option_titlecolor+"; }");
		}

		// Apply the user's specified color for Address Box result URL texts
		if (localStorage.option_urlcolor && localStorage.option_urlcolor.length) {
			$("#customstyle").append(".result_url, .result_url .dotdotdot { color:"+localStorage.option_urlcolor+"; }");
		}

		// Apply the user's specified background color for Address Box results and Search Box queries/suggestions
		if (localStorage.option_resultbgcolor && localStorage.option_resultbgcolor.length) {
			$("#customstyle").append(".result, .resultpreview, .dotdotdot { background-color:"+localStorage.option_resultbgcolor+"; }");
		}

		// Apply the user's sepcified highlighted color for results/queries/suggestions title texts
		if (localStorage.option_selectedtitlecolor && localStorage.option_selectedtitlecolor.length) {
			$("#customstyle").append("#opensearch_results .arrowed, .arrowed .result_title, .arrowed .result_title .dotdotdot, .rightClickedResult .result_title, .rightClickedResult .result_title .dotdotdot, .arrowed .resultTag, .rightClickedResult .resultTag { color:"+localStorage.option_selectedtitlecolor+"; }");
		}

		// Apply the user's sepcified highlighted color for result URL texts
		if (localStorage.option_selectedurlcolor && localStorage.option_selectedurlcolor.length) {
			$("#customstyle").append(".arrowed .result_url, .arrowed .result_url .dotdotdot, .rightClickedResult .result_url, .rightClickedResult .result_url .dotdotdot { color:"+localStorage.option_selectedurlcolor+"; }");
		}

		// Apply the user's sepcified highlighted background color for results/queries/suggestions
		if (localStorage.option_selectedresultbgcolor && localStorage.option_selectedresultbgcolor.length) {
			$("#customstyle").append("#apps a:hover, .arrowed, #options .arrowed .dotdotdot, .arrowed .result_title .dotdotdot, .arrowed .result_url .dotdotdot, .rightClickedResult, .rightClickedResult .result_title .dotdotdot, .rightClickedResult .result_url .dotdotdot, .rightClickedResult .resultTag, .arrowed .resultTag { background-color:"+localStorage.option_selectedresultbgcolor+"; }");
		}

		// Apply the user's specified font size for result titles
		if (localStorage.option_titlesize && localStorage.option_titlesize.length) {
			$("#customstyle").append(".result_title, #options .result_title, .result_title .dotdotdot { font-size:"+localStorage.option_titlesize+"px; }");
		}

		// Apply the user's specified font size for result URLs and queries/suggestions
		if (localStorage.option_urlsize && localStorage.option_urlsize.length) {
			$("#customstyle").append(".result_url, #options .result_url, .historyresult, .jsonresult, .resultTag, .result_url .dotdotdot { font-size:"+localStorage.option_urlsize+"px; }");
		}

		// Apply the user's specified Address Box result separator color (and right-click context menu divider)
		if (localStorage.option_separatorcolor && localStorage.option_separatorcolor.length) {
			$("#customstyle").append(".result { border-color:"+localStorage.option_separatorcolor+"; }");
			$("#customstyle").append("#contextMenu .menuHr { background-color:"+localStorage.option_separatorcolor+"; }");
		}

		// Apply the user's specified Address Box and Search Box background color
		if (localStorage.option_inputbgcolor && localStorage.option_inputbgcolor.length) {
			$("#customstyle").append(".inputwrapper { background-color:"+localStorage.option_inputbgcolor+"; }");
		}

		// Apply the bookmark/favorite icon's custom tint opacity strength
		if (localStorage.option_favopacity && localStorage.option_favopacity.length) {
			$("#fauxstar").attr("data-pb-tint-opacity", localStorage.option_favopacity / 100);
		}
		// Apply the bookmar/favorite icon's tint color
		if (localStorage.option_favcolor && localStorage.option_favcolor.length) {
			$("#fauxstar").attr("data-pb-tint-colour",localStorage.option_favcolor);
			$(".favstar").attr("src",$("#fauxstar").attr("src"));
		}

		// Load the Address Box's fallback URL into an element? Not sure why...
		if (localStorage.option_fallbacksearchurl && localStorage.option_fallbacksearchurl.length) {
			$("#option_fallbacksearchurl").val(localStorage.option_fallbacksearchurl);
		}

		// In the Options, when deciding on a new color for the input boxes' text, remove the faded/italic CSS class
		// so that the user can properly see what the text will look like when they're typing into it.

		// Then reset it back to being faded once the user is done deciding on a color.
		$("#option_fauxbarfontcolor").live("blur", function(){
			$("#awesomeinput").val("").blur();
		});

		// Apply custom Fauxbar background gradient colors
		if (localStorage.option_topgradient && localStorage.option_topgradient.length && localStorage.option_bottomgradient && localStorage.option_bottomgradient.length) {
			changeFauxbarColors();
		}

		// Apply custom Address Box and Search Box font color
		if (localStorage.option_fauxbarfontcolor && localStorage.option_fauxbarfontcolor.length) {
			var placeholderRGBA = hexToR(localStorage.option_fauxbarfontcolor)+','+hexToG(localStorage.option_fauxbarfontcolor)+','+hexToB(localStorage.option_fauxbarfontcolor);
			$("#customstyle").append(".inputwrapper input { color:"+localStorage.option_fauxbarfontcolor+"; }");
			$("#customstyle").append("input::-webkit-input-placeholder, .triangle { color:rgba("+placeholderRGBA+",.5); }");
			$("#customstyle").append("input::-webkit-input-placeholder { font-style:"+(window.OS == "Windows" ? "italic" : "normal")+" }");
			$("#customstyle").append("#addressbox_triangle:hover .triangle, #opensearch_triangle:hover .triangle, #super_triangle:hover .triangle { color:rgba("+placeholderRGBA+",.59); }");
		}
		
		// Menu bar styles
		if (localStorage.option_showMenuBar == 1) {
			$('#customstyle').append('#menubar { background-color:'+localStorage.option_menuBarBackgroundColor+'; }');
			if (localStorage.option_showTabsMenu == 0) { $('#customstyle').append('menu[tabs] { display:none; }'); }
			if (localStorage.option_showHistoryMenu == 0) { $('#customstyle').append('menu[history] { display:none; }'); }
			if (localStorage.option_showBookmarksMenu == 0) { $('#customstyle').append('menu[bookmarks] { display:none; }'); }
			if (localStorage.option_showAppsMenu == 0) { $('#customstyle').append('menu[apps] { display:none; }'); }
			if (localStorage.option_showExtensionsMenu == 0) { $('#customstyle').append('menu[extensions] { display:none; }'); }
			if (localStorage.option_showChromeMenu == 0) { $('#customstyle').append('menu[chrome] { display:none; }'); }
			if (localStorage.option_showFauxbarMenu == 0) { $('#customstyle').append('menu[fauxbar] { display:none; }'); }
			
			$('#customstyle').append(
				'#menubar { font-size:'+localStorage.option_urlsize+'px; }' +
				'menu item { color:'+localStorage.option_titlecolor+'; }' +
				'menu items > item:not(.faded):hover, menu items > group > item:not(.faded):hover, menu item:not(.faded).hovering { color:'+localStorage.option_selectedtitlecolor+'; background-color:'+localStorage.option_selectedresultbgcolor+'; }' +
				'menu items item:hover > items, menu item.hovering > items { color:'+localStorage.option_titlecolor+'; background-color:'+localStorage.option_resultbgcolor+'; }' +
				'#menubar hr { border-color:'+localStorage.option_separatorcolor+'; }' +
				'menuName, menuDate { color:'+localStorage.option_menuBarFontColor+'; }' +
				'#menubar item[faded] { color:'+localStorage.option_titlecolor+'; }'
			);
			
		} else {
			$('#customstyle').append('#menubar { display:none; }');
		}

		// So, just make the Fauxbar appear instantly, now that all the custom colors and stuff have been applied.
		localStorage.customStyles = $("#customstyle").html();
	} else {
		$("#customstyle").append(localStorage.customStyles);
	}
});

// getTransitions() is good for debugging/finding history items that were usually accssed as an auto_subframe (ads, social media iframes).
// however, some legit things use auto_subframe (I think), like Google Instant searching (or maybe not). so best to just leave them all in.
// could build in an option later on filter out auto_subframe results, but probably more trouble than its worth.

// UPDATE: wait, maybe it is only ads?
// and strangely, when using chrome.history.search() to get every history item (empty search query), auto_subframe results are not returned. Nevermind...
// DON'T DELETE
/*function getTransitions() {
	if (window.infoDivs.length > 0) {
		chrome.history.getVisits({url:$(window.infoDivs[window.infoDivs.length-1]).attr("url")}, function(visits){
			for (var v in visits) {
				$(window.infoDivs[window.infoDivs.length-1]).append(visits[v].transition + " ");
			}
			window.infoDivs.pop();
			getTransitions();
		});
	}
}
// DON'T DELETE
function revealTransitions(div) {
	window.currentDiv = div;
	chrome.history.getVisits({url:$(div).attr("url")}, function(visits){
		var transitions = "";
		for (var v in visits) {
			transitions += visits[v].transition+" ";
		}
		$('div.visitinfo[url="'+$(window.currentDiv).attr("url")+'"]').html(transitions);
	});
}*/

// http://www.javascripter.net/faq/hextorgb.htm
function hexToR(h) { return parseInt((cutHex(h)).substring(0,2),16) }
function hexToG(h) { return parseInt((cutHex(h)).substring(2,4),16) }
function hexToB(h) { return parseInt((cutHex(h)).substring(4,6),16) }
function cutHex(h) { return (h.charAt(0)=="#") ? h.substring(1,7) : h}