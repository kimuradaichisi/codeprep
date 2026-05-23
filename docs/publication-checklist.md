# Publication Checklist

## Required

- [ ] Run all tests
- [ ] Run dependency audit
- [ ] Check dependency licenses
- [ ] Scan for secrets
- [ ] Verify package metadata
- [ ] Verify README safety sections
- [ ] Verify AI-assisted development disclosure
- [ ] Verify acknowledgement section
- [ ] Verify no Repomix branding confusion
- [ ] Verify VSCode package contents
- [ ] Test extension in a clean workspace
- [ ] Test behavior without Git
- [ ] Test behavior in an empty workspace
- [ ] Test patch preview before apply
- [ ] Confirm no silent patch application

## Suggested Commands

```bash
npm test
npm audit
npx license-checker --summary
git grep -n "apiKey"
git grep -n "token"
git grep -n "secret"
git grep -n "password"
git grep -n "BEGIN PRIVATE KEY"
git grep -n "sk-"
```

## Manual Review

- [ ] README does not claim full original authorship
- [ ] README does not present CodePrep as Repomix official/compatible
- [ ] Marketplace description does not use confusing Repomix naming
- [ ] LICENSE is present
- [ ] SECURITY.md is present
- [ ] CHANGELOG.md is present
