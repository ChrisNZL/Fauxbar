// Save new site tile configuration/layout
function saveSiteTiles(justChecking) {
	var tiles = new Array;
	$("#topthumbs a").each(function(){
		tiles[tiles.length] = {url:$(this).attr("url"), title:$(this).attr("origtitle")};
	});
	if (justChecking == true) {
		return JSON.stringify(tiles);
	} else {
		$("button").first().prop("disabled",true).text("Saving...").next().remove();
		if (openDb()) {
			window.db.transaction(function(tx){
				tx.executeSql('UPDATE thumbs SET manual = 0');
				$("#topthumbs a").each(function(){
					var a = this;
					tx.executeSql('UPDATE thumbs SET manual = 1 WHERE url = ?', [$(a).attr("url")], function(tx, results){
						if (results.rowsAffected == 0) {
							tx.executeSql('INSERT INTO thumbs (url, manual) VALUES (?, 1)', [$(a).attr("url")]);
						}
					});
				});
			}, function(t){
				errorHandler(t, getLineInfo());
			}, function(){
				// success
				localStorage.option_topsitecols = $("select").val();
				localStorage.siteTiles = JSON.stringify(tiles);
				if (localStorage.option_autoSaveToCloud == 1) {
					chrome.runtime.sendMessage(null, 'Save options to cloud');
				}
				if (getHashVar("edittiles")) {
					window.close();
				} else {
					chrome.tabs.getCurrent(function(tab){
						chrome.tabs.update(tab.id, {url:chrome.extension.getURL("/html/fauxbar.html")});
					});
				}
			});
		}
	}
}

// Exit tile editing mode without saving changes
function cancelTiles() {
	$("button").prop("disabled",true);
	window.onbeforeunload = '';
	if (getHashVar("edittiles")) {
		window.close();
	} else {
		chrome.tabs.getCurrent(function(tab){
			chrome.tabs.update(tab.id, {url:chrome.extension.getURL("/html/fauxbar.html")});
		});
	}
}

// Initialise page tile editing mode

delete window.keywordEngine;
$("#awesomeInsetButton").removeClass("insetButton").addClass("noInsetButton");
$("#addressbaricon").attr("src","chrome://favicon/null");
$(".switchtext").html("Switch to tab:").css("display","");
$("#address_goarrow img").attr("src","/img/plus.png");
$("#address_goarrow").attr("title","Add the entered address as a tile");
$("#awesomeinput").focus();

window.document.title = "Fauxbar: Edit Tiles";
window.onbeforeunload = function() {
	if (localStorage.siteTiles && saveSiteTiles(true) != localStorage.siteTiles) {
		return 'You have not saved your new tile configuration yet.\n\nAre you sure you want to leave this page and discard your changes?';
	}
};
window.tileEditMode = true;
window.draggingTile = false;
$("#awesomeinput").attr("placeholder","Add a site as a tile").blur();
hideResults();

// Prevent links from performing their usual behaviour when user clicks them
$("#topthumbs a").live("click", function(){
	return false;
});

// Prompt user to rename a tile on double-click
$("#topthumbs a").live("dblclick", function(){
	var text = prompt("Rename tile:",$(this).attr("origtitle"));
	if (text) {
		$(".toptitletext",this).text(text);
		$(this).attr("origtitle",text);
		truncatePageTileTitle($(".toptitle",this));
	}
});

// Begin dragging a tile
$("#topthumbs a").live("mousedown", function(e){
	if (e.button == 0) {
		removeContextMenu();
		window.draggingTile = true;
		window.topThumbA = this;
		setTimeout(function(){
			if (window.draggingTile == true) {
				$(window.topThumbA)
					.addClass("draggingTile")
					.removeClass("sitetile")
					.css("top",(e.pageY-66)+"px")
					.css("left",(e.pageX-106)+"px")
					.after('<a class="holderTile"><div class="thumb" style="background:none; height:'+$("div.thumb").first().innerHeight()+"px"+'"></div><span class="toptitle">&nbsp;</span></a>');
				$("body").css("cursor","move").append('<div id="cursorbox" style="top:'+e.pageY+'px;left:'+e.pageX+'"></div>');
				$(".tileCross").css("display","none");
			}
		}, 100);
		return false;
	}
});

// Drop the dragged tile to its new spot
$("body").live("mouseup", function(){
	window.draggingTile = false;
	var dest = $(".holderTile").offset();
	if (dest) {
		$(".draggingTile").animate({top:dest.top+4+"px", left:dest.left+4+"px"}, 200, function(){
			$(".draggingTile").addClass("sitetile").removeClass("draggingTile").css("top","").css("left","").insertAfter(".holderTile");
			$(".holderTile").remove();
			$("#cursorbox").remove();
			$("body").css("cursor","");
			$(".tileCross").css("display","");
		});
	}
});

// Keep the dragged tile with the mouse cursor
$("body").live("mousemove", function(e){
	if (window.draggingTile == true) {
		$(".draggingTile").css("top",(e.pageY-66)+"px").css("left",(e.pageX-106)+"px");
		$("#cursorbox").css("top",e.pageY+"px").css("left",e.pageX+"px");
		var hoveredTile = $('#cursorbox').collidesWith('.sitetile');
		if (hoveredTile.length == 1) {
			if (hoveredTile.next(".holderTile").length == 0) {
				$(".holderTile").insertAfter(hoveredTile);
			} else {
				$(".holderTile").insertBefore(hoveredTile);
			}
		}
	}
});

// Tile edit mode CSS
$("#topthumbs").attr("title","Click and drag to move.\nRight-click to rename.");
$("#editTileStyle").append('#topthumbs a { cursor:move; }');
$("#editTileStyle").append('#topthumbs a:hover, #topthumbs a.draggingTile { background-color:'+localStorage.option_resultbgcolor+'; color:'+localStorage.option_titlecolor+'; }');
if (navigator.appVersion.indexOf("Mac")!=-1) {
	$("#editTileStyle").append('#manualmode { font-size:13px; }');
}
var maxWidth = $("#addresswrapper").parent().outerWidth();
$("#handle").css("display","none");
$("#addresswrapper").parent().css("display","table-cell");
$("#searchwrapper").parent().css("display","none");
$(".wrapper").css("max-width",maxWidth+"px");
$("#editmodeContainer").remove();
$("#maindiv").before('<div id="editmodeContainer" style="opacity:0; box-shadow:0 2px 2px rgba(0,0,0,.3);"><div id="manualmode"><img src="/img/fauxbar48.png" style="margin-top:'+
						($('#menubar').css('display') == 'none' ? '1' : $('#menubar').outerHeight()+1)+'px" /> <b>Tile editing enabled.</b> Add sites as tiles using the modified Address Box below. Drag tiles to rearrange. Right-click to rename.&nbsp;'
						+' <div style="display:inline; white-space:nowrap">Maximum tiles per row: <select style="position:relative; z-index:999; font-family:inherit; margin-bottom:-2px">'
						+'<option value="1">1</option>'
						+'<option value="2">2</option>'
						+'<option value="3">3</option>'
						+'<option value="4">4</option>'
						+'<option value="5">5</option></select></div></div></div>');
$('option[value="'+localStorage.option_topsitecols+'"]').prop("selected",true);
$("select").bind("change", function(){
	setMaxTilesPerRow($(this).val());
});
$("#editmodeContainer").prepend('<div id="editModeButtons"><button saveSiteTiles style="font-family:'+localStorage.option_font+', Ubuntu, Lucida Grande, Segoe UI, Arial, sans-serif;">Save</button>&nbsp;' +
	'<button cancelTiles style="font-family:'+localStorage.option_font+', Ubuntu, Lucida Grande, Segoe UI, Arial, sans-serif;">Cancel</button></div>');
$("#editmodeContainer").animate({opacity:1}, 325);
chrome.tabs.getCurrent(function(tab){
	chrome.tabs.update(tab.id, {selected:true}, function(){
		$("#awesomeinput").focus();
	});
});

$('button[saveSiteTiles]').live('click', saveSiteTiles);
$('button[cancelTiles]').live('click', cancelTiles);

$("#sapps").remove();
$("#apps").remove();
setTimeout(function(){
	$("#topthumbs").css("display","block").css("opacity",1);
	setTileOnLoads();
}, 1);

// Render the user's existing site tiles
if (window.tiles) {
	$("#topthumbs").html("");
	var thumbs = '';
	for (var t in window.tiles) {
		thumbs += renderPageTile(window.tiles[t].url, window.tiles[t].title, true);
	}
	renderSiteTiles(thumbs);
	$("#topthumbs a").css("opacity",1);
}

// Add a new page tile to Fauxbar while in tile editing mode
function addTile(el) {
	hideResults();
	setTimeout(function(){
		$("#awesomeinput").val(window.actualUserInput).focus().setSelection(0,window.actualUserInput.length);
	}, 10);
	toggleSwitchText();
	$("#awesomeinput").focus();
	$("#topthumbs").append(renderPageTile($(el).attr("url"), $(el).attr("origtitle"), true));
	setTileOnLoads();
	$("#topthumbs a").last().animate({opacity:1}, 500);
	$("#topthumbs a").attr("title","Click and drag to move.\nRight-click to rename.");
}

function removeTile(el) {
	$(el).parent().animate({opacity:0}, 350, function(){
		$(this).remove();
	});
}


/* http://www.48design.de/news/2009/11/20/kollisionsabfrage-per-jquery-plugin-update-v11-8/
* Collision Check Plugin v1.1
* Copyright (c) Constantin Groß, 48design.de
* v1.2 rewrite with thanks to Daniel
*
* @requires jQuery v1.3.2
* @description Checks single or groups of objects (divs, images or any other block element) for collission / overlapping
* @returns an object collection with all colliding / overlapping html objects
*
* Dual licensed under the MIT and GPL licenses:
*   http://www.opensource.org/licenses/mit-license.php
*   http://www.gnu.org/licenses/gpl.html
*
*/
(function($) {
 $.fn.collidesWith = function(elements) {
  var rects = this;
  var checkWith = $(elements);
  var c = $([]);

  if (!rects || !checkWith) { return false; }

  rects.each(function() {
   var rect = $(this);

   // define minimum and maximum coordinates
   var rectOff = rect.offset();
   var rectMinX = rectOff.left;
   var rectMinY = rectOff.top;
   var rectMaxX = rectMinX + rect.outerWidth();
   var rectMaxY = rectMinY + rect.outerHeight();

   checkWith.not(rect).each(function() {
    var otherRect = $(this);
    var otherRectOff = otherRect.offset();
    var otherRectMinX = otherRectOff.left;
    var otherRectMinY = otherRectOff.top;
    var otherRectMaxX = otherRectMinX + otherRect.outerWidth();
    var otherRectMaxY = otherRectMinY + otherRect.outerHeight();

    // check for intersection
    if ( rectMinX >= otherRectMaxX ||
         rectMaxX <= otherRectMinX ||
         rectMinY >= otherRectMaxY ||
         rectMaxY <= otherRectMinY ) {
           return true; // no intersection, continue each-loop
    } else {
		// intersection found, add only once
		if(c.length == c.not(this).length) { c.push(this); }
    }
   });
        });
   // return collection
        return c;
 }
})(jQuery);

$('.tileCross').live('click', function(){
	removeTile(this);
	return false;
});