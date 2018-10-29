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
	var index = new audex.audio.parameter_dezippered(0.4);

	// create oscillator
	var oscillator = new audex.audio.processor.table_oscillator_4('sine', 2048);

    // define transfer functions
    var transfer_functions = {
        'chebyshev_0': {
            'name': 'Chebyshev (order 0)',
            'f_x': function (x) {
                var f_x = 1;
                return f_x;
            },
            'domain_min': -1.0,
            'domain_max': 1.0,
            'range_min': -1.0,
            'range_max': 1.0
        },
        'chebyshev_1': {
            'name': 'Chebyshev (order 1)',
            'f_x': function (x) {
                var f_x = x;
                return f_x;
            },
            'domain_min': -1.0,
            'domain_max': 1.0,
            'range_min': -1.0,
            'range_max': 1.0
        },
        'chebyshev_2': {
            'name': 'Chebyshev (order 2)',
            'f_x': function (x) {
                var f_x = 2 * Math.pow(x, 2) - 1;
                return f_x;
            },
            'domain_min': -1.0,
            'domain_max': 1.0,
            'range_min': -1.0,
            'range_max': 1.0
        },
        'chebyshev_3': {
            'name': 'Chebyshev (order 3)',
            'f_x': function (x) {
                var f_x = 4 * Math.pow(x, 3) - 3 * x;
                return f_x;
            },
            'domain_min': -1.0,
            'domain_max': 1.0,
            'range_min': -1.0,
            'range_max': 1.0
        },
        'chebyshev_4': {
            'name': 'Chebyshev (order 4)',
            'f_x': function (x) {
                var f_x = 8 * Math.pow(x, 4) - 8 * Math.pow(x, 2) + 1;
                return f_x;
            },
            'domain_min': -1.0,
            'domain_max': 1.0,
            'range_min': -1.0,
            'range_max': 1.0
        },
        'chebyshev_5': {
            'name': 'Chebyshev (order 5)',
            'f_x': function (x) {
                var f_x = 16 * Math.pow(x, 5) - 20 * Math.pow(x, 3) + 5 * x;
                return f_x;
            },
            'domain_min': -1.0,
            'domain_max': 1.0,
            'range_min': -1.0,
            'range_max': 1.0
        },
        'chebyshev_6': {
            'name': 'Chebyshev (order 6)',
            'f_x': function (x) {
                var f_x = 32 * Math.pow(x, 6) - 48 * Math.pow(x, 4) + 18 * Math.pow(x, 2) - 1;
                return f_x;
            },
            'domain_min': -1.0,
            'domain_max': 1.0,
            'range_min': -1.0,
            'range_max': 1.0
        },
        'chebyshev_7': {
            'name': 'Chebyshev (order 7)',
            'f_x': function (x) {
                var f_x = 64 * Math.pow(x, 7) - 112 * Math.pow(x, 5) + 56 * Math.pow(x, 3) - 7 * x;
                return f_x;
            },
            'domain_min': -1.0,
            'domain_max': 1.0,
            'range_min': -1.0,
            'range_max': 1.0
        }
    };

	// create waveshaper
    var shaper = new audex.audio.processor.table_function_4(transfer_functions.chebyshev_7.f_x, -1.0, 1.0, 2048);
    shaper.table_range_set(-1.0, 1.0);

	// dsp callback
	var wave_shaper_process = function (e) {
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
	audex.audio.add_source('wave_shaper', wave_shaper_process);

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
        var canvas_x_to_shaper_x = audex.helpers.range_map_linear(0, canvas_width - 1, -1.0, 1.0);
        var shaper_y_to_canvas_y = audex.helpers.range_map_linear(-1.0, 1.0, canvas_width - 1, 0);

        canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);

        canvas_ctx.strokeStyle = 'rgb(0, 0, 0)';
        canvas_ctx.beginPath();
        canvas_ctx.moveTo(canvas_width_half, 0);
        canvas_ctx.lineTo(canvas_width_half, canvas_height);
        canvas_ctx.stroke();

        canvas_ctx.beginPath();
        canvas_ctx.moveTo(0, canvas_height_half);
        canvas_ctx.lineTo(canvas_width, canvas_height_half);
        canvas_ctx.stroke();

        canvas_ctx.strokeStyle = 'rgb(255, 0, 0)';
        canvas_ctx.beginPath();
        for (var i = 0; i < canvas_width; i++) {
            var x = (i * canvas_x_to_shaper_x.m) + canvas_x_to_shaper_x.b;
            var y = shaper.f_x(x);
            var y_canvas = (y * shaper_y_to_canvas_y.m) + shaper_y_to_canvas_y.b;
            if (i === 0) {
                canvas_ctx.moveTo(i, y_canvas);
            }
            else {
                canvas_ctx.lineTo(i, y_canvas);
            }
        };
        canvas_ctx.stroke();
    };

	// init ui
	$(document).ready(function () {
		$example_ui = $('div.audio_example#waveshaper');

                var audio_state = false;
                $('#audio_toggle').on('click', function () {
                    console.log('hi');
                    if (audio_state) {
                        $('#audio_toggle').text('Start Audio');
                        audex.audio.context.suspend();
                    } else {
                        $('#audio_toggle').text('Stop Audio');
                        audex.audio.context.resume();
                    }
                    audio_state = !audio_state;
                });

		// init slider ranges
		var frequency_min = 20.0 / sample_rate;
		var frequency_max = 1000.0 / sample_rate;
		var index_min = 0.0;
		var index_max = 1.0;

        // init function selector
        var shaper_function_select = $example_ui.find('select#shaper_function').first();
        $.each(transfer_functions, function (key, value) {
            if (value.f_x === shaper.table_function_get()) {
                shaper_function_select
                    .append($('<option></option>')
                    .attr('value', key)
                    .attr('selected', 'selected')
                    .text(value.name));
            }
            else {
                shaper_function_select
                    .append($('<option></option>')
                    .attr('value', key)
                    .text(value.name));
            }
        });
        shaper_function_select.change(function () {
            var option = $(this);
            var transfer_function = transfer_functions[$(this).val()].f_x;
            shaper.table_function_set(transfer_function);
        });

        // init waveshaper display
        var shaper_canvas = $example_ui.find('canvas#shaper').first().get(0);
        render_shaper(shaper_canvas);

		// init sin wave frequency slider
		var $slider_frequency = $example_ui.find('input#frequency').first();
		$slider_frequency.attr('min', frequency_min);
		$slider_frequency.attr('max', frequency_max);
		$slider_frequency.attr('step', 0.0001);
		$slider_frequency.val(frequency.value_get());
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
		$slider_index.val(index.value_get());
		$slider_index.on('input', function () {
			var $el = $(this);
			var value_new = Number($el.val());
			index.value_next_set(value_new);
		});
	});
})();
