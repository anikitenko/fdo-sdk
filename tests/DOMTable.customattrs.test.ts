import {DOMTable} from "../src";

describe("DOMTable customAttributes coverage", () => {
    const dom = new DOMTable();

    const methods = [
        'createTable',
        'createTableHead',
        'createTableBody',
        'createTableFoot',
        'createTableRow',
        'createTableHeader',
        'createTableCell',
        'createCaption'
    ] as const;

    methods.forEach((m) => {
        it(`${m} with customAttributes should render those attributes`, () => {
            const fn: any = (dom as any)[m];
            expect(typeof fn).toBe('function');
            // Build args depending on method signature
            let out;
            if (m === 'createTableHeader' || m === 'createTableCell') {
                out = fn.call(dom, ["X"], { customAttributes: { 'data-x': '1' } }, undefined, { scope: 'col' });
            } else if (m === 'createTableRow') {
                out = fn.call(dom, ["<td></td>"], { customAttributes: { 'data-x': 'r' } });
            } else {
                out = fn.call(dom, [], { customAttributes: { 'data-x': 'v' } });
            }
            expect(out).toContain('data-x="');
        });
    });
});
