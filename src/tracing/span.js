"use strict";

const { generateToken } = require("../utils");

/**
 * Trace Span class
 *
 * @class Span
 */
class Span {

	/**
	 * Creates an instance of Span.
	 * @param {Tracer} tracer
	 * @param {String} name
	 * @param {Object?} opts
	 *
	 * @memberof Span
	 */
	constructor(tracer, name, opts) {
		this.tracer = tracer;
		this.logger = this.tracer.logger;
		this.name = name;
		this.opts = opts || {};
		this.rootSpanID = this.opts.rootSpanID;
		this.priority = this.opts.priority != null ? this.opts.priority : 5;
		this.id = opts.id || generateToken();
		this.sampled = this.opts.sampled != null ? this.opts.sampled : this.tracer.shouldSample(this);

		this.startTime = null;
		this.startHrTime = null;
		this.finishMs = null;
		this.duration = null;

		this.logs = [];
		this.tags = {};

		if (this.opts.defaultTags)
			this.addTags(this.opts.defaultTags);

		if (this.opts.tags)
			this.addTags(this.opts.tags);
	}

	/**
	 * Start span.
	 *
	 * @param {Number?} time
	 * @returns {Span}
	 * @memberof Span
	 */
	start(time) {
		this.startTime = time || Date.now();
		this.startHrTime = process.hrtime();

		this.logger.debug(`[${this.id}] Span '${this.name}' is started.`);

		this.tracer.invokeExporter("startSpan", [this]);

		return this;
	}

	/**
	 * Add tags. It will be merged with previous tags.
	 *
	 * @param {Object} obj
	 * @returns {Span}
	 *
	 * @memberof Span
	 */
	addTags(obj) {
		Object.assign(this.tags, obj);

		return this;
	}

	/**
	 * Get elapsed time from starting.
	 *
	 * @returns {Number} duration
	 * @memberof Span
	 */
	getElapsedTime() {
		const diff = process.hrtime(this.startHrTime);
		return (diff[0] * 1e3) + (diff[1] / 1e6);
	}

	/**
	 * Log a trace event.
	 *
	 * @param {String} name
	 * @param {Object?} fields
	 * @param {Number?} time
	 * @returns {Span}
	 * @memberof Span
	 */
	log(name, fields, time) {
		const elapsed = time ? time - this.startTime : this.getElapsedTime();

		this.logs.push({
			name,
			fields: fields || {},
			time: time || Date.now(),
			elapsed
		});

		this.logger.debug(`[${this.id}] Span '${this.name}' has a new log event: ${name}.`);


		return this;
	}

	/**
	 * Finish span.
	 *
	 * @param {Number?} time
	 * @returns {Span}
	 * @memberof Span
	 */
	finish(time) {
		if (time) {
			this.duration = time - this.startTime;
			this.stopTime = time;
		} else {
			this.duration = this.getElapsedTime();
			this.stopTime = this.startTime + this.duration;
		}

		this.logger.debug(`[${this.id}] Span '${this.name}' is finished. Duration: ${Number(this.duration).toFixed(3)} ms`);

		this.tracer.invokeExporter("finishSpan", [this]);

		return this;
	}

	/**
	 * Start a child span.
	 *
	 * @param {String} name
	 * @param {Object?} opts
	 * @returns {Span} Child span
	 * @memberof Span
	 */
	startSpan(name, opts) {
		const r = {
			rootSpanID: this.id,
			sampled: this.sampled
		};
		return this.tracer.startSpan(name, opts ? Object.assign(r, opts) : r);
	}

}

module.exports = Span;

/*

    trace_id: new Uint64BE(0x12345678, 0x9abcdef0),
    span_id: new Uint64BE(0x12345678, 0x12345678),
    parent_id: null,
    name: 'root',
    resource: '/',
    service: 'benchmark',
    type: 'web',
    error: 0,
    meta: {},
    metrics: {},
    start: 1500000000000123600,
    duration: 100000000

*/

/*
    this.type = 'Span'
    this.traceId = null
    this.guid = null
    this.parentId = null
    this.transactionId = null
    this.sampled = null
    this.priority = null
    this.name = null
    this.category = CATEGORIES.GENERIC
    this.component = null
    this.timestamp = null
    this.duration = null
    this['nr.entryPoint'] = null
    this['span.kind'] = null
*/
