const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

if (!html.includes('value="sniff"')) {
    html = html.replace(
        '<option value="eat">Eat</option>',
        '<option value="eat">Eat</option>\n        <option value="sniff">Sniff</option>'
    );
    fs.writeFileSync('index.html', html);
    console.log('updated index.html');
}
