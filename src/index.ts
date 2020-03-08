import aw1 from '@mmstudio/aw000001';
import on from '@mmstudio/on';
import * as dot from 'dot';

enum Position {
	After = 'after',
	Before = 'before',
	FirstIn = 'firstin',
	LastIn = 'lastin',
	Replace = 'replace',
	Inner = 'inner'
}

export default function render(mm: aw1, data: unknown, tpl: string, panme: string, position: Position) {
	const dom_node = mm.data.node;
	const doms = dom_node.querySelectorAll(`[data-mm-tpl=${panme}]`);
	const tpl_d = render_data(data, tpl);
	const list = Array.from(doms);

	if (list.length === 0) {
		throw new Error(`cannot find node: ${panme}`);
	}
	list.forEach((dom) => {
		const node = fromString(tpl_d || '');
		mm.parse_event(node);
		place(node, position, dom);
	});
	list.forEach((dom) => {
		lazyload_picture(dom);
	});
}

function render_data(data: unknown, tpl: string) {
	return dot.template(tpl)(data);
}

const PICTURE_FLAG = 'data-mm-src';
const OFFSET = 20;

function in_viewport(node: Element) {
	const body = window.document.documentElement;
	const nbcr = node.getBoundingClientRect();
	return nbcr.bottom > 0 && nbcr.right > 0 && nbcr.left < body.clientWidth && nbcr.top < body.clientHeight + OFFSET;
}

function lazyload(node: Element) {
	return new Promise<Element>((resolve) => {
		if (in_viewport(node)) {
			resolve(node);
			return;
		}
		const handle = on(window, ['scroll', 'resize'], () => {
			if (in_viewport(node)) {
				if (handle) {
					handle.destroy();
				}
				resolve(node);
			}
		});
	});
}

function lazyload_picture(node: Element) {
	const img_list = Array.from(node.querySelectorAll<HTMLImageElement>(`img[${PICTURE_FLAG}]`));
	img_list.forEach((img) => {
		lazyload(img).then(() => {
			const pic_src = img.getAttribute(PICTURE_FLAG);
			if (!pic_src) {
				return;
			}
			const image = new Image();
			image.onload = () => {
				img.src = pic_src;
				img.removeAttribute(PICTURE_FLAG);
			};
			image.src = pic_src;
		});
	});
}

const has_dom_contextual_fragment = Boolean(typeof Range !== 'undefined' && Range && Range.prototype.createContextualFragment);

const tagWrap: { [key: string]: string[] & { pre?: string; post?: string; }; } = {
	caption: ['table'],
	col: ['table', 'colgroup'],
	colgroup: ['table'],
	optgroup: ['select'],
	option: ['select'],
	rp: ['ruby'],
	rt: ['ruby'],
	rtc: ['ruby'],
	source: ['audio'],
	tbody: ['table'],
	td: ['table', 'tbody', 'tr'],
	tfoot: ['table'],
	th: ['table', 'thead', 'tr'],
	thead: ['table'],
	tr: ['table', 'tbody']
};

function fromString(html: string): DocumentFragment {
	let fragment: DocumentFragment;

	let master = document.createElement('div');
	const match = /<\s*([\w:]+)/.exec(html);
	const tag = match ? match[1].toLowerCase() : '';

	function unwrapElement(element: DocumentFragment | HTMLElement, levels: number) {
		for (let i = 0; i < levels; i++) {
			element = element.firstChild as HTMLElement;
		}

		return element;
	}

	if (has_dom_contextual_fragment) {
		master.style.display = 'none';
		document.body.appendChild(master);
		const range = document.createRange();
		range.selectNode(master);

		if (match && tagWrap[tag]) {
			const wrap = tagWrap[tag];
			const wrappedHTML = wrap.pre + html + wrap.post;
			fragment = range.createContextualFragment(wrappedHTML);
			fragment = unwrapElement(fragment, wrap.length) as DocumentFragment;
		} else {
			fragment = range.createContextualFragment(html);
		}
	} else {
		if (match && tagWrap[tag]) {
			const wrap = tagWrap[tag];
			const wrappedHTML = wrap.pre + html + wrap.post;
			master.innerHTML = wrappedHTML;
			master = unwrapElement(master, wrap.length) as HTMLDivElement;
		} else {
			master.innerHTML = html;
		}

		fragment = document.createDocumentFragment();
		let firstChild: Node | null;
		// eslint-disable-next-line no-cond-assign
		while (firstChild = master.firstChild) {
			fragment.appendChild(firstChild);
		}
	}

	return fragment;
}

function place(node: Node, position: Position, relativeElement: Element): void {
	let parent: Node | null;

	if (position === Position.After || position === Position.Before || position === Position.Replace) {
		parent = relativeElement.parentNode;
		if (!parent) {
			throw new ReferenceError('dom.place: Reference node must have a parent to determine placement');
		}

		if (position === Position.After) {
			if (parent.lastChild === relativeElement) {
				parent.appendChild(node);
			} else {
				parent.insertBefore(node, relativeElement.nextSibling);
			}
		} else if (position === Position.Before) {
			parent.insertBefore(node, relativeElement);
		} else if (position === Position.Replace) {
			parent.replaceChild(node, relativeElement);
		}
	} else if (position === Position.FirstIn) {
		relativeElement.insertBefore(node, relativeElement.firstChild);
	} else if (position === Position.Inner) {
		relativeElement.innerHTML = '';
		relativeElement.appendChild(node);
	} else {
		// LastIn
		relativeElement.appendChild(node);
	}
}
