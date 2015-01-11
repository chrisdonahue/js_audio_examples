(function (audex) {
	// create convenience reference to base object
	var processor = audex.audio.processor.base;

	// constructor
	var table_function_4 = function (table_length, table_function, table_domain_min, table_domain_max) {
		processor.call(this, 1, 1);

        table_render.bind(this);

		this.table_length = -1;
        this.table_length_internal = -1;
        this.table = null;
		this.table_function = null;
        this.table_domain_min = Infinity;
        this.table_domain_max = -Infinity;
        this.table_range_min = Infinity;
        this.table_range_max = -Infinity;
        this.table_index_to_domain = null;
        this.table_domain_to_index = null;

		if (table_length !== undefined && table _function !== undefined && table_domain_min !== undefined && table_domain_max !== undefined) {
			this.table_length = table_length;
            this.table_length_internal = table_length + 3;
            this.table_function = table_function;
            this.table_domain_min = table_domain_min;
            this.table_domain_max = table_domain_max;

            table_render();
		}
	};
	
	// inherit
	table_function_4.prototype = Object.create(processor.prototype);
	table_function_4.prototype.constructor = table_function_4;

	// overrides
	table_function_4.prototype.prepare = function (sample_rate, buffer_length) {
	};

	table_function_4.prototype.process = function (buffer_length, buffer) {
		if (this.table == null) {
			throw 'audex.audio.processor.table_function_4: No table assigned';
		}

		var input = buffer.channel_get(0);
		var output = buffer.channel_get(0);

		var table_length = this.table_length;
		var table = this.table;

        var table_domain_min = this.table_domain_min;
        var table_domain_max = this.table_domain_max;
        var table_range_min = this.table_range_min;
        var table_range_max = this.table_range_max;

		for (var i = 0; i < buffer_length; i++) {
			// find current input
			input_current = input[i];

            // hard clip input
            if (input_current < table_range_min) {
                input_current = table_range_min;
            }
            else if (input_current > table_range_max) {
                input_current = table_range_max;
            }
            
            // translate input to float offset
            var offset_f = (input_value * this.table_domain_to_index.m) + this.table_domain_to_index.b;

            // stolen from d_array.c of pure data (tabread4~ code)
            var offset = Math.floor(offset_f);
            var frac = offset_f - offset;
            var a = shaper_buffer[offset - 1];
            var b = shaper_buffer[offset];
            var c = shaper_buffer[offset + 1];
            var d = shaper_buffer[offset + 2];
            var cminusb = c - b;
            var output_current = b + frac * (
                cminusb - 0.1666667 * (1.0 - frac) * (
                    (d - a - 3.0 * cminusb) * frac + (d + 2.0 * a - 3.0 * b)
                )
            );

            // hard clip output_current to get rid of edge rounding error
            if (output_current < table_range_min) {
                output_current = table_range_min;
            }
            else if (output_current > table_range_max) {
                output_current = table_range_max;
            }

            // set output
            output[i] = output_current;
		}
	};

	// public methods
	table_function_4.prototype.table_length_set = function (table_length) {
        this.table_length = table_length;
        table_render();
	};

    table_function_4.prototype.table_domain_set = function (table_domain_min, table_domain_max) {
        this.table_domain_min = table_domain_min;
        this.table_domain_max = table_domain_max;
        table_render();
    };

    table_function_4.prototype.table_range_set = function (table_range_min, table_range_max) {
        this.table_range_min = table_range_min;
        this.table_range_max = table_range_max;
    };

    table_function_4.prototype.table_function_set = function (table_function) {
        this.table_function = table_function;
        table_render();
    };

	table_function_4.prototype.evaluate = function (x) {
        // TODO after test process
        return -1.0;
	};


	// private methods
    var table_render = function () {
        // calculate table length internal
        this.table_length_internal = this.table_length + 3;

        // reallocate if necessary
        if (this.table === null || this.table.length !== this.table_length_internal) {
            this.table = audex.helpers.allocate_buffer_float_32(this.table_length_internal);
        }

        // calculate range mappers
        this.table_index_to_domain = audex.helpers.range_map_linear(1, this.table_length, this.table_domain_min, this.table_domain_max);
        this.table_domain_to_index = audex.helpers.range_map_linear(this.table_domain_min, this.table_domain_max, 1, this.table_length);

        // render table
        this.table_range_min = Infinity;
        this.table_range_max = -Infinity;
        for (var i = 0; i < this.table_length_internal; i++) {
            var x = (i * this.table_index_to_domain.m) + this.table_index_to_domain.b;
            var y = this.table_function(x);
            if (y < this.table_range_min) {
                this.table_range_min = y;
            }
            if (y > this.table_range_max) {
                this.table_range_max = y;
            }
            this.table[i] = this.table_function(x);
        }
    };

	// add to namespace
	audex.audio.processor.table_function_4 = table_function_4;
}) (window.audex);
