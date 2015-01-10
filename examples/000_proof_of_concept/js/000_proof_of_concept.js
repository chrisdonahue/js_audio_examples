(function () {
	var audex = window.audex;

	// audio parameters
	var block_size = audex.audio.block_size;
	var block_size_inverse = audex.helpers.inverse_memoized(block_size);
	var sample_rate = audex.audio.sample_rate;

	// dsp parameters
	var frequency = new audex.audio.parameter_dezippered(440.0 / sample_rate);
	var index = new audex.audio.parameter_dezippered(0.2);

	// init state
	var shaper_buffer_size = 2048;
	var shaper_index_to_audio = audex.helpers.range_map_linear(1, shaper_buffer_size, -1.0, 1.0);
	var audio_to_shaper_index = audex.helpers.range_map_linear(-1.0, 1.0, 1, shaper_buffer_size);
    shaper_buffer_size += 3; // add 3 for interpolation purposes

    // allocate and fill wave shaper
	var shaper_buffer = new Float32Array(shaper_buffer_size);
	for (var i = 0; i < shaper_buffer_size; i++) {
		var x = (i * shaper_index_to_audio.m) + shaper_index_to_audio.b;
		var y = 4 * Math.pow(x, 3) - 3 * x;
		shaper_buffer[i] = y;
	}

	// allocate oscillator
	var oscillator = new audex.audio.processor.table_oscillator('sine', 2048);
	var oscillator_buffer = new audex.audio.buffer(1, block_size);
	var oscillator_buffer_data = oscillator_buffer.channel_get(0);

	// dsp callback
	var sine_wave_gen_direct_process = function (e) {
		var output_buffer = e.outputBuffer.getChannelData(0);

		// set up
		var num_samples_remaining = block_size;
		var num_samples_processed = 0;

		// render table oscillator
		frequency.value_dezipper_ramp_linear(block_size, oscillator_buffer_data);
		oscillator.process(block_size, oscillator_buffer);
		frequency.value_dezipper_finish();

		// set up index dezippering
		var index_dezipper = index.value_dezipper_start(block_size_inverse);
		
		// waveshaper
		while (num_samples_remaining) {
            // calculate sin wave value
			var input_value = oscillator_buffer_data[num_samples_processed];

            // apply index
			input_value *= index_dezipper.value_current;

            // calculate table offset
            var offset_f = (input_value * audio_to_shaper_index.m) + audio_to_shaper_index.b;

            // stolen from d_array.c of pure data (tabread4~ code)
            var offset = Math.floor(offset_f);
            var frac = offset_f - offset;
            var a = shaper_buffer[offset - 1];
            var b = shaper_buffer[offset];
            var c = shaper_buffer[offset + 1];
            var d = shaper_buffer[offset + 2];
            var cminusb = c - b;
            var output = b + frac * (
                cminusb - 0.1666667 * (1.0 - frac) * (
                    (d - a - 3.0 * cminusb) * frac + (d + 2.0 * a - 3.0 * b)
                )
            );

            // hard clip to get rid of edge rounding error
			if (output > 1.0) {
				output = 1.0;
			}
			else if (output < -1.0) {
				output = -1.0;
			}

            // store output value
			output_buffer[num_samples_processed] = output;

            // dezipper parameters
			if (index_dezipper.value_next_differs) {
				index_dezipper.value_current += index_dezipper.value_increment;
			}

            // record amount processed
			num_samples_processed++;
			num_samples_remaining--;
		}

		index.value_dezipper_finish();
	};

	// register callback
	audex.audio.add_source('sine_wave_gen_direct', sine_wave_gen_direct_process);

	// init ui
	$(document).ready(function () {
		$example_ui = $('div.audio_example#waveshaper');

		// init slider ranges
		var frequency_min = 20.0 / sample_rate;
		var frequency_max = 1000.0 / sample_rate;
		var index_min = 0.0;
		var index_max = 1.0;

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
