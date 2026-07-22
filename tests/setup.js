const fs = require('fs');
const path = require('path');

window.loadPanelScript = function (relativePath) {
    const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    window.eval(source);
};

beforeEach(function () {
    localStorage.clear();
    document.body.innerHTML = '';
    window.TATA = {};
    global.TATA = window.TATA;
});
