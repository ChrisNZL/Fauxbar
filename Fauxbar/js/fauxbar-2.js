// Focus Address Box or Search Box if user presses appropriate keyboard shortcut
chrome.runtime.onMessage.addListener(function(message){
	switch (message) {
		case 'Focus Address Box':
			focusAddressBox();
			break;
		case 'Focus Search Box':
			focusSearchBox();
			break;
	}
});

// http://stackoverflow.com/questions/890807/iterate-over-a-javascript-associative-array-in-sorted-order
function sortKeys(obj) {
    var keys = [];
    for(var key in obj) {
        keys.push(key);
    }
    return keys;
}

// Truncate a page tile title and add "..." to its end
function truncatePageTileTitle(tileTitle) {
	if ($(tileTitle).outerWidth() > 212) {
		var origTitle = $(".toptitletext",tileTitle).text();
		while ($(tileTitle).outerWidth() > 200) {
			$(".toptitletext",tileTitle).text($(".toptitletext",tileTitle).text().substring(0,$(".toptitletext",tileTitle).text().length-1));
		}
		$(".toptitletext",tileTitle).text($(".toptitletext",tileTitle).text()+"...");
		$(tileTitle).attr("title",origTitle);
	}
}


function resizeTileThumbs() {
	var shortestHeight = 132;
	$("#topthumbs div.thumb img").each(function(){
		if ($(this).innerHeight()-200 < $(this).parent().outerHeight() && $(this).innerHeight()-200 < shortestHeight && $(this).innerHeight()-200 > 20) {
			shortestHeight = $(this).innerHeight()-200;
			$("#topthumbs div.thumb").css("height",shortestHeight+"px");
		}
	});
}

function setMaxTilesPerRow(cols) {
	// Set max width for the thumbs container
	$("#topthumbs").css("max-width",(cols*242)+"px");
}

function setTileOnLoads() {
	// Shrink thumbs if needed (used when browser window screenshots are rather wide)
	$("#topthumbs div.thumb img")
	.bind("load", function(){
		truncatePageTileTitle($(this).parents(".sitetile").children(".toptitle"));
		$(this).parents(".sitetile").attr("doneLoading",1); //css("opacity",1);
		resizeTileThumbs();
		if ($(".sitetile").length == $('.sitetile[doneLoading="1"]').length) {
			$(".sitetile").css("opacity",1);
		}
	})
	.bind("error",function(){
		truncatePageTileTitle($(this).parents(".sitetile").children(".toptitle"));
		$(this).parents(".sitetile").attr("doneLoading",1); //css("opacity",1);
		$(this).remove();
		if ($(".sitetile").length == $('.sitetile[doneLoading="1"]').length) {
			$(".sitetile").css("opacity",1);
		}
	});
}

function renderSiteTiles(thumbs) {

	// Hide the site tiles if we're showing Chrome's installed apps instead
	if (localStorage.sapps == 2) {
		$("#topthumbs").css("opacity",0);
	}

	setMaxTilesPerRow(localStorage.option_topsitecols);
	$("#topthumbs").append(thumbs);

	setTileOnLoads();

	resizeTileThumbs();

	// Display tiles or not
	if (localStorage.sapps == 2 && localStorage.option_showapps == 1) {
		$("#topthumbs").css("display","none").css("opacity",1);
	} else {
		$("#topthumbs").css("opacity",1);
	}
}

// If user's opted to show top site tiles...
if (localStorage.indexComplete == 1 && !getHashVar("options")) {
	if (localStorage.option_showtopsites == 1) {

		// Generate top sites if Fauxbar's index is fresh. Either way, show the tiles afterwards
		$("#customstyle").append("#topthumbs a, #apps a { background-color:"+localStorage.option_resultbgcolor+"; color:"+localStorage.option_titlecolor+"; }");
		$("#customstyle").append("#topthumbs a:hover, #apps a:hover, #apps a.rightClickedApp { background-color:"+localStorage.option_selectedresultbgcolor+"; color:"+localStorage.option_selectedtitlecolor+"; }");

		if (localStorage.option_pagetilearrangement == "manual") {
			window.tiles = jQuery.parseJSON(localStorage.siteTiles);
			var thumbs = '';
			for (var t in window.tiles) {
				thumbs += renderPageTile(window.tiles[t].url, window.tiles[t].title);
			}
			renderSiteTiles(thumbs);
			if (getHashVar("edittiles") == 1) {
				var newScript = document.createElement("script");
				newScript.setAttribute('src', '/js/tilemode.js');
				document.getElementById('head').appendChild(newScript);
			}
		} else {
			chrome.tabs.getAllInWindow(null, function(tabs) {
				window.currentTabs = tabs;
				if (openDb()) {
					window.db.transaction(function(tx){

						// Get top sites
						var thumbs = '';

						// Choose which page tiles to display
						switch(localStorage.option_pagetilearrangement) {
							case "manual":
								break;

							// case: "frecency"
							default:

								function processTiles(tx) {

									// Don't fetch file:/// URLs?
									var hideFiles = localStorage.option_hidefiletiles == 1 ? ' url NOT LIKE "file:///%" AND ' : '';

									// Don't fetch pinned URLs?
									var hidePinned = '';
									if (localStorage.option_hidepinnedtiles == 1) {
										for (var t in window.currentTabs) {
											if (window.currentTabs[t].pinned) {
												hidePinned += ' url NOT LIKE "'+explode("#",window.currentTabs[t].url)[0]+'%" AND ';
											}
										}
									}

									// Don't fetch opened URLs?
									var hideOpened = '';
									if (localStorage.option_hideopentiles == 1) {
										for (var ot in window.currentTabs) {
											hideOpened += ' url NOT LIKE "'+explode("#",window.currentTabs[ot].url)[0]+'%" AND ';
										}
									}

									// Get top sites
									var statement = 'select url, title from thumbs WHERE '+hideFiles+hidePinned+hideOpened+' frecency > 0 order by frecency DESC limit ?';
									tx.executeSql(statement, [localStorage.option_topsiterows*localStorage.option_topsitecols], function(tx, results){
										var len = results.rows.length, i;
										var thumbUrl = '';

										// Create HTML for each site tile
										for (var i = 0; i < len; i++) {
											thumbUrl = results.rows.item(i).url;
											thumbs += renderPageTile(thumbUrl, results.rows.item(i).title);
										}
										renderSiteTiles(thumbs);
									});
								}

								if (!localStorage.almostdone || localStorage.almostdone == 1) {
									tx.executeSql('UPDATE thumbs SET frecency = 0');
									tx.executeSql('SELECT DISTINCT url, title, frecency FROM urls WHERE url NOT LIKE "data:%" AND title != "" ORDER BY frecency DESC LIMIT 30', [], function(tx, results){
										var len = results.rows.length, i;
										if (len > 0) {
											for (var i = 0; i < len; i++) {
												tx.executeSql('INSERT OR REPLACE INTO thumbs (url, title, frecency) VALUES (?, ?, ?)', [results.rows.item(i).url, results.rows.item(i).title, results.rows.item(i).frecency]);
											}
										}
										localStorage.almostdone = 0;
										processTiles(tx);
									});
								} else {
									processTiles(tx);
								}
								break;
						}
					}, function(t){
						errorHandler(t, getLineInfo());
					});
				}
			});
		}
	}
}

function sortKeysAlphabetically (x,y){
	// Case insensitive sort: http://www.java2s.com/Code/JavaScript/Language-Basics/CaseInsensitiveComparisonfortheArraySortMethod.htm
	var a = String(x).toUpperCase();
	var b = String(y).toUpperCase();
	if (a > b)
		return 1;
	if (a < b)
		return -1;
	return 0;
}

$(document).ready(function(){

	$("#customstyle").append("#contextMenu { background-color:"+localStorage.option_resultbgcolor+"; color:"+localStorage.option_titlecolor+"; }");
	$("#customstyle").append("#contextMenu .menuOption { font-size:"+localStorage.option_urlsize+"px; }");
	$("#customstyle").append("#contextMenu .menuOption:hover { background-color:"+localStorage.option_selectedresultbgcolor+"; color:"+localStorage.option_selectedtitlecolor+"; }");
	$("#customstyle").append("#contextMenu .disabled:hover { color:"+localStorage.option_titlecolor+"; background:none; }");

	// If enabled to show...
	if (localStorage.option_showapps == 1 && !getHashVar("options")) {

		// Get all apps and set their uninstall link
		window.uninstall = function(appId) {
			chrome.management.getAll(function(apps){
				for (var a in apps) {
					if (apps[a].id == appId) {
						confirm("Uninstall \""+apps[a].name+"\" from Chrome?") ? chrome.management.uninstall(apps[a].id)+$(".app"+apps[a].id).remove() : null;
						return;
					}
				}
			});
		};
		// When tile is moused over, show the uninstall icon after a moment; hide it when moused out
		$(".app").live("mouseenter", function(){
			$(".unin",this).animate({position:"relative"}, 700, function(){
				$(this).css("display","inline-block");
			});
		});
		$(".app").live("mouseleave", function(){
			$(".unin",this).stop(true).css("display","none");
		});

		// Get all apps
		chrome.management.getAll(function(apps){
			var apps2 = {};
			for (var a2 in apps) {
				if (apps[a2].isApp) {
					apps2[apps[a2].name] = apps[a2];
				}
			}
			// Sort them alphabetically
			apps2 = sortKeys(apps2).sort(sortKeysAlphabetically);

			for (var a3 in apps) {
				for (a4 in apps2) {
					if (apps[a3].isApp && apps[a3].name == apps2[a4]) {
						apps2[a4] = apps[a3];
					}
				}
			}

			// Create their HTML
			apps = apps2;
			var appHtml = '';
			for (var a in apps) {
				if (apps[a].isApp == true && apps[a].enabled) {
					appHtml += '<a class="app app'+apps[a].id+'" href="'+apps[a].appLaunchUrl+'" appname="'+str_replace('"','&quot;',apps[a].name)+'" appid="'+apps[a].id+'">';
					appHtml += '<img src="'+(apps[a].icons ? apps[a].icons[apps[a].icons.length-1].url : '/img/app128default.png')+'" style="height:128px;width:128px" /><br />';
					appHtml += '<span title="'+apps[a].description+'" style="display:inline-block">'+apps[a].name+'</span>';
					appHtml += '</a>';
				}
			}

			// Get ready to display them
			appHtml += '<a class="app" href="https://chrome.google.com/webstore"><img src="/img/webstore.png" style="height:128px;width:128px;" /><br />Web Store</a>';
			$("#apps").css("max-width",localStorage.option_maxwidth+"px")
					  .css("position","relative")
					  .css("opacity",0)
					  .css("display","block")
					  .append(appHtml);

			// Truncate names if they're too long
			var origTitle = '';
			$("#apps a span").each(function(){
				if ($(this).outerWidth() > 128) {
					origTitle = $(this).text();
					while ($(this).outerWidth() > 120) {
						$(this).text($(this).text().substring(0,$(this).text().length-1));
					}
					$(this).text($(this).text()+"...");
					$(this).attr("title",origTitle+" - "+$(this).attr("title"));
				}
			});

			// Display app tiles if required
			if (localStorage.sapps == 1 && localStorage.option_showtopsites == 1) {
				$("#apps").css("display","none").css("opacity",1);
			} else {
				$("#apps").css("opacity",1);
			}
		});
	}

	if (localStorage.option_showapps == 1 && localStorage.option_showtopsites == 1 && localStorage.indexComplete == 1) {
		window.sapped = false;
		
		window.sapps = function(s) {
			var trans = window.sapped ? 130 : 0;
			if (s == 1) {
				if (window.sapped == true) {
					$("#apps").animate({opacity:0}, trans, function(){
						$(this).css("display","none");
						$("#topthumbs").css("opacity",0).css("display","block").animate({opacity:1}, trans);
						$(".toptitle").each(function(){
							truncatePageTileTitle(this);
						});
					});
				}
				localStorage.sapps = 1;
				$("#sapps1").prop("disabled",true);
				$("#sapps2").prop("disabled",false);
			} else {
				if (window.sapped == true) {
					$("#topthumbs").animate({opacity:0}, trans, function(){
						$(this).css("display","none");
						$("#apps").css("opacity",0).css("display","block").animate({opacity:1}, trans);
					});
				}
				localStorage.sapps = 2;
				$("#sapps1").prop("disabled",false);
				$("#sapps2").prop("disabled",true);
			}
			window.sapped = true;
		}
		
		setTimeout(function(){
			$("#sapps").css("opacity",0).css("margin-left","-"+(Math.ceil($("#sapps").outerWidth()/2))+"px").css("opacity",1);
		},50);
		sapps(localStorage.sapps);
		$('#sapps1').live('click', function() {
			window.sapps(1);
		});
		$('#sapps2').live('click', function() {
			window.sapps(2);
		});
	} else {
		$("#sapps").remove();
	}

	/*if (localStorage.showintro != 0 && localStorage.indexedbefore == 1) {
		$("#background").after('<div id="optionsintro" style="display:block">Welcome to '+(localStorage.extensionName ? localStorage.extensionName : 'Fauxbar')+'.&nbsp; To open the options, right-click anywhere on the page.</div>');
	}*/

	chrome.management.onInstalled.addListener(function(app) {
		if (app.isApp) {
			setTimeout(function(){
				window.location.reload();
			},100);
		}
	});
});

$('button[startIndexing]').live('click', function(){
	chrome.runtime.sendMessage(null, {action:'reindex'});
	$(this).prop('disabled',true).html('Please Wait...');
});

$('.errorBoxCross, a[openTheErrorLog]').live('click', function(){
	$('#errorBox').css('display','none');
	return true;
});