(function () {
	var audex = window.audex;

	// audio parameters
	var block_size = audex.audio.block_size;
	var block_size_inverse = audex.helpers.inverse_memoized(block_size);
	var sample_rate = audex.audio.sample_rate;

    // create buffer for dsp callback
	var buffer_audio = new audex.audio.buffer(2, block_size);
    var buffer_audio_ch_0 = buffer_audio.channel_get(0);
    var buffer_audio_ch_1 = buffer_audio.channel_get(1);

	// dsp parameters
	var frequency = new audex.audio.parameter_dezippered(440.0 / sample_rate);
	var index = new audex.audio.parameter_dezippered(0.2);

	// create oscillator
	var oscillator = new audex.audio.processor.table_oscillator_4('sine', 2048);

    // define transfer functions
    var transfer_functions = {
        'chebyshev_3': {
            'name': 'Chebyshev order 3',
            'f_x': function (x) {
                var f_x = 4 * Math.pow(x, 3) - 3 * x;
                return f_x;
            },
            'domain_min': -1.0,
            'domain_max': 1.0,
            'range_min': -1.0,
            'range_max': 1.0
        }
    };

	// create waveshaper
    var shaper = new audex.audio.processor.table_function_4(transfer_functions.chebyshev_3.f_x, -1.0, 1.0, 2048);
    shaper.table_range_set(-1.0, 1.0);

	// dsp callback
	var sine_wave_gen_direct_process = function (e) {
		var output_buffer = e.outputBuffer.getChannelData(0);

		// render table oscillator
		frequency.value_dezipper_ramp_linear(block_size, buffer_audio_ch_0);
		frequency.value_dezipper_finish();
		oscillator.process(block_size, buffer_audio);

        // generate index ramp
        index.value_dezipper_ramp_linear(block_size, buffer_audio_ch_1);
		index.value_dezipper_finish();

        // apply index
        for (var i = 0; i < block_size; i++) {
            buffer_audio_ch_0[i] *= buffer_audio_ch_1[i];
        }

        // evaluate shaper
        shaper.process(block_size, buffer_audio);

        // output
        for (var i = 0; i < block_size; i++) {
            output_buffer[i] = buffer_audio_ch_0[i];
        }
	};

	// register callback
	audex.audio.add_source('sine_wave_gen_direct', sine_wave_gen_direct_process);

    // shaper display animation callback
    var render_shaper = function (canvas) {
        requestAnimFrame(function () {
            render_shaper(canvas);
        });

        var canvas_ctx = canvas.getContext('2d');
        var canvas_width = canvas.width;
        var canvas_height = canvas.height;
        var canvas_width_half = canvas_width / 2;
        var canvas_height_half = canvas_height / 2;

        canvas_ctx.strokeStyle = 'rgb(0, 0, 0)';
        canvas_ctx.beginPath();
        canvas_ctx.moveTo(canvas_width_half, 0);
        canvas_ctx.lineTo(canvas_width_half, canvas_height);
        canvas_ctx.stroke();

        canvas_ctx.beginPath();
        canvas_ctx.moveTo(0, canvas_height_half);
        canvas_ctx.lineTo(canvas_width, canvas_height_half);
        canvas_ctx.stroke();
    };

	// init ui
	$(document).ready(function () {
		$example_ui = $('div.audio_example#waveshaper');

		// init slider ranges
		var frequency_min = 20.0 / sample_rate;
		var frequency_max = 1000.0 / sample_rate;
		var index_min = 0.0;
		var index_max = 1.0;

        // init waveshaper display
        var shaper_canvas = $example_ui.find('canvas#shaper').first().get(0);
        render_shaper(shaper_canvas);

		// init sin wave frequency slider
		var $slider_frequency = $example_ui.find('input#frequency').first();
		$slider_frequency.attr('min', frequency_min);
		$slider_frequency.attr('max', frequency_max);
		$slider_frequency.attr('step', 0.0001);
		$slider_frequency.attr('value', frequency.value_get());
		$slider_frequency.on('input', function () {
			var $el = $(this);
			var value_new = Number($el.val());
			frequency.value_next_set(value_new);
		});

		// init index slider
		var $slider_index = $example_ui.find('input#index').first()
		$slider_index.attr('min', index_min);
		$slider_index.attr('max', index_max);
		$slider_index.attr('step', 0.01);
		$slider_index.attr('value', index.value_get());
		$slider_index.on('input', function () {
			var $el = $(this);
			var value_new = Number($el.val());
			index.value_next_set(value_new);
		});
	});
})();
