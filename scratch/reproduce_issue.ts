import { ClipParser } from '../src/features/patch/domain/ClipParser';

const markdown = `
Hi, I'm a Silicon Valley engineer. このプロジェクトの構造を完全に理解しました。

\`prompt_generator.py\`:
\`\`\`python
import argparse
import datetime
import fnmatch
import os
from pathlib import Path

class PromptGenerator:
    def __init__(self):
        # ... existing code ...
        self.default_ignore_patterns = [
            # ... existing code ...
            "dmypy.json",
            ".ai_prompts/", # 出力先もデフォルトで除外
        ]
\`\`\`
`;

const parser = new ClipParser();
const result = parser.parse(markdown);

if (result.isFailure) {
    console.error('Parse Failed:', result.error.message);
} else {
    console.log('Parse Success!');
    result.value.forEach((patch: any) => {
        console.log('File Path:', patch.filePath);
        console.log('Code Length:', patch.code.length);
    });
}
