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
	var audio_out_gain = audio_ctx.createGain();
	audio_out_gain.connect(audio_ctx.destination);

	// create analyser
	var audio_analyser = audio_ctx.createAnalyser();
	audio_analyser.fftSize = 256;
	var audio_analyser_buffer = new Uint8Array(256);
	audio_analyser.connect(audio_out_gain);

	// create master gain node
	var audio_analyser_pre_gain = audio_ctx.createGain();
	audio_analyser_pre_gain.connect(audio_analyser);

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
				source_new.connect(audio_analyser_in_gain);
			} catch (e) {
				throw e;
			}
		}
	};
	window.core.audio.block_size = audio_processor_block_size;
	window.core.audio.sample_rate = audio_ctx.sampleRate;

	/*
		initialize canvas analyser
	*/

	// Shim by Paul Irish
	// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	window.requestAnimFrame = (function() {
	  return  window.requestAnimationFrame ||
			  window.webkitRequestAnimationFrame ||
			  window.mozRequestAnimationFrame ||
			  window.oRequestAnimationFrame ||
			  window.msRequestAnimationFrame ||
			  function(callback) {
				  window.setTimeout(callback, 1000 / 60);
			  };
	})();

	var render_oscilloscope = function(canvas, analyser) {
		var canvas_ctx = canvas.getContext('2d');
		var canvas_width = canvas.width;
		var canvas_height = canvas.height;

		requestAnimFrame(function(){
			render_oscilloscope(canvas, analyser);
		});
		
		analyser.getByteFrequencyData(audio_analyser_buffer);

		var fft_num_bins = analyser.frequencyBinCount;

		canvas_ctx.fillStyle = 'rgb(0, 0, 0)';
		canvas_ctx.fillRect(0, 0, canvas_width, canvas_height);

		var barWidth = (canvas_width / fft_num_bins) * 2.5;
		var barHeight;
		var x = 0;

		for(var i = 0; i < fft_num_bins; i++) {
			barHeight = audio_analyser_buffer[i];

			canvas_ctx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
			canvas_ctx.fillRect(x,canvas_height-barHeight/2,barWidth,barHeight/2);

			x += barWidth + 1;
		}

		/*
		canvas_ctx.clearRect(0, 0, canvas.width, canvas.height);
		canvas_ctx.fillStyle = "red"
		canvas_ctx.fillRect(0, 0, canvas.width, canvas.height);
		*/
	}

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

		// init global controls
		var $audio_controls = $('div#audio_controls');

		// init oscilloscope
		var canvas_oscilloscope = $audio_controls.find('canvas#oscilloscope').first().get(0);
		var canvas_oscilloscope_ctx = canvas_oscilloscope.getContext('2d');
		render_oscilloscope(canvas_oscilloscope, audio_analyser);

		// init pre-analyser gain slider
		var gain_min = 0;
		var gain_max = 100;
		var $slider_analyser_pre_gain = $audio_controls.find('input#output_gain').first();
		$slider_gain.attr('min', gain_min);
		$slider_gain.attr('max', gain_max);
		$slider_gain.attr('value', gain_initial);
		$slider_gain.on('input', function () {
			var $el = $(this);
			var value_new = Number($el.val());
			value_new = value_new / gain_max;
			value_new = value_new * value_new;
			audio_out_gain.gain.value = value_new;
		});

		// init gain slider
		var $slider_gain = $audio_controls.find('input#output_gain').first();
		$slider_gain.attr('min', gain_min);
		$slider_gain.attr('max', gain_max);
		$slider_gain.attr('value', gain_initial);
		$slider_gain.on('input', function () {
			var $el = $(this);
			var value_new = Number($el.val());
			value_new = value_new / gain_max;
			value_new = value_new * value_new;
			audio_out_gain.gain.value = value_new;
		});
	});
})();