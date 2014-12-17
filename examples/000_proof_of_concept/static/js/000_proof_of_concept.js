(function () {
	var time = 0.0;

	var block_size = window.core.audio.block_size;
	var sample_rate = window.core.audio.sample_rate;

	var sine_wave_gen_direct_process = function(e) {
		var buffer_output = e.outputBuffer.getChannelData(0);
		var num_samples_remaining = block_size;
		var num_samples_processed = 0;
		var time_increment = 1.0 / sample_rate;
		
		while (num_samples_remaining) {
			buffer_output[num_samples_processed] = Math.sin(2.0 * Math.PI * 440.0 * time);
			time += time_increment;

			num_samples_processed++;
			num_samples_remaining--;
		}
	};

	window.core.audio.add_source('sine_wave_gen_direct', sine_wave_gen_direct_process);
})();