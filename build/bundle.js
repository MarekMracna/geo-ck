
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var tl = [
    	{
    		number: 0,
    		type: "day"
    	},
    	{
    		city: "Londýn",
    		name: "Letisko Heathrow",
    		picture: "https://thepointsguy.com/wp-content/uploads/2015/10/heathrow.png",
    		time: "2021-03-10T15:05:00Z",
    		type: "place"
    	},
    	{
    		duration: "7 hodín 25 minút",
    		type: "transport",
    		vehicle: "Lietadlom"
    	},
    	{
    		city: "Doha (Katar)",
    		name: "Letisko Hamad",
    		time: "2021-03-10T22:30:00+03:00",
    		type: "place"
    	},
    	{
    		duration: "10 hodín 25 minút",
    		type: "transport",
    		vehicle: "Lietadlom"
    	},
    	{
    		number: 1,
    		type: "day"
    	},
    	{
    		city: "Tokyo",
    		name: "Letisko Narita",
    		time: "2021-03-11T17:55:00+09:00",
    		type: "place"
    	},
    	{
    		duration: "1 hodina",
    		type: "transport",
    		vehicle: "Autom"
    	},
    	{
    		city: "Tokyo",
    		name: "Hostel Sadou",
    		time: "2021-03-11T19:00:00+09:00",
    		type: "place"
    	},
    	{
    		duration: "40 minút",
    		type: "transport",
    		vehicle: "Pešo"
    	},
    	{
    		city: "Tokyo",
    		name: "LaQua",
    		time: "2021-03-11T19:40:00+09:00",
    		type: "place"
    	},
    	{
    		number: 2,
    		type: "day"
    	},
    	{
    		city: "Tokyo",
    		name: "Ulice Tokya",
    		time: "2021-03-12T08:00:00+09:00",
    		type: "place"
    	},
    	{
    		duration: "15 minút",
    		type: "transport",
    		vehicle: "Autom"
    	},
    	{
    		city: "Tokyo",
    		duration: "2 hodiny",
    		name: "Nezu múzeum",
    		time: "2021-03-12T10:00:00+09:00",
    		type: "place"
    	},
    	{
    		duration: "15 minút",
    		type: "transport",
    		vehicle: "Autom"
    	},
    	{
    		city: "Tokyo",
    		name: "McDonald's",
    		time: "2021-03-12T12:30:00+09:00",
    		type: "place"
    	},
    	{
    		duration: "10 minút",
    		type: "transport",
    		vehicle: "Autom"
    	},
    	{
    		city: "Tokyo",
    		duration: "2 hodiny 45 minút",
    		name: "Maxell Aqua Park",
    		time: "2021-03-12T13:15:00+09:00",
    		type: "place"
    	},
    	{
    		duration: "1 hodina 17 minút",
    		type: "transport",
    		vehicle: "Autom"
    	},
    	{
    		city: "Tokyo",
    		duration: "1 hodina",
    		name: "Hoki múzeum",
    		time: "2021-03-12T17:20:00+09:00",
    		type: "place"
    	},
    	{
    		duration: "10 minút",
    		type: "transport",
    		vehicle: "Autom"
    	},
    	{
    		city: "Tokyo",
    		duration: "50 minút",
    		name: "Megumi Restaurant",
    		time: "2021-03-12T18:30:00+09:00",
    		type: "place"
    	},
    	{
    		duration: "1 hodina",
    		type: "transport",
    		vehicle: "Autom"
    	},
    	{
    		city: "Tokyo",
    		name: "Hostel Sadou",
    		time: "2021-03-12T20:30:00+09:00",
    		type: "place"
    	},
    	{
    		duration: "2 hodiny",
    		type: "transport",
    		vehicle: "Autom"
    	},
    	{
    		city: "Hoshinoya",
    		desc: "Skupina 1",
    		name: "Hoshinoya Fuji hotel",
    		time: "2021-03-12T10:00:00+09:00",
    		type: "place"
    	},
    	{
    		city: "Národný park Fuji-Hakone-Izu",
    		desc: "Skupina 1",
    		name: "Jazero Kawaguchi+okolie Fuji",
    		time: "2021-03-12T11:00:00+09:00",
    		type: "place"
    	},
    	{
    		desc: "Skupina 2",
    		duration: "45 minút",
    		type: "transport",
    		vehicle: "Autom"
    	},
    	{
    		city: "Národný park Fuji-Hakone-Izu",
    		desc: "Skupina 2",
    		duration: "7 hodín",
    		name: "Narusawa-Fuji",
    		time: "2021-03-12T11:00:00+09:00",
    		type: "place"
    	}
    ];

    /* src/Timeline.svelte generated by Svelte v3.32.1 */

    const { Error: Error_1 } = globals;
    const file = "src/Timeline.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (57:30) 
    function create_if_block_5(ctx) {
    	let h1;
    	let t0;
    	let t1_value = /*item*/ ctx[1].day + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text("Deň ");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(h1, "class", "day");
    			add_location(h1, file, 57, 4, 1619);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(57:30) ",
    		ctx
    	});

    	return block;
    }

    // (52:36) 
    function create_if_block_4(ctx) {
    	let div;
    	let p0;
    	let t0;
    	let t1_value = /*item*/ ctx[1].vehicle.toLowerCase() + "";
    	let t1;
    	let t2;
    	let p1;
    	let t3_value = /*item*/ ctx[1].duration + "";
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			t0 = text("Presun ");
    			t1 = text(t1_value);
    			t2 = space();
    			p1 = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			add_location(p0, file, 53, 8, 1482);
    			attr_dev(p1, "class", "duration");
    			add_location(p1, file, 54, 8, 1533);
    			attr_dev(div, "class", "transport svelte-bcr3bd");
    			add_location(div, file, 52, 4, 1450);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(div, t2);
    			append_dev(div, p1);
    			append_dev(p1, t3);
    			append_dev(div, t4);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(52:36) ",
    		ctx
    	});

    	return block;
    }

    // (35:0) {#if item.type === 'place'}
    function create_if_block(ctx) {
    	let li;
    	let div;
    	let h2;
    	let t0_value = /*item*/ ctx[1].name + "";
    	let t0;
    	let t1;
    	let h4;
    	let t2_value = /*item*/ ctx[1].city + "";
    	let t2;
    	let t3;
    	let p;
    	let t4;
    	let t5_value = /*item*/ ctx[1].time.toLocaleString() + "";
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let if_block0 = /*item*/ ctx[1].est && create_if_block_3(ctx);
    	let if_block1 = /*item*/ ctx[1].desc && create_if_block_2(ctx);
    	let if_block2 = /*item*/ ctx[1].picture && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			div = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			h4 = element("h4");
    			t2 = text(t2_value);
    			t3 = space();
    			p = element("p");
    			t4 = text("Príchod: ");
    			t5 = text(t5_value);
    			t6 = space();
    			if (if_block0) if_block0.c();
    			t7 = space();
    			if (if_block1) if_block1.c();
    			t8 = space();
    			if (if_block2) if_block2.c();
    			t9 = space();
    			attr_dev(h2, "class", "name");
    			add_location(h2, file, 37, 12, 947);
    			attr_dev(h4, "class", "city");
    			add_location(h4, file, 38, 12, 993);
    			attr_dev(p, "class", "arrival svelte-bcr3bd");
    			add_location(p, file, 39, 12, 1039);
    			attr_dev(div, "class", "svelte-bcr3bd");
    			add_location(div, file, 36, 8, 929);
    			attr_dev(li, "class", "svelte-bcr3bd");
    			add_location(li, file, 35, 4, 916);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, div);
    			append_dev(div, h2);
    			append_dev(h2, t0);
    			append_dev(div, t1);
    			append_dev(div, h4);
    			append_dev(h4, t2);
    			append_dev(div, t3);
    			append_dev(div, p);
    			append_dev(p, t4);
    			append_dev(p, t5);
    			append_dev(div, t6);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t7);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(li, t8);
    			if (if_block2) if_block2.m(li, null);
    			append_dev(li, t9);
    		},
    		p: function update(ctx, dirty) {
    			if (/*item*/ ctx[1].est) if_block0.p(ctx, dirty);
    			if (/*item*/ ctx[1].desc) if_block1.p(ctx, dirty);
    			if (/*item*/ ctx[1].picture) if_block2.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(35:0) {#if item.type === 'place'}",
    		ctx
    	});

    	return block;
    }

    // (41:12) {#if item.est}
    function create_if_block_3(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*item*/ ctx[1].est + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Odhadovaná doba pobytu: ");
    			t1 = text(t1_value);
    			attr_dev(p, "class", "est svelte-bcr3bd");
    			add_location(p, file, 41, 12, 1139);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(41:12) {#if item.est}",
    		ctx
    	});

    	return block;
    }

    // (44:12) {#if item.desc}
    function create_if_block_2(ctx) {
    	let p;
    	let t_value = /*item*/ ctx[1].desc + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "desc svelte-bcr3bd");
    			add_location(p, file, 44, 12, 1251);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(44:12) {#if item.desc}",
    		ctx
    	});

    	return block;
    }

    // (48:8) {#if item.picture}
    function create_if_block_1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*item*/ ctx[1].picture)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-bcr3bd");
    			add_location(img, file, 48, 8, 1351);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(48:8) {#if item.picture}",
    		ctx
    	});

    	return block;
    }

    // (34:0) {#each items as item}
    function create_each_block(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*item*/ ctx[1].type === "place") return create_if_block;
    		if (/*item*/ ctx[1].type === "transport") return create_if_block_4;
    		if (/*item*/ ctx[1].type === "day") return create_if_block_5;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (if_block) if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(34:0) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let ul;
    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "svelte-bcr3bd");
    			add_location(ul, file, 32, 0, 857);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*items*/ 1) {
    				each_value = /*items*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Timeline", slots, []);

    	let items = tl.map(n => {
    		if (n.type === "place") {
    			return {
    				type: "place",
    				time: new Date(n.time),
    				name: n.name,
    				city: n.city,
    				picture: n === null || n === void 0 ? void 0 : n.picture,
    				desc: n === null || n === void 0 ? void 0 : n.desc,
    				est: n === null || n === void 0 ? void 0 : n.duration
    			};
    		} else if (n.type === "transport") {
    			return {
    				type: "transport",
    				duration: n.duration,
    				vehicle: n.vehicle
    			};
    		} else if (n.type === "day") {
    			return {
    				type: "day",
    				day: Number.parseInt(n.number)
    			};
    		} else {
    			throw new Error(`Unknown entry in JSON: ${n}`);
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Timeline> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ tl, items });

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [items];
    }

    class Timeline extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Timeline",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.32.1 */
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let div;
    	let timeline;
    	let t0;
    	let footer;
    	let h3;
    	let t2;
    	let p0;
    	let t4;
    	let p1;
    	let current;
    	timeline = new Timeline({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			create_component(timeline.$$.fragment);
    			t0 = space();
    			footer = element("footer");
    			h3 = element("h3");
    			h3.textContent = "Cestovná kancelária Tabibito";
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "2021 Marek Mračna, Michal Valigurský";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "Gymnázium, ul. 1. Mája 8, 901 01 Malacky";
    			attr_dev(div, "class", "svelte-10xo9f6");
    			add_location(div, file$1, 4, 1, 79);
    			add_location(h3, file$1, 8, 2, 129);
    			add_location(p0, file$1, 9, 2, 169);
    			add_location(p1, file$1, 10, 2, 215);
    			attr_dev(footer, "class", "svelte-10xo9f6");
    			add_location(footer, file$1, 7, 1, 118);
    			add_location(main, file$1, 3, 0, 71);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			mount_component(timeline, div, null);
    			append_dev(main, t0);
    			append_dev(main, footer);
    			append_dev(footer, h3);
    			append_dev(footer, t2);
    			append_dev(footer, p0);
    			append_dev(footer, t4);
    			append_dev(footer, p1);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(timeline.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(timeline.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(timeline);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Timeline });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
