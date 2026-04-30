
import { describe, it, expect } from 'vitest';
import { generateTree } from '../../utils/treeGenerator';

describe('treeGenerator', () => {
    it('should generate a simple tree from paths', () => {
        const paths = [
            'src/index.ts',
            'src/utils/math.ts',
            'README.md'
        ];
        const expected = 
'├── README.md\n' +
'└── src\n' +
'    ├── index.ts\n' +
'    └── utils\n' +
'        └── math.ts\n';
        
        expect(generateTree(paths)).toBe(expected);
    });

    it('should return empty string for empty input', () => {
        expect(generateTree([])).toBe('');
    });
});
