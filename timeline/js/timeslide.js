(function ($, document, undefined) {

	var timeslide = function () {
	}

	timeslide.settings = {
		timelineBy: 'years',
		groupBy: 	'years'
	};

	var currentPoint = -1;
	var slideIterator = -1; // index in current point
	var slides = {};
	var points = {};
	var ordered_pts = [];
	var timelineScale = NaN;
	var startPoint = NaN;

	function isObj(obj) { return typeof(obj) == 'object'; }
	function isStr(str) { return typeof(str) == 'string'; }
	function textOf(el) { if (el.length === 0) return ""; return el.text(); }

	var animationStack = [];

	timeslide.getLocatorFor = function (hevent) {
		// only used for grouping. So...
		var y = hevent.dtstart.getFullYear();

		switch (timeslide.settings.groupBy) {
		case 'decades':
			return [y - (y % 10), String(y - (y % 10))];
		case 'years':
			return [y, String(y)];
		case 'months':
			return [Math.round(
				(y + hevent.dtstart.getMonth() / 12) * 100
			), hevent.dtstart.getMonth() + "/" + y];
		}
	}

	timeslide.parseDatePattern = function (date_el) {
		// microformats date pattern
		var tmp_date = NaN, dt = false;

		var dt_title = date_el.attr('title'),
			dt_text  = date_el.text();

		if (isStr(dt_title) && dt_title) {

			tmp_date = Date.parse(dt_title);

			if (!isNaN(tmp_date)) {
				dt = new Date(tmp_date);
			} else {
				console.log(
					"[DEBUG] Invalid date in title: " + dt_title
				);
			}
		} else {

			tmp_date = Date.parse(dt_text);

			if (!isNaN(tmp_date)) {
				dt = new Date(tmp_date);
			} else {
				console.log(
					"[DEBUG] Invalid date in .dtstart: " + dt_text
				);
			}
		}

		return dt;
	}

	timeslide.parseHEvent = function (el) {

		if (!el.is('.hevent')) {
			console.log(
				"[WARNING] Element being parsed as hevent is not hevent"
			);
		}

		var hevent = {};
		hevent._original = el;

		var dtstart = el.find('.dtstart');

		if (dtstart.length == 0) {
			throw "No start date found";
		}

		hevent.dtstart = timeslide.parseDatePattern(dtstart);

		if (!isObj(hevent.dtstart)) {
			throw "Invalid dtstart. Failed to parse as date.";
		}

		hevent.summary = el.find('.summary');
		if (hevent.summary.length == 0) {
			throw "Required field summary not present."
		}

		// optional fields
		hevent.heading   = el.find('.event-title').text() ||
						   el.find('h1').text() ||
						   el.find('h2').text() ||
						   el.find('h3').text();

		hevent.location = el.find('.location').text();
		hevent.url 		= el.find('.url').attr('href');
		hevent.dtend    = timeslide.parseDatePattern(el.find('.dtend'));
		hevent.rdate    = timeslide.parseDatePattern(el.find('.rdate'));
		//hevent.rrule  = timeslide.parseDatePattern(el.find('.rrule');
		hevent.description = el.find('.description').text();
		hevent.category = el.find('.category').text();
		hevent.status   = el.find('.status').text();

		return hevent;
	}

	timeslide.loadItem = function (elem) {
		var slide = {}, point = {};

		if (typeof(slides) == 'undefined') {
			slides = {};
		}

		slide = timeslide.parseHEvent(elem);

		var pt = timeslide.getLocatorFor(slide),
			i = pt[0], title = pt[1];

		if (!pt[0]) {
			throw "Could not determine the point in time.";
		}

		if (typeof(points[i]) == 'undefined') {
			points[i] = { 'title' : title };
		}

		if (typeof(points[i].slides) == 'undefined') {
			points[i].slides = []
		}
		slide.point = i;
		slide.id = i + "-" + points[i].slides.length;
		slides[slide.id] = slide;

		points[i].slides.push(slide);

		return slide;
	};

	timeslide.initSlides = function (wrap) {
		var raw_slides = wrap.find(".slide");

		raw_slides.each(function() {
			try {
				timeslide.loadItem($(this));
			} catch (e) {
				console.log("[ERROR] Error while parsing hevent: " + e);
				console.log($(this));
			}

            $(this).find('.popup').each(function () {
                var more_link = $("<a href='#' class='popout_link'>pop-out &rarr;</a>"),
                    self = this;
                more_link.click(function () {
                    $('#thickbox').empty().append($(self).html()).show()
                });
                $(this).closest('.summary').append(more_link);
                $(this).hide();
            });
			$(this).hide();
		});
	}

	timeslide.nextSlide = function () {
		var p=currentPoint, i=slideIterator;

		i += 1;

		if (typeof(points[currentPoint].slides) == 'undefined') {
			throw "Currently at an invalid slide (" +
				  currentPoint + "). This should never have happened. Sorry.";
		}

		if (i >= points[currentPoint].slides.length) {
			// ran out of slides in the current point
			// check to see if next point exists

			var idx = ordered_pts.indexOf("" + currentPoint) + 1;

			if (idx >= ordered_pts.length) {
				throw "Already at last slide.";
			} else {
				p = ordered_pts[idx];
				i = 0; // first slide there
			}
		}
		return p + '-' + i;
	}

	timeslide.prevSlide = function () {
		var p=currentPoint, i=slideIterator;

		i--;

		if (typeof(points[currentPoint].slides) == 'undefined') {
			throw "Currently at an invalid slide (" +
				  currentPoint + "). This should never have happened. Sorry.";
		}

		if (i < 0) {
			// ran out of slides in the current point
			// check to see if next point exists

			var idx = ordered_pts.indexOf("" + currentPoint) - 1;

			if (idx < 0) {
				throw "Already at first slide.";
			} else {
				p = ordered_pts[idx];
				i = points[p].slides.length - 1; // last slide
			}
		}
		return p + '-' + i;
	}

	timeslide.loadSlide = function(slide) {
		if (!isObj(slide)) throw "Invalid slide: " + slide;
		timeslide.loadPoint(slide.point);

		currentPoint = slide.point;
		slideIterator = Number(slide.id.split('-')[1]);

		$('#headscroll li').removeClass('current');
		$('#headscroll #slide-head-' + slide.id).addClass('current');

		$('#slide-content').anim({opacity: 0.0}, 0.2, 'ease-in', function() {
			$('#slide-content').empty()
				.append(slide.summary).anim({opacity: 1.0}, 0.2, 'ease-out');
		});
	}

	timeslide.msg = function (txt) {
		alert(txt);
	}

	timeslide.loadPoint = function(point) {
		var cur = $('#timeline').attr('data-current'),
			p = points[point];

		if (!isObj(p)) throw "Invalid point: " + point;
		$('#headscroll ul').empty();
		for (i in p.slides) {
			var slide = p.slides[i];

			head = '<li><dl><dt>' + slide.heading + '</dt>';
			head += isStr(slide.subheading) ? '<dd>' + slide.subheading + '</dd>' : '';
			head += '</dl></li>';

			head = $(head).attr('id', 'slide-head-' + slide.id);
			head.click(function () {
				timeslide.goTo($(this).attr('id').replace('slide-head-', ''));
			});
			$('#headscroll ul').append(head);
		}

		if (cur == point) return;
		else timeslide.moveToPoint(point);
	}

	timeslide.goTo = function (id) {
		timeslide.loadSlide(slides[id]);
	}

	timeslide.initView = function () {
		var timelinewrap = $('<div id="timeline-wrap"></div>'),
			timeline = $('<div id="timeline">'
						+ '<div id="timeline-labels"></div>'
					    + '<div id="timeline-lines"></div>'
						+ '</div>');

		timelinewrap.append(timeline);

		var stagewrap  = $('<div id="stage-wrap"></div>'),
			headscroll = $('<div id="headscroll"><ul></ul></div>'),
			content    = $('<div id="slide-content"></div>'),
            thickbox   = $('<div id="thickbox"></div>'),
			head, head_dl, head_dd, head_dt;

        thickbox.click(function () { $(this).hide() });
		$('body').append(stagewrap);
		$('body').append(timelinewrap);

		stagewrap.append(headscroll).append(content).append(thickbox);
	}

	timeslide.initTimeline = function () {
		var pts = [], closest = NaN;

		for (p in points) {
			if (!points.hasOwnProperty(p)) continue;

			pts.push(p);
		}

		pts.sort();

		k = NaN;
		for (p in pts) {
			if (pts[p]-pts[k] > closest) {} else { closest = pts[p]-pts[k]; }

			k=p;
		}

		timelineScale = closest; // pixels
		startPoint = pts[0];

		for (p in pts) {
			var pt = $('<div class="timeline-point-label"></div>'),
				gap = timeslide.getLocationOnTimeline(pts[p]);
			pt.text(points[pts[p]].title);
			pt.attr('id', 'timeline-label' + pts[p]);
			pt.css('left', gap);

			$('#timeline-labels').append(pt);

			var line = $('<div class="timeline-point-line">&nbsp;</div>');
			line.css('width', gap);
			$('#timeline-lines').append(line);
		}

		ordered_pts = pts;

		timeslide.moveToPoint(ordered_pts[0]);
	}

	timeslide.keyDown = function (e) {

		switch (e.which) {
		case 35:
			// end: last slide
			var last_p = ordered_pts[ordered_pts.length - 1],
				last = points[last_p].slides[points[last_p].slides.length - 1];
			timeslide.loadSlide(last);
			break;

		case 36:
			// home: first slide
			timeslide.goTo(ordered_pts[0] + "-0");
			break;

		case 37:
			// left: previous point
			if (currentPoint >= 0) {
				var p = ordered_pts.indexOf("" + currentPoint) - 1;
				if (p >= 0 && p < ordered_pts.length) {
					p = ordered_pts[p];
					timeslide.goTo(p + "-" + (points[p].slides.length - 1));
				}
			}
			break;

		case 38:
			// up: previous slide
			timeslide.goTo(timeslide.prevSlide());
			break;

		case 39:
			// right: next point
			var p = ordered_pts.indexOf("" + currentPoint) + 1;

			if (p > 0 && p < ordered_pts.length) {
				p = ordered_pts[p];
				timeslide.goTo(p + "-0");
			}
			break;

		case 40:
			// down: next slide
			timeslide.goTo(timeslide.nextSlide());
			break;
		}
	}

	timeslide.moveToPoint = function (p) {
		var offset = $('#timeline-wrap').width() * 0.5,
			x = timeslide.getLocationOnTimeline(p);

		if (isNaN(x)) x = 0;

		// animate
		var cur = $('#timeline').attr('data-current');

		try {
			$('#timeline-label' + cur).removeClass('current');
			$('#timeline-label' + p).addClass('current');
			$('#timeline').attr('data-current', p);
		} catch (e) {}

		$('#timeline').anim({translate3d: offset - x + 'px, 0, 0'}, 1, 'ease');
	}

	timeslide.getLocationOnTimeline = function (p) {
		var x = p;
		x -= startPoint;
		x /= timelineScale;
		x *= 300;

		return Math.round(x);
	}

	$(document).ready(function () {
		timeslide.initSlides($(document));
		timeslide.initView();
		timeslide.initTimeline();

		for (slide in slides) {
			timeslide.loadSlide(slides[slide]);
			break;
		}

		$('body').keydown(timeslide.keyDown);
		// XXX: scroll
		console.log(slides);
		console.log(points);
	});

	window.timeslide = timeslide;
	window.slides = slides;
	window.points = points;
	window.ordered_pts = ordered_pts;
})($, document)
