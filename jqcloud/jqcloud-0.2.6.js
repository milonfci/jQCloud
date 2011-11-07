/*!
 * jQCloud Plugin for jQuery
 *
 * Version 0.2.6
 *
 * Copyright 2011, Luca Ongaro
 * Licensed under the MIT license.
 *
 * Date: Mon Nov 07 21:39:07 +0100 2011
*/ 

(function( $ ) {
  "use strict";
  $.fn.jQCloud = function(word_array, options) {
    // Reference to the container element
    var $this = this;
    // Reference to the ID of the container element
    var container_id = $this.attr('id');

    // Default options value
    var default_options = {
      width: $this.width(),
      height: $this.height(),
      center: {
        x: $this.width() / 2.0,
        y: $this.height() / 2.0
      },
      delayedMode: word_array.length > 50,
      randomClasses: 0,
      nofollow: false
    };

    // Maintain backward compatibility with old API (pre 0.2.0), where the second argument of jQCloud was a callback function
    if (typeof options === 'function') {
      options = { callback: options };
    }

    options = $.extend(default_options, options || {});

    // Add the "jqcloud" class to the container for easy CSS styling
    $this.addClass("jqcloud");

    var drawWordCloud = function() {
      // Helper function to test if an element overlaps others
      var hitTest = function(elem, other_elems){
        // Pairwise overlap detection
        var overlapping = function(a, b){
          if (Math.abs(2.0*a.offsetLeft + a.offsetWidth - 2.0*b.offsetLeft - b.offsetWidth) < a.offsetWidth + b.offsetWidth) {
            if (Math.abs(2.0*a.offsetTop + a.offsetHeight - 2.0*b.offsetTop - b.offsetHeight) < a.offsetHeight + b.offsetHeight) {
              return true;
            }
          }
          return false;
        };
        var i = 0;
        // Check elements for overlap one by one, stop and return false as soon as an overlap is found
        for(i = 0; i < other_elems.length; i++) {
          if (overlapping(elem, other_elems[i])) {
            return true;
          }
        }
        return false;
      };

      // Make sure every weight is a number before sorting
      for (var i = 0; i < word_array.length; i++) {
        word_array[i].weight = parseFloat(word_array[i].weight, 10);
      }
      
      // Sort word_array from the word with the highest weight to the one with the lowest
      word_array.sort(function(a, b) { if (a.weight < b.weight) {return 1;} else if (a.weight > b.weight) {return -1;} else {return 0;} });

      var step = 2.0;
      var already_placed_words = [];
      var aspect_ratio = options.width / options.height;

      // Function to draw a word, by moving it in spiral until it finds a suitable empty place. This will be iterated on each word.
      var drawOneWord = function(index, word) {
        // Define the ID attribute of the span that will wrap the word, and the associated jQuery selector string
        var word_id = container_id + "_word_" + index,
            word_selector = "#" + word_id,

            // If the option randomClasses is a number, and higher than 0, assign this word randomly to a class
            // of the kind 'r1', 'r2', 'rN' with N = randomClasses
            // If option randomClasses is an array, assign this word randomly to one of the classes in the array
            random_class = (typeof options.randomClasses === "number" && options.randomClasses > 0) ?
          " r" + Math.ceil(Math.random()*options.randomClasses) :
          (($.isArray(options.randomClasses) && options.randomClasses.length > 0) ?
            " " + options.randomClasses[ Math.floor(Math.random()*options.randomClasses.length) ] :
            ""),

            angle = 6.28 * Math.random(),
            radius = 0.0,

            // Linearly map the original weight to a discrete scale from 1 to 10
            weight = Math.round((word.weight - word_array[word_array.length - 1].weight)/(word_array[0].weight - word_array[word_array.length - 1].weight) * 9.0) + 1,

            word_span = $('<span>').attr('id',word_id).attr('class','w' + weight).addClass(random_class).attr('title', word.title || word.text || ''),
            inner_html;

        // Append link if word.url attribute was set
        if (!!word.url) {
          inner_html = $('<a>').attr('href', encodeURI(word.url).replace(/'/g, "%27")).text(word.text);
          // If nofollow: true set rel='nofollow'
          if (!!options.nofollow) {
            inner_html.attr("rel", "nofollow");
          }
        } else {
          inner_html = word.text;
        }
        word_span.append(inner_html);

        // Bind handlers to words
        if (!!word.handlers) {
          for (var prop in word.handlers) {
            if (word.handlers.hasOwnProperty(prop) && typeof word.handlers[prop] === 'function') {
              $(word_span).bind(prop, word.handlers[prop]);
            }
          }
        }

        $this.append(word_span);

        var width = word_span.width(),
            height = word_span.height(),
            left = options.center.x - width / 2.0,
            top = options.center.y - height / 2.0;

        // Save a reference to the style property, for better performance
        var word_style = word_span[0].style;
        word_style.position = "absolute";
        word_style.left = left + "px";
        word_style.top = top + "px";

        while(hitTest(document.getElementById(word_id), already_placed_words)) {
          radius += step;
          angle += (index % 2 === 0 ? 1 : -1)*step;

          left = options.center.x - (width / 2.0) + (radius*Math.cos(angle)) * aspect_ratio;
          top = options.center.y + radius*Math.sin(angle) - (height / 2.0);

          word_style.left = left + "px";
          word_style.top = top + "px";
        }
        already_placed_words.push(document.getElementById(word_id));

        // Invoke callback if existing
        if (typeof word.callback === "function") {
          word.callback.call(word_span);
        }
      };

      var drawOneWordDelayed = function(index) {
        index = index || 0;
        if (index < word_array.length) {
          drawOneWord(index, word_array[index]);
          setTimeout(function(){drawOneWordDelayed(index + 1);}, 10);
        } else {
          if (typeof options.callback === 'function') {
            options.callback.call(this);
          }
        }
      };

      // Iterate drawOneWord on every word. The way the iteration is done depends on the drawing mode (delayedMode is true or false)
      if (options.delayedMode || options.delayed_mode){
        drawOneWordDelayed();
      }
      else {
        $.each(word_array, drawOneWord);
        if (typeof options.callback === 'function') {
          options.callback.call(this);
        }
      }
    };

    // Delay execution so that the browser can render the page before the computatively intensive word cloud drawing
    setTimeout(function(){drawWordCloud();}, 10);
    return this;
  };
})(jQuery);
