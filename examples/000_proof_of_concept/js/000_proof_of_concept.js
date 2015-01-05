(function () {
	// init audio processing
	var time = 0.0;

	var block_size = window.core.audio.block_size;
	var sample_rate = window.core.audio.sample_rate;

	var frequency = 440.0;

	var sine_wave_gen_direct_process = function(e) {
		var buffer_output = e.outputBuffer.getChannelData(0);
		var num_samples_remaining = block_size;
		var num_samples_processed = 0;
		var time_increment = 1.0 / sample_rate;
		
		while (num_samples_remaining) {
			buffer_output[num_samples_processed] = Math.sin(2.0 * Math.PI * frequency * time);
			time += time_increment;

			num_samples_processed++;
			num_samples_remaining--;
		}
	};

	window.core.audio.add_source('sine_wave_gen_direct', sine_wave_gen_direct_process);

	// init ui
	$(document).ready(function () {
		// init gain slider ranges
		var frequency_min = 0.0;
		var frequency_max = sample_rate / 2.0;

		// init pre-analyser gain slider
		var $slider_frequency = $('div.audio_example#sin_wave_formulaic').find('input#frequency').first();
		console.log($slider_frequency);
		$slider_frequency.attr('min', frequency_min);
		$slider_frequency.attr('max', frequency_max);
		$slider_frequency.attr('value', frequency);
		$slider_frequency.on('input', function () {
			var $el = $(this);
			var value_new = Number($el.val());
			frequency = value_new;
			console.log(frequency);
		});
	});
})();