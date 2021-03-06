var ManifoldWindowManager = function(args) {
	var self = this;

	/* The main window manager container - a jQuery object */
	this.container = {};

	/* Hash of our windows */
	this.windows = {};

	/* Defer all public methods until the class is done loading. */
	this.ready = $.Deferred();
	this.loading = $.Deferred();

	/* The manifold stylesheet */
	/* Override this to change the default styles - use any jquery selector */
	this.stylesheet = false;

	/* The styles in that stylesheet */
	this._styles = {};

	/* How often to refresh the styles in ms */
	this.refresh_delay = 300;

	/* Do we really need to re-implement extend? */
	this.extend = function(args) {
		$.extend(this, args);
	}

	/* Initialize the manager */
	this.init = function(args) {
		/* Override our defaults */
		this.extend(args);

		/* Setup our styles */
		this.initStyles();

		/* When we know the styles are loaded, then we can set defaults. */
		this.loading.done(function() {
			self.setDefaults();

			/* When the defaults are set, we're ready. */
			self.ready.resolve();
		});

		this.ready.done(function() {
			self.watch();
		});
	}

	this.setDefaults = function() {
		$('body,html').css(this._styles['.manifold-fullsize']);

		self.container = $('<div id="wm_container"></div>');
		self.container.addClass('manifold-fullsize manifold-default');
		self.container.css(self._styles['.manifold-fullsize']);
		self.container.css(self._styles['.manifold-default']);
		$('body').prepend(self.container);
	}

	/* Load in our helper styles */
	this.initStyles = function() {
		if(!this.stylesheet) {
			$('head').append('<link title="manifoldjs" rel="stylesheet" href="manifold.css"/>');
			this.stylesheet = 'link[title="manifoldjs"]';
		}
		$(this.stylesheet).load(function() {
			/* Read the styles we've gotten */
			self._styles = self.readStyles('manifoldjs');
			/* Resolve Loading */
			self.loading.resolve();
		});
	}

	/* Auxilary function to get baseline style data. */
	/* Reads raw css from the stylesheet and builds a hash
	   of style rules from it. */
	/* This is a little janky. But we do *not* want to rely
	   on CSS classes to make things work here, that would
	   defeat the whole purpose. */
	this.readStyles = function(title) { /* Takes the title of the stylesheet */
		var stylesheet;
		var classes = {};

		var rule_group_matcher = /\{\s*(.*?)\s*\}/;
		var rule_matcher = /^\s*([^:]+?)\s*:\s*(.*?)\s*;?\s*$/;

		for(i = 0; i < document.styleSheets.length; i++) {
			elm = document.styleSheets.item(i);
			if(elm.title == title) {
				stylesheet = elm;
				break;
			}
		}

		if(stylesheet) {
			var temp_classes = stylesheet.rules || stylesheet.cssRules;

			for(var i=0;i<temp_classes.length;i++) {
				var className = temp_classes[i].selectorText;
				classes[className] = {};

				var rule = temp_classes[i].cssText || classes[x].style.cssText;
				rule = rule.match(rule_group_matcher)[1];

				var rules = rule.split(';');
				for(j in rules) {
					matched_rules = rules[j].match(rule_matcher);
					if(matched_rules) {
						classes[className][matched_rules[1]] = matched_rules[2];
					}
				}
			}
		}

		return classes;
	}

	/* Append a window to the manager */
	this.addWindow = function(name, attrs) {
		var mwindow = new ManifoldWindow(self, name, attrs);
		self.windows[name] = mwindow;

		/* When the manager is ready and the window is ready,
		   append the window to the manager. */
		$.when(this.ready, mwindow.ready).done(function() {
			if(mwindow.view.parent().length == 0) {
				self.container.append(mwindow.view);
			}
		});

		return mwindow;
	}

	this.watch = function() {
		// Make sure that anything that's top and bottom bound sticks to the
		// actual body size.  We bind the container to the document size.
		// We don't want the height of the container to influence the
		// calculation of the document height, so we set it to zero first.
		self.container.height( 0 ).height( $(document).height() );

		for(name in self.windows) {
			self.windows[name].update();
		}

		setTimeout(self.watch, self.refresh_delay);
	}

	/* Setup */
	this.init(args);
}
var MWM = ManifoldWindowManager;

var ManifoldWindow = function(wm, name, attrs) {
	var self = this;
	this.name = name;

	/* Window Manager */
	this.wm = wm;
	/* The jQuery object for the window */
	this.view = {};

	/* Our ready state */
	this.ready = $.Deferred();

	/* Setup the base parameters */
	this.init = function(name, attrs) {
		this.view = $('<section></section>');

		this.view.attr('id', name);

		/* When the manager is ready, we know we have our styles */
		this.wm.ready.done(function() {
			/* Set our styles */
			self._styles = self.wm._styles;
			self.doStyles(attrs);
		});

		return this.view;
	}

	/* Decorate our window */
	this.doStyles = function(attrs) {
		this.view.css(this._styles['.manifold-default']);

		for(key in attrs) {
			if(this._styles['.manifold-'+key]) {
				this.view.addClass('manifold-'+key);
				if(attrs[key] === true) {
					console.log(self.name, self.view.css('top'));
					this.view.css(this._styles['.manifold-'+key]);;
				}
			}
		}

		if(attrs['attach-top'] && attrs['attach-top'] !== true) {
			if(attrs['attach-top'] instanceof ManifoldWindow) {
				attrs['attach-top'].ready.done( function() {
					var top = attrs['attach-top'].view.outerHeight(true) +
						parseInt(attrs['attach-top'].view.css('top'));
					self.view.css('top', top+'px');
				});
			}
		}
		if(attrs['attach-bottom'] && attrs['attach-bottom'] !== true) {
			if(attrs['attach-bottom'] instanceof ManifoldWindow) {
				attrs['attach-bottom'].ready.done( function() {
					var bottom = attrs['attach-bottom'].view.outerHeight(true) +
						parseInt(attrs['attach-bottom'].view.css('bottom'));
					self.view.css('bottom', bottom+'px');
				});
			}
		}
		if(attrs['attach-left'] && attrs['attach-left'] !== true) {				/* Fix me */
			if(attrs['attach-left'] instanceof ManifoldWindow) {
				attrs['attach-left'].ready.done( function() {
					var left = attrs['attach-left'].view.outerWidth(true) +
						parseInt(attrs['attach-left'].view.css('left'));
					self.view.css('left', left+'px');
				});
			}
		}
		if(attrs['attach-right'] && attrs['attach-right'] !== true) {				/* Fix me */
			if(attrs['attach-right'] instanceof ManifoldWindow) {
				attrs['attach-right'].ready.done( function() {
					var right = attrs['attach-right'].view.outerWidth(true) +
						parseInt(attrs['attach-right'].view.css('right'));
					self.view.css('right', right+'px');
				});
			}
		}

		if(attrs['width']) {
			this.view.css('width', attrs['width']);
		}
		if(attrs['height']) {
			this.view.css('height', attrs['height']);
		}

		/* Once all the styles are done, we're ready. */
		this.ready.resolve();
	}

	/* Append content to the window */
	this.append = function(content) {
		/* We allow content to be appended even though we may not be ready */
		this.view.append(content);
	}

	this._get_window = function(name) {
		return this.wm.windows[name];
	}

	this.update = function() {
		// Put your updates here.
	}

	/* Setup */
	this.init(name, attrs);

	return this;
}