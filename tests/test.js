import { expect } from 'chai';
import t from '../dist/index';

describe('render', () => {
	it('inner', () => {
		const node = document.createElement('div');
		node.innerHTML = '<tpl data-mm-tpl="p01"></tpl>';
		const mm = {
			data: {
				node
			},
			parse_event() { }
		};
		t(mm, { foo: 'bar' }, '<foo>bar</foo>', 'p01', 'inner');
		expect(node.innerHTML).eq('<tpl data-mm-tpl="p01"><foo>bar</foo></tpl>');
	});
});
