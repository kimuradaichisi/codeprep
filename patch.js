const fs = require("fs");
let content = fs.readFileSync("package.nls.json", "utf8");
content = content.replace("console.log(\"New logic here\");", "console.log(\\\"New logic here\\\");");
fs.writeFileSync("package.nls.json", content);
console.log("Patched");
