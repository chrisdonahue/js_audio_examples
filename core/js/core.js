(function () {
	/*
		configure js libs
	*/

	/*
		define our namespace
	*/

	var audex = {};
	window.audex = window.audex || audex;

	/*
		init audio
	*/

	audex.audio = {};

	// shim web audio API
	var audio_ctx = null;
	var audio_enabled = false;
	try {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		audio_ctx = new AudioContext();
		audio_enabled = audio_ctx !== null;
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

	// add callback for audio processors
	var audio_processors = {};
	var audio_processor_block_size = 1024;
	var audio_processor_input_num_channels = 1;
	var audio_processor_output_num_channels = 1;
	audex.audio.add_source = function (source_name, process_callback) {
		if (audio_enabled) {
			try {
				var source_new = audio_ctx.createScriptProcessor(audio_processor_block_size, audio_processor_input_num_channels, audio_processor_output_num_channels);
				source_new.onaudioprocess = process_callback;
				audio_processors[source_name] = source_new;
				source_new.connect(audio_analyser_pre_gain);
			} catch (e) {
				throw e;
			}
		}
	};
	audex.audio.ctx = audio_ctx;
	audex.audio.block_size = audio_processor_block_size;
	audex.audio.sample_rate = audio_ctx.sampleRate;

	/*
		helper functions
	*/

	audex.helpers = {};

	audex.helpers.range_map_linear = function (w, x, y, z) {
		var m = (z - y) / (x - w);

		return {
			'm': m,
			'b': (y - (w * m))
		};
	};

	var inverse_memoize = {};
	audex.helpers.inverse_memoized = function (x) {
		if (x in inverse_memoize) {
			return inverse_memoize[x];
		}

		var inverse = 1.0 / x;
		inverse_memoize[x] = inverse;
		
		return inverse;
	};

	var audex.helpers.positive_power_of_two_test = function (x) {
		return typeof x === 'number' && (x > 0) && ((x & (x - 1)) == 0);
	};

	/*
		helper classes
	*/

	// buffer

	var buffer = function (channels_num, length) {
		this.channels_num = channels_num;
		this.length = length;
		this.data = {};

		// allocate buffer
		for (var i = 0; i < this.channels_num; i++) {
			this.data[i] = new Float32Array(this.length);
		}
	};

	buffer.prototype.channel_get = function (channel_num) {
		if (channel_num < 0 || channel_num >= this.channels_num) {
			throw 'audex.audio.buffer: Requested invalid channel number (' + channel_num + ')';
		}

		return this.data[channel_num];
	};

	buffer.prototype.length_get = function () {
		return this.length;
	};

	buffer.prototype.channels_num_get = function () {
		return this.channels_num;
	};

	audex.audio.buffer = buffer;

	// processor
	
	var processor = function (inputs_num, outputs_num) {
		this.inputs_num = inputs_num;
		this.outputs_num = outputs_num;
	};

	processor.prototype.prepare = function (sample_rate, buffer_length) {
	};

	processor.prototype.process = function (buffer_length, buffer) {
	};

	audex.audio.processor = {};
	audex.audio.processor.base = processor;

	// parameter

	var parameter = function (value_initial) {
		this.value = value_initial;
	};

	parameter.prototype.value_get = function () {
		return this.value;
	};

	parameter.prototype.value_next_get = function () {
		return this.value;
	};

	parameter.prototype.value_next_set = function (value_next_new) {
		this.value = value_next_new;
	};

	audex.audio.parameter = parameter;

	// parameter dezippered

	var parameter_dezippered = function (value_initial) {
		parameter.call(this, arguments);

		this.value_next = value_initial;
		this.epsilon = 1e-10;
	};

	parameter_dezippered.prototype = Object.create(parameter.prototype)
	parameter_dezippered.prototype.constructor = parameter_dezippered;

	parameter_dezippered.prototype.value_next_get = function () {
		return this.value_next;
	};

	parameter_dezippered.prototype.value_next_set = function (value_next_new) {
		this.value_next = value_next_new;
	};

	parameter_dezippered.prototype.value_dezipper_start = function (block_size_inverse) {
		var value_next_differs = false;
		var value_current = this.value;
		var value_increment = 0.0;

		if (this.value_next !== this.value) {
			value_next_differs = true;
			value_increment = block_size_inverse * (this.value_next - this.value);
		}

		return {
			'value_next_differs': value_next_differs,
			'value_current': value_current,
			'value_increment': value_increment
		};
	};

	parameter_dezippered.prototype.value_dezipper_finish = function () {
		this.value = this.value_next;
	};

	audex.audio.parameter_dezippered = parameter_dezippered;

	/*
		initialize canvas analyser
	*/

	// Shim by Paul Irish
	// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	window.requestAnimFrame = (function () {
	  return  window.requestAnimationFrame ||
			  window.webkitRequestAnimationFrame ||
			  window.mozRequestAnimationFrame ||
			  window.oRequestAnimationFrame ||
			  window.msRequestAnimationFrame ||
			  function (callback) {
				  window.setTimeout(callback, 1000 / 60);
			  };
	})();

	var render_oscilloscope = function (canvas, analyser) {
		var canvas_ctx = canvas.getContext('2d');
		var canvas_width = canvas.width;
		var canvas_height = canvas.height;

		requestAnimFrame(function () {
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

			canvas_ctx.fillStyle = 'rgb(0,' + (barHeight+100) + ',0)';
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

		// init gain slider ranges
		var gain_min = 0;
		var gain_max = 100;

		// init pre-analyser gain slider
		var $slider_audio_analyser_pre_gain = $audio_controls.find('input#audio_analyser_gain_pre').first();
		$slider_audio_analyser_pre_gain.attr('min', gain_min);
		$slider_audio_analyser_pre_gain.attr('max', gain_max);
		$slider_audio_analyser_pre_gain.attr('value', 100);
		$slider_audio_analyser_pre_gain.on('input', function () {
			var $el = $(this);
			var value_new = Number($el.val());
			value_new = value_new / gain_max;
			value_new = value_new * value_new;
			audio_analyser_pre_gain.gain.value = value_new;
		});

		// init gain slider
		var $slider_audio_out_gain = $audio_controls.find('input#audio_out_gain').first();
		$slider_audio_out_gain.attr('min', gain_min);
		$slider_audio_out_gain.attr('max', gain_max);
		$slider_audio_out_gain.attr('value', 67);
		$slider_audio_out_gain.on('input', function () {
			var $el = $(this);
			var value_new = Number($el.val());
			value_new = value_new / gain_max;
			value_new = value_new * value_new;
			audio_out_gain.gain.value = value_new;
		});
	});
})();
