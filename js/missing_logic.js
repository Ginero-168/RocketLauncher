
function renderUserScripts() {
    var container = document.getElementById('user_scripts_container');
    if (!container) return;
    container.innerHTML = '';

    for (var id in userScripts) {
        if (userScripts.hasOwnProperty(id)) {
            var script = userScripts[id];
            var btn = createUserButton(id, script);
            container.appendChild(btn);
        }
    }
}

function createUserButton(id, script) {
    var btn = document.createElement('button');
    btn.className = 'btn-' + (script.color || 'red');
    btn.innerHTML = (script.icon || '★') + ' ' + script.name;
    btn.title = script.name;

    // Run Logic
    btn.onclick = function () {
        runScript(script.code);
    };

    // Context Menu
    btn.oncontextmenu = function (e) {
        e.preventDefault();
        currentContextScriptId = id;
        if (contextMenuEl) {
            contextMenuEl.style.top = e.clientY + 'px';
            contextMenuEl.style.left = e.clientX + 'px';
            contextMenuEl.style.display = 'block';
        }
    };

    return btn;
}

function saveUserScript(name, icon, code, color, isUpdate, targetId) {
    var id = isUpdate ? targetId : 'script_' + Date.now();

    userScripts[id] = {
        name: name,
        icon: icon,
        code: code,
        color: color,
        date: Date.now()
    };

    localStorage.setItem('tata_user_scripts', JSON.stringify(userScripts));
    renderUserScripts();
    alert("Script Saved!");
}

function runScript(code) {
    csInterface.evalScript(code);
}
