/**
 * TATA Sample Plugin - Hello World
 * 
 * This is a sample plugin demonstrating the TATA plugin API.
 * Place .js files in the /plugins folder and they will be auto-loaded.
 * 
 * Available TATA APIs:
 * - TATA.showInputModal(title, fields, callback)
 * - TATA.showConfirmModal(title, text, callback)
 * - TATA.ICONS (icon library)
 * - TATA.registerPlugin(name, pluginObject)
 */

TATA.registerPlugin('hello_world', {
    name: 'Hello World',
    version: '1.0.0',

    // Called when plugin is loaded
    init: function () {
        console.log('[HelloWorld Plugin] Initialized!');
    },

    // Custom function
    sayHello: function (name) {
        alert('Hello, ' + (name || 'World') + '!');
    }
});
