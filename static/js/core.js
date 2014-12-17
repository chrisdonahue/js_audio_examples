(function () {
	/*
		configure js libs
	*/

	/*
		initialize audio
	*/

	// define namespace
	window.core = window.core || {};
	window.core.audio = window.core.audio || {};

	// init web audio
	var audio_ctx = null;
	var audio_ctx_enabled = false;
	try {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		audio_ctx = new AudioContext();
		audio_ctx_enabled = audio_ctx !== null;
	} catch (e) {
		alert("Webkit Audio API not supported on this browser");
	}

	// create master gain node
	var audio_gain_node = audio_ctx.createGain();
	audio_gain_node.connect(audio_ctx.destination);

	// store in window.core.audio
	var audio_processors = {};
	var audio_processor_block_size = 1024;
	var audio_processor_input_num_channels = 1;
	var audio_processor_output_num_channels = 1;
	window.core.audio.add_source = function (source_name, process_callback) {
		if (audio_ctx_enabled) {
			try {
				var source_new = audio_ctx.createScriptProcessor(audio_processor_block_size, audio_processor_input_num_channels, audio_processor_output_num_channels);
				source_new.onaudioprocess = process_callback;
				audio_processors[source_name] = source_new;
				source_new.connect(audio_gain_node);
			} catch (e) {
				throw e;
			}
		}
	};
	window.core.audio.block_size = audio_processor_block_size;
	window.core.audio.sample_rate = audio_ctx.sampleRate;

	/*
		document ready callback
	*/

	$(document).ready(function () {
		// render latex
		$('span.latex').each(function (index) {
			var $el = $(this);
			$el.html(katex.renderToString($el.html()));
		});

		// link references
		var references = $('section#references ul li');
		references.each(function (index) {
			var $el = $(this);
			index = index + 1;
			var id = 'reference_' + String(index);
			$el.attr('id', id);
		});
		$('span.citation').each(function (index) {
			var $el = $(this);
			var index_reference = Number($el.attr('reference'));
			var index_reference_user = index_reference + 1;
			var index_reference_user_string = String(index_reference_user);
			$el.html('<a href="#reference_' + index_reference_user_string + '">[' + index_reference_user_string + ']</a>');
		});

		// init gain slider
		var gain_min = 0;
		var gain_max = 100;
		var gain_initial = 75;
		var slider_gain = $('div#audio_controls input#gain');
		slider_gain.attr('min', gain_min);
		slider_gain.attr('max', gain_max);
		slider_gain.attr('value', gain_initial);
		slider_gain.on('input', function () {
			var $el = $(this);
			var value_new = Number($el.val());
			value_new = value_new / gain_max;
			value_new = value_new * value_new;
			audio_gain_node.gain.value = value_new;
		});
	});
})();