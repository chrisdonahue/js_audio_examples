(function (audex) {
	// create convenience reference to base object
	var processor = audex.audio.processor.base;

	// constructor
	var table_oscillator = function (type, table_length) {
		processor.call(this, 1, 1);

		this.table_length = -1;
		this.table_mask = -1;
		this.table = null;
		this.phase = 0.0;

		if (type !== undefined) {
			table_length = table_length || 1024;
			this.set_table(table_length, table_generate(type, table_length));
		}
	};
	
	// inherit
	table_oscillator.prototype = Object.create(processor.prototype);
	table_oscillator.prototype.constructor = table_oscillator;

	// overrides
	table_oscillator.prototype.prepare = function (sample_rate, buffer_length) {
		this.phase = 0.0;
	};

	table_oscillator.prototype.process = function (buffer_length, buffer) {
		if (this.table == null) {
			throw 'audex.audio.processor.table_oscillator: No table assigned';
		}

		var frequency = buffer.channel_get(0);
		var output = buffer.channel_get(0);

		var table_length = this.table_length;
		var table_mask = this.table_mask;
		var table = this.table;
		var phase = this.phase;

		var frequency_current;
		var phase_increment;
		var phase_truncated;
		var fraction;
		var inm1;
		var in0;
		var inp1;
		var inp2;

		/*
		if (this.phase === 0.0) {
			console.log(frequency);
			console.log(table);
		}
		*/

		for (var i = 0; i < buffer_length; i++) {
			// find current frequency
			frequency_current = frequency[i];

			// calculate phase increment
			phase_increment = frequency_current * table_length;

			// truncate phase
			phase_truncated = Math.floor(phase);

			// calculate fractional position
			fraction = phase - phase_truncated;

			// calculate table offset
			inm1 = table[(phase_truncated - 1) & table_mask];
			in0 = table[phase_truncated & table_mask];
			inp1 = table[(phase_truncated + 1) & table_mask];
			inp2 = table[(phase_truncated + 2) & table_mask];

			// calculate output
			output[i] = in0 + 0.5 * fraction * (inp1 - inm1 + 
				fraction * (4.0 * inp1 + 2.0 * inm1 - 5.0 * in0 - inp2 +
				fraction * (3.0 * (in0 - inp1) - inm1 + inp2)));

			/*
			if (this.phase === 0.0) {
				console.log(phase);
				console.log(phase_increment);
				console.log(phase_truncated);
				console.log(fraction);
				console.log(inm1);
				console.log(in0);
				console.log(inp1);
				console.log(inp2);
				console.log('-------');
			}
			*/

			// add phase increment
			phase += phase_increment;
		}

		/*
		if (this.phase === 0.0) {
			console.log(output);
		}
		*/

		// prevent phase from overflowing
		while (phase > table_length) {
			phase = phase - table_length;
		}
		while (phase < 0.0) {
			phase = phase + table_length;
		}

		// store phase
		this.phase = phase;
	};

	// public methods
	table_oscillator.prototype.set_table = function (table_length, table) {
		positive_power_of_two_test(table_length);

		this.table_length = table_length;
		this.table_mask = table_length - 1;
		this.table = table;
	};

	// private methods
	var table_generate = function (type, length) {
		var table = (new audex.audio.buffer(1, length)).channel_get(0);
		switch(type) {
			case 'sine':
				for (var i = 0; i < length; i++) {
					table[i] = Math.sin(2.0 * Math.PI * (i / length));
				}
				break;
			default:
				throw 'audex.audio.processor.table_oscillator: Invalid table type (' + String(type) + ') specified';
		}
		return table;
	};

	var positive_power_of_two_test = function (x) {
		if (!(audex.helpers.positive_power_of_two_test(x))) {
			throw 'audex.audio.processor.table_oscillator: Table length specified (' + String(x) + ') is not a positive power of two';
		}
	};

	// add to namespace
	audex.audio.processor.table_oscillator = table_oscillator;
}) (window.audex);
