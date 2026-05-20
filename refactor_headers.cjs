const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.tsx')) {
            results.push(filePath);
        }
    });
    return results;
}

const files = walk('./src/pages');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    const isAdmin = file.includes('/admin/');

    // Replace sticky top-0 with fixed top-0 left-0 right-0 (and md:left-72 for admin)
    const headerRegex = /<header className="[^"]*sticky top-0[^"]*">/g;
    
    content = content.replace(headerRegex, (match) => {
        modified = true;
        let newClasses = match.replace('sticky top-0', 'fixed top-0 left-0 right-0');
        newClasses = newClasses.replace('w-full', ''); // remove w-full if exists
        if (isAdmin) {
            newClasses = newClasses.replace('fixed top-0 left-0 right-0', 'fixed top-0 left-0 right-0 md:left-72');
        }
        return newClasses;
    });

    // Add padding to the next element after header to prevent overlap
    // Usually the header is followed by <div className="px-5... or <div className="p-6...
    if (modified) {
        // We need to add pt-24 to the container below the header.
        // Let's find the header closing tag and the next tag.
        const headerCloseIndex = content.indexOf('</header>');
        if (headerCloseIndex !== -1) {
            // Find the next '<div' or '<main' or '<section'
            const restOfContent = content.slice(headerCloseIndex + 9);
            const nextTagMatch = restOfContent.match(/<([a-zA-Z]+)\s+className="([^"]+)"/);
            
            if (nextTagMatch) {
                const fullMatch = nextTagMatch[0];
                const tagName = nextTagMatch[1];
                const className = nextTagMatch[2];
                
                if (!className.includes('pt-24') && !className.includes('pt-28') && !className.includes('mt-24')) {
                    const newClassName = className + ' pt-24';
                    const newTag = `<${tagName} className="${newClassName}"`;
                    content = content.replace(fullMatch, newTag);
                }
            }
        }
        
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
